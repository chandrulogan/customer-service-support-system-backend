const express = require('express');
const { body } = require('express-validator');
const { organisationSignup, addNewEmployee, verifyToken, organisationLogin, getEmployeeList, assignEmployeeQueue } = require('../controller/organisationController');

const router = express.Router();

// Organisation signup route
router.post('/signup', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], organisationSignup);

// Organisation login route with validation
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], organisationLogin);

// Add employee (Protected Route)
router.post('/add-employee', verifyToken, addNewEmployee);
router.get('/employee-list', verifyToken, getEmployeeList);

// assign the queue to the agents
router.post('/update-agent-queue', assignEmployeeQueue)

module.exports = router;
