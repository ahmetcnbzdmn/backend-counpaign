const Review = require('../models/Review');
const Transaction = require('../models/Transaction');

exports.createReview = async (req, res) => {
    const { transactionId, businessId, rating, comment } = req.body;
    const customerId = req.user.id;

    if (!transactionId || !businessId || !rating) {
        return res.status(400).json({ message: 'Eksik bilgi.' });
    }

    try {
        // 1. Check if transaction exists and belongs to user
        const transaction = await Transaction.findOne({
            _id: transactionId,
            customer: customerId
        });

        if (!transaction) {
            return res.status(404).json({ message: 'İşlem bulunamadı.' });
        }

        // 2. Check if already reviewed
        if (transaction.review) {
            return res.status(400).json({ message: 'Bu işlem zaten değerlendirilmiş.' });
        }

        // 3. Create Review
        const newReview = new Review({
            customer: customerId,
            business: businessId,
            transaction: transactionId,
            rating,
            comment
        });

        await newReview.save();

        // 4. Update Transaction with Review ID
        transaction.review = newReview._id;
        await transaction.save();

        res.status(201).json({ message: 'Değerlendirme kaydedildi.', data: newReview });

    } catch (err) {
        console.error("Create Review Error:", err);
        res.status(500).json({ message: 'Değerlendirme yapılamadı.' });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ customer: req.user.id })
            .populate('business', 'companyName logo cardColor')
            .sort({ createdAt: -1 }); // Newest first

        res.json(reviews);
    } catch (err) {
        console.error("Get Reviews Error:", err);
        res.status(500).json({ message: 'Değerlendirmeler alınamadı.' });
    }
};
