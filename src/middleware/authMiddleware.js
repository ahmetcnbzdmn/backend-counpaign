const jwt = require('jsonwebtoken');
const { verifyFirebaseToken } = require('../utils/firebaseVerifier');
const Customer = require('../models/Customer');

const verifyToken = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        // 1. Try verifying as Local Backend Token (HS256)
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = verified;
        // console.log('   ✅ Auth verified (Local JWT), user:', req.user.id);
        next();
    } catch (localErr) {
        // 2. Try verifying as Firebase Token (RS256)
        try {
            // console.log("   ⚠️ Local Verify Failed, trying Firebase...");
            const firebaseUser = await verifyFirebaseToken(token);
            // console.log("   ✅ Firebase Token Verified. Email:", firebaseUser.email);

            // Find Local User by Email or Phone
            // Case-insensitive email lookup
            let user = await Customer.findOne({
                email: { $regex: new RegExp(`^${firebaseUser.email}$`, 'i') }
            });

            // FALLBACK 1: If user not found by email, check if it's a "fake" email (legacy system)
            // Pattern: phoneNumber@counpaign.local OR .com
            if (!user && firebaseUser.email) {
                const legacyMatch = firebaseUser.email.match(/^(\d+)@counpaign\.(local|com)$/);
                if (legacyMatch) {
                    const extractedPhone = legacyMatch[1];
                    // console.log("   ⚠️ Detected Legacy Fake Email, looking up by phone:", extractedPhone);
                    user = await Customer.findOne({ phoneNumber: extractedPhone });
                }
            }

            // FALLBACK 2: Check verified phone number from Firebase (if exists)
            if (!user && firebaseUser.phone_number) {
                user = await Customer.findOne({ phoneNumber: firebaseUser.phone_number });
            }

            if (!user) {
                // Optional: Auto-create user if they exist in Firebase but not here? 
                // For now, strict: must exist in Backend.
                // console.log("   ❌ User not found in Backend DB for email:", firebaseUser.email);
                return res.status(404).json({ error: 'User link failed. Contact support.' });
            }

            req.user = { id: user._id }; // Mock payload matching local JWT structure
            // console.log('   🔗 Dual-Auth Success. Mapped to Local User:', user._id);
            next();

        } catch (firebaseErr) {
            console.error('Auth failed:', firebaseErr.message); // Keep error log
            res.status(401).json({ error: 'Invalid token.' });
        }
    }
};

const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }
};

const isBusiness = (req, res, next) => {
    if (req.user && (req.user.role === 'business' || req.user.role === 'super_admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Business only.' });
    }
};

module.exports = verifyToken; // Default export for backwards compatibility
module.exports.verifyToken = verifyToken; // Named export
module.exports.isSuperAdmin = isSuperAdmin;
module.exports.isBusiness = isBusiness;
