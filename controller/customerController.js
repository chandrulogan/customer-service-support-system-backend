const { Kafka } = require('kafkajs');
const Customer = require('../schema/customers_Schema');

// Kafka setup
const kafka = new Kafka({
    clientId: 'customer-service',
    brokers: ['<your-confluent-cloud-broker>']
});
const producer = kafka.producer();

const customerConnect = async (req, res, next) => {
    try {
        const { name, connect_Reason } = req.body;
        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required!' });
        }

        const newCustomer = new Customer({ name, connect_Reason });
        await newCustomer.save();

        // Send customer request to Kafka topic
        await producer.connect();
        await producer.send({
            topic: 'customer-queue',
            messages: [{ value: JSON.stringify({ id: newCustomer._id, name, connect_Reason }) }]
        });

        res.status(201).json({
            message: 'Customer connected successfully!',
            customer: { id: newCustomer._id, name }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { customerConnect };
