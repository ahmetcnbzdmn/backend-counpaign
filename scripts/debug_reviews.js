require('dotenv').config();
const mongoose = require('mongoose');
const Review = require('./src/models/Review');
const Customer = require('./src/models/Customer');
const Business = require('./src/models/Business');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        console.log("--- ALL REVIEWS ---");
        const reviews = await Review.find({});
        console.log(`Found ${reviews.length} reviews.`);

        for (const r of reviews) {
            console.log(`\nReview ID: ${r._id}`);
            console.log(`  Customer ID: ${r.customer}`);
            console.log(`  Business ID: ${r.business}`);
            console.log(`  Rating: ${r.rating}`);

            // Check if Customer exists
            const customer = await Customer.findById(r.customer);
            console.log(`  -> Customer Found: ${customer ? 'YES' : 'NO'} (${customer?.username || 'No Name'})`);

            // Check if Business exists
            const business = await Business.findById(r.business);
            console.log(`  -> Business Found: ${business ? 'YES' : 'NO'} (${business?.companyName})`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
};

run();
