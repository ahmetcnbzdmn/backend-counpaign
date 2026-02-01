const Gift = require('../models/Gift');
const CustomerBusiness = require('../models/CustomerBusiness');
const Transaction = require('../models/Transaction');

// Create a new gift (Business Only)
exports.createGift = async (req, res) => {
    try {
        const { title, pointCost } = req.body;
        const businessId = req.user.id;

        if (!title || pointCost === undefined) {
            return res.status(400).json({ message: 'Title and Point Cost are required.' });
        }

        const gift = new Gift({
            business: businessId,
            title,
            pointCost
        });

        await gift.save();
        res.status(201).json(gift);
    } catch (err) {
        console.error("Create Gift Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get gifts for the logged-in business
exports.getMyGifts = async (req, res) => {
    try {
        const businessId = req.user.id;
        const gifts = await Gift.find({ business: businessId }).sort({ pointCost: 1 });
        res.json(gifts);
    } catch (err) {
        console.error("Get My Gifts Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete a gift (Business Only)
exports.deleteGift = async (req, res) => {
    try {
        const businessId = req.user.id;
        const giftId = req.params.id;

        const gift = await Gift.findOneAndDelete({ _id: giftId, business: businessId });

        if (!gift) {
            return res.status(404).json({ message: 'Hediye bulunamadı veya silme yetkiniz yok.' });
        }

        res.json({ message: 'Hediye silindi.' });
    } catch (err) {
        console.error("Delete Gift Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get gifts for a specific business (Public/Customer)
exports.getBusinessGifts = async (req, res) => {
    try {
        const businessId = req.params.businessId;
        const gifts = await Gift.find({ business: businessId }).sort({ pointCost: 1 });
        res.json(gifts);
    } catch (err) {
        console.error("Get Business Gifts Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Redeem a gift (Customer Only)
// 7a. Prepare Redemption (Generate QR) - Customer
exports.prepareRedemption = async (req, res) => {
    try {
        const { businessId, giftId } = req.body;
        const customerId = req.user.id;

        const gift = await Gift.findOne({ _id: giftId, business: businessId });
        if (!gift) return res.status(404).json({ message: 'Hediye bulunamadı.' });

        const walletItem = await CustomerBusiness.findOne({ customer: customerId, business: businessId });
        if (!walletItem || walletItem.points < gift.pointCost) {
            return res.status(400).json({ message: 'Yetersiz puan.' });
        }

        // Generate 6-character alphanumeric code for easier manual entry
        const crypto = require('crypto');
        const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars

        const QRToken = require('../models/QRToken');
        await QRToken.create({
            token: code,
            user: customerId,
            business: businessId,
            type: 'gift_redemption',
            metadata: { giftId, pointCost: gift.pointCost, title: gift.title }
        });

        res.json({
            token: code,
            giftTitle: gift.title,
            pointCost: gift.pointCost,
            expiresIn: 300
        });
    } catch (err) {
        console.error("Prepare Redemption Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 7b. Verify Redemption (Check code & return details) - Business
exports.verifyRedemptionCode = async (req, res) => {
    try {
        const { token } = req.body;
        const businessId = req.user.id;

        const QRToken = require('../models/QRToken');
        const qrToken = await QRToken.findOne({
            token: token.toUpperCase(),
            business: businessId,
            type: 'gift_redemption',
            status: 'active'
        }).populate('user');

        if (!qrToken) {
            return res.status(404).json({ message: 'Geçersiz veya süresi dolmuş kod.' });
        }

        const { giftId, pointCost, title } = qrToken.metadata;
        const customer = qrToken.user;

        res.json({
            isValid: true,
            giftTitle: title,
            pointCost,
            customerName: `${customer.name} ${customer.surname}`,
            customerEmail: customer.email
        });
    } catch (err) {
        console.error("Verify Redemption Code Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 7c. Complete Redemption (Verify & Deduct) - Business
exports.completeRedemption = async (req, res) => {
    try {
        const { token } = req.body;
        const businessId = req.user.id;

        const QRToken = require('../models/QRToken');
        const qrToken = await QRToken.findOne({
            token: token.toUpperCase(),
            business: businessId,
            type: 'gift_redemption',
            status: 'active'
        }).populate('user');

        if (!qrToken) {
            return res.status(404).json({ message: 'Geçersiz veya süresi dolmuş kod (Tekrar kullanım veya zaman aşımı).' });
        }

        const { giftId, pointCost, title } = qrToken.metadata;
        const customerId = qrToken.user._id;

        // Re-check balance (Double spend prevention)
        const walletItem = await CustomerBusiness.findOne({ customer: customerId, business: businessId });
        if (!walletItem || walletItem.points < pointCost) {
            return res.status(400).json({ message: 'Müşterinin puanı artık yetersiz.' });
        }

        // Deduct Points
        walletItem.points -= pointCost;
        await walletItem.save();

        // Mark Token Used
        qrToken.status = 'used';
        await qrToken.save();

        // Record Transaction
        const tran = new Transaction({
            customer: customerId,
            business: businessId,
            type: 'gift_redemption',
            description: `Hediye Teslimi: ${title}`,
            pointsEarned: -pointCost,
            stampsEarned: 0
        });
        await tran.save();

        res.json({
            success: true,
            message: 'Hediye teslim edildi.',
            gift: title,
            customer: `${qrToken.user.name} ${qrToken.user.surname}`,
            remainingPoints: walletItem.points
        });

    } catch (err) {
        console.error("Complete Redemption Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Legacy direct redeem (optional, keeping for compatibility if needed, otherwise deprecate)
exports.redeemGift = async (req, res) => {
    // Legacy implementation removed to enforce secure flow
    res.status(410).json({ message: 'Lütfen yeni QR sistemini kullanın.' });
};
