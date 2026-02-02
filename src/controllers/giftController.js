const Gift = require('../models/Gift');
const CustomerBusiness = require('../models/CustomerBusiness');
const Transaction = require('../models/Transaction');

const QRToken = require('../models/QRToken');
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

// Update a gift (Business Only)
exports.updateGift = async (req, res) => {
    try {
        const { title, pointCost } = req.body;
        const businessId = req.user.id;
        const giftId = req.params.id;

        const gift = await Gift.findOne({ _id: giftId, business: businessId });
        if (!gift) {
            return res.status(404).json({ message: 'Hediye bulunamadı.' });
        }

        if (title) gift.title = title;
        if (pointCost !== undefined) gift.pointCost = pointCost;

        await gift.save();
        res.json(gift);
    } catch (err) {
        console.error("Update Gift Error:", err);
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
        const gifts = await Gift.find({ business: businessId }).sort({ pointCost: 1 }).lean();
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
        const { businessId, giftId, redemptionType } = req.body; // redemptionType: 'POINT' or 'GIFT_ENTITLEMENT'
        const customerId = req.user.id;

        let meta = {};
        const walletItem = await CustomerBusiness.findOne({ customer: customerId, business: businessId });

        if (!walletItem) return res.status(404).json({ message: 'Cüzdan bulunamadı.' });

        if (redemptionType === 'GIFT_ENTITLEMENT') {
            // Check if user has free gift rights (from stamps)
            if (!walletItem.giftsCount || walletItem.giftsCount < 1) {
                return res.status(400).json({ message: 'Hediye hakkınız bulunmuyor.' });
            }
            meta = {
                type: 'GIFT_ENTITLEMENT',
                title: 'Ücretsiz Hediye Hakkı',
                pointCost: 0
            };
        } else {
            // Default: Point Redemption
            const gift = await Gift.findOne({ _id: giftId, business: businessId });
            if (!gift) return res.status(404).json({ message: 'Hediye bulunamadı.' });

            if (walletItem.points < gift.pointCost) {
                return res.status(400).json({ message: 'Yetersiz puan.' });
            }
            meta = {
                type: 'POINT',
                giftId,
                pointCost: gift.pointCost,
                title: gift.title
            };
        }

        // Invalidate previous active tokens for this user & business & type
        // Invalidate previous active tokens for this user & business & type
        await QRToken.updateMany(
            {
                user: customerId,
                business: businessId,
                type: 'gift_redemption',
                status: 'active'
            },
            { status: 'expired' }
        );

        // Generate 6-character alphanumeric code
        const crypto = require('crypto');
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();


        await QRToken.create({
            token: code,
            user: customerId,
            business: businessId,
            type: 'gift_redemption',
            metadata: meta
        });

        res.json({
            token: code,
            ...meta,
            expiresIn: 300
        });
    } catch (err) {
        console.error("Prepare Redemption Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 7d. Cancel Redemption (Invalidate Code) - Customer
exports.cancelRedemption = async (req, res) => {
    try {
        const { token } = req.body;
        const customerId = req.user.id;

        const QRToken = require('../models/QRToken');
        await QRToken.updateMany(
            {
                token: token.toUpperCase(),
                user: customerId,
                status: 'active'
            },
            { status: 'cancelled' }
        );

        res.json({ message: 'Transaction cancelled successfully.' });
    } catch (err) {
        console.error("Cancel Redemption Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 7b. Verify Redemption (Check code & return details) - Business
exports.verifyRedemptionCode = async (req, res) => {
    try {
        const { token } = req.body;
        const businessId = req.user.id;


        const qrToken = await QRToken.findOne({
            token: token.toUpperCase(),
            business: businessId,
            type: 'gift_redemption',
            status: 'active'
        }).populate('user');

        if (!qrToken) {
            return res.status(404).json({ message: 'Geçersiz veya süresi dolmuş kod.' });
        }

        const { type, pointCost, title } = qrToken.metadata;
        const customer = qrToken.user;

        res.json({
            isValid: true,
            redemptionType: type || 'POINT', // 'POINT' or 'GIFT_ENTITLEMENT'
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


        const qrToken = await QRToken.findOne({
            token: token.toUpperCase(),
            business: businessId,
            type: 'gift_redemption',
            status: 'active'
        }).populate('user');

        if (!qrToken) {
            return res.status(404).json({ message: 'Geçersiz kod.' });
        }

        const { type, pointCost, title } = qrToken.metadata;
        const customerId = qrToken.user._id;

        const walletItem = await CustomerBusiness.findOne({ customer: customerId, business: businessId });
        if (!walletItem) return res.status(404).json({ message: 'Cüzdan bulunamadı.' });

        // DEDUCTION LOGIC
        if (type === 'GIFT_ENTITLEMENT') {
            if (walletItem.giftsCount < 1) {
                return res.status(400).json({ message: 'Müşterinin hediye hakkı kalmamış.' });
            }
            walletItem.giftsCount -= 1;
        } else {
            // Default: Points
            if (walletItem.points < pointCost) {
                return res.status(400).json({ message: 'Müşterinin puanı yetersiz.' });
            }
            walletItem.points -= pointCost;
        }

        await walletItem.save();

        qrToken.status = 'used';
        await qrToken.save();

        // Record Transaction
        const tran = new Transaction({
            customer: customerId,
            business: businessId,
            type: 'gift_redemption',
            category: 'HARCAMA', // Explicitly set enum value
            description: type === 'GIFT_ENTITLEMENT' ? 'Free Gift Entitlement Used' : `Gift Redemption: ${title}`,
            pointsEarned: type === 'GIFT_ENTITLEMENT' ? 0 : -pointCost,
            stampsEarned: 0
        });
        await tran.save();

        res.json({
            success: true,
            message: 'Teslimat onaylandı.',
            gift: title,
            customer: `${qrToken.user.name} ${qrToken.user.surname}`,
            redemptionType: type
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
