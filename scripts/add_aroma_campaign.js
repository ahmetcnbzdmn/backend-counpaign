const mongoose = require('mongoose');
const Business = require('./src/models/Business');
const Campaign = require('./src/models/Campaign');

// Connection
const MONGODB_URI = 'mongodb://localhost:27017/counpaign';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected for Aroma Campaign'))
    .catch(err => console.log(err));

const addAromaCampaign = async () => {
    try {
        // 1. Find or Create Aroma Kafe
        let business = await Business.findOne({ companyName: /Aroma Kafe/i });

        if (!business) {
            console.log('Aroma Kafe not found. Creating it...');
            business = await Business.create({
                companyName: 'Aroma Kafe',
                category: 'Kafe',
                address: 'Bahçelievler, Ankara',
                city: 'Ankara',
                district: 'Çankaya',
                phone: '0312 222 33 44',
                cardColor: '#D81B60', // Pinkish
                cardIcon: 'icecream', // Mapped to icecream_rounded in app
                stampsTarget: 5,
                totalPointsDistributed: 0,
                rating: 4.5
            });
            console.log(`Created new business: ${business.companyName}`);
        } else {
            console.log(`Found business: ${business.companyName}`);
        }

        // 2. Create Campaign (Turkish content to test auto-translation)
        const newCampaign = {
            businessId: business._id,
            title: 'Muffin Günleri Başladı!',
            shortDescription: '2 kahve alana 1 çikolatalı muffin hediye.',
            content: 'Aroma Kafe\'de bu aya özel kampanya! Herhangi 2 kahve siparişinde, el yapımı nefis çikolatalı muffin bizden. Tatlı krizine birebir!',
            rewardType: 'stamp', // Must be 'points' or 'stamp'
            rewardValue: 1,
            rewardValidityDays: 15,
            icon: 'icecream',
            isPromoted: true,
            headerImage: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=800&q=80', // Muffin/Cupcake image
            displayOrder: 1,
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)) // 1 month
        };

        const result = await Campaign.create(newCampaign);
        console.log('Successfully added campaign:', result.title);

        process.exit();
    } catch (err) {
        console.error('Error adding campaign:', err);
        process.exit(1);
    }
};

addAromaCampaign();
