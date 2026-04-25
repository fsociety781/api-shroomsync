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
      limit: result.limit,
      offset: result.offset,
    });
  }),

  /**
   * GET /api/v1/devices/:deviceId/telemetry/sensor/latest
   * Get the most recent sensor reading.
   */
  getLatestSensor: asyncHandler(async (req, res) => {
    const record = await telemetryService.getLatestSensor(req.params.deviceId);

    if (!record) {
      throw new NotFoundError('No sensor telemetry data found for this device');
    }

    ApiResponse.success(res, record);
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
      limit: result.limit,
      offset: result.offset,
    });
  }),

  /**
   * GET /api/v1/devices/:deviceId/telemetry/history/latest
   * Get the most recent system state reading.
   */
  getLatestHistory: asyncHandler(async (req, res) => {
    const record = await telemetryService.getLatestHistory(req.params.deviceId);

    if (!record) {
      throw new NotFoundError('No history telemetry data found for this device');
    }

    ApiResponse.success(res, record);
  }),
};

module.exports = telemetryController;
