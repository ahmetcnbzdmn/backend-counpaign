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
                redemptionThreshold: 100,
                stampsTarget: settings.stampsTarget || 6
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

        // 1.1 Delete all participations for this business
        const Participation = require('../models/Participation');
        const deletedParticipations = await Participation.deleteMany({ business: req.params.id });
        console.log(`🗑️ Deleted ${deletedParticipations.deletedCount} participations`);

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

        // 5. Delete all gifts for this business
        const Gift = require('../models/Gift');
        const deletedGifts = await Gift.deleteMany({ business: req.params.id });
        console.log(`🗑️ Deleted ${deletedGifts.deletedCount} gifts`);

        // 6. Delete all transactions for this business
        const Transaction = require('../models/Transaction');
        const deletedTransactions = await Transaction.deleteMany({ business: req.params.id });
        console.log(`🗑️ Deleted ${deletedTransactions.deletedCount} transactions`);

        // 7. Delete all reviews for this business
        const Review = require('../models/Review');
        const deletedReviews = await Review.deleteMany({ business: req.params.id });
        console.log(`🗑️ Deleted ${deletedReviews.deletedCount} reviews`);

        // 8. Delete the firm itself
        await Business.findByIdAndDelete(req.params.id);

        console.log('✅ Firm deleted:', firm.companyName);
        res.json({
            message: 'Firma, ilişkili kampanyalar, hediyeler, işlemler ve müşteri bağlantıları başarıyla silindi',
            details: {
                campaigns: deletedCampaigns.deletedCount,
                participations: deletedParticipations.deletedCount,
                customerBusinessRelations: deletedRelations.deletedCount,
                qrTokens: deletedQRTokens.deletedCount,
                gifts: deletedGifts.deletedCount,
                transactions: deletedTransactions.deletedCount,
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
        const Transaction = require('../models/Transaction');
        const Participation = require('../models/Participation');

        const totalUsers = await Customer.countDocuments();
        const totalFirms = await Business.countDocuments();
        const totalCampaigns = await Campaign.countDocuments();
        const activeCampaigns = await Campaign.countDocuments({ endDate: { $gte: new Date() } });

        // Transactions
        const totalTransactions = await Transaction.countDocuments();

        // Simple mock chart for now (or calculate real last 7 days)
        // For stability, returning empty chart array is safer than code that might fail
        const transactionChart = [];

        // Participations
        const totalParticipations = await Participation.countDocuments();

        // ... (previous code)

        res.json({
            users: {
                total: totalUsers,
                today: 0
            },
            firms: {
                total: totalFirms,
                month: 0
            },
            campaigns: {
                total: totalCampaigns,
                active: activeCampaigns
            },
            transactions: {
                total: totalTransactions,
                today: 0,
                chart: transactionChart
            },
            participations: {
                total: totalParticipations,
                won: 0
            },
            rewards: {
                points: { earned: 0, spent: 0 },
                stamps: { earned: 0, spent: 0 }
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get stats for a specific firm (Business Dashboard)
exports.getFirmStats = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.status(400).json({ error: 'Business ID required' });

        const CustomerBusiness = require('../models/CustomerBusiness');
        const Participation = require('../models/Participation');
        const Transaction = require('../models/Transaction');

        // 1. Customer Count (Wallet Adds)
        const totalCustomers = await CustomerBusiness.countDocuments({ business: businessId });

        // 2. Participations
        const totalParticipations = await Participation.countDocuments({ businessId });

        // 3. Transactions (Mocked daily/monthly for now)
        const totalTransactions = await Transaction.countDocuments({ business: businessId });

        // 4. Mock Charts Data (Empty arrays to prevent frontend crash)
        const walletAdsChart = [];
        const transactionsChart = [];

        res.json({
            customers: { total: totalCustomers },
            participations: { total: totalParticipations },
            transactions: {
                daily: 0,
                monthly: totalTransactions
            },
            rewards: {
                weeklyPoints: 0,
                weeklyStamps: 0,
                weeklyCoffee: 0
            },
            charts: {
                walletAdds: walletAdsChart,
                transactions: transactionsChart
            }
        });

    } catch (error) {
        console.error('Get firm stats error:', error);
        res.status(500).json({ error: error.message });
    }
};
