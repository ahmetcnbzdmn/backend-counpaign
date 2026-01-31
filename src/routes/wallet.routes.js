const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');

// Base path: /api/wallet (or /api/firms)
// All routes require authentication (Customer)
router.use(authMiddleware);

// Get all available businesses to add
router.get('/explore', businessController.getAllBusinesses);

// Get newest businesses
router.get('/explore/newest', businessController.getNewestBusinesses);

// Get specific business details
router.get('/explore/:id', businessController.getBusinessById);

// Add business to wallet
router.post('/add', businessController.addBusinessToWallet);

// Remove business from wallet
router.post('/remove', businessController.removeBusinessFromWallet);

// Get my added businesses
router.get('/my', businessController.getMyBusinesses);

// Reorder wallet
router.post('/reorder', businessController.reorderWallet);

module.exports = router;
