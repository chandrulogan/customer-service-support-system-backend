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
const { agentLogin, addAgentToQueue, removeAgentFromQueue } = require('./controller/agentLogin');
const chatRoutes = require('./controller/chatRoutes');

// routes
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
/*
"connection" is a built-in event in Socket.IO that is triggered every time a new client (browser, app, etc.) 
 connects to your WebSocket server.
*/
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // creating the room and making the connection
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

            // ✅ Save to MongoDB
            const chatMessage = new Chat({
                chatId: roomId,
                from: userId,
                fromModel: userType,
                message: messages,
                queryType: "General Inquiry",
            });
            await chatMessage.save();

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

    socket.on("endChat", ({ roomId, userType }) => {
        console.log(`Chat ended by ${userType} in room ${roomId}`);

        // Optionally broadcast to the other user
        socket.broadcast.to(roomId).emit("chatEnded", { message: "Chat has been ended." });
        socket.leave(roomId)
        // Save end event in DB if needed
    });

    socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});


// Worker function this will run in background
const startQueueWorker = require('./controller/queueWorker');
startQueueWorker()

// Routes
app.get('/', (req, res) => res.send('Hello World!'));
app.use('/', apiRoutes);
app.use('/chat', chatRoutes);
app.use('/organisation', organisationRoutes);
app.post('/customer-connect', customerConnect);
app.post('/agent-login', agentLogin);
app.post('/add-agent-to-queue', addAgentToQueue);
app.post('/remove-agent-from-queue', removeAgentFromQueue);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});


const port = process.env.PORT || 1997;
server.listen(port, () => console.log(`🚀 Server is running on http://localhost:${port}`));
