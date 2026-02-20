const twilio = require('twilio');
const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');
const authController = require('./authController');

// Export helper methods from authController or define them again. 
// Since they are defined inside authController but not exported, let's export them in authController or just reproduce.
// Actually, I need to export those generators from authController first.

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken);

exports.sendVerification = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        // Ensure format +90...
        let formattedPhone = phoneNumber.replace(/\s+/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = formattedPhone.substring(1);
        if (!formattedPhone.startsWith('+')) formattedPhone = '+90' + formattedPhone;

        const verification = await client.verify.v2.services(serviceSid)
            .verifications
            .create({ to: formattedPhone, channel: 'sms' });

        res.json({ status: verification.status });
    } catch (error) {
        console.error("Twilio Send Error:", error);
        res.status(500).json({ error: error.message || 'SMS gönderilemedi.' });
    }
};

exports.verifyCode = async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;

        let formattedPhone = phoneNumber.replace(/\s+/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = formattedPhone.substring(1);
        if (!formattedPhone.startsWith('+')) formattedPhone = '+90' + formattedPhone;

        const verificationCheck = await client.verify.v2.services(serviceSid)
            .verificationChecks
            .create({ to: formattedPhone, code });

        if (verificationCheck.status === 'approved') {
            // Find user and generate token
            // Note: Phone number in DB might be formatted differently (e.g., 5551234567 without +90)
            // Assuming DB stores 10 digits or we strips +90 manually.
            const rawPhone = formattedPhone.replace('+90', '');
            const user = await Customer.findOne({ phoneNumber: { $regex: rawPhone + '$' } }); // Fuzzy match end

            if (!user) {
                return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
            }

            // Mark as Verified
            user.isVerified = true;
            await user.save();

            const accessToken = authController.generateAccessToken(user._id);
            const refreshToken = await authController.generateRefreshToken(user._id, 'Customer', req.ip);

            res.json({
                status: 'approved',
                token: accessToken,
                refreshToken,
                user
            });
        } else {
            res.status(400).json({ error: 'Doğrulama kodu hatalı.' });
        }
    } catch (error) {
        console.error("Twilio Verify Error:", error);
        res.status(500).json({ error: error.message || 'Doğrulama yapılamadı.' });
    }
};
