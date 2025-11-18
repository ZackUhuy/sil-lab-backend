const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// User (Dosen/Mhs/Asisten) mengajukan peminjaman
router.post('/', requireAuth, bookingController.createBooking);

// Melihat daftar peminjaman (Admin lihat semua, user lihat punya sendiri)
router.get('/', requireAuth, bookingController.getBookings);

// Admin menyetujui/menolak peminjaman
router.patch('/:id/status', requireAuth, requireRole(['admin']), bookingController.updateStatus);

module.exports = router;