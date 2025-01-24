const mongoose = require('mongoose');

// Define the employees schema
const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    connect_Reason: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        default: "555"
    },
});

module.exports = mongoose.model('customer', customerSchema);
