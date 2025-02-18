const redis = require('../redisClient'); // Import the Redis client
const Employee = require('../schema/employee_Schema');

const VALID_QUERY_TYPES = ["Billing", "Technical Support", "General Inquiry"]; // Allowed types

const agentLogin = async (req, res, next) => {
    try {
        const { agentId, password, queryType } = req.body;

        if (!agentId || !password || !queryType) {
            return res.status(400).json({ message: 'AgentId, password, and queryType are required!' });
        }

        // Validate queryType
        if (!VALID_QUERY_TYPES.includes(queryType)) {
            return res.status(400).json({
                message: `Invalid query type. Allowed values: ${VALID_QUERY_TYPES.join(", ")}`,
            });
        }

        // Find agent in DB
        const agent = await Employee.findOne({ agentId });

        if (!agent) {
            return res.status(404).json({ message: 'Agent not found!' });
        }

        if (password !== agent.password) {
            return res.status(401).json({ message: 'Invalid credentials!' });
        }

        // Add agent to Redis queue
        await redis.lpush(`agentQueue:${queryType}`, JSON.stringify({ agentId, name: agent.name, queryType }));

        // 🔹 Publish an event to notify the worker that an agent has joined
        const message = JSON.stringify({ queryType }); // Fix here
        console.log("📤 Publishing message to Redis:", message);
        await redis.publish("queueUpdate", message);


        res.status(200).json({
            message: 'Agent logged in successfully and added to queue!',
            agent: { id: agent._id, name: agent.name, email: agent.email, queryType }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { agentLogin };
