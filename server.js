const express = require('express');
const { createServer } = require('node:http');
var cors = require('cors')
const { body, validationResult } = require('express-validator');
const connectDatabase = require('./database/db');
const { initializeSocket, getSocketInstance } = require("./socket");
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
const chatRoutes = require('./controller/chatRoutes');
const organisationRoutes = require('./routes/organisationRoutes');

const app = express();
app.use(cors({
    origin: "*"
}))
const server = createServer(app);
initializeSocket(server);

const io = getSocketInstance(); // ✅ Get the existing socket.io instance

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
// ✅ Use chat API routes
app.use('/chat', chatRoutes);

app.use('/organisation', organisationRoutes);

app.post('/customer-connect', customerConnect);
app.post('/agent-login', agentLogin);

console.log("🔄 Starting processQueue...");
processQueue();

server.listen(port, () => console.log(`Server is running on http://localhost:${port}`));
