// ============================================
// ShroomSync — Control Routes
// Route definitions only — logic in controller.
// ============================================

const { Router } = require('express');
const controlController = require('../controllers/control.controller');

const router = Router();

router.post('/:deviceId/control/mode',    controlController.changeControlMode);
router.post('/:deviceId/setpoint',        controlController.updateSetpoint);
router.post('/:deviceId/timer',           controlController.updateTimer);
router.post('/:deviceId/timer/floor',     controlController.updateFloorTimer);
router.post('/:deviceId/schedule',        controlController.updateSchedule);
router.post('/:deviceId/schedule/floor',  controlController.updateFloorSchedule);
router.post('/:deviceId/schedule/mode',   controlController.changeScheduleMode);
router.post('/:deviceId/actuator/pump',   controlController.controlPump);
router.post('/:deviceId/actuator/fan',    controlController.controlFan);

module.exports = router;
