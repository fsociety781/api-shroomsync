// ============================================
// ShroomSync — Telemetry Routes
// Route definitions only — logic in controller.
// ============================================

const { Router } = require('express');
const telemetryController = require('../controllers/telemetry.controller');

const router = Router();

router.get('/:deviceId/telemetry/sensor',        telemetryController.querySensor);
router.get('/:deviceId/telemetry/sensor/latest', telemetryController.getLatestSensor);

router.get('/:deviceId/telemetry/history',        telemetryController.queryHistory);
router.get('/:deviceId/telemetry/history/latest', telemetryController.getLatestHistory);

module.exports = router;
