// ============================================
// ShroomSync — Cultivation Cycle Routes
// ============================================

const { Router } = require('express');
const cycleController = require('../controllers/cycle.controller');

const router = Router();

router.get('/:deviceId/cycles', cycleController.listCycles);
router.post('/:deviceId/cycles', cycleController.createCycle);

router.get('/:deviceId/cycles/:cycleId', cycleController.getCycle);
router.patch('/:deviceId/cycles/:cycleId', cycleController.updateCycle);
router.post('/:deviceId/cycles/:cycleId/complete', cycleController.completeCycle);
router.delete('/:deviceId/cycles/:cycleId', cycleController.deleteCycle);

router.get('/:deviceId/cycles/:cycleId/summary', cycleController.getCycleSummary);

router.get('/:deviceId/cycles/:cycleId/harvests', cycleController.listHarvests);
router.post('/:deviceId/cycles/:cycleId/harvests', cycleController.addHarvest);
router.patch('/:deviceId/cycles/:cycleId/harvests/:harvestId', cycleController.updateHarvest);
router.delete('/:deviceId/cycles/:cycleId/harvests/:harvestId', cycleController.deleteHarvest);

module.exports = router;
