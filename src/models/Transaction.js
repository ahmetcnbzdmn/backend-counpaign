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
        enum: ['STAMP', 'POINT', 'GIFT_REDEEM', 'gift_redemption'], // Added gift_redemption
        required: true
    },
    category: {
        type: String,
        // Allow dynamic categories or expand this enum. 
        // Admin panel logic sends data that might not fit 'KAZANIM' or 'HARCAMA' strictly if not mapped.
        // Assuming 'HARCAMA' covers redemption.
        enum: ['KAZANIM', 'HARCAMA'],
        required: true
    },
    value: {
        type: Number,
        default: 0 // Changed default to 0 as pointsEarned handles value
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
    },
    // New fields for detailed history
    pointsEarned: {
        type: Number,
        default: 0
    },
    stampsEarned: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
