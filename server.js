require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
const { createServer } = require('http');
const connectDatabase = require('./database/db');
const Customer = require('./schema/customers_Schema');
const { producer, consumer, connectKafka } = require('./kafkaConfig');

// Initialize Express Application
const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// **Redis Setup**
const pubClient = createClient({ url: process.env.REDIS_CONNECTION_STRING });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
        console.log('Connected to Redis');
        io.adapter(createAdapter(pubClient, subClient));
    })
    .catch((err) => console.error('Redis connection error:', err));

// **Kafka Setup**
connectKafka().catch((err) => console.error("Error connecting to Kafka:", err));

// **Middleware to parse JSON requests**
app.use(express.json());

// **Connect to MongoDB**
connectDatabase();

// **Socket.IO - Handle Real-Time Connections**
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// **API Endpoint: Add a Customer**
app.post('/customer-connect', async (req, res, next) => {
    try {
        const { name, connect_Reason } = req.body;

        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required' });
        }

        // Step 1: Create the customer object
        const customerId = Date.now(); // Generate unique ID
        const newCustomer = { id: customerId, name, connect_Reason, status: 'Pending', createdAt: new Date() };

        // Step 2: Save customer to Redis queue
        await pubClient.lPush('customerQueue', JSON.stringify(newCustomer));

        // Step 3: Save customer to MongoDB
        const savedCustomer = new Customer(newCustomer);
        await savedCustomer.save();

        // Step 4: Emit real-time event for new customer connection
        io.emit('customer-connected', {
            message: 'A new customer has connected',
            customer: newCustomer,
        });

        // Step 5: Produce Kafka message with customer data
        await producer.send({
            topic: 'topic_0',
            messages: [{ key: newCustomer.id.toString(), value: JSON.stringify(newCustomer), partition: 0 }],
        });
        console.log(`Kafka message produced for customer: ${newCustomer.id}`);

        res.status(201).json({ message: 'Customer connected successfully', customer: newCustomer });
    } catch (error) {
        console.error('Error in customer-connect:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// **Start Kafka Consumer**
async function startConsumer() {
    await consumer.subscribe({ topic: 'topic_0', fromBeginning: true });
    console.log('Kafka consumer subscribed to topic: customerTopic');

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const customer = JSON.parse(message.value.toString());
            console.log(`Consumed message from topic ${topic}:`, customer);

            // Add additional processing logic if needed
        },
    });
}

startConsumer().catch((err) =>
    console.error('Error in Kafka consumer:', err.message)
);

// **Global Error Handling Middleware**
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// **Start the Server**
const PORT = 3004;
server.listen(PORT, () => console.log(`Customer Service running on port ${PORT}`));
