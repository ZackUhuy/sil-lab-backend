const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// --- USER ENDPOINTS ---

// User mengajukan peminjaman (Ruangan atau Alat)
router.post('/', requireAuth, bookingController.createBooking);

// User melihat riwayat peminjaman sendiri (atau Admin melihat semua)
router.get('/', requireAuth, bookingController.getBookings);

// Endpoint Publik untuk melihat status ruangan (Dipakai di Dashboard User & Admin)
router.get('/schedule', requireAuth, bookingController.getPublicSchedule);


// --- ADMIN ENDPOINTS ---

// Cek alat yang sedang dipinjam (untuk menghitung sisa stok di Dashboard Admin)
router.get('/active-tools', requireAuth, requireRole(['admin']), bookingController.getActiveToolLoans);

// Admin membuat jadwal manual (bisa berulang/recurring) - Status langsung disetujui
router.post('/admin', requireAuth, requireRole(['admin']), bookingController.createAdminBooking);

// Admin menyetujui atau menolak peminjaman
router.patch('/:id/status', requireAuth, requireRole(['admin']), bookingController.updateStatus);

// Admin menghapus data peminjaman/jadwal
router.delete('/:id', requireAuth, requireRole(['admin']), bookingController.deleteBooking);

module.exports = router;