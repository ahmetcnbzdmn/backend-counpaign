const QRToken = require('../models/QRToken');
const CustomerBusiness = require('../models/CustomerBusiness');
const crypto = require('crypto');

// Generate QR token for business
exports.generateQR = async (req, res) => {
    try {
        const businessId = req.user?.id;

        if (!businessId) {
            return res.status(400).json({ error: 'Business ID required' });
        }

        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex');

        // Create QR token
        const qrToken = new QRToken({
            token,
            business: businessId,
            type: 'business_scan',
            status: 'active'
        });

        await qrToken.save();

        console.log('✅ QR Token generated for business:', businessId);
        res.json({ token, expiresIn: 60 });
    } catch (error) {
        console.error('Generate QR error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Validate QR token (customer scans static/dynamic QR)
exports.validateQR = async (req, res) => {
    try {
        const { token } = req.body;
        const customerId = req.user?.id;

        if (!customerId) {
            return res.status(401).json({ error: 'Customer ID not found in token' });
        }

        let business = null;

        // 1. First try finding in QRToken collection (legacy dynamic QR)
        const qrToken = await QRToken.findOne({ token, status: 'active' }).populate('business');

        if (qrToken && qrToken.type === 'business_scan') {
            business = qrToken.business;

            // Validate Expected Business (Prevent cross-business scanning)
            const { expectedBusinessId } = req.body;
            if (expectedBusinessId && business._id.toString() !== expectedBusinessId) {
                return res.status(400).json({
                    error: 'Firm Mismatch',
                    details: {
                        expected: expectedBusinessId,
                        actual: business._id,
                        actualName: business.companyName
                    }
                });
            }

            // Mark token as scanned
            qrToken.status = 'scanned';
            qrToken.scannedBy = customerId;
            await qrToken.save();

        } else {
            // 2. Try finding as a static QR token on a Business
            const Business = require('../models/Business');
            business = await Business.findOne({ staticQR: token });

            if (!business) {
                return res.status(404).json({ error: 'Invalid or expired QR code' });
            }

            // Validate Expected Business
            const { expectedBusinessId } = req.body;
            if (expectedBusinessId && business._id.toString() !== expectedBusinessId) {
                return res.status(400).json({
                    error: 'Firm Mismatch',
                    details: {
                        expected: expectedBusinessId,
                        actual: business._id,
                        actualName: business.companyName
                    }
                });
            }

            // Create a temporary QRToken for the confirmation flow
            // (so existing checkStatus/confirm/cancel flow keeps working)
            const tempToken = crypto.randomBytes(16).toString('hex');

            // Check if this customer has a pending gift_redemption for this business
            const pendingGift = await QRToken.findOne({
                user: customerId,
                business: business._id,
                type: 'gift_redemption',
                status: 'active'
            });

            if (pendingGift) {
                // Gift redemption flow — mark the gift token as scanned
                pendingGift.status = 'scanned';
                await pendingGift.save();

                const tempQR = new QRToken({
                    token: tempToken,
                    business: business._id,
                    type: 'gift_redemption',
                    status: 'scanned',
                    scannedBy: customerId,
                    metadata: pendingGift.metadata
                });
                await tempQR.save();

                console.log(`🎁 Static QR scanned for GIFT redemption - Customer ${customerId}, Gift: ${pendingGift.metadata?.title}`);

                return res.json({
                    business: {
                        id: business._id,
                        name: business.companyName
                    },
                    giftRedemption: {
                        title: pendingGift.metadata?.title,
                        type: pendingGift.metadata?.type,
                        pointCost: pendingGift.metadata?.pointCost,
                        giftTokenId: pendingGift._id
                    },
                    qrTokenId: tempQR._id,
                    pollToken: tempToken
                });
            }

            // Normal scan flow
            const tempQR = new QRToken({
                token: tempToken,
                business: business._id,
                type: 'business_scan',
                status: 'scanned',
                scannedBy: customerId
            });
            await tempQR.save();

            console.log(`✅ Static QR scanned - Customer ${customerId} at ${business.companyName}`);

            return res.json({
                business: {
                    id: business._id,
                    name: business.companyName
                },
                qrTokenId: tempQR._id,
                pollToken: tempToken
            });
        }

        console.log(`✅ QR scanned - Customer ${customerId} at ${business.companyName}`);

        res.json({
            business: {
                id: business._id,
                name: business.companyName
            },
            qrTokenId: qrToken._id
        });
    } catch (error) {
        console.error('Validate QR error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Confirm stamp/point entry (admin enters stamp count + purchase amount)
exports.confirmParticipation = async (req, res) => {
    try {
        const { qrTokenId, customerId, stampCount, purchaseAmount } = req.body;
        const businessId = req.user?.id;

        // Verify QR token
        const qrToken = await QRToken.findById(qrTokenId);
        if (!qrToken || (qrToken.status !== 'active' && qrToken.status !== 'scanned')) {
            return res.status(400).json({ error: 'Invalid or expired QR token' });
        }

        // Mark token as used
        qrToken.status = 'used';

        // Get business settings for points percentage
        const Business = require('../models/Business');
        const business = await Business.findById(businessId);
        const pointsPercentage = business?.settings?.pointsPercentage || 10;

        // Calculate points from purchase amount (default 10%)
        const stampsToAdd = parseInt(stampCount) || 0;
        const purchase = parseFloat(purchaseAmount) || 0;
        const pointsToAdd = Math.floor(purchase * (pointsPercentage / 100));

        // Find or create CustomerBusiness record
        let customerBusiness = await CustomerBusiness.findOne({
            customer: customerId,
            business: businessId
        });

        if (!customerBusiness) {
            customerBusiness = new CustomerBusiness({
                customer: customerId,
                business: businessId,
                points: 0,
                stamps: 0,
                giftsCount: 0
            });
        }

        // Add stamps
        if (stampsToAdd > 0) {
            customerBusiness.stamps += stampsToAdd;

            // Auto-handle stamp completion for gifts
            const stampsTarget = customerBusiness.stampsTarget || 6;
            if (customerBusiness.stamps >= stampsTarget) {
                const completedGifts = Math.floor(customerBusiness.stamps / stampsTarget);
                customerBusiness.giftsCount += completedGifts;
                customerBusiness.stamps = customerBusiness.stamps % stampsTarget;
            }
        }

        // Add points from purchase
        if (pointsToAdd > 0) {
            customerBusiness.points += pointsToAdd;
        }

        customerBusiness.totalVisits = (customerBusiness.totalVisits || 0) + 1;
        await customerBusiness.save();

        // Create Transaction Record
        const Transaction = require('../models/Transaction');

        const transaction = await Transaction.create({
            customer: customerId,
            business: businessId,
            type: stampsToAdd > 0 ? 'STAMP' : 'POINT',
            category: 'KAZANIM',
            value: stampsToAdd > 0 ? stampsToAdd : pointsToAdd,
            pointsEarned: pointsToAdd,
            stampsEarned: stampsToAdd,
            purchaseAmount: purchase,
            description: `Damga: ${stampsToAdd}, Puan: ${pointsToAdd} (${purchase} TL alışveriş)`,
            status: 'COMPLETED'
        });

        // Link transaction to QR token
        qrToken.transaction = transaction._id;
        await qrToken.save();

        console.log(`✅ Confirmed - Stamps: +${stampsToAdd}, Points: +${pointsToAdd} (${purchase} TL, ${pointsPercentage}%)`);

        res.json({
            message: 'Stamp/point entry confirmed successfully',
            transactionId: transaction._id,
            customerBusiness: {
                stamps: customerBusiness.stamps,
                stampsTarget: customerBusiness.stampsTarget || 6,
                giftsCount: customerBusiness.giftsCount,
                points: customerBusiness.points,
                totalVisits: customerBusiness.totalVisits
            }
        });
    } catch (error) {
        console.error('Confirm entry error:', error);
        res.status(500).json({ error: error.message });
    }
};
// Check status of a QR token (polling for admin panel)
exports.checkStatus = async (req, res) => {
    try {
        const { token } = req.params;
        const businessId = req.user?.id;

        console.log(`🔍 Checking QR status | Token: ${token} | Business: ${businessId}`);

        const qrToken = await QRToken.findOne({ token, business: businessId })
            .populate('scannedBy', 'name surname email phoneNumber');

        if (!qrToken) {
            console.log(`❌ QR Token not found in DB: ${token}`);
            return res.status(404).json({ error: 'Token not found' });
        }

        console.log(`📊 Token status: ${qrToken.status}`);

        if (qrToken.status === 'scanned') {
            console.log(`✨ Token SCANNED by: ${qrToken.scannedBy?.name} ${qrToken.scannedBy?.surname}`);

            // Get customer loyalty data
            const customerBusiness = await CustomerBusiness.findOne({
                customer: qrToken.scannedBy._id,
                business: businessId
            });

            return res.json({
                status: 'scanned',
                customer: qrToken.scannedBy,
                customerBusiness: customerBusiness ? {
                    stamps: customerBusiness.stamps,
                    stampsTarget: customerBusiness.stampsTarget || 6,
                    giftsCount: customerBusiness.giftsCount,
                    points: customerBusiness.points,
                    totalVisits: customerBusiness.totalVisits
                } : { stamps: 0, stampsTarget: 6, giftsCount: 0, points: 0, totalVisits: 0 },
                qrTokenId: qrToken._id.toString()
            });
        }

        res.json({ status: qrToken.status });
    } catch (error) {
        console.error('Check QR status error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Poll for static QR scans (admin panel uses this instead of checkStatus)
exports.pollStaticQR = async (req, res) => {
    try {
        const businessId = req.user?.id;

        if (!businessId) {
            return res.status(400).json({ error: 'Business ID required' });
        }

        // Find the most recent scanned (but not yet confirmed) QRToken for this business
        // Check BOTH business_scan and gift_redemption types
        const qrToken = await QRToken.findOne({
            business: businessId,
            type: { $in: ['business_scan', 'gift_redemption'] },
            status: 'scanned'
        })
            .sort({ createdAt: -1 })
            .populate('scannedBy', 'name surname email phoneNumber');

        if (!qrToken || !qrToken.scannedBy) {
            return res.json({ status: 'waiting' });
        }

        // If this is a gift redemption scan
        if (qrToken.type === 'gift_redemption' && qrToken.metadata) {
            console.log(`🎁 Static QR poll - Gift redemption by: ${qrToken.scannedBy.name} ${qrToken.scannedBy.surname}`);

            return res.json({
                status: 'scanned',
                scanType: 'gift_redemption',
                customer: qrToken.scannedBy,
                giftRedemption: {
                    title: qrToken.metadata.title,
                    type: qrToken.metadata.type,
                    pointCost: qrToken.metadata.pointCost
                },
                qrTokenId: qrToken._id.toString()
            });
        }

        // Normal scan — get customer loyalty data
        const customerBusiness = await CustomerBusiness.findOne({
            customer: qrToken.scannedBy._id,
            business: businessId
        });

        console.log(`📱 Static QR poll - Found scan by: ${qrToken.scannedBy.name} ${qrToken.scannedBy.surname}`);

        return res.json({
            status: 'scanned',
            scanType: 'business_scan',
            customer: qrToken.scannedBy,
            customerBusiness: customerBusiness ? {
                stamps: customerBusiness.stamps,
                stampsTarget: customerBusiness.stampsTarget || 6,
                giftsCount: customerBusiness.giftsCount,
                points: customerBusiness.points,
                totalVisits: customerBusiness.totalVisits
            } : { stamps: 0, stampsTarget: 6, giftsCount: 0, points: 0, totalVisits: 0 },
            qrTokenId: qrToken._id.toString()
        });
    } catch (error) {
        console.error('Poll static QR error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Check status for CUSTOMER (waiting for admin confirmation)
exports.checkCustomerStatus = async (req, res) => {
    try {
        const { token } = req.params;
        const customerId = req.user?.id;

        const qrToken = await QRToken.findOne({ token });

        if (!qrToken) {
            return res.status(404).json({ error: 'Token not found' });
        }

        // Optional: specific check if this user scanned it? 
        // For now just returning status is enough for polling.

        if (qrToken.status === 'used') {
            return res.json({
                status: 'used',
                message: 'İşlem Onaylandı',
                transactionId: qrToken.transaction // Important for review submission
            });
        }

        // [NEW] Handle Cancelled Status
        if (qrToken.status === 'cancelled') {
            return res.json({
                status: 'cancelled',
                message: 'İşlem İptal Edildi'
            });
        }

        res.json({ status: qrToken.status });
    } catch (error) {
        console.error('Check Customer QR status error:', error);
        res.status(500).json({ error: error.message });
    }
};

// [NEW] Cancel QR (Called when admin closes the modal)
exports.cancelQR = async (req, res) => {
    try {
        const { qrTokenId } = req.body;
        const businessId = req.user?.id;

        const qrToken = await QRToken.findOne({ _id: qrTokenId, business: businessId });

        if (!qrToken) {
            return res.status(404).json({ error: 'Token not found or unauthorized' });
        }

        qrToken.status = 'cancelled';
        await qrToken.save();

        console.log(`🚫 QR Token cancelled by business: ${businessId}`);
        res.json({ message: 'QR Cancelled' });
    } catch (error) {
        console.error('Cancel QR error:', error);
        res.status(500).json({ error: error.message });
    }
};
