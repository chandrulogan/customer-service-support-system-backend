const Customer = require('../../schema/customers_Schema');
const { producer, consumer } = require('../../kafkaConfig');

const customerConnect = async (req, res, next) => {
    try {
        const { name, connect_Reason } = req.body;
        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required!' });
        }

        const newCustomer = new Customer({ name, connect_Reason });
        await newCustomer.save();

        // Send customer request to Kafka topic
        try {
            await producer.send({
                topic: 'topic_0',
                messages: [{ value: JSON.stringify({ id: newCustomer._id, name, connect_Reason }) }]
            });
        } catch (kafkaError) {
            console.error('Kafka producer error:', kafkaError);
            return res.status(500).json({ message: 'Error sending message to Kafka' });
        }

        res.status(201).json({
            message: 'Customer connected successfully!',
            customer: { id: newCustomer._id, name }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { customerConnect };
