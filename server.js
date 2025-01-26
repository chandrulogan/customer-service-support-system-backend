require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
const { createServer } = require('http');
const connectDatabase = require('./database/db');
const Customer = require('./schema/customers_Schema');

// Initialize Express and Socket.IO
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Redis Setup
const pubClient = createClient({
    url: process.env.REDIS_CONNECTION_STRING,
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
        console.log('Connected to Redis');
        io.adapter(createAdapter(pubClient, subClient));
    })
    .catch((err) => console.error('Redis connection error:', err));

// Middleware to parse JSON
app.use(express.json());

// Connect to MongoDB
connectDatabase();

// **Socket.IO - Real-Time Events**
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// **Add a Customer**
// **Add a Customer**
app.post('/customer-connect', async (req, res, next) => {
    try {
        const { name, connect_Reason } = req.body;

        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required' });
        }

        // Step 1: Create the customer object
        const customerId = Date.now(); // Unique ID for Redis and MongoDB
        const newCustomer = { id: customerId, name, connect_Reason, status: 'Pending', createdAt: new Date() };

        // Step 2: Save to Redis
        await pubClient.lPush('customerQueue', JSON.stringify(newCustomer)); // Add to Redis list

        // Step 3: Save to MongoDB
        const savedCustomer = new Customer(newCustomer);
        await savedCustomer.save();

        // Step 4: Emit a real-time event to notify connected clients
        io.emit('customer-connected', {
            message: 'A new customer has connected',
            customer: newCustomer,
        });

        res.status(201).json({
            message: 'Customer connected successfully',
            customer: newCustomer,
        });
    } catch (error) {
        console.error('Error in customer-connect:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});


// **Error Handling Middleware**
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// **Start the Server**
const PORT = 3004;
server.listen(PORT, () => console.log(`Customer Service running on port ${PORT}`));
