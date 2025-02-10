const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    agentId: {
        type: String,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        unique: false, // Remove uniqueness
    },
    organisation: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        default: "555"
    },
    location: {
        type: String,
        default: "mexico", // Default if location is not provided
        required: true
    },
    queryTypes: {
        type: [String],
        default: ["General Inquiry"], // Default if query types are not provided
        required: true,
        enum: ["Billing", "Technical Support", "General Inquiry"]
    }
});

// **Pre-save Hook to Generate Sequential agentId**
employeeSchema.pre('save', async function (next) {
    if (!this.agentId) { // Only generate if agentId is not already set
        const lastEmployee = await mongoose.model('employees').findOne({}, {}, { sort: { agentId: -1 } });
        let nextId = "000001"; // Default for first agent

        if (lastEmployee && lastEmployee.agentId) {
            nextId = String(parseInt(lastEmployee.agentId) + 1).padStart(6, '0');
        }

        this.agentId = nextId;
    }
    next();
});

module.exports = mongoose.model('employees', employeeSchema);
