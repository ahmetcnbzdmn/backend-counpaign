const Participation = require('../models/Participation');
const Campaign = require('../models/Campaign');
const CustomerBusiness = require('../models/CustomerBusiness');
const Transaction = require('../models/Transaction');

// @desc    Join a campaign
// @route   POST /api/participations/join/:campaignId
// @access  Private (Customer only)
exports.joinCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const customerId = req.user.id; // From authMiddleware

        // Check if campaign exists
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Check if already joined
        const existing = await Participation.findOne({ customer: customerId, campaign: campaignId });
        if (existing) {
            return res.status(400).json({ error: 'Already joined this campaign' });
        }

        const participation = new Participation({
            customer: customerId,
            campaign: campaignId,
            business: campaign.businessId,
            status: 'JOINED'
        });

        await participation.save();

        res.status(201).json({
            message: 'Successfully joined the campaign',
            participation
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to join campaign', details: err.message });
    }
};

// @desc    Get my active participations
// @route   GET /api/participations/my
// @access  Private (Customer only)
exports.getMyParticipations = async (req, res) => {
    try {
        const customerId = req.user.id;
        const participations = await Participation.find({ customer: customerId })
            .populate('campaign')
            .populate('business', 'companyName logo');

        res.json(participations);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch participations', details: err.message });
    }
};

// @desc    Manually trigger 'WON' status (For testing/Internal use)
//          In a real scenario, this would be called by a 'checkWinStatus' function
// @route   POST /api/participations/win/:id
// @access  Private
exports.completeCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        const participation = await Participation.findById(id).populate('campaign');
        if (!participation) {
            return res.status(404).json({ error: 'Participation record not found' });
        }

        if (participation.status === 'WON' || participation.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Campaign already won or completed' });
        }

        // 1. Update Participation Status
        participation.status = 'WON';
        participation.wonAt = new Date();
        await participation.save();

        // 2. Grant Reward
        const { rewardType, rewardValue, businessId } = participation.campaign;

        let customerBusiness = await CustomerBusiness.findOne({
            customer: participation.customer,
            business: businessId
        });

        if (!customerBusiness) {
            // Create relationship if it doesn't exist
            customerBusiness = new CustomerBusiness({
                customer: participation.customer,
                business: businessId
            });
        }

        if (rewardType === 'points') {
            customerBusiness.points += rewardValue;
        } else if (rewardType === 'stamp') {
            customerBusiness.stamps += rewardValue;

            // Handle stamp overflow/gift logic if necessary
            // (Assuming existing logic handles this elsewhere, but let's be safe)
            if (customerBusiness.stamps >= customerBusiness.stampsTarget) {
                const giftsEarned = Math.floor(customerBusiness.stamps / customerBusiness.stampsTarget);
                customerBusiness.giftsCount += giftsEarned;
                customerBusiness.stamps %= customerBusiness.stampsTarget;
            }
        }

        await customerBusiness.save();

        // 3. Log Transaction
        const transaction = new Transaction({
            customer: participation.customer,
            business: businessId,
            type: rewardType === 'points' ? 'POINT' : 'STAMP',
            category: 'KAZANIM',
            value: rewardValue,
            status: 'COMPLETED'
        });

        await transaction.save();

        res.json({
            message: 'Congratulations! Campaign won and reward granted.',
            participation,
            reward: { type: rewardType, value: rewardValue }
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to process win', details: err.message });
    }
};
