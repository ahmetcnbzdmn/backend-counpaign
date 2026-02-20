const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');
require('dotenv').config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Force update or create 'admin'
        let admin = await Admin.findOne({ username: 'admin' });

        if (!admin) {
            console.log('Admin not found, creating new admin...');
            admin = new Admin({
                username: 'admin',
                role: 'super_admin',
                email: 'admin@counpaign.com'
            });
        } else {
            console.log('Updating existing admin...');
        }

        // This will trigger the pre-save hook and re-hash the password
        admin.password = 'admin123';

        await admin.save();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Admin Password Reset Complete!');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting admin:', error);
        process.exit(1);
    }
};

resetAdmin();
