const Customer = require('../schema/customers_Schema');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Import UUID for unique IDs
const bcrypt = require('bcryptjs');
const redis = require('../redisClient'); // Import Redis client

const VALID_QUERY_TYPES = ["Billing", "Technical Support", "General Inquiry"]; // Allowed types

const customerConnect = async (req, res, next) => {
    try {
        const { name, connect_Reason, mobileNumber } = req.body;
        console.log("req", req.header);
        

        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required!' });
        }

        if (!VALID_QUERY_TYPES.includes(connect_Reason)) {
            return res.status(400).json({
                message: `Invalid connect reason. Allowed values: ${VALID_QUERY_TYPES.join(", ")}`,
            });
        }

        // 🔹 Generate a new unique ID
        let uniqueID = uuidv4();
        console.log(`✅ New customer created: ${uniqueID}`);

        // 🔹 Add customer to the Redis queue
        const customerData = JSON.stringify({ id: uniqueID, name, connect_Reason, mobileNumber });
        await redis.lpush(`customerQueue:${connect_Reason}`, customerData);

        // 🔹 Publish an event to notify the worker that a customer has joined
        const message = JSON.stringify({ queryType: connect_Reason });
        console.log("📤 Publishing message to Redis:", message);

        await redis.publish("queueUpdate", message);

        res.status(201).json({
            message: 'Customer connected successfully and added to queue!',
            customer: { id: uniqueID, name, connect_Reason, mobileNumber }
        });

    } catch (error) {
        next(error);
    }
};

const customerSignup = async (req, res, next) => {
    try {
        const { name, mobileNumber, password } = req.body;

        console.log("/customer/sign-up body", name, mobileNumber, password);

        if (!name || !mobileNumber || !password) {
            return res.status(400).json({ message: 'Name, mobileNumber, and password are required!' });
        }

        // Check if mobile number already exists
        const existingCustomer = await Customer.findOne({ mobileNumber });

        if (existingCustomer) {
            return res.status(400).json({ message: 'Customer already registered! Try signing in.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new customer
        const newCustomer = new Customer({ name, mobileNumber, password: hashedPassword, actualPasssword: password });
        await newCustomer.save();

        // Generate JWT Token
        const token = jwt.sign(
            { id: newCustomer._id, mobileNumber },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(201).json({
            message: 'Customer registered successfully!',
            result: { id: newCustomer._id, name, mobileNumber },
            token
        });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const customerSignIn = async (req, res) => {
    try {
        const { mobileNumber, password } = req.body;

        console.log("/customer/sign-in body", mobileNumber, password);

        if (!mobileNumber || !password) {
            return res.status(400).json({ message: 'Mobile number and password are required!' });
        }

        // Check if customer exists
        const existingCustomer = await Customer.findOne({ mobileNumber });

        if (!existingCustomer) {
            return res.status(400).json({ message: 'Cannot find customer!' });
        }

        console.log("existingCustomer", existingCustomer);

        // Compare the hashed password
        const passwordVerification = await bcrypt.compare(password, existingCustomer.password);

        if (!passwordVerification) {
            return res.status(400).json({ message: 'Password or mobile number is incorrect' });
        }

        // Generate JWT Token with necessary customer details
        const token = jwt.sign(
            { id: existingCustomer._id, mobileNumber: existingCustomer.mobileNumber, uniqueID: existingCustomer?.uniqueID },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            message: "User verified!",
            token
        });

    } catch (error) {
        console.error("Sign-in Error:", error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

module.exports = { customerConnect, customerSignup, customerSignIn };
