// auth-service.js
const express = require('express');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const connectDatabase = require('./database/db');
const Organisation = require('./schema/organisation_Schema');

const app = express();
app.use(express.json());
connectDatabase();

// Signup route
app.post(
    '/organisation-signup',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { name, email, password } = req.body;
            const existingOrg = await Organisation.findOne({ email });

            if (existingOrg) {
                return res.status(400).json({ message: 'Email is already registered!' });
            }

            const newOrganisation = new Organisation({ name, email, password });
            await newOrganisation.save();

            res.status(201).json({ message: 'Signup successful', organisation: newOrganisation });
        } catch (error) {
            next(error);
        }
    }
);

// Start the server
app.listen(3001, () => console.log('Authentication Service running on port 3001'));
