const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// User biasa: Buat laporan & Lihat laporan sendiri
router.post('/', requireAuth, reportController.createReport);
router.get('/my', requireAuth, reportController.getMyReports);

// Admin: Lihat semua laporan
router.get('/all', requireAuth, requireRole(['admin']), reportController.getAllReports);

module.exports = router;