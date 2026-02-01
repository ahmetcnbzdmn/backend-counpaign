const Campaign = require('../models/Campaign');

// @desc    Create a new campaign
// @route   POST /api/campaigns
// @access  Private (Business only)
exports.createCampaign = async (req, res) => {
    try {
        console.log('📋 Campaign Request body:', req.body);
        console.log('📁 Campaign Uploaded file:', req.file);

        const {
            businessId,
            title,
            shortDescription,
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

        // Use businessId from request body (admin panel sends it)
        // or from authenticated user if not provided
        const finalBusinessId = businessId || req.user?.id;

        if (!finalBusinessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        // Image URL from uploaded file
        const headerImage = req.file ? `/uploads/${req.file.filename}` : null;

        const campaign = new Campaign({
            businessId: finalBusinessId,
            title,
            shortDescription,
            headerImage,
            content,
            rewardType,
            rewardValue: parseInt(rewardValue),
            rewardValidityDays: parseInt(rewardValidityDays),
            icon,
            isPromoted: isPromoted === 'true' || isPromoted === true,
            displayOrder: parseInt(displayOrder) || 0,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : new Date()
        });

        await campaign.save();

        console.log('✅ Campaign created:', title);
        res.status(201).json({
            message: 'Campaign created successfully',
            campaign
        });
    } catch (err) {
        console.error('Campaign creation error:', err);
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

        console.log('✏️ Update campaign request:', id);
        console.log('   Body:', req.body);
        console.log('   File:', req.file);

        // Find campaign (no businessId restriction for admin panel)
        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Update fields from request body
        const updates = Object.keys(req.body);
        updates.forEach((update) => {
            if (update === 'rewardValue' || update === 'rewardValidityDays' || update === 'displayOrder') {
                campaign[update] = parseInt(req.body[update]);
            } else if (update === 'isPromoted') {
                campaign[update] = req.body[update] === 'true' || req.body[update] === true;
            } else if (update === 'startDate' || update === 'endDate') {
                campaign[update] = new Date(req.body[update]);
            } else {
                campaign[update] = req.body[update];
            }
        });

        // Update header image if new file uploaded
        if (req.file) {
            campaign.headerImage = `/uploads/${req.file.filename}`;
        }

        await campaign.save();

        console.log('✅ Campaign updated:', campaign.title);
        res.json({
            message: 'Campaign updated successfully',
            campaign
        });
    } catch (err) {
        console.error('Update campaign error:', err);
        res.status(500).json({ error: 'Failed to update campaign', details: err.message });
    }
};

// @desc    Delete a campaign
// @route   DELETE /api/campaigns/:id
// @access  Private (Business only)
exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Delete campaign request:', id);
        console.log('   User:', req.user);

        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Delete all participations associated with this campaign (CASCADE DELETE)
        const Participation = require('../models/Participation');
        const deletedParticipations = await Participation.deleteMany({ campaign: id });
        console.log(`🗑️ Deleted ${deletedParticipations.deletedCount} participations for campaign: ${campaign.title}`);

        // Delete the campaign itself
        await Campaign.findByIdAndDelete(id);

        console.log('✅ Campaign deleted:', campaign.title);
        res.json({
            message: 'Campaign and participations deleted successfully',
            details: {
                participations: deletedParticipations.deletedCount
            }
        });
    } catch (err) {
        console.error('Delete campaign error:', err);
        res.status(500).json({ error: 'Failed to delete campaign', details: err.message });
    }
};
