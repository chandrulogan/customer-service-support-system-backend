const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // Import the uuid library

// Define the customer schema
const customerSchema = new mongoose.Schema({
    uniqueID: {
        type: String,
        default: uuidv4, // Automatically generates a unique ID
        unique: true,    // Ensures the ID is unique
        immutable: true, // Prevent changes after creation
    },
    name: {
        type: String,
        required: true,
    },
    connect_Reason: {
        type: String,
        required: true,
    },
});

// Export the model
module.exports = mongoose.model('Customer', customerSchema);
