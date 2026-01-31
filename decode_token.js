const jwt = require('jsonwebtoken');

// Test token from Flutter app
const token = 'PASTE_TOKEN_HERE'; // You'll need to get this from Flutter

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_dev_key_change_in_prod');
    console.log('Decoded token:', decoded);
} catch (err) {
    console.error('Error:', err.message);
}
