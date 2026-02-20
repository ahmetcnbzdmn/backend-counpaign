const baseUrl = 'http://16.16.255.118:5000/api';

async function testRemoteAuthFlow() {
    console.log(`🚀 Starting Remote Auth Flow Test on ${baseUrl}...`);

    try {
        // Test Refresh Token without token
        console.log("\nTesting Refresh Token route existence...");
        const refreshFailRes = await fetch(`${baseUrl}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: 'test_token' })
        });

        const data = await refreshFailRes.json();
        console.log(`Response Status: ${refreshFailRes.status}`);
        console.log("Response Data:", data);

        if (refreshFailRes.status !== 404) {
            console.log("✅ Route exists! The new deployment was successful.");
        } else {
            console.log("❌ Route still returns 404. Deployment did not take effect.");
        }

    } catch (e) {
        console.error("Test failed: Connection error", e);
    }
}

testRemoteAuthFlow();
