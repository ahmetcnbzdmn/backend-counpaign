const mongoose = require('mongoose');

const qrTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: false // Optional for business tokens
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: false // For business-generated QR codes
    },
    type: {
        type: String,
        enum: ['login', 'payment', 'campaign', 'business_scan', 'gift_redemption'],
        default: 'login'
    },
    status: {
        type: String,
        enum: ['active', 'scanned', 'used', 'expired', 'cancelled'],
        default: 'active'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // Flexible metadata (e.g., giftId)
        default: {}
    },
    scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // Increased to 5 minutes (300s) for better UX
    }
});

module.exports = mongoose.model('QRToken', qrTokenSchema);
