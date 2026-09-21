// ============================================
// ShroomSync — Telemetry Controller
// Handles HTTP request/response logic for
// telemetry data queries.
// ============================================

const telemetryService = require('../services/telemetry.service');
const { telemetryQuerySchema } = require('../utils/validators');
const { NotFoundError } = require('../utils/errors');
const asyncHandler = require('../utils/async-handler');
const ApiResponse = require('../utils/api-response');

const telemetryController = {
  /**
   * GET /api/v1/devices/:deviceId/telemetry/sensor
   * Query historical sensor data with pagination.
   */
  querySensor: asyncHandler(async (req, res) => {
    const query = telemetryQuerySchema.parse(req.query);
    const result = await telemetryService.querySensor(req.params.deviceId, query);

    ApiResponse.paginated(res, result.records, {
      total: result.total,
      offset: result.offset,
    });
  }),

  /**
   * GET /api/v1/devices/:deviceId/telemetry/sensor/latest
   * Get the most recent sensor reading.
   */
  getLatestSensor: asyncHandler(async (req, res) => {
    const record = await telemetryService.getLatestSensor(req.params.deviceId);
    ApiResponse.success(res, record || null);
  }),

  /**
   * GET /api/v1/devices/:deviceId/telemetry/history
   * Query historical system state data with pagination.
   */
  queryHistory: asyncHandler(async (req, res) => {
    const query = telemetryQuerySchema.parse(req.query);
    const result = await telemetryService.queryHistory(req.params.deviceId, query);

    ApiResponse.paginated(res, result.records, {
      total: result.total,
      offset: result.offset,
    });
  }),

  /**
   * GET /api/v1/devices/:deviceId/telemetry/history/latest
   * Get the most recent system state reading.
   */
  getLatestHistory: asyncHandler(async (req, res) => {
    const record = await telemetryService.getLatestHistory(req.params.deviceId);
    ApiResponse.success(res, record || null);
  }),
};

module.exports = telemetryController;
