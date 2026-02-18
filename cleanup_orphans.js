const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const Campaign = require('./src/models/Campaign');
const Business = require('./src/models/Business');

// Load env
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/counpaign');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
};

const cleanup = async () => {
    await connectDB();

    try {
        console.log('Searching for orphaned campaign products...');

        // Find all products with campaignId
        const campaignProducts = await Product.find({ campaignId: { $ne: null } });
        console.log(`Found ${campaignProducts.length} products with campaignId.`);

        let deletedCount = 0;
        for (const product of campaignProducts) {
            const campaign = await Campaign.findById(product.campaignId);
            if (!campaign) {
                console.log(`orphaned product found: ${product.name} (ID: ${product._id}) -> Campaign ${product.campaignId} missing.`);
                await Product.deleteOne({ _id: product._id });
                deletedCount++;
                console.log('Deleted orphaned product.');
            }
        }

        console.log(`Cleanup complete. Deleted ${deletedCount} orphaned products.`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.disconnect();
    }
};

cleanup();
