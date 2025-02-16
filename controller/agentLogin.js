const redis = require('../redisClient'); // Import the Redis client
const Employee = require('../schema/employee_Schema');

const VALID_QUERY_TYPES = ["Billing", "Technical Support", "General Inquiry"]; // Allowed types


const agentLogin = async (req, res, next) => {
    try {
        const { agentId, password, queryType } = req.body;

        if (!agentId || !password) {
            return res.status(400).json({ message: 'AgentId and password are required!' });
        }

        const agent = await Employee.findOne({ agentId });

        if (!agent) {
            return res.status(404).json({ message: 'Agent not found!' });
        }

        if (password !== agent.password) {
            return res.status(401).json({ message: 'Invalid credentials!' });
        }        

        if (!VALID_QUERY_TYPES?.includes(queryType)) res.status(200).json({
            message: 'Invalid Query type',
            agent: { agentId, password, queryType }
        });

        // Add agent to Redis queue
        await redis.lpush(`agentQueue:${queryType}`, JSON.stringify({ agentId, name: agent.name, queryType }));

        res.status(200).json({
            message: 'Agent logged in successfully and added to queue!',
            agent: { id: agent._id, name: agent.name, email: agent.email }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { agentLogin };
