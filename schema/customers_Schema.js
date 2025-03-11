const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        default: "555",
        // select: false
    },
    actualPasssword: {
        type: String,
    },
    mobileNumber: {
        type: Number,
        default: "555",
        required: true
    },
    uniqueID: {
        type: String,
        unique: true,
        default: function () { return new mongoose.Types.ObjectId().toString(); } // Generate unique ID
    }
});

module.exports = mongoose.model('customer', customerSchema);
