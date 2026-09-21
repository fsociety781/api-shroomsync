// ============================================
// ShroomSync — Device Routes
// Route definitions only — logic in controller.
// ============================================

const { Router } = require('express');
const deviceController = require('../controllers/device.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');

const router = Router();

// Device listing (optionalAuth: jika login difilter per user, jika tidak mengembalikan list umum)
router.get('/',                    optionalAuth, deviceController.listDevices);

// Device activation (input ID / scan barcode) & unpair
router.post('/activate',           requireAuth, deviceController.activateDevice);
router.post('/unpair/:deviceId',   requireAuth, deviceController.unpairDevice);

router.get('/:deviceId',           optionalAuth, deviceController.getDevice);
router.post('/',                   deviceController.createDevice);
router.delete('/:deviceId',        deviceController.deleteDevice);

module.exports = router;
