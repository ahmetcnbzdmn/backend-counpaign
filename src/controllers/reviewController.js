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

exports.getPendingReviews = async (req, res) => {
    try {
        const transactions = await Transaction.find({
            customer: req.user.id,
            review: { $exists: false }
        })
            .populate('business', 'companyName logo cardColor')
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (err) {
        console.error("Get Pending Reviews Error:", err);
        res.status(500).json({ message: 'Bekleyen değerlendirmeler alınamadı.' });
    }
};
// Get all reviews (Super Admin) - Full details
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('business', 'companyName logo')
            .populate('customer', 'name surname email profileImage')
            .sort({ createdAt: -1 });

        const reviewsWithFlag = reviews.map(r => ({
            ...r.toObject(),
            isAnonymous: false
        }));

        res.json(reviewsWithFlag);
    } catch (err) {
        console.error("Get All Reviews Error:", err);
        res.status(500).json({ message: 'Değerlendirmeler alınamadı.' });
    }
};

// Get firm reviews (Firm Admin) - Anonymous
exports.getFirmReviews = async (req, res) => {
    try {
        // For 'business' role, the user ID in the token IS the business ID.
        // For other roles (if we support managers later), it might be separate.
        const businessId = req.user.role === 'business' ? req.user.id : req.user.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'İşletme kimliği bulunamadı.' });
        }

        const reviews = await Review.find({ business: businessId })
            .populate('customer', 'username') // Fetch username to mask it? Or just don't populate?
            .select('-transaction') // Hide transaction link
            .sort({ createdAt: -1 });

        // Transform for anonymity
        const anonymousReviews = reviews.map(r => ({
            _id: r._id,
            rating: r.rating,
            comment: r.comment,
            // Mask User
            customer: { name: 'Anonim', surname: '' },
            // Mask Date (Optional: show "Recent" or just hide exact time)
            createdAt: r.createdAt,
            isAnonymous: true
        }));

        res.json(anonymousReviews);
    } catch (err) {
        console.error("Get Firm Reviews Error:", err);
        res.status(500).json({ message: 'Değerlendirmeler alınamadı.' });
    }
};
// Delete Review (Super Admin Only)
exports.deleteReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ message: 'Değerlendirme bulunamadı.' });
        }

        // Unlink from transaction
        if (review.transaction) {
            await Transaction.findByIdAndUpdate(review.transaction, { $unset: { review: 1 } });
        }

        await Review.findByIdAndDelete(reviewId);

        res.json({ message: 'Değerlendirme başarıyla silindi.' });
    } catch (err) {
        console.error("Delete Review Error:", err);
        res.status(500).json({ message: 'Değerlendirme silinemedi.' });
    }
};
