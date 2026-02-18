const Business = require('../models/Business');
const Customer = require('../models/Customer');
const Campaign = require('../models/Campaign');
const crypto = require('crypto');

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

        // Auto-generate permanent QR token for this firm
        const staticQR = crypto.randomBytes(32).toString('hex');

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
            staticQR,
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

        // 8. Delete all notifications for this business
        const Notification = require('../models/Notification');
        // Delete business notifications
        const deletedBusinessNotifications = await Notification.deleteMany({ targetBusiness: req.params.id });
        console.log(`🗑️ Deleted ${deletedBusinessNotifications.deletedCount} business notifications`);

        // Delete user notifications where title is the firm's name
        const deletedUserNotifications = await Notification.deleteMany({ type: 'USER', title: firm.companyName });
        console.log(`🗑️ Deleted ${deletedUserNotifications.deletedCount} user notifications with firm title`);

        const deletedNotifications = deletedBusinessNotifications.deletedCount + deletedUserNotifications.deletedCount;

        // 9. Delete all products for this business
        const Product = require('../models/Product');
        const fs = require('fs');
        const path = require('path');

        // Find products to delete images first
        const productsToDelete = await Product.find({ business: req.params.id });
        let deletedImagesCount = 0;

        for (const product of productsToDelete) {
            if (product.imageUrl) {
                const imagePath = path.join(__dirname, '../../', product.imageUrl);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        deletedImagesCount++;
                    } catch (err) {
                        console.error(`Failed to delete image: ${imagePath}`, err);
                    }
                }
            }
        }

        const deletedProducts = await Product.deleteMany({ business: req.params.id });
        console.log(`🗑️ Deleted ${deletedProducts.deletedCount} products and ${deletedImagesCount} images`);

        // 10. Delete the firm itself
        await Business.findByIdAndDelete(req.params.id);

        console.log('✅ Firm deleted:', firm.companyName);
        res.json({
            message: 'Firma, ilişkili kampanyalar, hediyeler, ürünler, işlemler, bildirimler ve müşteri bağlantıları başarıyla silindi',
            details: {
                campaigns: deletedCampaigns.deletedCount,
                customerBusinessRelations: deletedRelations.deletedCount,
                qrTokens: deletedQRTokens.deletedCount,
                gifts: deletedGifts.deletedCount,
                products: deletedProducts.deletedCount,
                transactions: deletedTransactions.deletedCount,
                reviews: deletedReviews.deletedCount,
                notifications: deletedNotifications.deletedCount,
                customerRewards: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Delete firm error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Generate static QR for an existing firm (for firms without one)
exports.generateStaticQR = async (req, res) => {
    try {
        const firm = await Business.findById(req.params.id);
        if (!firm) {
            return res.status(404).json({ error: 'Firma bulunamadı' });
        }

        if (firm.staticQR) {
            return res.status(400).json({ error: 'Bu firma zaten bir QR koduna sahip', staticQR: firm.staticQR });
        }

        const staticQR = crypto.randomBytes(32).toString('hex');
        firm.staticQR = staticQR;
        await firm.save();

        console.log(`✅ Static QR generated for firm: ${firm.companyName}`);
        res.json({ staticQR, companyName: firm.companyName });
    } catch (error) {
        console.error('Generate static QR error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get static QR for a firm
exports.getStaticQR = async (req, res) => {
    try {
        const firm = await Business.findById(req.params.id).select('staticQR companyName');
        if (!firm) {
            return res.status(404).json({ error: 'Firma bulunamadı' });
        }

        if (!firm.staticQR) {
            return res.status(404).json({ error: 'Bu firma için QR kodu oluşturulmamış' });
        }

        res.json({ staticQR: firm.staticQR, companyName: firm.companyName });
    } catch (error) {
        console.error('Get static QR error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const Transaction = require('../models/Transaction');
        const Notification = require('../models/Notification');
        const Review = require('../models/Review');
        const Gift = require('../models/Gift');

        // Date helpers
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Users
        const totalUsers = await Customer.countDocuments();
        const usersToday = await Customer.countDocuments({ createdAt: { $gte: todayStart } });

        // Firms
        const totalFirms = await Business.countDocuments();
        const firmsThisMonth = await Business.countDocuments({ createdAt: { $gte: monthStart } });

        // Campaigns
        const totalCampaigns = await Campaign.countDocuments();
        const activeCampaigns = await Campaign.countDocuments({
            endDate: { $gte: now },
            startDate: { $lte: now }
        });

        // Transactions
        const totalTransactions = await Transaction.countDocuments();
        const transactionsToday = await Transaction.countDocuments({ createdAt: { $gte: todayStart } });

        // Transaction chart (last 7 days)
        const transactionChart = [];
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const count = await Transaction.countDocuments({
                createdAt: { $gte: dayStart, $lt: dayEnd }
            });
            transactionChart.push({
                day: dayNames[dayStart.getDay()],
                count
            });
        }



        // Rewards from Transactions (corrected)
        // Sum stamps earned from STAMP type transactions
        const stampsAgg = await Transaction.aggregate([
            { $match: { type: 'STAMP', stampsEarned: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$stampsEarned' } } }
        ]);
        const totalStampsEarned = stampsAgg[0]?.total || 0;

        // Sum points earned from POINT type transactions
        const pointsAgg = await Transaction.aggregate([
            { $match: { type: 'POINT', category: 'KAZANIM' } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$pointsEarned', '$value'] } } } }
        ]);
        const totalPointsEarned = pointsAgg[0]?.total || 0;

        // Count gift redemptions
        const totalGiftsRedeemed = await Transaction.countDocuments({
            type: { $in: ['GIFT_REDEEM', 'gift_redemption'] }
        });

        // Notifications
        const totalNotifications = await Notification.countDocuments({ type: 'USER' });
        const unreadNotifications = await Notification.countDocuments({ type: 'USER', isRead: false, isDeleted: { $ne: true } });

        // Reviews
        const totalReviews = await Review.countDocuments();
        const avgRatingResult = await Review.aggregate([
            { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);
        const avgRating = avgRatingResult[0]?.avg ? avgRatingResult[0].avg.toFixed(1) : 0;

        res.json({
            users: {
                total: totalUsers,
                today: usersToday
            },
            firms: {
                total: totalFirms,
                month: firmsThisMonth
            },
            campaigns: {
                total: totalCampaigns,
                active: activeCampaigns
            },
            transactions: {
                total: totalTransactions,
                today: transactionsToday,
                chart: transactionChart
            },

            rewards: {
                points: totalPointsEarned,
                stamps: totalStampsEarned,
                gifts: totalGiftsRedeemed
            },
            notifications: {
                total: totalNotifications,
                unread: unreadNotifications
            },
            reviews: {
                total: totalReviews,
                avgRating: parseFloat(avgRating)
            },
            gifts: {
                redeemed: totalGiftsRedeemed
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
        const Transaction = require('../models/Transaction');
        const Review = require('../models/Review');
        const Gift = require('../models/Gift');
        const mongoose = require('mongoose');

        // Date helpers
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 1. Customer Count (Wallet Adds)
        const totalCustomers = await CustomerBusiness.countDocuments({ business: businessId });



        // 3. Transactions
        const dailyTransactions = await Transaction.countDocuments({
            business: businessId,
            createdAt: { $gte: todayStart }
        });
        const monthlyTransactions = await Transaction.countDocuments({
            business: businessId,
            createdAt: { $gte: monthStart }
        });

        // 4. Weekly Rewards
        // Sum stamps earned from STAMP type transactions
        const weeklyStampsAgg = await Transaction.aggregate([
            { $match: { business: new mongoose.Types.ObjectId(businessId), type: 'STAMP', stampsEarned: { $gt: 0 }, createdAt: { $gte: weekAgo } } },
            { $group: { _id: null, total: { $sum: '$stampsEarned' } } }
        ]);
        const weeklyStamps = weeklyStampsAgg[0]?.total || 0;

        // Sum points earned from POINT type transactions (pure point campaigns)
        const weeklyPointsAgg = await Transaction.aggregate([
            { $match: { business: new mongoose.Types.ObjectId(businessId), type: 'POINT', category: 'KAZANIM', createdAt: { $gte: weekAgo } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$pointsEarned', '$value'] } } } }
        ]);
        const weeklyPoints = weeklyPointsAgg[0]?.total || 0;

        // Count gift redemptions from Transaction (GIFT_REDEEM or gift_redemption types)
        const weeklyGifts = await Transaction.countDocuments({
            business: businessId,
            type: { $in: ['GIFT_REDEEM', 'gift_redemption'] },
            createdAt: { $gte: weekAgo }
        });

        // 5. Charts Data (Last 30 days)
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

        // Wallet Adds Chart
        const walletAddsChart = [];
        for (let i = 29; i >= 0; i--) {
            const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const count = await CustomerBusiness.countDocuments({
                business: businessId,
                joinedAt: { $gte: dayStart, $lt: dayEnd }
            });
            walletAddsChart.push({
                day: `${dayStart.getDate()}/${dayStart.getMonth() + 1}`,
                count
            });
        }

        // Transactions Chart
        const transactionsChart = [];
        for (let i = 29; i >= 0; i--) {
            const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const count = await Transaction.countDocuments({
                business: businessId,
                createdAt: { $gte: dayStart, $lt: dayEnd }
            });
            transactionsChart.push({
                day: `${dayStart.getDate()}/${dayStart.getMonth() + 1}`,
                count
            });
        }

        // 6. Reviews
        const totalReviews = await Review.countDocuments({ business: businessId });
        const avgRatingResult = await Review.aggregate([
            { $match: { business: new mongoose.Types.ObjectId(businessId) } },
            { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);
        const avgRating = avgRatingResult[0]?.avg ? avgRatingResult[0].avg.toFixed(1) : 0;

        // 7. Gifts - count from Transaction table (gift redemptions)
        const totalGifts = await Gift.countDocuments({ business: businessId });
        const redeemedGifts = await Transaction.countDocuments({
            business: businessId,
            type: { $in: ['GIFT_REDEEM', 'gift_redemption'] }
        });

        res.json({
            customers: { total: totalCustomers },

            transactions: {
                daily: dailyTransactions,
                monthly: monthlyTransactions
            },
            rewards: {
                weeklyPoints: weeklyPoints,
                weeklyStamps: weeklyStamps,
                weeklyCoffee: weeklyGifts
            },
            reviews: {
                total: totalReviews,
                avgRating: parseFloat(avgRating)
            },
            gifts: {
                total: totalGifts,
                redeemed: redeemedGifts
            },
            charts: {
                walletAdds: walletAddsChart,
                transactions: transactionsChart
            }
        });

    } catch (error) {
        console.error('Get firm stats error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Points Details for a firm (Only POINT type campaigns, not stamp campaigns)
exports.getPointsDetails = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.status(400).json({ error: 'Business ID required' });

        const Transaction = require('../models/Transaction');

        // Get transactions where type is POINT (pure point campaigns)
        const transactions = await Transaction.find({
            business: businessId,
            type: 'POINT',
            category: 'KAZANIM'
        })
            .populate('customer', 'name surname phoneNumber')
            .sort({ createdAt: -1 })
            .limit(500);

        const result = transactions.map(tx => {
            return {
                _id: tx._id,
                customerName: tx.customer ? `${tx.customer.name} ${tx.customer.surname}` : 'Bilinmeyen',
                customerPhone: tx.customer?.phoneNumber || '-',
                points: tx.pointsEarned || tx.value || 0,
                purchaseAmount: tx.purchaseAmount || 0,
                campaign: tx.description || 'Puan Kazanımı',
                status: 'Aktif',
                date: tx.createdAt
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Get points details error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Stamps Details for a firm (STAMP type campaigns)
exports.getStampsDetails = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.status(400).json({ error: 'Business ID required' });

        const Transaction = require('../models/Transaction');

        // Get transactions where stamps were earned (stamp campaigns)
        const transactions = await Transaction.find({
            business: businessId,
            type: 'STAMP',
            stampsEarned: { $gt: 0 }
        })
            .populate('customer', 'name surname phoneNumber')
            .sort({ createdAt: -1 })
            .limit(500);

        const result = transactions.map(tx => {
            return {
                _id: tx._id,
                customerName: tx.customer ? `${tx.customer.name} ${tx.customer.surname}` : 'Bilinmeyen',
                customerPhone: tx.customer?.phoneNumber || '-',
                stamps: tx.stampsEarned,
                points: tx.pointsEarned || 0,
                purchaseAmount: tx.purchaseAmount || 0,
                campaign: tx.description || 'Pul Kazanımı',
                status: 'Aktif',
                date: tx.createdAt
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Get stamps details error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Gifts Details for a firm
exports.getGiftsDetails = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) return res.status(400).json({ error: 'Business ID required' });

        const Transaction = require('../models/Transaction');

        const transactions = await Transaction.find({
            business: businessId,
            type: { $in: ['GIFT_REDEEM', 'gift_redemption'] }
        })
            .populate('customer', 'name surname phoneNumber')
            .sort({ createdAt: -1 })
            .limit(500);

        const result = transactions.map(tx => ({
            _id: tx._id,
            customerName: tx.customer ? `${tx.customer.name} ${tx.customer.surname}` : 'Bilinmeyen',
            customerPhone: tx.customer?.phoneNumber || '-',
            giftName: tx.description || 'Hediye Kullanımı',
            status: 'Tamamlandı', // Gift redemptions are always completed
            date: tx.createdAt
        }));

        res.json(result);
    } catch (error) {
        console.error('Get gifts details error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============ ADMIN DETAIL ENDPOINTS (All Firms) ============

// Get All Points Details for Admin (all firms)
exports.getAdminPointsDetails = async (req, res) => {
    try {
        const Transaction = require('../models/Transaction');

        const transactions = await Transaction.find({
            type: 'POINT',
            category: 'KAZANIM'
        })
            .populate('customer', 'name surname phoneNumber')
            .populate('business', 'companyName')
            .sort({ createdAt: -1 })
            .limit(1000);

        const result = transactions.map(tx => {
            // Status based on business existence
            let status = 'Aktif';
            if (!tx.business) {
                status = 'Firma Silinmiş';
            }

            return {
                _id: tx._id,
                businessName: tx.business?.companyName || 'Bilinmeyen Firma',
                customerName: tx.customer ? `${tx.customer.name} ${tx.customer.surname}` : 'Bilinmeyen',
                customerPhone: tx.customer?.phoneNumber || '-',
                points: tx.pointsEarned || tx.value || 0,
                purchaseAmount: tx.purchaseAmount || 0,
                campaign: tx.description || 'Puan Kazanımı',
                status,
                date: tx.createdAt
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Get admin points details error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get All Stamps Details for Admin (all firms)
exports.getAdminStampsDetails = async (req, res) => {
    try {
        const Transaction = require('../models/Transaction');

        const transactions = await Transaction.find({
            type: 'STAMP',
            stampsEarned: { $gt: 0 }
        })
            .populate('customer', 'name surname phoneNumber')
            .populate('business', 'companyName')
            .sort({ createdAt: -1 })
            .limit(1000);

        const result = transactions.map(tx => {
            // Status based on business existence
            let status = 'Aktif';
            if (!tx.business) {
                status = 'Firma Silinmiş';
            }

            return {
                _id: tx._id,
                businessName: tx.business?.companyName || 'Bilinmeyen Firma',
                customerName: tx.customer ? `${tx.customer.name} ${tx.customer.surname}` : 'Bilinmeyen',
                customerPhone: tx.customer?.phoneNumber || '-',
                stamps: tx.stampsEarned,
                points: tx.pointsEarned || 0,
                purchaseAmount: tx.purchaseAmount || 0,
                campaign: tx.description || 'Pul Kazanımı',
                status,
                date: tx.createdAt
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Get admin stamps details error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get All Gifts Details for Admin (all firms)
exports.getAdminGiftsDetails = async (req, res) => {
    try {
        const Transaction = require('../models/Transaction');

        const transactions = await Transaction.find({
            type: { $in: ['GIFT_REDEEM', 'gift_redemption'] }
        })
            .populate('customer', 'name surname phoneNumber')
            .populate('business', 'companyName')
            .sort({ createdAt: -1 })
            .limit(1000);

        const result = transactions.map(tx => ({
            _id: tx._id,
            businessName: tx.business?.companyName || 'Bilinmeyen Firma',
            customerName: tx.customer ? `${tx.customer.name} ${tx.customer.surname}` : 'Bilinmeyen',
            customerPhone: tx.customer?.phoneNumber || '-',
            giftName: tx.description || 'Hediye Kullanımı',
            status: 'Tamamlandı',
            date: tx.createdAt
        }));

        res.json(result);
    } catch (error) {
        console.error('Get admin gifts details error:', error);
        res.status(500).json({ error: error.message });
    }
};
