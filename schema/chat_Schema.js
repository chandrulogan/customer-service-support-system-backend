const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true, // Ensure chatId is always provided
        unique: true,
        index: true // Indexed for faster queries
    },
    from: {
        type: mongoose.Schema.Types.ObjectId, // Sender (Customer/Agent)
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    queryType: {
        type: String,
        enum: ["Billing", "Technical Support", "General Inquiry"], // Predefined query types
        required: true,
        index: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    }
});

// ✅ Ensure efficient querying by indexing chatId & queryType
chatSchema.index({ chatId: 1, queryType: 1, timestamp: -1 });

module.exports = mongoose.model('Chat', chatSchema);
