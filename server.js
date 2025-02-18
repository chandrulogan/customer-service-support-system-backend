const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { body, validationResult } = require('express-validator');
const connectDatabase = require('./database/db');
const { initializeSocket } = require("./socket");
const redis = require('./redisClient'); // Import the Redis client

// schema import
const Organisation = require('./schema/organisation_Schema');
const Employees = require('./schema/employee_Schema');
const Queue = require('./schema/queue_Schema');
const Chat = require('./schema/chat_Schema');

// controllers import
const { customerConnect } = require('./controller/customerController');
const { agentLogin } = require('./controller/agentLogin');
const processQueue = require('./controller/queueWorker');

const app = express();
const server = createServer(app);
initializeSocket(server);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const port = 1997;


app.use(express.json());
connectDatabase();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('chat', async ({ sender, receiver, message }) => {
        const newMessage = new Chat({ sender, receiver, message });
        await newMessage.save();
        io.emit('chat', newMessage);
    });

    socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

app.get('/', (req, res) => res.send('Hello World!'));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

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

app.post('/add-agent', async (req, res, next) => {
    try {
        const { name, organisation } = req.body;
        if (!name || !organisation) {
            return res.status(400).json({ message: 'Name and organisation are required!' });
        }
        const newEmployee = new Employees({ name, organisation });
        await newEmployee.save();
        res.status(201).json({ message: 'Agent added successfully!', agent: { id: newEmployee._id, name } });
    } catch (error) {
        next(error);
    }
});

app.post('/customer-connect', customerConnect);
app.post('/agent-login', agentLogin);

app.post('/real-time/add-to-queue', async (req, res, next) => {
    try {
        const { customerId, issue } = req.body;
        if (!customerId || !issue) return res.status(400).json({ message: 'Customer ID and issue are required!' });
        await redis.lpush('customerQueue', JSON.stringify({ customerId, issue }));
        io.emit('customer-queue', { message: 'New customer added to queue.', customerId, issue });
        res.status(201).json({ message: 'Customer added to queue successfully!' });
    } catch (error) { next(error); }
});

app.get('/queue-status', async (req, res, next) => {
    try {
        const queue = await redis.lrange('customerQueue', 0, -1);
        res.status(200).json(queue.map(item => JSON.parse(item)));
    } catch (error) { next(error); }
});

app.post('/assign-agent', async (req, res, next) => {
    try {
        const { agentId } = req.body;
        if (!agentId) return res.status(400).json({ message: 'Agent ID is required!' });
        const nextCustomer = await redis.rpop('customerQueue');
        if (!nextCustomer) return res.status(404).json({ message: 'No customers in the queue.' });
        res.status(200).json({ message: 'Agent assigned successfully!', queueItem: JSON.parse(nextCustomer) });
    } catch (error) { next(error); }
});

app.post('/resolve-customer', async (req, res, next) => {
    try {
        const { queueId } = req.body;
        if (!queueId) return res.status(400).json({ message: 'Queue ID is required!' });
        res.status(200).json({ message: 'Customer issue resolved successfully!' });
    } catch (error) { next(error); }
});

app.post('/create-queue', async (req, res, next) => {
    try {
        const { queueId } = req.body;
        if (!queueId) return res.status(400).json({ message: 'Queue ID is required!' });
        res.status(200).json({ message: 'Customer issue resolved successfully!' });
    } catch (error) { next(error); }
})

console.log("🔄 Starting processQueue...");
processQueue();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ customerId, agentId }) => {
        const roomId = `${customerId}-${agentId}`;
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

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

server.listen(port, () => console.log(`Server is running on http://localhost:${port}`));
