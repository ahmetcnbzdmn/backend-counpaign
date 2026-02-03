const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true,
        trim: true
    },
    targetCustomer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null
    },
    targetBusiness: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        default: null
    },
    type: {
        type: String,
        enum: ['USER', 'BUSINESS', 'ALL_USERS', 'ALL_BUSINESSES', 'SYSTEM'],
        default: 'SYSTEM'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
