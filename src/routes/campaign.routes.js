const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const auth = require('../middleware/authMiddleware');

// Public route: Get all campaigns for a specific business
router.get('/business/:businessId', campaignController.getCampaignsByBusiness);

// Public route: Get ALL campaigns (Global)
router.get('/', campaignController.getAllCampaigns);

// Protected routes (Business only)
router.post('/',
    auth,
    campaignController.createCampaign
);

router.patch('/:id',
    auth,
    campaignController.updateCampaign
);

router.delete('/:id',
    auth,
    campaignController.deleteCampaign
);

module.exports = router;
