const mongoose = require('mongoose');
const Business = require('./src/models/Business');
const Campaign = require('./src/models/Campaign');

// Connection
const MONGODB_URI = 'mongodb://localhost:27017/counpaign';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected for A4 Campaign'))
    .catch(err => console.log(err));

const addA4Campaign = async () => {
    try {
        // 1. Find A4 Kahve
        let business = await Business.findOne({ companyName: /A4 Kahve/i });

        if (!business) {
            console.log('A4 Kahve not found. Creating it...');
            business = await Business.create({
                companyName: 'A4 Kahve',
                category: 'Kafe',
                address: 'Kızılay, Ankara', // Dummy default
                city: 'Ankara',
                district: 'Çankaya',
                phone: '0555 555 55 55',
                cardColor: '#6F4E37', // Coffee brown
                cardIcon: 'coffee_rounded',
                stampsTarget: 8,
                totalPointsDistributed: 0,
                rating: 4.8
            });
            console.log(`Created new business: ${business.companyName}`);
        } else {
            console.log(`Found business: ${business.companyName}`);
        }

        // 2. Create Campaign
        const newCampaign = {
            businessId: business._id,
            title: 'A4 Özel Filtre Kahve Fırsatı',
            shortDescription: 'Filtre kahve alana kurabiye ikramı!',
            content: 'A4 Kahve\'nin eşsiz filtre kahvesini deneyimle, yanında el yapımı kurabiye bizden olsun. Sadece uygulama kullanıcılarına özel.',
            rewardType: 'stamp', // Changed from item to stamp
            rewardValue: 1,
            rewardValidityDays: 30,
            icon: 'cookie_rounded', // Ensure this maps or use generic
            isPromoted: true,
            headerImage: 'https://images.unsplash.com/photo-1517701604599-bb29b5c7dd9b?auto=format&fit=crop&w=800&q=80', // Cafe vibe
            displayOrder: 1,
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)) // 3 months
        };

        const result = await Campaign.create(newCampaign);
        console.log('Successfully added campaign:', result.title);

        process.exit();
    } catch (err) {
        console.error('Error adding campaign:', err);
        process.exit(1);
    }
};

addA4Campaign();
