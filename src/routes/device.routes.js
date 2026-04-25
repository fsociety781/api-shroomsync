// ============================================
// ShroomSync — Device Routes
// Route definitions only — logic in controller.
// ============================================

const { Router } = require('express');
const deviceController = require('../controllers/device.controller');

const router = Router();

router.get('/',           deviceController.listDevices);
router.get('/:deviceId',  deviceController.getDevice);
router.post('/',          deviceController.createDevice);
router.delete('/:deviceId', deviceController.deleteDevice);

module.exports = router;
