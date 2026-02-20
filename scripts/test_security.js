const baseUrl = 'http://16.16.255.118:5000/api';

async function testSecurityFeatures() {
    console.log(`🚀 Starting Security Features Test on ${baseUrl}...\n`);

    // --- 1. Test Joi Input Validation ---
    console.log("[1] Testing Joi Input Validation (Strict Payloads)...");
    try {
        // Send a request without the required 'password' field
        const joiRes = await fetch(`${baseUrl}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin_test' }) // Missing password
        });

        const joiData = await joiRes.json();
        console.log(`Status: ${joiRes.status} (Expected: 400)`);
        console.log("Response:", joiData);

        if (joiRes.status === 400 && joiData.error && joiData.error.includes('zorunludur')) {
            console.log("✅ Joi Validation is WORKING. It blocked the malformed payload.");
        } else {
            console.log("❌ Joi Validation failed to block the payload.");
        }
    } catch (e) {
        console.error("Joi test error:", e.message);
    }

    // --- 2. Test Rate Limiting ---
    console.log("\n[2] Testing Advanced Rate Limiting (Brute Force Protection)...");
    console.log("Sending 6 rapid login requests from the same IP (Production limit is 5/15min)...");

    let rateLimitTriggered = false;
    for (let i = 1; i <= 6; i++) {
        try {
            const limitRes = await fetch(`${baseUrl}/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: `spam_user_${i}`, password: 'password123' })
            });

            if (limitRes.status === 429) {
                const limitData = await limitRes.json();
                console.log(`Attempt ${i}: Status 429 - BLOCKED! Response:`, limitData);
                rateLimitTriggered = true;
                break; // Stop loop, we proved it works
            } else {
                console.log(`Attempt ${i}: Status ${limitRes.status} - Passed`);
            }
        } catch (e) {
            console.error(`Attempt ${i} error:`, e.message);
        }
    }

    if (rateLimitTriggered) {
        console.log("✅ Rate Limiting is WORKING. It successfully blocked brute-force attempts.");
    } else {
        console.log("❌ Rate Limiting did not trigger. (Note: The limit might be higher if NODE_ENV is not 'production' inside Docker)");
    }
}

testSecurityFeatures();
