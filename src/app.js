const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security Middleware - Configure helmet to allow CORS for uploads
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request Logger
app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (req.headers.authorization) {
        console.log('   Auth: Bearer token present');
    }
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('   Body:', JSON.stringify(req.body).substring(0, 100));
    }
    next();
});

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Increased limit for development
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic Health Check
app.get('/', (req, res) => {
    res.json({ message: 'Counpaign API is running 🚀', timestamp: new Date() });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes')); // Admin dashboard
app.use('/api/business', require('./routes/business.routes'));
app.use('/api/firms', require('./routes/firm.routes')); // Admin panel
app.use('/api/users', require('./routes/user.routes')); // Admin panel users
app.use('/api/qr', require('./routes/qr.routes')); // QR system
app.use('/api/terminal', require('./routes/terminal.routes'));
app.use('/api/customer', require('./routes/customer.routes'));
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/campaigns', require('./routes/campaign.routes'));
app.use('/api/participations', require('./routes/participation.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/gifts', require('./routes/gift.routes')); // Gift system
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/notifications', require('./routes/notification.routes')); // Review system
app.use('/api/products', require('./routes/product.routes')); // Menu system

// 404 Handler for debugging
// 404 Handler for debugging
app.use((req, res, next) => {
    console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Error trapped by middleware:", err);
    res.status(500).json({ error: 'Something went wrong!', details: err.message || 'Unknown error' });
});

module.exports = app;
