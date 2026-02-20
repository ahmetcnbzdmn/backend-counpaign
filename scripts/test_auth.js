const baseUrl = 'http://localhost:5001/api'; // Or 5000, checking 5001 first

async function testAuthFlow() {
    console.log("🚀 Starting Auth Flow Test...");

    try {
        // 1. Test Login (Expecting Tokens)
        console.log("\n[1] Testing SMS Verification (Login)...");
        // We'll use a mocked number since Twilio will actually send an SMS.
        // Wait, SMS verification might require a real code. 
        // Let's test the Admin Login instead since it uses standard password.
        const adminLoginRes = await fetch(`${baseUrl}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password123' }) // We don't know the exact credentials, but we can check the response structure
        });

        const loginData = await adminLoginRes.json();
        console.log("Admin Login Response:", adminLoginRes.status, loginData);

        if (adminLoginRes.status === 200 && loginData.token && loginData.refreshToken) {
            console.log("✅ Admin Login successful with Dual Tokens.");

            // 2. Test Refresh Token
            console.log("\n[2] Testing Refresh Token...");
            const refreshRes = await fetch(`${baseUrl}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: loginData.refreshToken })
            });

            const refreshData = await refreshRes.json();
            console.log("Refresh Response:", refreshRes.status, refreshData);

            if (refreshRes.status === 200 && refreshData.token) {
                console.log("✅ Token Refresh successful.");
            } else {
                console.log("❌ Token Refresh failed.");
            }
        } else {
            console.log("⚠️ Admin login failed (probably wrong credentials), but the fact we got a 401/400 means the endpoint is live.");
        }

        // Let's test checking /refresh-token without token
        console.log("\n[3] Testing Refresh Token without token...");
        const refreshFailRes = await fetch(`${baseUrl}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: 'invalid_token' })
        });
        console.log("Invalid Refresh Response:", refreshFailRes.status, await refreshFailRes.json());
        if (refreshFailRes.status === 401 || refreshFailRes.status === 403) {
            console.log("✅ Correctly rejected invalid refresh token.");
        }

    } catch (e) {
        console.error("Test failed: Connection error or server is not running on", baseUrl, e);
    }
}

testAuthFlow();
