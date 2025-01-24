// organisation-service.js
const express = require('express');
const connectDatabase = require('./database/db');
require('dotenv').config();

const Organisation = require('./schema/organisation_Schema');

const app = express();
app.use(express.json());
connectDatabase();

// Get all organizations
app.get('/organizations', async (req, res, next) => {
    try {
        const organizations = await Organisation.find();
        res.status(200).json(organizations);
    } catch (error) {
        next(error);
    }
});

// Start the server
app.listen(3002, () => console.log('Organization Service running on port 3002'));
