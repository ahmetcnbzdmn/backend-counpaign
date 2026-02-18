const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    imageUrl: {
        type: String, // Full URL or relative path
        default: null
    },
    category: {
        type: String,
        enum: ['Sıcak Kahveler', 'Soğuk Kahveler', 'Sıcak İçecekler', 'Soğuk İçecekler', 'Tatlılar', 'Fırsatlar'],
        default: 'Sıcak Kahveler',
        required: true
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    discount: {
        type: Number, // TL discount amount
        default: 0,
        min: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
