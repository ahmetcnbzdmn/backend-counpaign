const express = require('express');
const router = express.Router();
const firmController = require('../controllers/firmController');

// Super Admin stats
router.get('/stats', firmController.getDashboardStats);

// Business stats
router.get('/firm-stats', firmController.getFirmStats);

// Detail endpoints for KPI cards
router.get('/points-details', firmController.getPointsDetails);
router.get('/stamps-details', firmController.getStampsDetails);
router.get('/gifts-details', firmController.getGiftsDetails);

// Admin detail endpoints (all firms)
router.get('/admin/points-details', firmController.getAdminPointsDetails);
router.get('/admin/stamps-details', firmController.getAdminStampsDetails);
router.get('/admin/gifts-details', firmController.getAdminGiftsDetails);

module.exports = router;
