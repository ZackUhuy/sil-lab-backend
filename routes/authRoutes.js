const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Endpoint Register & Login
router.post('/register', authController.register);
router.post('/login', authController.login);

// --- INI PENTING: Reset Password ---
// Pastikan baris ini ada!
router.post('/forgot-password', authController.forgotPassword);
router.post('/update-password', requireAuth, authController.updateUserPassword);

module.exports = router;