const { Server } = require("socket.io");

let io = null;

function initializeSocket(server) {
    io = new Server(server, {
        cors: { origin: "*" }, // Allow all origins (for testing)
    });

    io.on("connection", (socket) => {
        console.log("A client connected:", socket.id);

        socket.on("disconnect", () => {
            console.log("A client disconnected:", socket.id);
        });
    });
}

function getSocketInstance() {
    if (!io) {
        throw new Error("Socket.io is not initialized!");
    }
    return io;
}

// ✅ Export correctly
module.exports = { initializeSocket, getSocketInstance };
