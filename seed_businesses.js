const mongoose = require('mongoose');
const Business = require('./src/models/Business');

// Connection String (Local)
const MONGODB_URI = 'mongodb://localhost:27017/counpaign'; // Matches .env(MONGODB_URI)

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected for Seed'))
    .catch(err => console.log(err));

const seedBusinesses = async () => {
    try {
        const businesses = [
            {
                companyName: 'Counpaign Coffee',
                email: 'coffee@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#EE2C2C', // Red
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'Bahçelievler'
            },
            {
                companyName: 'Starbucks Bağdat',
                email: 'sbux@example.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#00704A', // Green
                cardIcon: 'coffee_rounded',
                settings: { pointsPerVisit: 15 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'Kızılay'
            },
            {
                companyName: 'Espresso Lab',
                email: 'elab@example.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#000000', // Black
                cardIcon: 'coffee_rounded',
                settings: { pointsPerVisit: 12 },
                city: 'Ankara',
                district: 'Keçiören',
                neighborhood: 'Etlik'
            },
            {
                companyName: 'Burger King',
                email: 'bk@example.com',
                password: 'password123',
                category: 'Restaurant',
                cardColor: '#ED7707', // Orange
                cardIcon: 'lunch_dining_rounded',
                settings: { pointsPerVisit: 20 },
                city: 'Ankara',
                district: 'Yenimahalle',
                neighborhood: 'Batı Sitesi'
            },
            {
                companyName: 'KFC',
                email: 'kfc@example.com',
                password: 'password123',
                category: 'Restaurant',
                cardColor: '#A3080C', // Deep Red
                cardIcon: 'lunch_dining_rounded',
                settings: { pointsPerVisit: 25 },
                city: 'Ankara',
                district: 'Etimesgut',
                neighborhood: 'Eryaman'
            },
            {
                companyName: 'Mavi Jeans',
                email: 'mavi@example.com',
                password: 'password123',
                category: 'Clothing',
                cardColor: '#1E88E5', // Blue
                cardIcon: 'checkroom_rounded',
                settings: { pointsPerVisit: 50 },
                city: 'Ankara',
                district: 'Mamak',
                neighborhood: 'Abidinpaşa'
            },
            {
                companyName: 'Zara',
                email: 'zara@example.com',
                password: 'password123',
                category: 'Clothing',
                cardColor: '#181818', // Dark Grey
                cardIcon: 'checkroom_rounded',
                settings: { pointsPerVisit: 100 },
                city: 'Ankara',
                district: 'Gölbaşı',
                neighborhood: 'İncek'
            },
            // [NEW] Requested Businesses
            {
                companyName: 'Stock',
                email: 'stock@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#388E3C', // YEŞİL
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'Bahçelievler'
            },
            {
                companyName: 'A4 Kahve',
                email: 'a4@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#0D47A1', // LACİVERT
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'Bahçelievler'
            },
            {
                companyName: 'Nitka',
                email: 'nitka@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#1B5E20', // KOYU YEŞİL
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'Ayrancı'
            },
            {
                companyName: 'Rotpfau',
                email: 'rotpfau@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#D32F2F', // KIRMIZI
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'İşçi Blokları'
            },
            {
                companyName: 'Coffee and More',
                email: 'coffeeandmore@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#E6B800', // HARDAL RENGİ
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'Bahçelievler'
            },
            {
                companyName: 'Speco',
                email: 'speco@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#0097A7', // TURKUAZ
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'Bahçelievler'
            },
            {
                companyName: 'Pablo Artisan 100. Yıl',
                email: 'pablo100@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#212121', // SİYAH
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: '100. Yıl'
            },
            {
                companyName: 'Aroma Kafe',
                email: 'aroma@counpaign.com',
                password: 'password123',
                category: 'Cafe',
                cardColor: '#DAA520', // ALTIN RENGİ
                cardIcon: 'local_cafe_rounded',
                settings: { pointsPerVisit: 10 },
                city: 'Ankara',
                district: 'Çankaya',
                neighborhood: '100. Yıl'
            }
        ];

        // Clear existing
        await Business.deleteMany({});
        console.log('Cleared existing businesses');

        for (const data of businesses) {
            // Check if exists
            const exists = await Business.findOne({ email: data.email });
            if (!exists) {
                const b = new Business(data);
                await b.save();
                console.log(`Added: ${data.companyName}`);
            } else {
                console.log(`Skipped: ${data.companyName} (Exists)`);
            }
        }

        console.log('Seeding Complete');
        process.exit();

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedBusinesses();
