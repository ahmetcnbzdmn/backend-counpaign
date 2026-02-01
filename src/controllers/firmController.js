const Business = require('../models/Business');
const Customer = require('../models/Customer');
const Campaign = require('../models/Campaign');

// Get all firms (for admin panel)
exports.getAllFirms = async (req, res) => {
    try {
        const firms = await Business.find().select('-password').sort({ createdAt: -1 });
        res.json(firms);
    } catch (error) {
        console.error('Get all firms error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get single firm by ID
exports.getFirmById = async (req, res) => {
    try {
        const firm = await Business.findById(req.params.id).select('-password');
        if (!firm) {
            return res.status(404).json({ error: 'Firma bulunamadı' });
        }
        res.json(firm);
    } catch (error) {
        console.error('Get firm by ID error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create new firm
exports.createFirm = async (req, res) => {
    try {
        console.log('📋 Request body:', req.body);
        console.log('📁 Uploaded file:', req.file);

        const { name, email, password } = req.body;

        // Parse settings from JSON string
        let settings = {};
        try {
            settings = req.body.settings ? JSON.parse(req.body.settings) : {};
        } catch (e) {
            console.log('Settings parse error:', e);
        }

        // Check if firm with email already exists
        const existingFirm = await Business.findOne({ email });
        if (existingFirm) {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor' });
        }

        // Logo URL from uploaded file
        const logoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const newFirm = new Business({
            companyName: name,
            email,
            password,
            category: settings.category || 'kafe',
            logo: logoUrl,
            cardColor: settings.cardColor || '#EE2C2C',
            cardIcon: settings.cardIcon || 'local_cafe_rounded',
            city: settings.city || 'Ankara',
            district: settings.district || '',
            neighborhood: settings.neighborhood || '',
            settings: {
                pointsPerVisit: 10,
                redemptionThreshold: 100
            }
        });

        await newFirm.save();

        // Return without password
        const firmData = newFirm.toObject();
        delete firmData.password;

        console.log('✅ Firm created:', name);
        res.status(201).json(firmData);
    } catch (error) {
        console.error('Create firm error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update firm
exports.updateFirm = async (req, res) => {
    try {
        const { companyName, email, category, logo, cardColor, cardIcon, city, district, neighborhood, settings } = req.body;

        const firm = await Business.findById(req.params.id);
        if (!firm) {
            return res.status(404).json({ error: 'Firma bulunamadı' });
        }

        // Update fields
        if (companyName) firm.companyName = companyName;
        if (email) firm.email = email;
        if (category) firm.category = category;
        if (logo !== undefined) firm.logo = logo;
        if (cardColor) firm.cardColor = cardColor;
        if (cardIcon) firm.cardIcon = cardIcon;
        if (city) firm.city = city;
        if (district !== undefined) firm.district = district;
        if (neighborhood !== undefined) firm.neighborhood = neighborhood;
        if (settings) firm.settings = { ...firm.settings, ...settings };

        await firm.save();

        const firmData = firm.toObject();
        delete firmData.password;

        res.json(firmData);
    } catch (error) {
        console.error('Update firm error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete firm
exports.deleteFirm = async (req, res) => {
    try {
        const firm = await Business.findById(req.params.id);
        if (!firm) {
            return res.status(404).json({ error: 'Firma bulunamadı' });
        }

        const CustomerBusiness = require('../models/CustomerBusiness');
        const QRToken = require('../models/QRToken');

        // 1. Delete all campaigns associated with this firm
        const deletedCampaigns = await Campaign.deleteMany({ businessId: req.params.id });
        console.log(`🗑️ Deleted ${deletedCampaigns.deletedCount} campaigns for firm: ${firm.companyName}`);

        // 2. Delete all CustomerBusiness relationships
        const deletedRelations = await CustomerBusiness.deleteMany({ business: req.params.id });
        console.log(`🗑️ Deleted ${deletedRelations.deletedCount} customer-business relationships`);

        // 3. Delete all QR tokens for this business
        const deletedQRTokens = await QRToken.deleteMany({ business: req.params.id });
        console.log(`🗑️ Deleted ${deletedQRTokens.deletedCount} QR tokens`);

        // 4. Remove this business from all customer rewards
        console.log(`🔍 Looking for customers with rewards for businessId: ${req.params.id}`);
        const customersWithRewards = await Customer.find({ 'rewards.businessId': req.params.id });
        console.log(`   Found ${customersWithRewards.length} customers with this firm's rewards`);

        const result = await Customer.updateMany(
            { 'rewards.businessId': req.params.id },
            { $pull: { rewards: { businessId: req.params.id } } }
        );
        console.log(`🗑️ Removed firm from ${result.modifiedCount} customer rewards`);

        // 5. Delete the firm itself
        await Business.findByIdAndDelete(req.params.id);

        console.log('✅ Firm deleted:', firm.companyName);
        res.json({
            message: 'Firma, ilişkili kampanyalar ve müşteri bağlantıları başarıyla silindi',
            details: {
                campaigns: deletedCampaigns.deletedCount,
                customerBusinessRelations: deletedRelations.deletedCount,
                qrTokens: deletedQRTokens.deletedCount,
                customerRewards: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Delete firm error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await Customer.countDocuments();
        const totalFirms = await Business.countDocuments();
        const totalCampaigns = await Campaign.countDocuments();
        const activeCampaigns = await Campaign.countDocuments({ endDate: { $gte: new Date() } });

        res.json({
            users: {
                total: totalUsers,
                new: 0 // You can implement this with a date filter if needed
            },
            firms: {
                total: totalFirms,
                active: totalFirms // All firms are considered active for now
            },
            campaigns: {
                total: totalCampaigns,
                active: activeCampaigns
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    }
};
