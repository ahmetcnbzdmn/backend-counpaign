const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'adminModel'
    },
    adminModel: {
        type: String,
        required: true,
        enum: ['Admin', 'Business']
    },
    action: {
        type: String, // e.g., 'CONFIRM_PARTICIPATION', 'DELETE_USER', 'ADD_GIFT'
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false // Optional, some actions might not target a specific document
    },
    targetModel: {
        type: String,
        required: false // E.g., 'Customer', 'Transaction', 'QRToken'
    },
    oldData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    newData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create index for faster queries by admin or action
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
