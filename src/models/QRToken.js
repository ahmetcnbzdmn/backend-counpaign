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
        enum: ['login', 'payment', 'campaign', 'business_scan'],
        default: 'login'
    },
    status: {
        type: String,
        enum: ['active', 'scanned', 'used', 'expired'],
        default: 'active'
    },
    scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 // 60 seconds TTL for business QR tokens
    }
});

module.exports = mongoose.model('QRToken', qrTokenSchema);
