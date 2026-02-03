const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken, isSuperAdmin, isBusiness } = require('../middleware/authMiddleware');

// Create a review (Mobile App User)
router.post('/', verifyToken, reviewController.createReview);

// Get my reviews (Mobile App User)
router.get('/my-reviews', verifyToken, reviewController.getReviews);

// Get ALL reviews (Super Admin)
router.get('/all', verifyToken, isSuperAdmin, reviewController.getAllReviews);

// Delete Review (Super Admin)
router.delete('/:id', verifyToken, isSuperAdmin, reviewController.deleteReview);

// Get My Firm's reviews (Firm Admin)
router.get('/my-business', verifyToken, isBusiness, reviewController.getFirmReviews);

module.exports = router;
