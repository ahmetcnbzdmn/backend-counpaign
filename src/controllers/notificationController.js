const { getMessaging } = require('../utils/firebaseAdmin');
const Customer = require('../models/Customer');
const Business = require('../models/Business');
const Notification = require('../models/Notification');

// Helper to chunk tokens (FCM multicast limit is 500)
const chunkArray = (myArray, chunk_size) => {
    let index = 0;
    const arrayLength = myArray.length;
    const tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        const myChunk = myArray.slice(index, index + chunk_size);
        tempArray.push(myChunk);
    }

    return tempArray;
}

const sendFCM = async (tokens, title, body) => {
    const messaging = getMessaging();
    if (!messaging) {
        console.warn("⚠️ Cannot send FCM: Firebase Admin not initialized.");
        return false;
    }

    try {
        // Filter empty tokens
        const validTokens = tokens.filter(t => t && t.length > 20); // Basic validation
        if (validTokens.length === 0) return false;

        const batches = chunkArray(validTokens, 500);
        let successCount = 0;

        for (const batch of batches) {
            const message = {
                notification: { title, body },
                tokens: batch
            };

            const response = await messaging.sendEachForMulticast(message);
            successCount += response.successCount;

            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        // failedTokens.push(batch[idx]);
                        // Optional: Remove invalid tokens from DB here
                    }
                });
                console.log(`[FCM] Batch had ${response.failureCount} failures.`);
            }
        }

        console.log(`[FCM] Successfully sent to ${successCount} devices.`);
        return true;
    } catch (error) {
        console.error("FCM Send Error:", error);
        return false;
    }
};

// Send Bulk Notification to Users
exports.sendToUsers = async (req, res) => {
    const { userIds, title, body, sendToAll } = req.body;

    if (!title || !body) {
        return res.status(400).json({ message: 'Başlık ve mesaj içeriği zorunludur.' });
    }

    try {
        let targets = [];

        if (sendToAll) {
            targets = await Customer.find({}, '_id fcmToken');
        } else if (userIds && userIds.length > 0) {
            targets = await Customer.find({ _id: { $in: userIds } }, '_id fcmToken');
        }

        if (targets.length === 0) {
            return res.status(404).json({ message: 'Hedef kullanıcı bulunamadı.' });
        }

        // Create Notifications in DB (Optimized insert)
        const notifications = targets.map(user => ({
            title,
            body,
            targetCustomer: user._id,
            type: 'USER',
            isRead: false
        }));

        await Notification.insertMany(notifications);

        // Send FCM
        const tokens = targets.map(u => u.fcmToken);
        sendFCM(tokens, title, body); // Fire and forget (don't wait for all batches)

        res.json({ message: `${targets.length} kullanıcıya bildirim gönderildi.` });
    } catch (err) {
        console.error("Send Users Notification Error:", err);
        res.status(500).json({ message: 'Bildirim gönderilemedi.' });
    }
};

// Send to Business (Single or Bulk)
exports.sendToBusiness = async (req, res) => {
    const { businessIds, title, body, sendToAll } = req.body;

    if (!title || !body) {
        return res.status(400).json({ message: 'Başlık ve mesaj içeriği zorunludur.' });
    }

    try {
        let targets = [];

        if (sendToAll) {
            targets = await Business.find({}, '_id');
        } else if (businessIds && businessIds.length > 0) {
            targets = await Business.find({ _id: { $in: businessIds } }, '_id');
        }

        if (targets.length === 0) {
            return res.status(404).json({ message: 'Hedef işletme bulunamadı.' });
        }

        // Create Notifications in DB
        const notifications = targets.map(biz => ({
            title,
            body,
            targetBusiness: biz._id,
            type: 'BUSINESS',
            isRead: false
        }));

        await Notification.insertMany(notifications);

        // Notify via Socket.IO if connected?
        // (Implementation pending)

        res.json({ message: `${targets.length} işletmeye bildirim gönderildi.` });
    } catch (err) {
        console.error("Send Business Notification Error:", err);
        res.status(500).json({ message: 'Bildirim gönderilemedi.' });
    }
};

// Get My Notifications (For Business Context)
exports.getMyNotifications = async (req, res) => {
    try {
        // Assuming req.user is set by authMiddleware
        // For business users, req.user.id is the business ID
        let businessId = req.user.id;

        // If super admin looking at business context (rare, but possible)
        if (req.user.role === 'super_admin' && req.query.businessId) {
            businessId = req.query.businessId;
        } else if (req.user.businessId) {
            // Some auth flows might attach businessId separately
            businessId = req.user.businessId;
        }

        console.log(`[getMyNotifications] User: ${req.user.username || 'N/A'}, Role: ${req.user.role}, Target BusinessId: ${businessId}`);

        if (!businessId) {
            return res.status(400).json({ message: 'İşletme kimliği bulunamadı.' });
        }

        const notifications = await Notification.find({ targetBusiness: businessId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(notifications);
    } catch (err) {
        console.error("Get My Notifications Error:", err);
        res.status(500).json({ message: 'Bildirimler alınamadı.' });
    }
};

// Get User Notifications (For Customer App)
exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id; // From verifyToken

        const notifications = await Notification.find({ targetCustomer: userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(notifications);
    } catch (err) {
        console.error("Get User Notifications Error:", err);
        res.status(500).json({ message: 'Bildirimler alınamadı.' });
    }
};

// Mark as Read
exports.markAsRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'İşlem başarısız.' });
    }
};
