// ============================================
// ShroomSync — Cultivation Cycle Controller
// ============================================

const cycleService = require('../services/cycle.service');
const {
  createCycleSchema,
  updateCycleSchema,
  completeCycleSchema,
  cycleQuerySchema,
  createHarvestSchema,
  updateHarvestSchema,
  harvestQuerySchema,
} = require('../utils/validators');
const asyncHandler = require('../utils/async-handler');
const ApiResponse = require('../utils/api-response');

const cycleController = {
  /**
   * GET /api/v1/devices/:deviceId/cycles
   * List cultivation cycles for a device.
   */
  listCycles: asyncHandler(async (req, res) => {
    const query = cycleQuerySchema.parse(req.query);
    const result = await cycleService.listCycles(req.params.deviceId, query);

    ApiResponse.paginated(res, result.records, {
      total: result.total,
      offset: result.offset,
    });
  }),

  /**
   * POST /api/v1/devices/:deviceId/cycles
   * Start or register a cultivation cycle.
   */
  createCycle: asyncHandler(async (req, res) => {
    const data = createCycleSchema.parse(req.body);
    const cycle = await cycleService.createCycle(req.params.deviceId, data);
    ApiResponse.success(res, cycle, 'Cultivation cycle created successfully', 201);
  }),

  /**
   * GET /api/v1/devices/:deviceId/cycles/:cycleId
   * Get a single cultivation cycle.
   */
  getCycle: asyncHandler(async (req, res) => {
    const cycle = await cycleService.getCycle(req.params.deviceId, req.params.cycleId);
    ApiResponse.success(res, cycle);
  }),

  /**
   * PATCH /api/v1/devices/:deviceId/cycles/:cycleId
   * Update cycle metadata/status.
   */
  updateCycle: asyncHandler(async (req, res) => {
    const data = updateCycleSchema.parse(req.body);
    const cycle = await cycleService.updateCycle(req.params.deviceId, req.params.cycleId, data);
    ApiResponse.success(res, cycle, 'Cultivation cycle updated');
  }),

  /**
   * POST /api/v1/devices/:deviceId/cycles/:cycleId/complete
   * Mark a cycle as completed.
   */
  completeCycle: asyncHandler(async (req, res) => {
    const data = completeCycleSchema.parse(req.body);
    const cycle = await cycleService.completeCycle(req.params.deviceId, req.params.cycleId, data);
    ApiResponse.success(res, cycle, 'Cultivation cycle completed');
  }),

  /**
   * DELETE /api/v1/devices/:deviceId/cycles/:cycleId
   * Delete a cycle and all harvest records inside it.
   */
  deleteCycle: asyncHandler(async (req, res) => {
    await cycleService.deleteCycle(req.params.deviceId, req.params.cycleId);
    ApiResponse.success(res, null, 'Cultivation cycle deleted');
  }),

  /**
   * GET /api/v1/devices/:deviceId/cycles/:cycleId/summary
   * Get harvest analytics for a cycle.
   */
  getCycleSummary: asyncHandler(async (req, res) => {
    const summary = await cycleService.getCycleSummary(req.params.deviceId, req.params.cycleId);
    ApiResponse.success(res, summary);
  }),

  /**
   * GET /api/v1/devices/:deviceId/cycles/:cycleId/harvests
   * List harvest records for a cycle.
   */
  listHarvests: asyncHandler(async (req, res) => {
    const query = harvestQuerySchema.parse(req.query);
    const result = await cycleService.listHarvests(req.params.deviceId, req.params.cycleId, query);

    ApiResponse.paginated(res, result.records, {
      total: result.total,
      offset: result.offset,
    });
  }),

  /**
   * POST /api/v1/devices/:deviceId/cycles/:cycleId/harvests
   * Add a harvest record.
   */
  addHarvest: asyncHandler(async (req, res) => {
    const data = createHarvestSchema.parse(req.body);
    const harvest = await cycleService.addHarvest(req.params.deviceId, req.params.cycleId, data);
    ApiResponse.success(res, harvest, 'Harvest recorded successfully', 201);
  }),

  /**
   * PATCH /api/v1/devices/:deviceId/cycles/:cycleId/harvests/:harvestId
   * Update a harvest record.
   */
  updateHarvest: asyncHandler(async (req, res) => {
    const data = updateHarvestSchema.parse(req.body);
    const harvest = await cycleService.updateHarvest(
      req.params.deviceId,
      req.params.cycleId,
      req.params.harvestId,
      data
    );
    ApiResponse.success(res, harvest, 'Harvest updated');
  }),

  /**
   * DELETE /api/v1/devices/:deviceId/cycles/:cycleId/harvests/:harvestId
   * Delete a harvest record.
   */
  deleteHarvest: asyncHandler(async (req, res) => {
    await cycleService.deleteHarvest(req.params.deviceId, req.params.cycleId, req.params.harvestId);
    ApiResponse.success(res, null, 'Harvest deleted');
  }),
};

module.exports = cycleController;
