const https = require('https');
const jwt = require('jsonwebtoken');

let cachedKeys = null;
let cacheExpiry = 0;

const fetchGooglePublicKeys = () => {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        if (cachedKeys && now < cacheExpiry) {
            return resolve(cachedKeys);
        }

        https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const keys = JSON.parse(data);
                    const cacheControl = res.headers['cache-control'];
                    let maxAge = 3600; // Default 1 hour

                    if (cacheControl) {
                        const match = cacheControl.match(/max-age=(\d+)/);
                        if (match) maxAge = parseInt(match[1]);
                    }

                    cachedKeys = keys;
                    cacheExpiry = now + (maxAge * 1000);
                    resolve(keys);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (e) => reject(e));
    });
};

const verifyFirebaseToken = async (token) => {
    const keys = await fetchGooglePublicKeys();

    // Decode header to find 'kid'
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('Invalid token structure');
    }

    const kid = decoded.header.kid;
    const publicKey = keys[kid];

    if (!publicKey) {
        // Force refresh cache once if key not found (maybe rotated)
        cachedKeys = null;
        const freshKeys = await fetchGooglePublicKeys();
        const freshPublicKey = freshKeys[kid];
        if (!freshPublicKey) throw new Error('Invalid kid (key not found)');

        return jwt.verify(token, freshPublicKey, { algorithms: ['RS256'] });
    }

    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
};

module.exports = { verifyFirebaseToken };
