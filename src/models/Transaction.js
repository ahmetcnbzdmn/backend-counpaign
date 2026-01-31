const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    type: {
        type: String,
        enum: ['STAMP', 'POINT', 'GIFT_REDEEM'],
        required: true
    },
    category: {
        type: String,
        enum: ['KAZANIM', 'HARCAMA'],
        required: true
    },
    value: {
        type: Number,
        default: 1 // 1 stamp, 10 points etc.
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
        default: 'COMPLETED'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
