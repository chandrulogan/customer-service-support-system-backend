const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// schema
const Organisation = require('../schema/organisation_Schema');
const Employees = require('../schema/employee_Schema');

// Organisation Signup
exports.organisationSignup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, email, password } = req.body;

        // Check if email already exists
        const existingOrganisation = await Organisation.findOne({ email });
        if (existingOrganisation) {
            return res.status(400).json({ message: 'Email is already registered!' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new organisation
        const newOrganisation = new Organisation({ name, email, password: hashedPassword });
        await newOrganisation.save();
        

        // Generate JWT Token
        const token = jwt.sign({ id: newOrganisation._id, email }, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });

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
        const { number, name, organisation } = req.body;

        // Validate input
        if (!name || !organisation || !number) {
            return res.status(400).json({ message: 'Name, organisation, number are required!' });
        }

        // Find the organisation by name first
        const org = await Organisation.findOne({ name: organisation });

        if (!org) {
            return res.status(400).json({ message: 'Invalid organisation!' });
        }

        const isEmployeeAlreadyRegistered = await Employees.findOne({ number });
        
        if (isEmployeeAlreadyRegistered) {
            return res.status(400).json({
                message: 'Employee number is already registered',
            });
        }

        // Create new employee with the organisation's ObjectId
        const newEmployee = new Employees({ name, organisation, number });
        
        await newEmployee.save();
        
        res.status(201).json({
            message: 'Employee added successfully!',
            employee: { id: newEmployee._id, name, organisation: org.name, number: newEmployee.number }
        });

    } catch (error) {
        res.status(500).json({
            message: { error },
        });
    }
};

// get employee list
exports.getEmployeeList = async (req, res, next) => {
    try {
        const employeesList = await Employees.find();

        res.status(201).json({
            message: 'Employee data received',
            result: employeesList
        });
    } catch (error) {
        res.status(500).json({
            message: { error },
        });
    }
}

// Employee Login
exports.employeeLogin = async (req, res, next) => {
    try {
        const { name, organisation } = req.body;

        // Validate input
        if (!name || !organisation) {
            return res.status(400).json({ message: 'Name and organisation are required!' });
        }

        // Find the organisation by name
        const org = await Organisation.findOne({ name: organisation });

        if (!org) {
            return res.status(400).json({ message: 'Organisation not found!' });
        }

        // Find employee by name and organisation ID
        const employee = await Employees.findOne({ name, organisation: org._id });

        if (!employee) {
            return res.status(400).json({ message: 'Invalid name or organisation!' });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: employee._id, name }, process.env.JWT_SECRET, { expiresIn: '24h' });

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
    // console.log("Headers:", req.headers);  // Check if Authorization header exists

    const token = req.header('Authorization')?.split(' ')[1];  // Remove "Bearer " prefix
    console.log("Extracted Token:", token);

    if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

    try {
        console.log("process.env.JWT_SECRET", process.env.JWT_SECRET);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded Token Data:", decoded);

        req.user = decoded;
        next();
    } catch (error) {
        console.error("JWT Verification Error:", error);
        res.status(400).json({ message: 'Invalid Token' });
    }
};


exports.organisationLogin = async (req, res, next) => {
    const { email, password } = req.body;

    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // 1) Check if organisation exists
        const organisation = await Organisation.findOne({ email });

        if (!organisation) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // 2) Compare hashed password
        const isMatch = await bcrypt.compare(password, organisation.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // 3) Generate JWT Token
        const token = jwt.sign({ id: organisation._id, email: organisation.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: "Login successful!",
            token,
            organisation: {
                id: organisation._id,
                name: organisation.name,
                email: organisation.email
            }
        });

    } catch (error) {
        next(error);
    }
};
