const mongoose = require('mongoose');

const customerBusinessSchema = new mongoose.Schema({
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
    points: {
        type: Number,
        default: 0
    },
    stamps: {
        type: Number,
        default: 0
    },
    stampsTarget: {
        type: Number,
        default: 6
    },
    giftsCount: {
        type: Number,
        default: 0
    },
    totalVisits: {
        type: Number,
        default: 0
    },
    orderIndex: {
        type: Number,
        default: 0
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure unique relationship
customerBusinessSchema.index({ customer: 1, business: 1 }, { unique: true });

module.exports = mongoose.model('CustomerBusiness', customerBusinessSchema);
