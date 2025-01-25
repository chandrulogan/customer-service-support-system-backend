const express = require('express');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
const { createServer } = require('http');
const connectDatabase = require('./database/db');
const Queue = require('./schema/queue_Schema');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Redis setup for Pub/Sub
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
connectDatabase();

// **Socket.IO - Real-Time Events**
io.on('connection', (socket) => {
    console.log('Queue Service connected:', socket.id);

    // Listen for 'agent-logged-in' event
    socket.on('agent-logged-in', (data) => {
        console.log('Agent Logged In:', data);
        // You can implement your logic here when an agent logs in.
        // For example, update the UI or notify other parts of the system.
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Queue Service disconnected:', socket.id);
    });
});

// **Queue Status Endpoint**
app.get('/queue-status', async (req, res, next) => {
    try {
        const queue = await Queue.find()
            .populate('customer')
            .populate('assignedAgent');
        res.status(200).json(queue);
    } catch (error) {
        next(error);
    }
});

// **Start the Server**
const PORT = process.env.PORT || 3004;
server.listen(PORT, () => console.log(`Queue Service running on port ${PORT}`));
