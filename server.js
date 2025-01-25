// agent-service.js
const express = require('express');
const connectDatabase = require('./database/db');
const Employees = require('./schema/employee_Schema');
const Queue = require('./schema/queue_Schema');
require('dotenv').config();

const app = express();
app.use(express.json());
connectDatabase();

// Add an agent
app.post('/add-agent', async (req, res, next) => {
    try {
        const { name, organisation, password } = req.body;

        if (!name || !organisation || !password) {
            return res.status(400).json({ message: 'Name, organisation, and password are required' });
        }

        // Check for duplicate name and organisation
        const existingEmployee = await Employees.findOne({ name, organisation });
        if (existingEmployee) {
            return res.status(400).json({ message: 'Agent already exists' });
        }

        // Create a new employee
        const newEmployee = new Employees({ name, organisation, password });
        await newEmployee.save().catch((error) => {
            if (error.code === 11000) {
                throw new Error('Duplicate key error: Employee already exists');
            }
            throw error; // Handle other errors
        });

        console.log('New Employee:', newEmployee);
        res.status(201).json({ message: 'Agent added successfully', agent: newEmployee });
    } catch (error) {
        console.error('Error adding agent:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});


// Assign agent to a customer in the queue
app.post('/assign-agent', async (req, res, next) => {
    try {
        const { agentId } = req.body;
        const nextCustomer = await Queue.findOne({ status: 'Pending' }).sort({ createdAt: 1 });

        if (!nextCustomer) {
            return res.status(404).json({ message: 'No customers in the queue' });
        }

        nextCustomer.assignedAgent = agentId;
        nextCustomer.status = 'In Progress';
        await nextCustomer.save();

        res.status(200).json({ message: 'Agent assigned successfully', queueItem: nextCustomer });
    } catch (error) {
        next(error);
    }
});

// Start the server
app.listen(3003, () => console.log('Agent Service running on port 3003'));
