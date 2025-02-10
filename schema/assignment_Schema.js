const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    agentId: { type: String, required: true },
    queryType: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Assignment", assignmentSchema);
