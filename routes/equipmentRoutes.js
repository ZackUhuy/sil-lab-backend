const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// 1. GET ALL (Perbaikan nama fungsi: getAllEquipment)
router.get('/', requireAuth, equipmentController.getAllEquipment);

// 2. CREATE (Hanya Admin)
router.post('/', requireAuth, requireRole(['admin']), equipmentController.createEquipment);

// 3. UPDATE (Hanya Admin)
router.put('/:id', requireAuth, requireRole(['admin']), equipmentController.updateEquipment);

// 4. DELETE (Hanya Admin)
router.delete('/:id', requireAuth, requireRole(['admin']), equipmentController.deleteEquipment);

module.exports = router;