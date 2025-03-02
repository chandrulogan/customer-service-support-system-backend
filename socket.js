const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Update with allowed origins
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`🔗 User connected: ${socket.id}`);

        socket.on('join-room', ({ roomId, userInfo }) => {
            const { name, id } = userInfo;
            socket.join(roomId);
            console.log(`${name || 'unknown'} - ${id} - joined room: ${roomId}`);
            socket.emit("join-room-success", { roomId, message: "User joined room successfully" });
        });

        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.id}`);
        });
    });

    console.log("✅ WebSocket initialized");
    return io;
};

const getSocketInstance = () => io;

module.exports = { initializeSocket, getSocketInstance };
