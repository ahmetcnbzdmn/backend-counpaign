const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/profile', authMiddleware, customerController.getProfile);
router.put('/profile', authMiddleware, customerController.updateProfile);
router.get('/transactions', authMiddleware, customerController.getTransactions);
router.post('/reviews', authMiddleware, require('../controllers/reviewController').createReview);
router.get('/reviews', authMiddleware, require('../controllers/reviewController').getReviews);

module.exports = router;
