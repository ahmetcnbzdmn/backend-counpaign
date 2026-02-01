const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Unified Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/lookup-email', authController.lookupEmail);

// SMS Verification
const smsController = require('../controllers/smsController');
router.post('/send-verification', smsController.sendVerification);
router.post('/verify-code', smsController.verifyCode);

// Admin Auth Route
router.post('/admin/login', authController.adminLogin);

module.exports = router;
