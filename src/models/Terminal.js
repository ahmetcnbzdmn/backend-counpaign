const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const terminalSchema = new mongoose.Schema({
    terminalName: {
        type: String,
        required: true,
        trim: true
    },
    terminalId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String, // PIN or Password for the device login
        required: true
    },
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to hash password (PIN)
// Pre-save hook to hash password (PIN)
terminalSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
terminalSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Terminal', terminalSchema);
