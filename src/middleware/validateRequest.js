const Joi = require('joi');

const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join(', ');
            console.log("❌ Validation Error:", errorMessage);
            return res.status(400).json({ error: errorMessage });
        }

        next();
    };
};

module.exports = validateRequest;
