const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const campaignsDir = path.join(uploadDir, 'campaigns');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(campaignsDir)) fs.mkdirSync(campaignsDir);

// Configure Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, campaignsDir);
    },
    filename: function (req, file, cb) {
        // Generate filename: campaign-{timestamp}-{random}.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `campaign-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload Route
router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Construct URL
        // req.protocol + '://' + req.get('host') could be used, but relative path is safer for DB
        // returning full URL for convenience
        const fullUrl = `${req.protocol}://${req.get('host')}/uploads/campaigns/${req.file.filename}`;

        console.log('✅ File uploaded:', fullUrl);

        res.json({
            message: 'File uploaded successfully',
            url: fullUrl,
            path: `/uploads/campaigns/${req.file.filename}`
        });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

module.exports = router;
