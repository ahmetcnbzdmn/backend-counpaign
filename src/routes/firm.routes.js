const express = require('express');
const router = express.Router();
const firmController = require('../controllers/firmController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists (absolute path matching express.static)
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
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
// Static QR management
router.post('/:id/generate-qr', firmController.generateStaticQR);
router.get('/:id/qr', firmController.getStaticQR);

module.exports = router;
