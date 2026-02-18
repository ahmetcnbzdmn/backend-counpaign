const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    shortDescription: {
        type: String,
        required: true,
        trim: true
    },
    headerImage: {
        type: String, // URL or Base64
        default: null
    },
    content: {
        type: String,
        required: true
    },
    // Menu integration fields
    menuItems: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        productName: String,
        price: Number
    }],
    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    reflectToMenu: {
        type: Boolean,
        default: false
    },
    bundleName: {
        type: String,
        trim: true,
        default: ''
    },
    icon: {
        type: String, // Flutter Icon name
        default: 'star_rounded'
    },
    isPromoted: {
        type: Boolean,
        default: false // Whether to show in Cafe page header
    },
    displayOrder: {
        type: Number,
        default: 0 // For custom sorting
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries by business
campaignSchema.index({ businessId: 1, displayOrder: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
