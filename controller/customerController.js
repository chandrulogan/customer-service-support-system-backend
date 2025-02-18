const Customer = require('../schema/customers_Schema');
const redis = require('../redisClient'); // Import Redis client

const VALID_QUERY_TYPES = ["Billing", "Technical Support", "General Inquiry"]; // Allowed types

const customerConnect = async (req, res, next) => {
    try {
        const { name, connect_Reason } = req.body;

        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required!' });
        }

        if (!VALID_QUERY_TYPES.includes(connect_Reason)) {
            return res.status(400).json({
                message: `Invalid connect reason. Allowed values: ${VALID_QUERY_TYPES.join(", ")}`,
            });
        }

        // Save customer to database
        const newCustomer = new Customer({ name, connect_Reason });
        await newCustomer.save();

        // Add customer to the Redis queue (organized by query type)
        await redis.lpush(`customerQueue:${connect_Reason}`, JSON.stringify({
            id: newCustomer._id,
            name,
            connect_Reason
        }));

        // 🔹 Publish an event to notify the worker that a customer has joined
        const message = JSON.stringify({ queryType: connect_Reason }); // Fix here
        console.log("📤 Publishing message to Redis:", message);
        await redis.publish("queueUpdate", message);


        res.status(201).json({
            message: 'Customer connected successfully and added to queue!',
            customer: { id: newCustomer._id, name, connect_Reason }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { customerConnect };
