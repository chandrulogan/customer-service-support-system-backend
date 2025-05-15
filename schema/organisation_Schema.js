const mongoose = require('mongoose');

// Define the Organisation schema
const OrganisationSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: true,
        lowercase: true, // Ensures email is always stored in lowercase
        unique: true,
        default:"CS3"
    },
    email: {
        type: String,
        required: true,
        lowercase: true, // Ensures email is always stored in lowercase
        // unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Organisation', OrganisationSchema);
