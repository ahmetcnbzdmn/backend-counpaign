const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists (absolute path matching express.static)
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer for campaign image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'campaign-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Public route: Get all campaigns for a specific business
router.get('/business/:businessId', campaignController.getCampaignsByBusiness);

// Public route: Get ALL campaigns (Global)
router.get('/', campaignController.getAllCampaigns);

// Protected routes (Business only)
router.post('/',
    auth,
    upload.single('headerImage'),
    campaignController.createCampaign
);

router.patch('/:id',
    auth,
    upload.single('headerImage'),
    campaignController.updateCampaign
);

router.delete('/:id',
    auth,
    campaignController.deleteCampaign
);

module.exports = router;
