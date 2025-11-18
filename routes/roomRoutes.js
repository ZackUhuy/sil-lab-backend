const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.post('/', requireAuth, requireRole(['admin']), roomController.createRoom);
router.get('/', requireAuth, roomController.getRooms);

// --- BARU: Delete Room ---
router.delete('/:id', requireAuth, requireRole(['admin']), roomController.deleteRoom);

module.exports = router;