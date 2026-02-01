const Customer = require('../models/Customer');
const CustomerBusiness = require('../models/CustomerBusiness');
const Admin = require('../models/Admin');

// Get users based on role
// Super admin: all customers
// Business: only customers who have their business in wallet
exports.getUsers = async (req, res) => {
    try {
        const userId = req.user?.id;
        console.log('👥 Get users request - User ID:', userId);

        // Check if user is an admin (super_admin)
        const admin = await Admin.findById(userId);

        let customers;

        if (admin && admin.role === 'super_admin') {
            // Super admin sees all customers
            customers = await Customer.find()
                .select('-password')
                .sort({ createdAt: -1 });
            console.log(`✅ Fetched ${customers.length} customers (super admin)`);
        } else {
            // Business user sees only their customers
            // Find all CustomerBusiness relationships for this business
            const relations = await CustomerBusiness.find({ business: userId })
                .populate('customer', '-password')
                .sort({ joinedAt: -1 });

            customers = relations.map(relation => relation.customer).filter(c => c); // Filter out null customers
            console.log(`✅ Fetched ${customers.length} customers for business ${userId}`);
        }

        res.json(customers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Customer.findById(id).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get user's wallet cafes (CustomerBusiness relationships)
exports.getUserCafes = async (req, res) => {
    try {
        const { id } = req.params;

        const cafes = await CustomerBusiness.find({ customer: id })
            .populate('business', 'companyName category cardColor')
            .sort({ joinedAt: -1 });

        res.json(cafes);
    } catch (error) {
        console.error('Get user cafes error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update wallet record (points, stamps, gifts)
exports.updateWallet = async (req, res) => {
    try {
        const { id: userId, recordId } = req.params;
        const updates = req.body;

        const record = await CustomerBusiness.findById(recordId);

        if (!record) {
            return res.status(404).json({ error: 'Wallet record not found' });
        }

        // Update fields
        Object.keys(updates).forEach(key => {
            record[key] = updates[key];
        });

        // Auto-handle stamp completion
        const stampsTarget = record.stampsTarget || 6;
        if (record.stamps >= stampsTarget) {
            const completedGifts = Math.floor(record.stamps / stampsTarget);
            record.giftsCount += completedGifts;
            record.stamps = record.stamps % stampsTarget;
            console.log(`🎁 Auto-completed ${completedGifts} gift(s). New stamps: ${record.stamps}, New gifts: ${record.giftsCount}`);
        }

        await record.save();

        res.json({ message: 'Wallet updated successfully', record });
    } catch (error) {
        console.error('Update wallet error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete wallet record
exports.deleteWallet = async (req, res) => {
    try {
        const { id: userId, recordId } = req.params;

        const record = await CustomerBusiness.findByIdAndDelete(recordId);

        if (!record) {
            return res.status(404).json({ error: 'Wallet record not found' });
        }

        res.json({ message: 'Wallet record deleted successfully' });
    } catch (error) {
        console.error('Delete wallet error:', error);
        res.status(500).json({ error: error.message });
    }
};
