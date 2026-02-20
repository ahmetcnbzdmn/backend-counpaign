const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['Customer', 'Admin', 'Business']
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdByIp: {
        type: String,
        default: ''
    },
    revoked: {
        type: Date
    },
    replacedByToken: {
        type: String
    }
});

// Create an index to automatically remove expired tokens from the DB
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual to check if token is expired or revoked
refreshTokenSchema.virtual('isExpired').get(function () {
    return Date.now() >= this.expiresAt;
});

refreshTokenSchema.virtual('isActive').get(function () {
    return !this.revoked && !this.isExpired;
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
