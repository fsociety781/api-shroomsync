// ============================================
// ShroomSync — Control Controller
// Handles HTTP request/response logic for
// sending commands to ESP32 devices via MQTT.
// ============================================

const mqttService = require('../services/mqtt.service');
const deviceService = require('../services/device.service');
const { buildTopics } = require('../constants/mqtt-topics');
const {
  controlModeSchema,
  setpointSchema,
  timerSchema,
  floorTimerSchema,
  scheduleSchema,
  floorScheduleSchema,
  scheduleModeSchema,
  actuatorSchema,
} = require('../utils/validators');
const asyncHandler = require('../utils/async-handler');
const ApiResponse = require('../utils/api-response');

/**
 * Helper: publish validated command to a device.
 */
function sendCommand(res, deviceId, topicKey, payload) {
  const topics = buildTopics(deviceId);
  const topic = topics[topicKey];

  if (!topic) {
    return ApiResponse.error(res, `Unknown topic key: ${topicKey}`, 400);
  }

  const mqttPublished = mqttService.publish(topic, payload);

  ApiResponse.success(
    res,
    { topic, payload, mqttPublished },
    mqttPublished ? 'Command sent and config saved' : 'Config saved, MQTT broker not connected'
  );
}

const controlController = {
  /**
   * POST /api/v1/devices/:deviceId/control/mode
   * Change control mode (1=Manual, 2=Auto, 3=Hybrid).
   */
  changeControlMode: asyncHandler(async (req, res) => {
    const data = controlModeSchema.parse(req.body);
    await deviceService.updateConfig(req.params.deviceId, {
      controlMode: data.mode,
    });
    sendCommand(res, req.params.deviceId, 'cmdControlMode', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/setpoint
   * Update temperature/humidity setpoints.
   */
  updateSetpoint: asyncHandler(async (req, res) => {
    const data = setpointSchema.parse(req.body);
    const update = {};
    if (data.MinS != null) update.minS = data.MinS;
    if (data.MidS != null) update.midS = data.MidS;
    if (data.MinK != null) update.minK = data.MinK;
    if (data.MidK != null) update.midK = data.MidK;
    await deviceService.updateConfig(req.params.deviceId, update);
    sendCommand(res, req.params.deviceId, 'cmdSetpoint', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/timer
   * Update pump timer config.
   */
  updateTimer: asyncHandler(async (req, res) => {
    const data = timerSchema.parse(req.body);
    await deviceService.updateConfig(req.params.deviceId, {
      timerMinute: data.Menit,
      timerSecond: data.Detik,
    });
    sendCommand(res, req.params.deviceId, 'cmdTimer', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/timer/floor
   * Update floor pump timer config.
   */
  updateFloorTimer: asyncHandler(async (req, res) => {
    const data = floorTimerSchema.parse(req.body);
    await deviceService.updateConfig(req.params.deviceId, {
      floorTimerMinute: data.FlrMenit,
      floorTimerSecond: data.FlrDetik,
    });
    sendCommand(res, req.params.deviceId, 'cmdFloorTimer', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/schedule
   * Update all schedule slots at once.
   */
  updateSchedule: asyncHandler(async (req, res) => {
    const data = scheduleSchema.parse(req.body);
    const update = {};
    if (data.jam1 != null) update.schedule1Hour = data.jam1;
    if (data.menit1 != null) update.schedule1Minute = data.menit1;
    if (data.jam2 != null) update.schedule2Hour = data.jam2;
    if (data.menit2 != null) update.schedule2Minute = data.menit2;
    if (data.jam3 != null) update.schedule3Hour = data.jam3;
    if (data.menit3 != null) update.schedule3Minute = data.menit3;
    await deviceService.updateConfig(req.params.deviceId, update);
    sendCommand(res, req.params.deviceId, 'cmdScheduleUpdate', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/schedule/floor
   * Update floor pump schedule.
   */
  updateFloorSchedule: asyncHandler(async (req, res) => {
    const data = floorScheduleSchema.parse(req.body);
    await deviceService.updateConfig(req.params.deviceId, {
      floorScheduleHour: data.FlrJam,
      floorScheduleMinute: data.FlrMenit,
    });
    sendCommand(res, req.params.deviceId, 'cmdFloorSchedule', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/schedule/mode
   * Change schedule mode (1x, 2x, 3x sehari).
   */
  changeScheduleMode: asyncHandler(async (req, res) => {
    const data = scheduleModeSchema.parse(req.body);
    await deviceService.updateConfig(req.params.deviceId, {
      scheduleMode: data.mode,
    });
    sendCommand(res, req.params.deviceId, 'cmdScheduleMode', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/actuator/pump
   * Manual pump override.
   */
  controlPump: asyncHandler((req, res) => {
    const data = actuatorSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdPump', { pump: data.on ? 1 : 0, on: data.on });
  }),

  /**
   * POST /api/v1/devices/:deviceId/actuator/fan
   * Manual fan/floor pump override.
   */
  controlFan: asyncHandler((req, res) => {
    const data = actuatorSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdFan', { fan: data.on ? 1 : 0, on: data.on });
  }),
};

module.exports = controlController;
