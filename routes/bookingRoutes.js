const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.post('/', requireAuth, bookingController.createBooking);
router.get('/', requireAuth, bookingController.getBookings);
router.get('/schedule', requireAuth, bookingController.getPublicSchedule);
router.patch('/:id/status', requireAuth, requireRole(['admin']), bookingController.updateStatus);

// --- BARU: Delete Booking ---
router.delete('/:id', requireAuth, requireRole(['admin']), bookingController.deleteBooking);

module.exports = router;