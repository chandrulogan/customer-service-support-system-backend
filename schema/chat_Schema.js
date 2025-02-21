const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        index: true // ✅ Indexed for faster queries
    },
    from: {
        type: String,
        refPath: 'fromModel', // ✅ Dynamic reference (Customer or Employee)
        required: true
    },
    fromModel: {
        type: String,
        enum: ['Customer', 'Employee'], // ✅ Stores whether the sender is a customer or an agent
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // ✅ Fast retrieval for chat history
    },
    queryType: {
        type: String,
        enum: ["Billing", "Technical Support", "General Inquiry"],
        required: true
    }
});

// ✅ Index chatId for faster retrieval and sorting by timestamp
chatSchema.index({ chatId: 1, timestamp: -1 });

module.exports = mongoose.model('Chat', chatSchema);
