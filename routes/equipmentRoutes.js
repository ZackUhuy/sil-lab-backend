const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Endpoint untuk MEMBUAT peralatan (Hanya Admin)
// POST /api/equipment
router.post('/', requireAuth, requireRole(['admin']), equipmentController.createEquipment);

// Endpoint untuk MELIHAT semua peralatan (Semua user ter-autentikasi)
// GET /api/equipment
router.get('/', requireAuth, equipmentController.getEquipment);

module.exports = router;