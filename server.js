// customer-service.js
const express = require('express');
const connectDatabase = require('./database/db');
const Customer = require('./schema/customers_Schema');
require('dotenv').config();

const app = express();
app.use(express.json());
connectDatabase();

// Add a customer
app.post('/customer-connect', async (req, res, next) => {
    try {
        const { name, connect_Reason } = req.body;

        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required' });
        }

        const newCustomer = new Customer({ name, connect_Reason });
        await newCustomer.save();

        res.status(201).json({ message: 'Customer connected successfully', customer: newCustomer });
    } catch (error) {
        next(error);
    }
});

// Start the server
app.listen(3004, () => console.log('Customer Service running on port 3004'));
