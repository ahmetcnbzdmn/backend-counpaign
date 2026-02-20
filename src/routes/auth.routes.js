const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const authValidationSchema = require('../utils/validations/auth.validation');

// Helper to get limiters from app.locals
const getLoginLimiter = (req, res, next) => req.app.locals.loginLimiter(req, res, next);
const getRegisterLimiter = (req, res, next) => req.app.locals.registerLimiter(req, res, next);

// Unified Auth Routes
router.post('/register', getRegisterLimiter, validateRequest(authValidationSchema.register), authController.register);
router.post('/login', getLoginLimiter, validateRequest(authValidationSchema.login), authController.login);
router.post('/lookup-email', getLoginLimiter, validateRequest(authValidationSchema.lookupEmail), authController.lookupEmail);

// SMS Verification
const smsController = require('../controllers/smsController');
router.post('/send-verification', getRegisterLimiter, validateRequest(authValidationSchema.lookupEmail), smsController.sendVerification);
router.post('/verify-code', getRegisterLimiter, smsController.verifyCode);

// Admin Auth Route
router.post('/admin/login', getLoginLimiter, validateRequest(authValidationSchema.adminLogin), authController.adminLogin);

// Token Management
router.post('/refresh-token', validateRequest(authValidationSchema.refreshToken), authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
