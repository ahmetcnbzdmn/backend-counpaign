const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    settings: {
        pointsPerVisit: { type: Number, default: 10 },
        redemptionThreshold: { type: Number, default: 100 }
    },
    // Visual Identity Fields for Mobile App
    category: {
        type: String,
        default: 'Cafe' // Cafe, Restaurant, Clothing, etc.
    },
    logo: {
        type: String, // URL or Base64
        default: null
    },
    cardColor: {
        type: String, // Hex Code e.g., #EE2C2C
        default: '#EE2C2C'
    },
    cardIcon: {
        type: String, // Icon name matching Flutter Icons e.g., 'local_cafe'
        default: 'local_cafe_rounded'
    },
    // Location Fields
    city: {
        type: String,
        default: 'Ankara'
    },
    district: {
        type: String,
        default: ''
    },
    neighborhood: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to hash password
// Pre-save hook to hash password
businessSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
businessSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Business', businessSchema);
