const Employee = require('../../schema/employee_Schema');
const { producer } = require('../../kafkaConfig');

const agentLogin = async (req, res, next) => {
    try {
        const { agentId, password } = req.body;

        if (!agentId || !password) {
            return res.status(400).json({ message: 'AgentId and password are required!' });
        }

        const agent = await Employee.findOne({ agentId });
        
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found!' });
        }

        // In a real-world app, compare hashed passwords (e.g., bcrypt.compare)
        if (password !== agent.password) {
            return res.status(401).json({ message: 'Invalid credentials!' });
        }

        // Send login event to Kafka
        try {
            await producer.send({
                topic: 'topic_2',
                messages: [{ value: JSON.stringify({ agent }) }]
            });
        } catch (kafkaError) {
            console.error('Kafka producer error:', kafkaError);
            return res.status(500).json({ message: 'Error sending login event to Kafka' });
        }

        res.status(200).json({
            message: 'Agent logged in successfully!',
            agent: { id: agent._id, name: agent.name, email: agent.email }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { agentLogin };
