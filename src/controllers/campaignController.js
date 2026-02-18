const Campaign = require('../models/Campaign');
const Product = require('../models/Product');

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
            icon,
            isPromoted,
            displayOrder,
            startDate,
            endDate,
            menuItems,
            discountAmount,
            reflectToMenu,
            bundleName
        } = req.body;

        // Use businessId from request body (admin panel sends it)
        // or from authenticated user if not provided
        const finalBusinessId = businessId || req.user?.id;

        if (!finalBusinessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        // Image URL from uploaded file
        const headerImage = req.file ? `/uploads/${req.file.filename}` : null;

        // Parse menuItems if it's a JSON string
        let parsedMenuItems = [];
        if (menuItems) {
            try {
                parsedMenuItems = typeof menuItems === 'string' ? JSON.parse(menuItems) : menuItems;
            } catch (e) {
                console.warn('Failed to parse menuItems:', e);
            }
        }

        const campaign = new Campaign({
            businessId: finalBusinessId,
            title,
            shortDescription,
            headerImage,
            content,
            icon,
            isPromoted: isPromoted === 'true' || isPromoted === true,
            displayOrder: parseInt(displayOrder) || 0,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : new Date(),
            menuItems: parsedMenuItems,
            discountAmount: parseFloat(discountAmount) || 0,
            reflectToMenu: reflectToMenu === 'true' || reflectToMenu === true,
            bundleName: bundleName || ''
        });

        await campaign.save();

        // If reflectToMenu is true, create a Product in "Fırsatlar" category
        if (campaign.reflectToMenu && parsedMenuItems.length > 0) {
            const totalPrice = parsedMenuItems.reduce((sum, item) => sum + (item.price || 0), 0);
            const productName = campaign.bundleName || parsedMenuItems.map(i => i.productName).join(' + ');

            await Product.create({
                business: finalBusinessId,
                name: productName,
                description: campaign.shortDescription,
                price: totalPrice,
                discount: campaign.discountAmount || 0,
                category: 'Fırsatlar',
                isPopular: false,
                isAvailable: true,
                campaignId: campaign._id,
                imageUrl: headerImage
            });
            console.log('🎁 Fırsatlar menu item created for campaign:', title);
        }

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
        const campaigns = await Campaign.find({})
            .sort({ createdAt: -1 });

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

        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Parse menuItems if provided
        if (req.body.menuItems) {
            try {
                req.body.menuItems = typeof req.body.menuItems === 'string'
                    ? JSON.parse(req.body.menuItems)
                    : req.body.menuItems;
            } catch (e) {
                console.warn('Failed to parse menuItems on update:', e);
            }
        }

        // Update fields from request body
        const updates = Object.keys(req.body);
        updates.forEach((update) => {
            if (update === 'displayOrder') {
                campaign[update] = parseInt(req.body[update]);
            } else if (update === 'discountAmount') {
                campaign[update] = parseFloat(req.body[update]) || 0;
            } else if (update === 'isPromoted' || update === 'reflectToMenu') {
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

        // Handle "Fırsatlar" product sync
        // Delete old product first
        await Product.deleteOne({ campaignId: campaign._id });

        // If reflectToMenu is true, create new product
        if (campaign.reflectToMenu && campaign.menuItems && campaign.menuItems.length > 0) {
            const totalPrice = campaign.menuItems.reduce((sum, item) => sum + (item.price || 0), 0);
            const productName = campaign.bundleName || campaign.menuItems.map(i => i.productName).join(' + ');

            await Product.create({
                business: campaign.businessId,
                name: productName,
                description: campaign.shortDescription,
                price: totalPrice,
                discount: campaign.discountAmount || 0,
                category: 'Fırsatlar',
                isPopular: false,
                isAvailable: true,
                campaignId: campaign._id,
                imageUrl: campaign.headerImage
            });
            console.log('🎁 Fırsatlar menu item updated for campaign:', campaign.title);
        }

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

        // Delete linked "Fırsatlar" product if it exists
        await Product.deleteOne({ campaignId: campaign._id });

        // Delete the campaign itself
        await Campaign.findByIdAndDelete(id);

        console.log('✅ Campaign deleted:', campaign.title);
        res.json({
            message: 'Campaign deleted successfully'
        });
    } catch (err) {
        console.error('Delete campaign error:', err);
        res.status(500).json({ error: 'Failed to delete campaign', details: err.message });
    }
};
