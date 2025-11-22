const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// User
router.post('/', requireAuth, reportController.createReport);
router.get('/my', requireAuth, reportController.getMyReports);

// Admin
router.get('/all', requireAuth, requireRole(['admin']), reportController.getAllReports);

// --- BARU: Admin Update Status ---
router.patch('/:id/status', requireAuth, requireRole(['admin']), reportController.updateReportStatus);

module.exports = router;