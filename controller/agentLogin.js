const redis = require('../redisClient'); // Import the Redis client
const Employee = require('../schema/employee_Schema');
const jwt = require('jsonwebtoken');

const VALID_QUERY_TYPES = ["Billing", "Technical Support", "General Inquiry"]; // Allowed types

const agentLogin = async (req, res, next) => {
    try {
        const { agentId, password, companyName } = req.body;

        if (!agentId || !password) {
            return res.status(400).json({ message: 'AgentId, password, and queryType are required!' });
        }

        // Find agent in DB
        const agent = await Employee.findOne({ agentId });

        if (!agent) {
            return res.status(404).json({ message: 'Agent not found!' });
        }

        if (password !== agent.password) {
            return res.status(401).json({ message: 'Invalid credentials!' });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: agent?._id, organisation: agent?.organisation, number: agent?.number }, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });

        res.status(200).json({
            message: 'User Logged in successfully',
            agent,
            token
        });

    } catch (error) {
        next(error);
    }
};

const addAgentToQueue = async (req, res, next) => {
    const { agentId, queryType, tenentId } = req.body;

    // // Find agent in DB
    const agent = await Employee.findOne({ agentId });

    if (!agent) {
        return res.status(404).json({ message: 'Unable to find the user!. Try Again!' });
    }

    // Validate queryType
    if (!VALID_QUERY_TYPES.includes(queryType)) {
        return res.status(400).json({
            message: `Invalid query type. Allowed values: ${VALID_QUERY_TYPES.join(", ")}`,
        });
    }

    // Add agent to Redis queue
    await redis.lpush(`agentQueue:${queryType}`, JSON.stringify({ agentId, name: agent.name, queryType }));

    // 🔹 Publish an event to notify the worker that an agent has joined
    const message = JSON.stringify({ queryType }); // Fix here
    console.log("📤 Publishing message to Redis:", message);
    await redis.publish("queueUpdate", message);

    res.status(200).json({
        message: `Added in the ${queryType} queue`,
    });
}

module.exports = { agentLogin, addAgentToQueue };
