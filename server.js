const express = require('express');
const { createServer } = require('node:http');
require('dotenv').config();
const cors = require('cors');
const connectDatabase = require('./database/db');
const { initializeSocket } = require("./socket");

// Schema import
const Chat = require('./schema/chat_Schema');

// Controllers import
const { customerConnect } = require('./controller/customerController');
const { agentLogin } = require('./controller/agentLogin');
const processQueue = require('./controller/queueWorker');
const chatRoutes = require('./controller/chatRoutes');
const organisationRoutes = require('./routes/organisationRoutes');
const apiRoutes = require('./routes');

const app = express();
const server = createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

// Initialize Database
connectDatabase();

// Initialize WebSocket Server
const io = initializeSocket(server);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('chat', async ({ sender, receiver, message }) => {
        const newMessage = new Chat({ sender, receiver, message });
        await newMessage.save();
        io.emit('chat', newMessage);
    });

    socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// Routes
app.get('/', (req, res) => res.send('Hello World!'));
app.use('/', apiRoutes);
app.use('/chat', chatRoutes);
app.use('/organisation', organisationRoutes);
app.post('/customer-connect', customerConnect);
app.post('/agent-login', agentLogin);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

console.log("🔄 Starting processQueue...");
processQueue();

const port = process.env.PORT || 1997;
server.listen(port, () => console.log(`🚀 Server is running on http://localhost:${port}`));
