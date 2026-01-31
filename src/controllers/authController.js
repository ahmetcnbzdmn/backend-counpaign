const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
// Keeping Business/Terminal imports if needed later, but unified flow uses Customer as User base
// const Business = require('../models/Business'); 
// const Terminal = require('../models/Terminal');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
};

// --- UNIFIED AUTH ---

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
            email,
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

        const token = generateToken(user._id);
        res.status(201).json({
            token,
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

        const token = generateToken(user._id);
        res.json({
            token,
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
