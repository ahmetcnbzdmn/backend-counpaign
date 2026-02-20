const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');
const Campaign = require('./src/models/Campaign');
const Participation = require('./src/models/Participation');

const MONGODB_URI = 'mongodb://localhost:27017/counpaign';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected for Participation Seed'))
    .catch(err => console.log(err));

const seedParticipations = async () => {
    try {
        const customer = await Customer.findOne();
        if (!customer) {
            console.log('No customers found. Please seed customers first.');
            process.exit();
        }

        const campaigns = await Campaign.find().limit(3);
        if (campaigns.length < 3) {
            console.log('Not enough campaigns found. Please run seed_campaigns.js first.');
            process.exit();
        }

        const participations = [
            {
                customer: customer._id,
                campaign: campaigns[0]._id,
                business: campaigns[0].businessId,
                status: 'JOINED'
            },
            {
                customer: customer._id,
                campaign: campaigns[1]._id,
                business: campaigns[1].businessId,
                status: 'WON',
                wonAt: new Date()
            },
            {
                customer: customer._id,
                campaign: campaigns[2]._id,
                business: campaigns[2].businessId,
                status: 'JOINED'
            }
        ];

        for (const data of participations) {
            const exists = await Participation.findOne({
                customer: data.customer,
                campaign: data.campaign
            });

            if (!exists) {
                const p = new Participation(data);
                await p.save();
                console.log(`Added Participation for customer: ${customer.name} in campaign: ${campaigns.find(c => c._id.equals(data.campaign)).title}`);
            } else {
                console.log(`Skipped: Participation already exists.`);
            }
        }

        console.log('Participation Seeding Complete');
        process.exit();
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
};

seedParticipations();
