const express = require('express');
const router = express.Router();
const CustomerBusiness = require('../models/CustomerBusiness');
const Transaction = require('../models/Transaction');
const Business = require('../models/Business');
const authMiddleware = require('../middleware/authMiddleware');

// Process a stamp (Mocking the Merchant scan)
router.post('/process', async (req, res) => {
    try {
        const { customerId, businessId, type = 'STAMP', value = 1 } = req.body;

        if (!customerId || !businessId) {
            return res.status(400).json({ error: 'customerId and businessId are required' });
        }

        // 1. Find or Create Relationship
        let cb = await CustomerBusiness.findOne({ customer: customerId, business: businessId });

        if (!cb) {
            cb = new CustomerBusiness({
                customer: customerId,
                business: businessId,
                stamps: 0,
                giftsCount: 0
            });
        }

        // 2. Logic based on type
        if (type === 'STAMP') {
            cb.stamps += 1;
            cb.totalVisits += 1;

            // Check if reward reached
            if (cb.stamps >= cb.stampsTarget) {
                cb.giftsCount += 1;
                cb.stamps = 0; // Reset counter
            }
        } else if (type === 'GIFT_REDEEM') {
            if (cb.giftsCount > 0) {
                cb.giftsCount -= 1;
            } else {
                return res.status(400).json({ error: 'No gifts available to redeem' });
            }
        } else if (type === 'POINT') {
            cb.points += Number(value);
        }

        await cb.save();

        // 3. Log Transaction
        const transaction = new Transaction({
            customer: customerId,
            business: businessId,
            type: type,
            category: type === 'GIFT_REDEEM' ? 'HARCAMA' : 'KAZANIM',
            value: Number(value),
            status: 'COMPLETED'
        });
        await transaction.save();

        res.json({
            message: 'Transaction processed successfully',
            stamps: cb.stamps,
            stampsTarget: cb.stampsTarget,
            giftsCount: cb.giftsCount,
            points: cb.points,
            totalVisits: cb.totalVisits
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during transaction processing' });
    }
});

// Get transaction history for a specific business
router.get('/history/:businessId', authMiddleware, async (req, res) => {
    try {
        const { businessId } = req.params;
        const customerId = req.user.id; // From authMiddleware

        const transactions = await Transaction.find({
            customer: customerId,
            business: businessId
        }).sort({ createdAt: -1 }); // Newest first

        console.log(`[DEBUG] History Fetch - Customer: ${customerId}, Business: ${businessId}, Found: ${transactions.length} items`);

        res.json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error while fetching transaction history' });
    }
});

module.exports = router;
