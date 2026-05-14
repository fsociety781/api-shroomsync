// ============================================
// ShroomSync — OTA Controller
// Handles HTTP request/response logic for
// OTA firmware update management.
// ============================================

const mqttService = require('../services/mqtt.service');
const otaService = require('../services/ota.service');
const { buildTopics, OTA_BROADCAST_TOPIC } = require('../constants/mqtt-topics');
const { otaTriggerSchema } = require('../utils/validators');
const asyncHandler = require('../utils/async-handler');
const ApiResponse = require('../utils/api-response');

const otaController = {
  /**
   * POST /api/v1/ota/trigger/:deviceId
   * Trigger OTA update for a specific device.
   */
  triggerDevice: asyncHandler(async (req, res) => {
    const data = otaTriggerSchema.parse(req.body);
    const { deviceId } = req.params;
    const topics = buildTopics(deviceId);

    // Log the OTA trigger
    await otaService.createLog(deviceId, {
      firmwareVersion: data.firmware_version,
      firmwareUrl: data.url,
    });

    // Publish to the device-specific OTA trigger topic
    const success = mqttService.publish(topics.otaTrigger, data);

    if (!success) {
      return ApiResponse.error(res, 'MQTT broker not connected', 503);
    }

    ApiResponse.success(res, { topic: topics.otaTrigger, payload: data }, `OTA trigger sent to ${deviceId}`);
  }),

  /**
   * POST /api/v1/ota/legacy-trigger/:deviceId
   * Trigger OTA update for a legacy device.
   */
  legacyTriggerDevice: asyncHandler(async (req, res) => {
    const data = otaTriggerSchema.parse(req.body);
    const { deviceId } = req.params;
    const topics = buildTopics(deviceId);

    // Log the OTA trigger
    await otaService.createLog(deviceId, {
      firmwareVersion: data.firmware_version,
      firmwareUrl: data.url,
    });

    // Publish to the legacy OTA trigger topic
    const success = mqttService.publish(topics.legacyOtaTrigger, data);

    if (!success) {
      return ApiResponse.error(res, 'MQTT broker not connected', 503);
    }

    ApiResponse.success(res, { topic: topics.legacyOtaTrigger, payload: data }, `Legacy OTA trigger sent to ${deviceId}`);
  }),

  /**
   * POST /api/v1/ota/broadcast
   * Trigger OTA update for ALL devices.
   */
  broadcast: asyncHandler(async (req, res) => {
    const data = otaTriggerSchema.parse(req.body);

    // Publish to the broadcast topic
    const success = mqttService.publish(OTA_BROADCAST_TOPIC, data);

    if (!success) {
      return ApiResponse.error(res, 'MQTT broker not connected', 503);
    }

    ApiResponse.success(res, { topic: OTA_BROADCAST_TOPIC, payload: data }, 'OTA broadcast sent to all devices');
  }),

  /**
   * GET /api/v1/ota/logs/:deviceId
   * Get OTA update history for a device.
   */
  getLogs: asyncHandler(async (req, res) => {
    const logs = await otaService.getLogs(req.params.deviceId);
    ApiResponse.success(res, logs);
  }),
};

module.exports = otaController;
