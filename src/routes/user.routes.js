const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// Get users (role-based filtering)
router.get('/', auth, userController.getUsers);

// Get single user by ID
router.get('/:id', auth, userController.getUserById);

// Get user's wallet cafes
router.get('/:id/cafes', auth, userController.getUserCafes);

// Update wallet record
router.patch('/:id/wallet/:recordId', auth, userController.updateWallet);

// Delete wallet record
router.delete('/:id/wallet/:recordId', auth, userController.deleteWallet);

// Delete user (or disconnect from business)
router.delete('/:id', auth, userController.deleteUser);

module.exports = router;
