const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// Get all products for a business (Public or Auth)
exports.getBusinessProducts = async (req, res) => {
    try {
        const { businessId } = req.params;
        const products = await Product.find({ business: businessId }).sort({ isPopular: -1, createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new product
exports.createProduct = async (req, res) => {
    try {
        const businessId = req.user.id; // From auth middleware (firm admin)
        const { name, description, price, isPopular, discount, isAvailable } = req.body;

        const product = new Product({
            business: businessId,
            name,
            description,
            price: Number(price),
            discount: Number(discount) || 0,
            isPopular: isPopular === 'true' || isPopular === true,
            isAvailable: isAvailable !== 'false' && isAvailable !== false,
            imageUrl: req.file ? `/uploads/products/${req.file.filename}` : null
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        if (req.file) {
            // Cleanup uploaded file on error
            fs.unlink(req.file.path, () => { });
        }
        res.status(400).json({ error: error.message });
    }
};

// Update a product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.id;
        const updates = { ...req.body };

        const product = await Product.findOne({ _id: id, business: businessId });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (req.file) {
            // Delete old image if exists
            if (product.imageUrl) {
                const oldPath = path.join(__dirname, '../../', product.imageUrl);
                if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => { });
            }
            updates.imageUrl = `/uploads/products/${req.file.filename}`;
        }

        if (updates.isPopular !== undefined) {
            updates.isPopular = updates.isPopular === 'true' || updates.isPopular === true;
        }
        if (updates.isAvailable !== undefined) {
            updates.isAvailable = updates.isAvailable === 'true' || updates.isAvailable === true;
        }
        if (updates.discount !== undefined) {
            updates.discount = Number(updates.discount) || 0;
        }
        if (updates.price !== undefined) {
            updates.price = Number(updates.price);
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
        res.json(updatedProduct);
    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        res.status(400).json({ error: error.message });
    }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.id;
        const { force } = req.query; // Check for force parameter

        console.log(`[DELETE PRODUCT] Request for ${id} (Force: ${force})`);

        const product = await Product.findOne({ _id: id, business: businessId });
        if (!product) {
            console.log(`[DELETE PRODUCT] Product not found or unauthorized: ${id}`);
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if product is used in any active or future campaign
        const Campaign = require('../models/Campaign');
        const activeCampaigns = await Campaign.find({
            businessId: businessId,
            'menuItems.productId': id
        });

        console.log(`[DELETE PRODUCT] Active campaigns found: ${activeCampaigns.length}`);

        if (activeCampaigns.length > 0 && force !== 'true') {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Bu ürün aktif kampanyalarda kullanılıyor. Silerseniz kampanyalar da silinecektir.',
                campaigns: activeCampaigns.map(c => c.title)
            });
        }

        // If force is true, delete the campaigns first
        if (activeCampaigns.length > 0 && force === 'true') {
            console.log(`[DELETE PRODUCT] Deleting ${activeCampaigns.length} campaigns via Cascade...`);

            // Collect campaign IDs to release other products
            const campaignIds = activeCampaigns.map(c => c._id);

            // Delete ALL products linked to these campaigns (e.g. "Fırsatlar" bundle products)
            // This prevents "zombie" products that are locked in the UI
            const productDeleteResult = await Product.deleteMany({ campaignId: { $in: campaignIds } });
            console.log(`[DELETE PRODUCT] Cascade deleted ${productDeleteResult.deletedCount} campaign bundle products.`);

            const deleteResult = await Campaign.deleteMany({
                businessId: businessId,
                'menuItems.productId': id
            });
            console.log(`[DELETE PRODUCT] Campaigns deleted: ${deleteResult.deletedCount}`);
        }

        // Delete the product
        console.log(`[DELETE PRODUCT] Deleting product ${id}...`);
        const prodDeleteResult = await Product.deleteOne({ _id: id, business: businessId });
        console.log(`[DELETE PRODUCT] Product deleted result:`, prodDeleteResult);

        // Delete image
        if (product.imageUrl) {
            const imagePath = path.join(__dirname, '../../', product.imageUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (err) => {
                    if (err) console.error('[DELETE PRODUCT] Image unlink error:', err);
                });
            }
        }

        res.json({ message: 'Product deleted successfully', deletedId: id });
    } catch (error) {
        console.error('[DELETE PRODUCT] Error:', error);
        res.status(500).json({ error: error.message });
    }
};
