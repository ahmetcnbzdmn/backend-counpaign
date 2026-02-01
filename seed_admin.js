const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/counpaign');
        console.log('✅ MongoDB Connected');

        // Check if super admin already exists
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('⚠️  Super admin already exists!');
            console.log('Username: admin');
            process.exit(0);
        }

        // Create super admin
        const superAdmin = new Admin({
            username: 'admin',
            password: 'admin123', // Bu şifre hash'lenecek
            role: 'super_admin',
            email: 'admin@counpaign.com'
        });

        await superAdmin.save();
        console.log('✅ Super Admin created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Login Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  IMPORTANT: Change this password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
