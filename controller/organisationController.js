const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Organisation = require('../schema/organisation_Schema');
const Employees = require('../schema/employee_Schema');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Organisation Signup
exports.organisationSignup = async (req, res, next) => {
    console.log("test-log");
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, email, password } = req.body;

        // Check if email already exists
        if (await Organisation.findOne({ email })) {
            return res.status(400).json({ message: 'Email is already registered!' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new organisation
        const newOrganisation = new Organisation({ name, email, password: hashedPassword });
        await newOrganisation.save();

        // Generate JWT Token
        const token = jwt.sign({ id: newOrganisation._id, email }, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            message: 'Organisation registered successfully!',
            organisation: { id: newOrganisation._id, name, email },
            token
        });
    } catch (error) {
        next(error);
    }
};

// Add New Employee (Protected Route)
exports.addNewEmployee = async (req, res, next) => {
    try {
        const { name, organisation } = req.body;

        // Validate input
        if (!name || !organisation) {
            return res.status(400).json({ message: 'Name and organisation are required!' });
        }

        // Check if the organisation exists
        const orgExists = await Organisation.findById(organisation);
        if (!orgExists) {
            return res.status(400).json({ message: 'Invalid organisation!' });
        }

        // Create new employee
        const newEmployee = new Employees({ name, organisation });
        await newEmployee.save();

        res.status(201).json({
            message: 'Employee added successfully!',
            employee: { id: newEmployee._id, name }
        });
    } catch (error) {
        next(error);
    }
};

// Employee Login
exports.employeeLogin = async (req, res, next) => {
    try {
        const { name, organisation } = req.body;

        // Validate input
        if (!name || !organisation) {
            return res.status(400).json({ message: 'Name and organisation are required!' });
        }

        // Find employee
        const employee = await Employees.findOne({ name, organisation });
        if (!employee) {
            return res.status(400).json({ message: 'Invalid name or organisation!' });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: employee._id, name }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful!',
            employee: { id: employee._id, name },
            token
        });
    } catch (error) {
        next(error);
    }
};

// Middleware to verify JWT
exports.verifyToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};
