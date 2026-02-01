const express = require('express');
const router = express.Router();
const giftController = require('../controllers/giftController');
const authMiddleware = require('../middleware/authMiddleware');
const businessAuthMiddleware = require('../middleware/businessAuthMiddleware');

// Business Routes (Manage Gifts)
router.post('/', businessAuthMiddleware, giftController.createGift);
router.get('/my', businessAuthMiddleware, giftController.getMyGifts);
router.delete('/:id', businessAuthMiddleware, giftController.deleteGift);

// Customer Routes (View & Redeem)
// Note: Customer auth is required for redeeming
router.get('/business/:businessId', authMiddleware, giftController.getBusinessGifts);
router.post('/redeem', authMiddleware, giftController.redeemGift);

module.exports = router;
