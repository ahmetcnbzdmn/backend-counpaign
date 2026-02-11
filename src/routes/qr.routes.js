const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const auth = require('../middleware/authMiddleware');

// Generate QR token for business
router.post('/generate', auth, qrController.generateQR);

// Validate QR token (from mobile app)
router.post('/validate', auth, qrController.validateQR);

// Confirm participation and update stamps/gifts
router.post('/confirm', auth, qrController.confirmParticipation);

// Cancel participation (Admin closes modal)
router.post('/cancel', auth, qrController.cancelQR);

// Check QR status (polling for admin panel)
router.get('/status/:token', auth, qrController.checkStatus);

// Poll for static QR scans (admin panel polling)
router.get('/poll-static', auth, qrController.pollStaticQR);

// Check QR status (polling for CUSTOMER) - to see if admin confirmed
router.get('/status/customer/:token', auth, qrController.checkCustomerStatus);

module.exports = router;
