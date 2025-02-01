const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'Employees', default: null },
    issue: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Queue', queueSchema);
