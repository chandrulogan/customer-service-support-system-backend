const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { body, validationResult } = require('express-validator'); // For input validation
const mongoose = require('mongoose');
const connectDatabase = require('./database/db');

const Organisation = require('./schema/organisation_Schema');
const Employees = require('./schema/employee_Schema');
const Customer = require('./schema/customers_Schema');
const Queue = require('./schema/queue_Schema');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const port = 1997;

// Middleware to parse JSON
app.use(express.json());

// Connect to MongoDB
connectDatabase();

// **Socket.IO**
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// **Basic GET route**
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// **Centralized Error Handling Middleware**
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// **Organisation Signup**
app.post(
    '/organisation-signup',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { name, email, password } = req.body;

            const existingOrg = await Organisation.findOne({ email });
            if (existingOrg) {
                return res.status(400).json({ message: 'Email is already registered!' });
            }

            const newOrganisation = new Organisation({ name, email, password });
            await newOrganisation.save();

            res.status(201).json({
                message: 'Organisation registered successfully!',
                organisation: { id: newOrganisation._id, name: newOrganisation.name },
            });
        } catch (error) {
            next(error); // Pass error to the error-handling middleware
        }
    }
);

// **Add Agent**
app.post('/add-agent', async (req, res, next) => {
    try {
        const { name, organisation } = req.body;

        if (!name || !organisation) {
            return res.status(400).json({ message: 'Name and organisation are required!' });
        }

        const existingEmployee = await Employees.findOne({ name, organisation });
        if (existingEmployee) {
            return res.status(400).json({ message: 'Agent already exists!' });
        }

        const newEmployee = new Employees({ name, organisation });
        await newEmployee.save();

        res.status(201).json({
            message: 'Agent added successfully!',
            agent: { id: newEmployee._id, name: newEmployee.name },
        });
    } catch (error) {
        next(error);
    }
});

// **Customer Connect**
app.post('/customer-connect', async (req, res, next) => {
    try {
        const { name, connect_Reason } = req.body;

        if (!name || !connect_Reason) {
            return res.status(400).json({ message: 'Name and connect reason are required!' });
        }

        const newCustomer = new Customer({ name, connect_Reason });
        await newCustomer.save();

        res.status(201).json({
            message: 'Customer connected successfully!',
            customer: { id: newCustomer._id, name: newCustomer.name },
        });
    } catch (error) {
        next(error);
    }
});

// **Add to Queue**
app.post('/real-time/add-to-queue', async (req, res, next) => {
    try {
        const { customerId, issue } = req.body;

        if (!customerId || !issue) {
            return res.status(400).json({ message: 'Customer ID and issue are required!' });
        }

        const newQueueItem = new Queue({ customer: customerId, issue });
        await newQueueItem.save();

        // Emit real-time update
        io.emit('customer-queue', {
            message: 'New customer added to queue.',
            queueItem: newQueueItem,
        });

        res.status(201).json({
            message: 'Customer added to queue successfully!',
            queueItem: newQueueItem,
        });
    } catch (error) {
        next(error);
    }
});

// **Queue Status**
app.get('/queue-status', async (req, res, next) => {
    try {
        const queue = await Queue.find()
            .populate('customer', 'name connect_Reason')
            .populate('assignedAgent', 'name organisation');

        // Emit real-time update
        // io.emit('queue-list', {
        //     message: 'Queue list',
        //     queueItem: queue,
        // });
        res.status(200).json(queue);
    } catch (error) {
        next(error);
    }
});

// **Assign Agent**
app.post('/assign-agent', async (req, res, next) => {
    try {
        const { agentId } = req.body;

        if (!agentId) {
            return res.status(400).json({ message: 'Agent ID is required!' });
        }

        const nextCustomer = await Queue.findOne({ status: 'Pending' })
            .sort({ createdAt: 1 })
            .populate('customer', 'name');

        if (!nextCustomer) {
            return res.status(404).json({ message: 'No customers in the queue.' });
        }

        nextCustomer.assignedAgent = agentId;
        nextCustomer.status = 'In Progress';
        await nextCustomer.save();

        res.status(200).json({
            message: 'Agent assigned successfully!',
            queueItem: nextCustomer,
        });
    } catch (error) {
        next(error);
    }
});

// **Resolve Customer**
app.post('/resolve-customer', async (req, res, next) => {
    try {
        const { queueId } = req.body;

        if (!queueId) {
            return res.status(400).json({ message: 'Queue ID is required!' });
        }

        const queueItem = await Queue.findById(queueId);

        if (!queueItem) {
            return res.status(404).json({ message: 'Queue item not found!' });
        }

        queueItem.status = 'Resolved';
        await queueItem.save();

        res.status(200).json({
            message: 'Customer issue resolved successfully!',
            queueItem,
        });
    } catch (error) {
        next(error);
    }
});

// **Start the Server**
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
