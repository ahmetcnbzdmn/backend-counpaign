const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let initialized = false;

const initFirebaseAdmin = () => {
    if (initialized) return;

    try {
        // Try to load service account key
        const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

        // Check if file exists (optional, require will throw if not found)
        const serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        initialized = true;
        console.log('✅ Firebase Admin Initialized');
    } catch (error) {
        console.warn('⚠️ Firebase Admin could not be initialized. Missing serviceAccountKey.json?');
        // console.error(error.message);
    }
};

const getMessaging = () => {
    if (!initialized) initFirebaseAdmin();
    if (!initialized) return null; // Still failed
    return admin.messaging();
};

module.exports = {
    initFirebaseAdmin,
    getMessaging
};
