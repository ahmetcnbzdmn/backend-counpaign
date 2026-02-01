const mongoose = require('mongoose');
require('dotenv').config();

// Define minimal schemas just for counting
const adminSchema = new mongoose.Schema({}, { strict: false });
const businessSchema = new mongoose.Schema({}, { strict: false });

const Admin = mongoose.model('Admin', adminSchema);
const Business = mongoose.model('Business', businessSchema);

const checkData = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log('   URI:', process.env.MONGO_URI.replace(/:([^:@]+)@/, ':****@')); // Hide password in log

        await mongoose.connect(process.env.MONGO_URI);

        console.log('✅ Connected!');
        console.log('📚 Database Name:', mongoose.connection.name);
        console.log('host:', mongoose.connection.host);

        const adminCount = await Admin.countDocuments();
        const businessCount = await Business.countDocuments();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`👤 Admins Found: ${adminCount}`);
        console.log(`Pw Businesses Found: ${businessCount}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (businessCount === 0) {
            console.log('⚠️ WARNING: No businesses found. Check if collection name is "businesses" in Atlas.');
        } else {
            console.log('✅ Data exists in this database.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking data:', error);
        process.exit(1);
    }
};

checkData();
