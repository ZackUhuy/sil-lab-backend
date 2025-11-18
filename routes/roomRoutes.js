const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Endpoint untuk MEMBUAT ruangan (Hanya Admin)
// POST /api/rooms
router.post('/', requireAuth, requireRole(['admin']), roomController.createRoom);

// Endpoint untuk MELIHAT semua ruangan (Semua user ter-autentikasi)
// GET /api/rooms
router.get('/', requireAuth, roomController.getRooms);

module.exports = router;