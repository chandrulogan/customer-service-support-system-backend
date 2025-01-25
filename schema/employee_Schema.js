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

// Hash password before saving
employeeSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

module.exports = mongoose.model('employees', employeeSchema);
