const Campaign = require('../models/Campaign');

// @desc    Create a new campaign
// @route   POST /api/campaigns
// @access  Private (Business only)
exports.createCampaign = async (req, res) => {
    try {
        const {
            title,
            shortDescription,
            headerImage,
            content,
            rewardType,
            rewardValue,
            rewardValidityDays,
            icon,
            isPromoted,
            displayOrder,
            startDate,
            endDate
        } = req.body;

        // Ensure businessId comes from the authenticated business
        const businessId = req.user.id;

        const campaign = new Campaign({
            businessId,
            title,
            shortDescription,
            headerImage,
            content,
            rewardType,
            rewardValue,
            rewardValidityDays,
            icon,
            isPromoted,
            displayOrder,
            startDate,
            endDate
        });

        await campaign.save();

        res.status(201).json({
            message: 'Campaign created successfully',
            campaign
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create campaign', details: err.message });
    }
};

// @desc    Get all campaigns for a specific business
// @route   GET /api/campaigns/business/:businessId
// @access  Public
exports.getCampaignsByBusiness = async (req, res) => {
    try {
        const { businessId } = req.params;

        const campaigns = await Campaign.find({ businessId })
            .sort({ displayOrder: 1, createdAt: -1 });

        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch campaigns', details: err.message });
    }
};

// @desc    Get ALL campaigns (Global Feed)
// @route   GET /api/campaigns
// @access  Public
exports.getAllCampaigns = async (req, res) => {
    try {
        // Fetch all campaigns, sort by newest
        // We populate business details so frontend can display Company Name & Color
        const campaigns = await Campaign.find({})
            .sort({ createdAt: -1 });

        // If we can't populate because of Schema definition, frontend might need to fetch businesses.
        // But let's try to return them.
        // Assuming strict schema is not enforcing ref check failure on find if not populated.
        // Actually, without populate, we just get businessId.

        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch all campaigns', details: err.message });
    }
};

// @desc    Update a campaign
// @route   PATCH /api/campaigns/:id
// @access  Private (Business only)
exports.updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.id; // From authMiddleware

        // Find campaign and ensure it belongs to the business
        const campaign = await Campaign.findOne({ _id: id, businessId });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found or unauthorized' });
        }

        const updates = Object.keys(req.body);
        updates.forEach((update) => (campaign[update] = req.body[update]));

        await campaign.save();

        res.json({
            message: 'Campaign updated successfully',
            campaign
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update campaign', details: err.message });
    }
};

// @desc    Delete a campaign
// @route   DELETE /api/campaigns/:id
// @access  Private (Business only)
exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.id;

        const campaign = await Campaign.findOneAndDelete({ _id: id, businessId });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found or unauthorized' });
        }

        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete campaign', details: err.message });
    }
};
