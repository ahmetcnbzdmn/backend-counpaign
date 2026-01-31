const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');

// Base path: /api/business
// All routes require authentication
// Removed role restriction - customers can also access terminals
router.use(authMiddleware);

router.post('/terminals', businessController.createTerminal);
router.get('/terminals', businessController.getTerminals);

module.exports = router;
