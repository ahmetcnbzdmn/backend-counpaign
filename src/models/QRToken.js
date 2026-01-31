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
        required: true
    },
    type: {
        type: String,
        enum: ['login', 'payment', 'campaign'],
        default: 'login'
    },
    status: {
        type: String,
        enum: ['active', 'used', 'expired'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // 5 minutes TTL (Optional, user didn't specify, but typical for QR tokens)
    }
});

module.exports = mongoose.model('QRToken', qrTokenSchema);
