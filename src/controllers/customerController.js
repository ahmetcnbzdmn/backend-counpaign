const Customer = require('../models/Customer');

exports.getProfile = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user.id).select('-password');
        if (!customer) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        res.json(customer);
    } catch (err) {
        console.error("Get Profile Error:", err);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, surname, email, phoneNumber, profileImage, gender, birthDate } = req.body;

        // Build update object
        const updates = {};
        if (name) updates.name = name;
        if (surname) updates.surname = surname;
        if (email) updates.email = email;
        if (phoneNumber) updates.phoneNumber = phoneNumber;
        if (profileImage !== undefined) updates.profileImage = profileImage;
        if (gender !== undefined) updates.gender = gender;
        if (birthDate !== undefined) updates.birthDate = birthDate;

        const customer = await Customer.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        res.json(customer);
    } catch (err) {
        console.error("Update Profile Error:", err);
        res.status(500).json({ error: 'Güncelleme hatası possibly duplicate valid fields.' });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await require('../models/Transaction').find({ customer: req.user.id })
            .populate('business', 'companyName logo cardColor')
            .populate('review') // Include review details
            .sort({ createdAt: -1 }); // Newest first

        res.json(transactions);
    } catch (err) {
        console.error("Get Transactions Error:", err);
        res.status(500).json({ error: 'İşlem geçmişi alınamadı.' });
    }
};
