const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Update with allowed origins
            methods: ["GET", "POST"]
        }
    });

    return io;
};

const getSocketInstance = () => io;

module.exports = { initializeSocket, getSocketInstance };
