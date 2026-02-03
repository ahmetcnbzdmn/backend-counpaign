const Business = require('../models/Business');
const CustomerBusiness = require('../models/CustomerBusiness');
const mongoose = require('mongoose');

// Remove a business from the customer's wallet
exports.removeBusinessFromWallet = async (req, res) => {
    const { businessId, password } = req.body;
    const customerId = req.user.id;

    if (!businessId || !password) {
        return res.status(400).json({ message: 'Business ID and Password are required' });
    }

    try {
        // 1. Verify Password
        const customer = await require('../models/Customer').findById(customerId);
        if (!customer) {
            console.log('❌ [removeBusinessFromWallet] User not found, customerId:', customerId);
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await customer.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Şifre hatalı.' });
        }

        // 2. Find the item to get its current index
        const itemToDelete = await CustomerBusiness.findOne({
            customer: customerId,
            business: businessId
        });

        if (!itemToDelete) {
            return res.status(404).json({ message: 'İşletme cüzdanınızda bulunamadı.' });
        }

        const deletedIndex = itemToDelete.orderIndex;

        // 3. Delete the item
        await CustomerBusiness.deleteOne({ _id: itemToDelete._id });

        // 4. Delete associated transactions (Cleanup history)
        await require('../models/Transaction').deleteMany({
            customer: customerId,
            business: businessId
        });

        // 4.1 Delete Participations (Reset campaign progress)
        // User requesting to delete this so they can "re-join" when adding firm back.
        await require('../models/Participation').deleteMany({
            customer: customerId,
            business: businessId
        });

        // 4.2 Delete Reviews
        await require('../models/Review').deleteMany({
            customer: customerId,
            business: businessId
        });

        // 4.3 Delete active QR Tokens (Redemptions pending/active)
        await require('../models/QRToken').deleteMany({
            user: customerId,
            business: businessId
        });

        // [CRITICAL] Do NOT delete 'Gift' model here. 
        // Gifts are admin-defined templates, not user data.
        // Previously allow 'Gift.deleteMany({})' which was dangerous.

        // 5. Rebalance indices: Decrement orderIndex for all items after the deleted one
        await CustomerBusiness.updateMany(
            {
                customer: customerId,
                orderIndex: { $gt: deletedIndex }
            },
            { $inc: { orderIndex: -1 } }
        );

        console.log(`✅ Removed from wallet: ${businessId} (Index: ${deletedIndex} -> Auto-Balanced)`);
        console.log(`🧹 Cleared transaction history for business: ${businessId}`);
        res.status(200).json({ message: 'İşletme silindi ve sıralama güncellendi.' });
    } catch (err) {
        console.error("❌ Remove Wallet Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get newest 10 businesses
exports.getNewestBusinesses = async (req, res) => {
    try {
        const businesses = await Business.find({}, 'companyName category logo cardColor cardIcon settings city district neighborhood')
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(businesses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get all businesses (for Explore/Add Screen)
exports.getAllBusinesses = async (req, res) => {
    try {
        // In a real app, might want pagination or filtering
        const businesses = await Business.find({}, 'companyName category logo cardColor cardIcon settings city district neighborhood');
        res.json(businesses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Add a business to the customer's wallet
exports.addBusinessToWallet = async (req, res) => {
    const { businessId } = req.body;
    const customerId = req.user.id; // From auth middleware

    console.log("👉 Add Wallet Request:", { customerId, businessId });

    if (!businessId) {
        return res.status(400).json({ message: 'Business ID is required' });
    }

    try {
        // Check if already added
        let existingRel = await CustomerBusiness.findOne({
            customer: customerId,
            business: businessId
        });

        if (existingRel) {
            console.log("⚠️ Already added");
            return res.status(400).json({ message: 'Bu işletme zaten cüzdanınızda ekli.' });
        }

        // Get highest orderIndex for this customer to append to the end
        const lastItem = await CustomerBusiness.findOne({ customer: customerId }).sort({ orderIndex: -1 });
        const newOrderIndex = (lastItem && lastItem.orderIndex !== undefined) ? lastItem.orderIndex + 1 : 0;

        // Fetch business settings to get stampsTarget
        const business = await Business.findById(businessId);
        const stampsTarget = (business && business.settings && business.settings.stampsTarget) ? business.settings.stampsTarget : 6;

        // Create new relationship
        const newRel = new CustomerBusiness({
            customer: customerId,
            business: businessId,
            points: 0,
            stampsTarget: stampsTarget, // Use firm-specific target
            orderIndex: newOrderIndex
        });

        await newRel.save();
        console.log(`✅ Added to wallet: ${newRel._id} (Index: ${newOrderIndex})`);

        res.status(201).json({ message: 'İşletme cüzdana eklendi.', data: newRel });
    } catch (err) {
        console.error("❌ Add Wallet Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get logged-in customer's businesses
exports.getMyBusinesses = async (req, res) => {
    const customerId = req.user.id;

    try {
        const relations = await CustomerBusiness.find({ customer: customerId })
            .populate('business', 'companyName category logo image cardColor cardIcon settings city district neighborhood')
            .sort({ orderIndex: 1 })
            .lean(); // Optimize performance

        // Filter out stale relations (where business was deleted)
        const validRelations = relations.filter(rel => rel.business != null);

        // Transform for easier frontend consumption
        let result = validRelations.map(rel => ({
            id: rel.business._id, // Return business ID as the main ID for the card
            relationId: rel._id,
            companyName: rel.business.companyName,
            category: rel.business.category,
            cardColor: rel.business.cardColor,
            cardIcon: rel.business.cardIcon,
            logo: rel.business.logo, // Add logo
            image: rel.business.image, // Add image (fallback)
            points: rel.points,
            stamps: rel.stamps,
            stampsTarget: rel.stampsTarget,
            giftsCount: rel.giftsCount,
            // Calculate value based on settings
            value: (rel.points / 10).toFixed(2), // Simple rule: 1 point = 0.1 TL (mock logic)
            orderIndex: rel.orderIndex || 0
        }));

        // The .sort({ orderIndex: 1 }) in the query already handles sorting,
        // so explicit sort here is redundant if the query is correct.
        // result.sort((a, b) => a.orderIndex - b.orderIndex);

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Reorder wallet (businesses)
exports.reorderWallet = async (req, res) => {
    const { order } = req.body; // Array of Business IDs
    const customerId = req.user.id;

    if (!order || !Array.isArray(order)) {
        return res.status(400).json({ message: 'Invalid order format' });
    }

    try {
        console.log(`[DEBUG] Reordering wallet for Customer: ${customerId}`);
        console.log(`[DEBUG] New Order (IDs):`, order);

        // Bulk update for performance
        const operations = order.map((businessId, index) => ({
            updateOne: {
                filter: {
                    customer: new mongoose.Types.ObjectId(customerId),
                    business: new mongoose.Types.ObjectId(businessId)
                },
                update: { $set: { orderIndex: index } }
            }
        }));

        if (operations.length > 0) {
            const bulkResult = await CustomerBusiness.bulkWrite(operations);
            console.log(`[DEBUG] Bulk Write Result:`, bulkResult);
        }

        console.log(`✅ Wallet reordered for ${customerId} (CustomerBusiness)`);
        res.json({ message: 'Sıralama güncellendi.' });
    } catch (err) {
        console.error("❌ Reorder Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Create a new terminal for the business
exports.createTerminal = async (req, res) => {
    const { terminalName, terminalId, password } = req.body;
    const businessId = req.user.userId;

    try {
        const terminal = new require('../models/Terminal')({
            terminalName,
            terminalId,
            password,
            businessId
        });
        await terminal.save();
        res.status(201).json(terminal);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get all terminals for the business
exports.getTerminals = async (req, res) => {
    const businessId = req.user.userId;

    try {
        const terminals = await require('../models/Terminal').find({ businessId });
        res.json(terminals);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
// Get single business by ID
exports.getBusinessById = async (req, res) => {
    try {
        const business = await Business.findById(req.params.id, 'companyName category logo cardColor cardIcon settings city district neighborhood');
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı' });
        }
        res.json(business);
    } catch (err) {
        console.error(err);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'İşletme bulunamadı' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};
