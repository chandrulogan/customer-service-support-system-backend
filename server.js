const express = require('express');
const { createServer } = require('node:http');
require('dotenv').config();
const cors = require('cors');
const connectDatabase = require('./database/db');
const { initializeSocket, getSocketInstance } = require("./socket");

// Schema import
const Chat = require('./schema/chat_Schema');

// Controllers import
const { customerConnect } = require('./controller/customerController');
const { agentLogin, addAgentToQueue } = require('./controller/agentLogin');
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

// socket connection
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Notify others in the room
        socket.to(roomId).emit("user-joined", { roomId, userId: socket.id });
    });

    // ✅ Send & Store Message
    socket.on("sendMessage", async ({ roomId, messageData }) => {
        try {
            const { userType, userId, messages } = messageData;

            console.log("messageData", messageData);

            // ✅ Save to MongoDB
            const chatMessage = new Chat({
                chatId: roomId,
                from: userId,
                fromModel: userType,
                message: messages,
                queryType: "General Inquiry",
            });
            await chatMessage.save();

            // // ✅ Emit message to room
            // io.to(roomId).emit("receive-message", {
            //     userId,
            //     message: messages,
            //     timestamp: new Date(),
            // });

            // ✅ Emit message to all **EXCEPT** the sender
            socket.broadcast.to(roomId).emit("receive-message", {
                userId,
                message: messages,
                fromModel: userType,
                timestamp: new Date(),
            });

            // return res.status(201).json({ success: true, message: "Message sent successfully" });

        } catch (error) {
            console.error("Error saving message:", error);
        }
    });

    socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

// Routes
app.get('/', (req, res) => res.send('Hello World!'));
app.use('/', apiRoutes);
app.use('/chat', chatRoutes);
app.use('/organisation', organisationRoutes);
app.post('/customer-connect', customerConnect);
app.post('/agent-login', agentLogin);
app.post('/add-agent-to-queue', addAgentToQueue);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// console.log("🔄 Starting processQueue...");
processQueue();

const port = process.env.PORT || 1997;
server.listen(port, () => console.log(`🚀 Server is running on http://localhost:${port}`));
