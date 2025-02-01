const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { body, validationResult } = require('express-validator');
const connectDatabase = require('./database/db');
const { connectKafka } = require('./kafkaConfig');
const { initializeSocket } = require("./socket"); // Import WebSocket

const Organisation = require('./schema/organisation_Schema');
const Employees = require('./schema/employee_Schema');
const Customer = require('./schema/customers_Schema');
const Queue = require('./schema/queue_Schema');
const Chat = require('./schema/chat_Schema'); // New Chat Schema
const { customerConnect } = require('./controller/queue/customerController');
const { startAgentAssignmentConsumer } = require("./controller/kafka/assignAgentConsumer");

const app = express();
const server = createServer(app);
// Initialize WebSocket
initializeSocket(server);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const port = 1997;

// Middleware
app.use(express.json());
connectDatabase(); // Connect to MongoDB

// **Connect to Kafka (Only Once)**
connectKafka().catch((err) => console.error("Error connecting to Kafka:", err));

// **Socket.IO for real-time updates**
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('chat', async ({ sender, receiver, message }) => {
        const newMessage = new Chat({ sender, receiver, message });
        await newMessage.save();
        io.emit('chat', newMessage);
    });

    socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// **Basic Routes**
app.get('/', (req, res) => res.send('Hello World!'));

// **Error Handling Middleware**
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// **Organisation Signup**
app.post('/organisation-signup', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, email, password } = req.body;
        if (await Organisation.findOne({ email })) {
            return res.status(400).json({ message: 'Email is already registered!' });
        }
        const newOrganisation = new Organisation({ name, email, password });
        await newOrganisation.save();
        res.status(201).json({ message: 'Organisation registered successfully!', organisation: { id: newOrganisation._id, name } });
    } catch (error) { next(error); }
});

// **Add Agent**
app.post('/add-agent', async (req, res, next) => {
    try {
        const { name, organisation } = req.body;
        if (!name || !organisation) return res.status(400).json({ message: 'Name and organisation are required!' });
        if (await Employees.findOne({ name, organisation })) return res.status(400).json({ message: 'Agent already exists!' });
        const newEmployee = new Employees({ name, organisation });
        await newEmployee.save();
        res.status(201).json({ message: 'Agent added successfully!', agent: { id: newEmployee._id, name } });
    } catch (error) { next(error); }
});

// **Customer Connect**
app.post('/customer-connect', customerConnect);


// **Add to Queue**
app.post('/real-time/add-to-queue', async (req, res, next) => {
    try {
        const { customerId, issue } = req.body;
        if (!customerId || !issue) return res.status(400).json({ message: 'Customer ID and issue are required!' });
        const newQueueItem = new Queue({ customer: customerId, issue });
        await newQueueItem.save();
        io.emit('customer-queue', { message: 'New customer added to queue.', queueItem: newQueueItem });
        res.status(201).json({ message: 'Customer added to queue successfully!', queueItem: newQueueItem });
    } catch (error) { next(error); }
});

// **Queue Status**
app.get('/queue-status', async (req, res, next) => {
    try {
        const queue = await Queue.find().populate('customer', 'name connect_Reason').populate('assignedAgent', 'name organisation');
        res.status(200).json(queue);
    } catch (error) { next(error); }
});

// **Assign Agent**
app.post('/assign-agent', async (req, res, next) => {
    try {
        const { agentId } = req.body;
        if (!agentId) return res.status(400).json({ message: 'Agent ID is required!' });
        const nextCustomer = await Queue.findOne({ status: 'Pending' }).sort({ createdAt: 1 }).populate('customer', 'name');
        if (!nextCustomer) return res.status(404).json({ message: 'No customers in the queue.' });
        nextCustomer.assignedAgent = agentId;
        nextCustomer.status = 'In Progress';
        await nextCustomer.save();
        res.status(200).json({ message: 'Agent assigned successfully!', queueItem: nextCustomer });
    } catch (error) { next(error); }
});

// **Resolve Customer**
app.post('/resolve-customer', async (req, res, next) => {
    try {
        const { queueId } = req.body;
        if (!queueId) return res.status(400).json({ message: 'Queue ID is required!' });
        const queueItem = await Queue.findById(queueId);
        if (!queueItem) return res.status(404).json({ message: 'Queue item not found!' });
        queueItem.status = 'Resolved';
        await queueItem.save();
        res.status(200).json({ message: 'Customer issue resolved successfully!', queueItem });
    } catch (error) { next(error); }
});

// Start Kafka Consumer for agent assignment
startAgentAssignmentConsumer().catch((err) =>
    console.error("Error starting agent assignment consumer:", err)
);

// private chat implementations
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // **Join a Private Room for Customer-Agent Chat**
    socket.on('join-room', ({ customerId, agentId }) => {
        const roomId = `${customerId}-${agentId}`;
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    // **Send a Message to a Specific User**
    socket.on('send-message', async ({ customerId, agentId, senderId, message }) => {
        try {
            const newMessage = new Chat({ customer: customerId, agent: agentId, sender: senderId, message });
            await newMessage.save();

            const roomId = `${customerId}-${agentId}`;
            io.to(roomId).emit('receive-message', { senderId, message, timestamp: newMessage.timestamp });
        } catch (error) {
            console.error('Message sending error:', error);
        }
    });

    // **Get Chat History**
    socket.on('get-messages', async ({ customerId, agentId }) => {
        try {
            const messages = await Chat.find({ customer: customerId, agent: agentId }).sort({ timestamp: 1 });
            socket.emit('chat-history', messages);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    });

    socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// **Start the Server**
server.listen(port, () => console.log(`Server is running on http://localhost:${port}`));
