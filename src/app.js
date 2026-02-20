const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('./utils/logger');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';

// ===== Security Middleware =====
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Firebase App Check Middleware (Preparation)
// Requires Firebase Admin SDK to be initialized with service account
// const admin = require('firebase-admin');
const verifyAppCheck = async (req, res, next) => {
    // If not in production, bypass or if bypass token is provided (for testing docs)
    if (!IS_PROD) return next();

    const appCheckToken = req.header('X-Firebase-AppCheck');

    if (!appCheckToken) {
        // Temporarily disabled until Firebase is fully configured on client side
        // return res.status(401).json({ error: 'App Check token required.' });
        console.log('⚠️ [DEV_WARNING] App Check token missing. Request allowed for now.');
        return next();
    }

    try {
        // await admin.appCheck().verifyToken(appCheckToken);
        // console.log('✅ Firebase App Check Verified');
        next();
    } catch (err) {
        console.error('AppCheck Error:', err);
        return res.status(401).json({ error: 'Invalid App Check token.' });
    }
};

// app.use(verifyAppCheck); // Uncomment after Firebase Admin is configured

// CORS: whitelist in production, open in development
const corsOptions = IS_PROD ? {
    origin: [
        'https://counpaign-admin.vercel.app',  // Admin panel
        'https://admin.counpaign.com',         // Admin panel (custom domain)
        'https://counpaign.com',                // Main domain
        'https://www.counpaign.com',            // Main domain (www)
        process.env.ADMIN_PANEL_URL,            // Custom admin URL
        process.env.MOBILE_APP_URL,             // Mobile app URL
    ].filter(Boolean),
    credentials: true,
} : {};
app.use(cors(corsOptions));

// Ensure uploads directory exists at startup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

// ===== Structured Request Logger =====
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const meta = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        };

        // Don't log body in production (security)
        if (!IS_PROD && req.body && Object.keys(req.body).length > 0) {
            meta.body = JSON.stringify(req.body).substring(0, 100);
        }

        if (res.statusCode >= 400) {
            logger.warn('Request failed', meta);
        } else {
            logger.info('Request handled', meta);
        }
    });

    next();
});

// ===== Rate Limiting =====
// Global rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: IS_PROD ? 200 : 5000,  // Strict in production
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Auth specific rate limiting (Brute-force protection)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: IS_PROD ? 5 : 50, // Limit each IP to 5 login requests per windowMs in production
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla giriş denemesi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.' },
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: IS_PROD ? 5 : 50, // Limit each IP to 5 register requests per hour in production
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla kayıt denemesi yaptınız. Lütfen daha sonra tekrar deneyin.' },
});

// Export limiters to use in routes
app.locals.loginLimiter = loginLimiter;
app.locals.registerLimiter = registerLimiter;

// ===== Body Parsers =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== Health Check Endpoint =====
app.get('/', (req, res) => {
    res.json({ message: 'Counpaign API is running 🚀', timestamp: new Date() });
});

app.get('/api/health', async (req, res) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    let dbStatus = 'disconnected';
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            dbStatus = 'connected';
        }
    } catch (err) {
        dbStatus = 'error: ' + err.message;
    }

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        environment: process.env.NODE_ENV || 'development',
        node: process.version,
        database: dbStatus,
        memory: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        },
    });
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
