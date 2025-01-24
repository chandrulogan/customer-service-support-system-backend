const mongoose = require('mongoose');

const queueSchema = mongoose.Schema({
    customer: { type: String, required: true }, // Change to String
    issue: { type: String, required: true },
    status: { type: String, default: 'Pending', enum: ['Pending', 'In Progress', 'Resolved'] },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Queue', queueSchema);
