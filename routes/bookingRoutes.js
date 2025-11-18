const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// User create booking
router.post('/', requireAuth, bookingController.createBooking);

// --- BARU: Admin Create Schedule (Manual) ---
router.post('/admin', requireAuth, requireRole(['admin']), bookingController.createAdminBooking);

router.get('/', requireAuth, bookingController.getBookings);
router.get('/schedule', requireAuth, bookingController.getPublicSchedule);
router.patch('/:id/status', requireAuth, requireRole(['admin']), bookingController.updateStatus);
router.delete('/:id', requireAuth, requireRole(['admin']), bookingController.deleteBooking);

module.exports = router;