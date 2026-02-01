const Gift = require('../models/Gift');
const CustomerBusiness = require('../models/CustomerBusiness');
const Transaction = require('../models/Transaction');

// Create a new gift (Business Only)
exports.createGift = async (req, res) => {
    try {
        const { title, pointCost } = req.body;
        const businessId = req.user.userId;

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
        const businessId = req.user.userId;
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
        const businessId = req.user.userId;
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
exports.redeemGift = async (req, res) => {
    try {
        const { businessId, giftId } = req.body;
        const customerId = req.user.id;

        // 1. Validate Gift
        const gift = await Gift.findOne({ _id: giftId, business: businessId });
        if (!gift) {
            return res.status(404).json({ message: 'Hediye bulunamadı.' });
        }

        // 2. Validate Customer Balance
        const walletItem = await CustomerBusiness.findOne({
            customer: customerId,
            business: businessId
        });

        if (!walletItem) {
            return res.status(404).json({ message: 'Bu işletme cüzdanınızda ekli değil.' });
        }

        if (walletItem.points < gift.pointCost) {
            return res.status(400).json({ message: 'Yetersiz puan.' });
        }

        // 3. Deduct Points
        walletItem.points -= gift.pointCost;
        await walletItem.save();

        // 4. Record Transaction
        const transaction = new Transaction({
            customer: customerId,
            business: businessId,
            type: 'gift_redemption',
            description: `Hediye Kullanımı: ${gift.title}`,
            pointsEarned: -gift.pointCost, // Negative for redemption
            stampsEarned: 0
        });
        await transaction.save();

        res.json({
            message: 'Hediye kullanımı başarılı.',
            remainingPoints: walletItem.points,
            giftTitle: gift.title
        });

    } catch (err) {
        console.error("Redeem Gift Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};
