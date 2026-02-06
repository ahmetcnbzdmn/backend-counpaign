const Customer = require('../models/Customer');
const CustomerBusiness = require('../models/CustomerBusiness');
const Admin = require('../models/Admin');

// Get users based on role
// Super admin: all customers
// Business: only customers who have their business in wallet
exports.getUsers = async (req, res) => {
    try {
        const userId = req.user?.id;
        console.log('👥 Get users request - User ID:', userId);

        // Check if user is an admin (super_admin)
        const admin = await Admin.findById(userId);

        let customers;

        if (admin && admin.role === 'super_admin') {
            // Super admin sees all customers
            customers = await Customer.find()
                .select('-password')
                .sort({ createdAt: -1 });
            console.log(`✅ Fetched ${customers.length} customers (super admin)`);
        } else {
            // Business user sees only their customers
            // Find all CustomerBusiness relationships for this business
            const relations = await CustomerBusiness.find({ business: userId })
                .populate('customer', '-password')
                .sort({ joinedAt: -1 });

            customers = relations.map(relation => relation.customer).filter(c => c); // Filter out null customers
            console.log(`✅ Fetched ${customers.length} customers for business ${userId}`);
        }

        res.json(customers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Customer.findById(id).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get user's wallet cafes (CustomerBusiness relationships)
exports.getUserCafes = async (req, res) => {
    try {
        const { id } = req.params;

        const cafes = await CustomerBusiness.find({ customer: id })
            .populate('business', 'companyName category cardColor logo cardIcon')
            .sort({ joinedAt: -1 });

        res.json(cafes);
    } catch (error) {
        console.error('Get user cafes error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update wallet record (points, stamps, gifts)
exports.updateWallet = async (req, res) => {
    try {
        const { id: userId, recordId } = req.params;
        const updates = req.body;

        const record = await CustomerBusiness.findById(recordId);

        if (!record) {
            return res.status(404).json({ error: 'Wallet record not found' });
        }

        // Update fields
        Object.keys(updates).forEach(key => {
            record[key] = updates[key];
        });

        // Auto-handle stamp completion
        const stampsTarget = record.stampsTarget || 6;
        if (record.stamps >= stampsTarget) {
            const completedGifts = Math.floor(record.stamps / stampsTarget);
            record.giftsCount += completedGifts;
            record.stamps = record.stamps % stampsTarget;
            console.log(`🎁 Auto-completed ${completedGifts} gift(s). New stamps: ${record.stamps}, New gifts: ${record.giftsCount}`);
        }

        await record.save();

        res.json({ message: 'Wallet updated successfully', record });
    } catch (error) {
        console.error('Update wallet error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete wallet record
exports.deleteWallet = async (req, res) => {
    try {
        const { id: userId, recordId } = req.params;

        const record = await CustomerBusiness.findByIdAndDelete(recordId);

        if (!record) {
            return res.status(404).json({ error: 'Wallet record not found' });
        }

        res.json({ message: 'Wallet record deleted successfully' });
    } catch (error) {
        console.error('Delete wallet error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete User (Role Based)
// Update FCM Token
exports.updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ message: 'Token gerekli.' });
        }

        console.log(`📲 FCM Token Update for User ${req.user.id}: ${fcmToken}`);
        await Customer.findByIdAndUpdate(req.user.id, { fcmToken });
        res.json({ success: true, message: 'Token güncellendi.' });
    } catch (err) {
        console.error("FCM Token Update Error:", err);
        res.status(500).json({ message: 'Token güncellenemedi.' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userIdToDelete = req.params.id;
        const requestorId = req.user.id;

        // Dynamic Imports
        const Participation = require('../models/Participation');
        const Transaction = require('../models/Transaction');
        const Review = require('../models/Review');
        const QRToken = require('../models/QRToken');
        const Campaign = require('../models/Campaign'); // Import Campaign for robust delete

        // Check if requestor is Super Admin
        const admin = await Admin.findById(requestorId);

        if (admin && admin.role === 'super_admin') {
            console.log(`🗑️ Super Admin deleting user ${userIdToDelete} globally`);

            // GLOBAL DELETE
            // 1. Delete Customer Profile
            const deletedUser = await Customer.findByIdAndDelete(userIdToDelete);
            if (!deletedUser) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

            // 2. Delete All Wallet Connections
            await CustomerBusiness.deleteMany({ customer: userIdToDelete });

            // 3. Delete All Participations
            await Participation.deleteMany({ customer: userIdToDelete });

            // 4. Delete All Transactions
            await Transaction.deleteMany({ customer: userIdToDelete });

            // 5. Delete All Reviews
            await Review.deleteMany({ customer: userIdToDelete });

            // 6. Delete QR Tokens
            await QRToken.deleteMany({ user: userIdToDelete });

            res.json({ message: 'Kullanıcı ve tüm verileri silindi.' });

        } else {
            // BUSINESS DELETE (Disconnect)
            console.log(`🔌 Business ${requestorId} disconnecting user ${userIdToDelete}`);

            // 1. Delete Wallet Connection for THIS business
            const wallet = await CustomerBusiness.findOneAndDelete({ customer: userIdToDelete, business: requestorId });
            console.log(`- Wallet deleted: ${wallet ? 'Yes' : 'No'}`);

            // 2. ROBUST DELETE: Participations
            // Find all campaigns of this business to ensure we delete by Campaign ID too (backup if business field id missing)
            const businessCampaigns = await Campaign.find({ businessId: requestorId }).select('_id');
            const campaignIds = businessCampaigns.map(c => c._id);
            console.log(`- Business has ${campaignIds.length} campaigns. IDs:`, campaignIds);

            const partCount = await Participation.countDocuments({
                customer: userIdToDelete,
                $or: [{ business: requestorId }, { campaign: { $in: campaignIds } }]
            });
            console.log(`- Participations found: ${partCount}`);

            const partResult = await Participation.deleteMany({
                customer: userIdToDelete,
                $or: [{ business: requestorId }, { campaign: { $in: campaignIds } }]
            });
            console.log(`- Participations deleted: ${partResult.deletedCount}`);

            // 3. Delete Transactions for THIS business
            const transCount = await Transaction.countDocuments({ customer: userIdToDelete, business: requestorId });
            console.log(`- Transactions found: ${transCount}`);
            const transResult = await Transaction.deleteMany({ customer: userIdToDelete, business: requestorId });
            console.log(`- Transactions deleted: ${transResult.deletedCount}`);

            // 4. Delete Reviews for THIS business
            const reviewCount = await Review.countDocuments({ customer: userIdToDelete, business: requestorId });
            console.log(`- Reviews found: ${reviewCount}`);
            const reviewResult = await Review.deleteMany({ customer: userIdToDelete, business: requestorId });
            console.log(`- Reviews deleted: ${reviewResult.deletedCount}`);

            // 5. Invalidate Active QR Tokens for this business
            const qrResult = await QRToken.deleteMany({ user: userIdToDelete, business: requestorId });
            console.log(`- QR Tokens deleted: ${qrResult.deletedCount}`);

            // ⚡ Real-Time Update: Emit Event to Mobile App
            try {
                const io = require('../utils/socket').getIO();
                io.to(userIdToDelete).emit('user_disconnected', {
                    businessId: requestorId
                });
                console.log(`📡 Socket Event 'user_disconnected' emitted to ${userIdToDelete}`);
            } catch (socketError) {
                console.error('Socket Emit Error:', socketError);
            }

            res.json({ message: 'Kullanıcı işletmenizden silindi.' });
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: error.message });
    }
};
