const express = require('express');
const router = express.Router();
const firmController = require('../controllers/firmController');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'firm-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Dashboard stats
router.get('/stats', firmController.getDashboardStats);

// CRUD operations for firms
router.get('/', firmController.getAllFirms);
router.get('/:id', firmController.getFirmById);
router.post('/', upload.single('logo'), firmController.createFirm);
router.put('/:id', upload.single('logo'), firmController.updateFirm);
router.delete('/:id', firmController.deleteFirm);

module.exports = router;
