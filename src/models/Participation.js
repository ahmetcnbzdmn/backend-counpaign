const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    status: {
        type: String,
        enum: ['JOINED', 'WON', 'COMPLETED'],
        default: 'JOINED'
    },
    wonAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a customer can only join a specific campaign once per cycle (for now, unique per campaign)
participationSchema.index({ customer: 1, campaign: 1 }, { unique: true });

module.exports = mongoose.model('Participation', participationSchema);
