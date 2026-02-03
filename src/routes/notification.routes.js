const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, isSuperAdmin, isBusiness } = require('../middleware/authMiddleware');

// Send to Users (Super Admin)
router.post('/send-users', verifyToken, isSuperAdmin, notificationController.sendToUsers);

// Send to Businesses (Super Admin)
router.post('/send-business', verifyToken, isSuperAdmin, notificationController.sendToBusiness);

// Get My Notifications (Firm Admin)
router.get('/my-notifications', verifyToken, isBusiness, notificationController.getMyNotifications);

// Get User Notifications (Customer App)
router.get('/user', verifyToken, notificationController.getUserNotifications);

// Mark as Read
router.put('/:id/read', verifyToken, notificationController.markAsRead);

module.exports = router;
