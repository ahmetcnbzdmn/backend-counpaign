const express = require('express');
const router = express.Router();
const firmController = require('../controllers/firmController');

// Super Admin stats
router.get('/stats', firmController.getDashboardStats);

// Business stats
router.get('/firm-stats', firmController.getFirmStats);

module.exports = router;
