const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017';

async function diagnose() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Root');

        const admin = mongoose.connection.db.admin();
        const listDatabasesResult = await admin.listDatabases();

        console.log('\n--- DATABASES ---');
        listDatabasesResult.databases.forEach(db => {
            console.log(`- ${db.name}`);
        });

        // Check specific DBs
        for (const dbName of ['counpaign']) {
            console.log(`\n--- INSPECTING DB: ${dbName} ---`);
            // To switch DB in Mongoose properly for native driver access:
            const targetDb = mongoose.connection.useDb(dbName).db;

            const collections = await targetDb.listCollections().toArray();
            console.log(`Collections: ${collections.map(c => c.name).join(', ')}`);

            const businessesCol = collections.find(c => c.name === 'businesses');
            if (businessesCol) {
                const count = await targetDb.collection('businesses').countDocuments();
                console.log(`> 'businesses' count: ${count}`);
                const docs = await targetDb.collection('businesses').find({}, { projection: { _id: 1, companyName: 1, email: 1 } }).toArray();
                console.log(`> Docs:`, JSON.stringify(docs, null, 2));
            } else {
                console.log(`> 'businesses' collection NOT found in ${dbName}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

diagnose();
