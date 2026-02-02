const QRToken = require('../models/QRToken');
const Participation = require('../models/Participation');
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

// Validate QR token and return customer participations
exports.validateQR = async (req, res) => {
    try {
        const { token } = req.body;
        const customerId = req.user?.id;

        if (!customerId) {
            return res.status(401).json({ error: 'Customer ID not found in token' });
        }

        // Find and validate token
        const qrToken = await QRToken.findOne({ token, status: 'active' }).populate('business');

        if (!qrToken) {
            return res.status(404).json({ error: 'Invalid or expired QR code' });
        }

        if (qrToken.type !== 'business_scan') {
            return res.status(400).json({ error: 'Invalid QR code type' });
        }

        // Validate Expected Business (Prevent cross-business scanning)
        const { expectedBusinessId } = req.body;
        if (expectedBusinessId && qrToken.business._id.toString() !== expectedBusinessId) {
            return res.status(400).json({
                error: 'Firm Mismatch',
                details: {
                    expected: expectedBusinessId,
                    actual: qrToken.business._id,
                    actualName: qrToken.business.companyName
                }
            });
        }

        // Get customer's participations for this business's campaigns
        const Campaign = require('../models/Campaign');
        const campaigns = await Campaign.find({ businessId: qrToken.business._id });
        const campaignIds = campaigns.map(c => c._id);

        const participations = await Participation.find({
            customer: customerId,
            campaign: { $in: campaignIds },
            business: qrToken.business._id
        }).populate('campaign');

        // Mark token as scanned
        qrToken.status = 'scanned';
        qrToken.scannedBy = customerId;
        await qrToken.save();

        console.log(`✅ QR scanned - Customer ${customerId} has ${participations.length} participations`);

        res.json({
            business: {
                id: qrToken.business._id,
                name: qrToken.business.companyName
            },
            participations,
            qrTokenId: qrToken._id
        });
    } catch (error) {
        console.error('Validate QR error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Confirm participation and update CustomerBusiness
exports.confirmParticipation = async (req, res) => {
    try {
        const { qrTokenId, customerId, campaignId } = req.body;
        const businessId = req.user?.id;

        // Verify QR token
        const qrToken = await QRToken.findById(qrTokenId);
        if (!qrToken || (qrToken.status !== 'active' && qrToken.status !== 'scanned')) {
            return res.status(400).json({ error: 'Invalid or expired QR token' });
        }

        // Get campaign details
        const Campaign = require('../models/Campaign');
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Mark token as used
        qrToken.status = 'used';
        await qrToken.save();

        // Find or create CustomerBusiness record
        let customerBusiness = await CustomerBusiness.findOne({
            customer: customerId,
            business: businessId
        });

        if (!customerBusiness) {
            // Create new relationship if doesn't exist
            customerBusiness = new CustomerBusiness({
                customer: customerId,
                business: businessId,
                points: 0,
                stamps: 0,
                giftsCount: 0
            });
        }

        // Apply reward based on campaign
        if (campaign.rewardType === 'stamp') {
            customerBusiness.stamps += (campaign.rewardValue || 1);

            // Auto-handle stamp completion for gifts
            const stampsTarget = customerBusiness.stampsTarget || 6;
            if (customerBusiness.stamps >= stampsTarget) {
                const completedGifts = Math.floor(customerBusiness.stamps / stampsTarget);
                customerBusiness.giftsCount += completedGifts;
                customerBusiness.stamps = customerBusiness.stamps % stampsTarget;
            }
        } else if (campaign.rewardType === 'points') {
            customerBusiness.points += (campaign.rewardValue || 0);
        }

        customerBusiness.totalVisits = (customerBusiness.totalVisits || 0) + 1;
        await customerBusiness.save();

        // [NEW] Create Transaction Record for Order History
        const Transaction = require('../models/Transaction');

        const isStamp = campaign.rewardType === 'stamp';
        const rewardVal = campaign.rewardValue || (isStamp ? 1 : 0);

        await Transaction.create({
            customer: customerId,
            business: businessId,
            type: isStamp ? 'STAMP' : 'POINT',
            category: 'KAZANIM',
            value: rewardVal,
            pointsEarned: isStamp ? 0 : rewardVal,
            stampsEarned: isStamp ? rewardVal : 0,
            description: `Kampanya: ${campaign.title}`,
            status: 'COMPLETED'
        });

        console.log(`✅ Participation confirmed for ${campaign.title} - Type: ${campaign.rewardType}, Value: ${campaign.rewardValue}`);

        res.json({
            message: 'Participation confirmed successfully',
            customerBusiness: {
                stamps: customerBusiness.stamps,
                giftsCount: customerBusiness.giftsCount,
                points: customerBusiness.points,
                totalVisits: customerBusiness.totalVisits
            }
        });
    } catch (error) {
        console.error('Confirm participation error:', error);
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

            // Get participations for this customer
            const Campaign = require('../models/Campaign');
            const campaigns = await Campaign.find({ businessId });
            const campaignIds = campaigns.map(c => c._id);
            console.log(`📅 Found ${campaigns.length} active campaigns for this business`);

            const participations = await Participation.find({
                customer: qrToken.scannedBy._id,
                campaign: { $in: campaignIds }
            }).populate('campaign');

            console.log(`🎟️ Found ${participations.length} matching participations for user`);

            return res.json({
                status: 'scanned',
                customer: qrToken.scannedBy,
                participations,
                qrTokenId: qrToken._id.toString()
            });
        }

        res.json({ status: qrToken.status });
    } catch (error) {
        console.error('Check QR status error:', error);
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
                // Could add reward details here if we fetched them
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
