const mongoose = require('mongoose');

// Define the employees schema
const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    organisation: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        default: "555"
    },
});

module.exports = mongoose.model('employees', employeeSchema);
