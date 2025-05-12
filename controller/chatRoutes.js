const express = require("express");
const Chat = require("../schema/chat_Schema");

const router = express.Router();

// configs
const redis = require('../redisClient');
const { getSocketInstance } = require("../socket");


/**
 * 🔹 API: Join a Room
 */
router.post("/join-room", (req, res) => {
    try {
        const { roomId, userInfo } = req.body;
        const io = getSocketInstance();

        io.to(roomId).emit("user-joined", { userInfo });
        return res.status(200).json({ success: true, message: "Joined room successfully" });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 🔹 API: Send a Message
 */
router.post("/send-message", async (req, res) => {
    try {
        const { roomId, messageData } = req.body;
        const { userType, userId, message } = messageData;
        const io = getSocketInstance();

        // ✅ Save to MongoDB
        const chatMessage = new Chat({
            chatId: roomId,
            from: userId,
            fromModel: userType,
            message,
            queryType: "General Inquiry",
        });
        await chatMessage.save();

        // ✅ Emit message to room
        io.to(roomId).emit("receive-message", {
            userId,
            message,
            timestamp: new Date(),
        });

        return res.status(201).json({ success: true, message: "Message sent successfully" });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 🔹 API: Fetch Chat History
 */
router.get("/chat-history/:roomId", async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Chat.find({ chatId: roomId }).sort({ timestamp: 1 }).limit(50);

        return res.status(200).json({ success: true, messages });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * API: Chat Rejected
*/
router.post("/decline", async(req, res) => {
    const { queueType, data  } = req.body
    console.log("req", req.body);

    await redis.rpush(`customerQueue:${queueType}`, JSON.stringify(data));

    return res.status(200).json({ success: true });
})

module.exports = router;
