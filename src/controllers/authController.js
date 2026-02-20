const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');
// Keeping Business/Terminal imports if needed later, but unified flow uses Customer as User base
// const Business = require('../models/Business'); 
// const Terminal = require('../models/Terminal');

const generateAccessToken = (id, role = 'customer') => {
    // Access token is valid for 15 minutes
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
};

const generateRefreshToken = async (userId, userModel, ipAddress) => {
    // Generate a random string for the refresh token
    const token = crypto.randomBytes(40).toString('hex');

    // Set expiration to 14 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const refreshToken = new RefreshToken({
        token,
        user: userId,
        userModel,
        expiresAt,
        createdByIp: ipAddress
    });

    await refreshToken.save();
    return token;
};

exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;

// --- UNIFIED AUTH ---

exports.lookupEmail = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        const customer = await Customer.findOne({ phoneNumber });

        if (!customer) {
            return res.status(404).json({ error: 'Bu numara ile kayıtlı kullanıcı bulunamadı.' });
        }

        res.json({ email: customer.email });
    } catch (err) {
        console.error("Lookup Email Error:", err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

exports.register = async (req, res) => {
    try {
        console.log("👉 Register Request Body:", req.body); // DEBUG LOG

        const { name, surname, phoneNumber, email, password, gender, birthDate } = req.body;

        // Check if user exists (Detail specific error)
        let existingEmail = await Customer.findOne({ email });
        if (existingEmail) {
            console.log("❌ Email exists:", email);
            return res.status(400).json({ error: 'Bu E-posta adresi zaten kullanılıyor.' });
        }

        let existingPhone = await Customer.findOne({ phoneNumber });
        if (existingPhone) {
            console.log("❌ Phone exists:", phoneNumber);
            return res.status(400).json({ error: 'Bu telefon numarası zaten kullanılıyor.' });
        }

        const user = new Customer({
            name,
            surname,
            phoneNumber,
            email: email.toLowerCase(),
            password,
            gender,
            birthDate
        });

        await user.save();
        console.log("✅ User created:", user._id);

        // --- RESTORED FUNCTIONALITY: Create QR Token & Validate Wallet ---
        // Create initial QR Token for the user
        const qrTokenString = require('crypto').randomBytes(16).toString('hex');
        const QrToken = require('../models/QRToken'); // Import locally to avoid circular dependency issues if any

        try {
            await QrToken.create({
                token: qrTokenString,
                user: user._id,
                type: 'login'
            });
            console.log("✅ Check-in QR Token created");
        } catch (qrError) {
            console.error("⚠️ QR Token creation failed (non-blocking):", qrError);
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = await generateRefreshToken(user._id, 'Customer', req.ip);

        res.status(201).json({
            token: accessToken, // renamed conceptually, keeps old API shape partly but adds refresh
            refreshToken,
            user: {
                id: user._id,
                name,
                surname,
                email,
                phoneNumber
            }
        });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        console.log("👉 Login Request:", phoneNumber);

        // Login with Phone Number
        const user = await Customer.findOne({ phoneNumber });
        if (!user) {
            console.log("❌ User not found");
            return res.status(400).json({ error: 'Bu telefon numarası kayıtlı değil.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log("❌ Password mismatch");
            return res.status(400).json({ error: 'Şifre hatalı.' });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = await generateRefreshToken(user._id, 'Customer', req.ip);

        res.json({
            token: accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                surname: user.surname,
                email: user.email,
                phoneNumber: user.phoneNumber
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// --- ADMIN LOGIN ---
// Supports both Admin users and Business users
exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("👉 Admin Login Request:", username);

        // First try Admin model (username-based)
        let admin = await Admin.findOne({ username });

        if (admin) {
            const isMatch = await admin.comparePassword(password);
            if (!isMatch) {
                console.log("❌ Password mismatch");
                return res.status(400).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
            }

            const accessToken = generateAccessToken(admin._id, admin.role);
            const refreshToken = await generateRefreshToken(admin._id, 'Admin', req.ip);

            res.json({
                token: accessToken,
                refreshToken,
                user: {
                    id: admin._id,
                    username: admin.username,
                    role: admin.role,
                    businessName: admin.role === 'super_admin' ? 'Super Admin' : 'Admin'
                }
            });
            console.log("✅ Admin logged in successfully:", admin.username);
            return;
        }

        // If not found in Admin, try Business model (email-based)
        const Business = require('../models/Business');
        const business = await Business.findOne({ email: username });

        if (!business) {
            console.log("❌ User not found in Admin or Business");
            return res.status(400).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
        }

        const isMatch = await business.comparePassword(password);
        if (!isMatch) {
            console.log("❌ Password mismatch");
            return res.status(400).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
        }

        const accessToken = generateAccessToken(business._id, 'business');
        const refreshToken = await generateRefreshToken(business._id, 'Business', req.ip);

        res.json({
            token: accessToken,
            refreshToken,
            user: {
                id: business._id,
                username: business.email,
                role: 'business',
                businessName: business.companyName,
                businessId: business._id,
                theme: business.companyName.toLowerCase() // For theme support
            }
        });
        console.log("✅ Business logged in successfully:", business.companyName);
    } catch (err) {
        console.error("Admin Login Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// --- REFRESH TOKEN ---
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token gerekli.' });
        }

        const storedToken = await RefreshToken.findOne({ token: refreshToken });

        if (!storedToken) {
            return res.status(401).json({ error: 'Geçersiz refresh token.' });
        }

        if (!storedToken.isActive) {
            return res.status(401).json({ error: 'Bu refresh token süresi dolmuş veya iptal edilmiş.' });
        }

        // Generate new Access Token based on user model
        let role = 'customer';
        if (storedToken.userModel === 'Admin') {
            const admin = await Admin.findById(storedToken.user);
            if (admin) role = admin.role;
        } else if (storedToken.userModel === 'Business') {
            role = 'business';
        }

        const newAccessToken = generateAccessToken(storedToken.user, role);

        res.json({
            token: newAccessToken
        });

    } catch (err) {
        console.error("Refresh Token Error:", err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

// --- LOGOUT ---
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Invalidate the refresh token
            await RefreshToken.findOneAndUpdate(
                { token: refreshToken },
                { revoked: new Date() }
            );
        }

        res.json({ message: 'Başarıyla çıkış yapıldı.' });
    } catch (err) {
        console.error("Logout Error:", err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

