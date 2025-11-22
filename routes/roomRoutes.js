const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.post('/', requireAuth, requireRole(['admin']), roomController.createRoom);
router.get('/', requireAuth, roomController.getRooms);

// Update Status (Maintenance)
router.patch('/:id/status', requireAuth, requireRole(['admin']), roomController.updateRoomStatus);

// --- BARU: Update Data (Edit Info) ---
router.put('/:id', requireAuth, requireRole(['admin']), roomController.updateRoom);

router.delete('/:id', requireAuth, requireRole(['admin']), roomController.deleteRoom);

module.exports = router;