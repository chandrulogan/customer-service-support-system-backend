const express = require('express');
const { body } = require('express-validator');
const { organisationSignup, addNewEmployee, verifyToken } = require('../controller/organisationController');

const router = express.Router();

// Organisation signup route
router.post('/signup', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], organisationSignup);

router.post('/add-employee', verifyToken, addNewEmployee);

module.exports = router;
