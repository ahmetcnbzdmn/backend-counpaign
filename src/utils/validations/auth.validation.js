const Joi = require('joi');

const authValidationSchema = {
    // Validation schema for customer registration
    register: Joi.object({
        name: Joi.string().trim().min(2).max(50).required().messages({
            'string.empty': 'İsim alanı boş bırakılamaz.',
            'string.min': 'İsim en az 2 karakter olmalıdır.',
            'any.required': 'İsim alanı zorunludur.'
        }),
        surname: Joi.string().trim().min(2).max(50).required().messages({
            'string.empty': 'Soyisim alanı boş bırakılamaz.',
            'string.min': 'Soyisim en az 2 karakter olmalıdır.',
            'any.required': 'Soyisim alanı zorunludur.'
        }),
        phoneNumber: Joi.string().pattern(/^5[0-9]{9}$/).required().messages({
            'string.pattern.base': 'Telefon numarası 5 ile başlamalı ve 10 hane olmalıdır.',
            'any.required': 'Telefon numarası zorunludur.'
        }),
        email: Joi.string().email().lowercase().trim().required().messages({
            'string.email': 'Lütfen geçerli bir e-posta adresi giriniz.',
            'any.required': 'E-posta alanı zorunludur.'
        }),
        password: Joi.string().min(6).required().messages({
            'string.min': 'Şifre en az 6 karakter olmalıdır.',
            'any.required': 'Şifre alanı zorunludur.'
        }),
        gender: Joi.string().valid('male', 'female', 'other', '').optional().allow(''),
        birthDate: Joi.date().iso().optional().allow(null)
    }),

    // Validation schema for customer login
    login: Joi.object({
        phoneNumber: Joi.string().pattern(/^5[0-9]{9}$/).required().messages({
            'string.pattern.base': 'Telefon numarası 5 ile başlamalı ve 10 hane olmalıdır.',
            'any.required': 'Telefon numarası zorunludur.'
        }),
        password: Joi.string().required().messages({
            'any.required': 'Şifre alanı zorunludur.'
        })
    }),

    // Validation schema for admin/business login
    adminLogin: Joi.object({
        username: Joi.string().required().messages({
            'string.empty': 'Kullanıcı adı veya e-posta zorunludur.'
        }),
        password: Joi.string().required().messages({
            'any.required': 'Şifre zorunludur.'
        })
    }),

    // Validation schema for email lookup
    lookupEmail: Joi.object({
        phoneNumber: Joi.string().pattern(/^5[0-9]{9}$/).required().messages({
            'string.pattern.base': 'Telefon numarası 5 ile başlamalı ve 10 hane olmalıdır.',
            'any.required': 'Telefon numarası zorunludur.'
        })
    }),

    // Validation schema for refresh token
    refreshToken: Joi.object({
        refreshToken: Joi.string().required().messages({
            'any.required': 'Refresh token zorunludur.'
        })
    })

};

module.exports = authValidationSchema;
