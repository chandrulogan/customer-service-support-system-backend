const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Server } = require('socket.io');
const { createServer } = require('http');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const connectDatabase = require('./database/db');
const Employees = require('./schema/employee_Schema');
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

// Redis Setup
const pubClient = createClient({
    url: process.env.REDIS_CONNECTION_STRING, // e.g., 'redis://default:<password>@<host>:<port>'
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
        console.log('Connected to Redis');
        io.adapter(createAdapter(pubClient, subClient));
    })
    .catch((err) => console.error('Redis connection error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(express.json());
connectDatabase();

// **Socket.IO - Real-Time Events**
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// **Add an Agent**
app.post('/add-agent', async (req, res, next) => {
    try {
        const { name, organisation, password } = req.body;

        if (!name || !organisation || !password) {
            return res.status(400).json({ message: 'Name, organisation, and password are required' });
        }

        // Check for duplicate name and organisation
        const existingEmployee = await Employees.findOne({ name, organisation });
        if (existingEmployee) {
            return res.status(400).json({ message: 'Agent already exists' });
        }

        // Create a new employee
        const newEmployee = new Employees({ name, organisation, password: password });
        await newEmployee.save();

        console.log('New Employee:', newEmployee);
        res.status(201).json({ message: 'Agent added successfully', agent: newEmployee });
    } catch (error) {
        console.error('Error adding agent:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// **Agent Login**
app.post('/login-agent', async (req, res, next) => {
    try {
        const { organisation, name, password } = req.body;

        // Step 1: Validate input
        if (!organisation || !name || !password) {
            return res.status(400).json({ message: 'Organisation, name, and password are required' });
        }

        // Step 2: Find the agent within the organisation
        const agent = await Employees.findOne({ organisation, name, password });
        if (!agent) {
            return res.status(400).json({ message: 'Agent not found within the organisation' });
        }


        // Step 5: Emit a real-time event for successful login
        io.emit('agent-logged-in', {
            message: 'An agent has logged in',
            agent: { id: agent._id, name: agent.name, organisation: agent.organisation },
        });

        // Respond with success
        res.status(200).json({
            message: 'Login successful',
        });
        
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});



// **Assign Agent to a Customer**
app.post('/assign-agent', async (req, res, next) => {
    try {
        const { agentId } = req.body;

        if (!agentId) {
            return res.status(400).json({ message: 'Agent ID is required' });
        }

        const nextCustomer = await Queue.findOne({ status: 'Pending' }).sort({ createdAt: 1 });
        if (!nextCustomer) {
            return res.status(404).json({ message: 'No customers in the queue' });
        }

        nextCustomer.assignedAgent = agentId;
        nextCustomer.status = 'In Progress';
        await nextCustomer.save();

        // Emit a real-time event for agent assignment
        io.emit('agent-assigned', {
            message: 'An agent has been assigned to a customer',
            queueItem: nextCustomer,
        });

        res.status(200).json({ message: 'Agent assigned successfully', queueItem: nextCustomer });
    } catch (error) {
        next(error);
    }
});

// **Start the Server**
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => console.log(`Agent Service running on port ${PORT}`));
