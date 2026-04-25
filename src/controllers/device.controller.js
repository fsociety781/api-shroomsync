// ============================================
// ShroomSync — Device Controller
// Handles HTTP request/response logic for
// device management operations.
// ============================================

const deviceService = require('../services/device.service');
const { createDeviceSchema } = require('../utils/validators');
const asyncHandler = require('../utils/async-handler');
const ApiResponse = require('../utils/api-response');

const deviceController = {
  /**
   * GET /api/v1/devices
   * List all registered devices.
   */
  listDevices: asyncHandler(async (req, res) => {
    const devices = await deviceService.listDevices();
    ApiResponse.success(res, devices);
  }),

  /**
   * GET /api/v1/devices/:deviceId
   * Get a single device with its config.
   */
  getDevice: asyncHandler(async (req, res) => {
    const device = await deviceService.getDevice(req.params.deviceId);
    ApiResponse.success(res, device);
  }),

  /**
   * POST /api/v1/devices
   * Register a new device.
   */
  createDevice: asyncHandler(async (req, res) => {
    const data = createDeviceSchema.parse(req.body);
    const device = await deviceService.createDevice(data);
    ApiResponse.success(res, device, 'Device created successfully', 201);
  }),

  /**
   * DELETE /api/v1/devices/:deviceId
   * Remove a device and all its data.
   */
  deleteDevice: asyncHandler(async (req, res) => {
    await deviceService.deleteDevice(req.params.deviceId);
    ApiResponse.success(res, null, 'Device deleted');
  }),
};

module.exports = deviceController;
