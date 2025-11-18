const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Endpoint untuk Register
router.post('/register', authController.register);

// Endpoint untuk Login
router.post('/login', authController.login);

module.exports = router;