const mongoose = require('mongoose');

const employeeQueueTypeSchema = new mongoose.Schema({
    agentId: {
        type: String
    },
    queue: {
        type: String
    }
})

module.exports = mongoose.model('employeeCurrentQueue', employeeQueueTypeSchema);
