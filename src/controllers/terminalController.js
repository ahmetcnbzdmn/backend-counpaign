const Customer = require('../models/Customer');
const Business = require('../models/Business');

exports.processTransaction = async (req, res) => {
    try {
        const { customerId, amount } = req.body;
        // req.user contains the terminal information (id)
        // We need to find which business this terminal belongs to.

        // In a real app, we would look up the terminal details again or store businessId in the token.
        // For now, let's look up the terminal model itself to get the businessId
        const Terminal = require('../models/Terminal');
        const terminal = await Terminal.findById(req.user.id);

        if (!terminal) return res.status(404).json({ error: 'Terminal not found.' });
        if (!terminal.isActive) return res.status(403).json({ error: 'Terminal is inactive.' });

        const businessId = terminal.businessId;

        // Find the customer
        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ error: 'Customer not found.' });

        // Calculate points (Mock logic: 1 point per 10 currency units, default 10 points)
        const pointsToAdd = amount ? Math.floor(amount / 10) : 10;

        // Update customer rewards
        const rewardIndex = customer.rewards.findIndex(r => r.businessId.toString() === businessId.toString());

        if (rewardIndex > -1) {
            customer.rewards[rewardIndex].points += pointsToAdd;
            customer.rewards[rewardIndex].lastUpdated = Date.now();
        } else {
            customer.rewards.push({ businessId, points: pointsToAdd });
        }

        await customer.save();

        res.json({
            message: 'Transaction successful',
            pointsAdded: pointsToAdd,
            totalPoints: rewardIndex > -1 ? customer.rewards[rewardIndex].points : pointsToAdd
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
