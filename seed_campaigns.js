const mongoose = require('mongoose');
const Business = require('./src/models/Business');
const Campaign = require('./src/models/Campaign');

// Connection String (Local)
const MONGODB_URI = 'mongodb://localhost:27017/counpaign';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected for Campaign Seed'))
    .catch(err => console.log(err));

const seedCampaigns = async () => {
    try {
        // Clear existing campaigns
        await Campaign.deleteMany({});
        console.log('Cleared existing campaigns');

        // Get all businesses
        const businesses = await Business.find({});
        console.log(`Found ${businesses.length} businesses to seed campaigns for.`);

        for (const business of businesses) {
            const campaigns = [
                {
                    businessId: business._id,
                    title: 'HER 5. KAHVE HEDİYE',
                    shortDescription: 'Karekodu okut hediyeni kaçırma',
                    content: '5 kahve alımında 1 kahve bizden hediye! Karekodu okutarak pullarını biriktir.',
                    rewardType: 'stamp',
                    rewardValue: 1, // 1 stamp per scan
                    rewardValidityDays: 180,
                    icon: 'coffee_rounded',
                    isPromoted: true,
                    headerImage: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=80', // Coffee image
                    displayOrder: 1,
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // 1 year from now
                },
                {
                    businessId: business._id,
                    title: 'PUAN KAZAN',
                    shortDescription: 'Yaptığın her alışverişte puan kazan',
                    content: 'Harcamalarının %10\'u kadar puan kazan, dilediğin zaman harca.',
                    rewardType: 'points',
                    rewardValue: 100, // Updated points
                    rewardValidityDays: 365,
                    icon: 'star_rounded',
                    isPromoted: true,
                    headerImage: 'https://images.unsplash.com/photo-1533750349088-cd87741e8adb?auto=format&fit=crop&w=800&q=80', // Golden Stars/Confetti
                    displayOrder: 2,
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                }
            ];

            await Campaign.insertMany(campaigns);
            console.log(`Added campaigns for: ${business.companyName}`);
        }

        console.log('Campaign Seeding Complete');
        process.exit();

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedCampaigns();
