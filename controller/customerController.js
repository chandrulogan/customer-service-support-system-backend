const Customer = require('../schema/customers_Schema');
const redis = require('../redisClient'); // Import Redis client
const { v4: uuidv4 } = require('uuid'); // Import UUID for unique IDs

const VALID_QUERY_TYPES = ["Billing", "Technical Support", "General Inquiry"]; // Allowed types

const customerConnect = async (req, res, next) => {
    try {
        const { name, connect_Reason, user_id } = req.body;

        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required!' });
        }

        if (!VALID_QUERY_TYPES.includes(connect_Reason)) {
            return res.status(400).json({
                message: `Invalid connect reason. Allowed values: ${VALID_QUERY_TYPES.join(", ")}`,
            });
        }

        // 🔹 Check if customer already exists
        let existingCustomer = await Customer.findOne({ name, connect_Reason });

        let customerId;
        if (existingCustomer) {
            customerId = user_id; // Use existing ID
            console.log(`🔄 Existing customer found: ${customerId}`);
        } else {
            // 🔹 Generate a new unique ID
            customerId = uuidv4();

            // Save new customer to database
            const newCustomer = new Customer({ _id: customerId, name, connect_Reason });
            await newCustomer.save();
            console.log(`✅ New customer created: ${customerId}`);
        }

        // 🔹 Add customer to the Redis queue
        const customerData = JSON.stringify({ id: customerId, name, connect_Reason });
        await redis.lpush(`customerQueue:${connect_Reason}`, customerData);

        // 🔹 Publish an event to notify the worker that a customer has joined
        const message = JSON.stringify({ queryType: connect_Reason });
        console.log("📤 Publishing message to Redis:", message);
        await redis.publish("queueUpdate", message);

        res.status(201).json({
            message: 'Customer connected successfully and added to queue!',
            customer: { id: customerId, name, connect_Reason }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { customerConnect };
