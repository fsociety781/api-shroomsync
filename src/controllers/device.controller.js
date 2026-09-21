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
   * List all registered devices (difilter per user jika terautentikasi).
   */
  listDevices: asyncHandler(async (req, res) => {
    const userId = req.user ? req.user.id : null;
    const isAdmin = req.user ? req.user.role === 'admin' : false;
    const devices = await deviceService.listDevices(userId, isAdmin);
    ApiResponse.success(res, devices);
  }),

  /**
   * POST /api/v1/devices/activate
   * Aktivasi / pairing device ke akun user via input ID atau Scan Barcode
   */
  activateDevice: asyncHandler(async (req, res) => {
    const { deviceId, name } = req.body;
    const device = await deviceService.activateDevice({
      deviceId,
      name,
      userId: req.user.id,
    });
    ApiResponse.success(
      res,
      device,
      'Perangkat berhasil diaktivasi dan ditautkan ke akun Anda',
      200
    );
  }),

  /**
   * POST /api/v1/devices/unpair/:deviceId
   * Lepas tautan device dari akun
   */
  unpairDevice: asyncHandler(async (req, res) => {
    const isAdmin = req.user ? req.user.role === 'admin' : false;
    const result = await deviceService.unpairDevice(
      req.params.deviceId,
      req.user.id,
      isAdmin
    );
    ApiResponse.success(res, result, 'Perangkat berhasil dilepas dari akun Anda');
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
