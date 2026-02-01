const authMiddleware = require('./authMiddleware');

module.exports = (req, res, next) => {
    // First run the standard auth middleware to decode token
    authMiddleware(req, res, () => {
        // Check if user has business role/permissions
        // Adjust this logic based on your User model and Role system
        // Assuming req.user is populated by authMiddleware

        if (req.user && (req.user.role === 'business' || req.user.role === 'admin' || req.user.role === 'super_admin')) {
            next();
        } else {
            return res.status(403).json({ message: 'Erişim engellendi. Bu işlem sadece işletmeler içindir.' });
        }
    });
};
