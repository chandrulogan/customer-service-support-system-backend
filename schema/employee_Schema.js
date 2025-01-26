const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
    },
    password: {
        type: String,
        require: true,
        select: false
    },
});

module.exports = mongoose.model('employees', employeeSchema);
