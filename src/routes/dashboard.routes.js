const express = require('express');
const router = express.Router();
const firmController = require('../controllers/firmController');

// Dashboard stats endpoint
router.get('/stats', firmController.getDashboardStats);

module.exports = router;
