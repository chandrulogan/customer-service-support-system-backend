const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// controllers import
const { customerConnect, customerSignup, customerSignIn } = require('./controller/customerController');


// customer routes
router.post('/customer/sign-up', customerSignup)
router.post('/customer/sign-in', customerSignIn)

module.exports = router;
