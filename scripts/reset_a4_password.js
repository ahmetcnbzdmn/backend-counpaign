const mongoose = require('mongoose');
const Business = require('./src/models/Business');

// Constructed URI with provided credentials and 'counpaign' db name
const MONGO_URI = 'mongodb+srv://ahmetcanbozduman_db_user:wDPJkRg46zDQRYb9@cluster0.8bmz9ir.mongodb.net/counpaign?appName=Cluster0';

async function resetPassword() {
    try {
        console.log('Connecting to Atlas...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to Atlas MongoDB');

        // Initial check to see what's in there
        // const businesses = await Business.find({}, 'companyName email');
        // console.log('Found businesses:', businesses.map(b => b.companyName));

        const email = 'a4@counpaign.com';
        const business = await Business.findOne({ email: email });

        if (!business) {
            console.log(`❌ Business with email ${email} not found.`);
            // Try by ID just in case
            const id = '697f20a2319a7488d9c56dc8';
            const busById = await Business.findById(id);
            if (busById) {
                console.log(`✅ Found by ID: ${busById.companyName}`);
                busById.password = '123456';
                await busById.save();
                console.log('Password updated.');
                process.exit(0);
            }
            process.exit(1);
        }

        console.log(`✅ Found business: ${business.companyName} (${business._id})`);

        // Update password
        business.password = '123456';
        await business.save(); // Pre-save hook will hash it

        console.log('🔒 Password reset successfully to 123456');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

resetPassword();
