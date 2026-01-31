const express = require('express');
const router = express.Router();
const terminalController = require('../controllers/terminalController');
const authMiddleware = require('../middleware/authMiddleware');

// Base path: /api/terminal
// All routes require authentication
router.use(authMiddleware);

router.post('/transaction', terminalController.processTransaction);

module.exports = router;
