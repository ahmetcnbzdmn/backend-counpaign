const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productController = require('../controllers/productController');
const businessAuth = require('../middleware/businessAuthMiddleware'); // Assuming this exists for firm admin auth

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
const productsDir = path.join(uploadDir, 'products');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir);

// Configure Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, productsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `product-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Routes
// Public (Get Menu)
router.get('/:businessId', productController.getBusinessProducts);

// Protected (Manage Menu)
// Note: Assuming verifyToken middleware is available or businessAuth
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware.verifyToken, upload.single('image'), productController.createProduct);
router.put('/:id', authMiddleware.verifyToken, upload.single('image'), productController.updateProduct);
router.delete('/:id', authMiddleware.verifyToken, productController.deleteProduct);

module.exports = router;
