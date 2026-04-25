// ============================================
// ShroomSync — OTA Routes
// Route definitions only — logic in controller.
// ============================================

const { Router } = require('express');
const otaController = require('../controllers/ota.controller');

const router = Router();

router.post('/trigger/:deviceId', otaController.triggerDevice);
router.post('/broadcast',         otaController.broadcast);
router.get('/logs/:deviceId',     otaController.getLogs);

module.exports = router;
