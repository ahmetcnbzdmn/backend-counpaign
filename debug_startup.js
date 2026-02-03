try {
    console.log("1. Loading authMiddleware...");
    const auth = require('./src/middleware/authMiddleware');
    console.log("   ✅ authMiddleware loaded. Type:", typeof auth);
    console.log("   Exports:", Object.keys(auth));

    console.log("2. Loading Review Model...");
    require('./src/models/Review');
    console.log("   ✅ Review Model loaded.");

    console.log("3. Loading review.routes...");
    require('./src/routes/review.routes');
    console.log("   ✅ review.routes loaded.");

    console.log("4. Loading app.js...");
    require('./src/app');
    console.log("   ✅ app.js loaded.");

    console.log("🎉 ALL CHECKS PASSED. The code seems syntactically correct.");
} catch (error) {
    console.error("❌ STARTUP ERROR:", error);
    process.exit(1);
}
