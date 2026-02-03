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

// Soft Delete Notification (Mobile App - marks as deleted but keeps in DB)
router.put('/:id/soft-delete', verifyToken, notificationController.softDeleteNotification);

// Hard Delete Notification (Admin Panel - permanently removes)
router.delete('/:id', verifyToken, notificationController.deleteNotification);

// Super Admin: Get All Business Notifications
router.get('/all-business', verifyToken, isSuperAdmin, notificationController.getAllBusinessNotifications);

// Super Admin: Get All User Notifications
router.get('/all-users', verifyToken, isSuperAdmin, notificationController.getAllUserNotifications);

module.exports = router;
