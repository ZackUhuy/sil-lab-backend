const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.post('/', requireAuth, requireRole(['admin']), equipmentController.createEquipment);
router.get('/', requireAuth, equipmentController.getEquipment);

// --- BARU: Route Edit Alat ---
router.put('/:id', requireAuth, requireRole(['admin']), equipmentController.updateEquipment);

router.delete('/:id', requireAuth, requireRole(['admin']), equipmentController.deleteEquipment);

module.exports = router;