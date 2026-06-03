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
async function sendCommand(res, deviceId, topicKey, payload, afterPublish = undefined) {
  const topics = buildTopics(deviceId);
  const topic = topics[topicKey];

  if (!topic) {
    return ApiResponse.error(res, `Unknown topic key: ${topicKey}`, 400);
  }

  const success = mqttService.publish(topic, payload);

  if (!success) {
    return ApiResponse.error(res, 'MQTT broker not connected', 503);
  }

  const result = afterPublish ? await afterPublish() : undefined;

  ApiResponse.success(
    res,
    {
      topic,
      payload,
      ...(result !== undefined && { device: result }),
    },
    'Command sent'
  );
}

function actuatorStatus(on) {
  return on ? 'ON' : 'OFF';
}

const controlController = {
  /**
   * POST /api/v1/devices/:deviceId/control/mode
   * Change control mode (1=Manual, 2=Auto, 3=Hybrid).
   */
  changeControlMode: asyncHandler((req, res) => {
    const data = controlModeSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdControlMode', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/setpoint
   * Update temperature/humidity setpoints.
   */
  updateSetpoint: asyncHandler((req, res) => {
    const data = setpointSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdSetpoint', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/timer
   * Update pump timer config.
   */
  updateTimer: asyncHandler((req, res) => {
    const data = timerSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdTimer', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/timer/floor
   * Update floor pump timer config.
   */
  updateFloorTimer: asyncHandler((req, res) => {
    const data = floorTimerSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdFloorTimer', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/schedule
   * Update all schedule slots at once.
   */
  updateSchedule: asyncHandler((req, res) => {
    const data = scheduleSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdScheduleUpdate', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/schedule/floor
   * Update floor pump schedule.
   */
  updateFloorSchedule: asyncHandler((req, res) => {
    const data = floorScheduleSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdFloorSchedule', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/schedule/mode
   * Change schedule mode (1x, 2x, 3x sehari).
   */
  changeScheduleMode: asyncHandler((req, res) => {
    const data = scheduleModeSchema.parse(req.body);
    sendCommand(res, req.params.deviceId, 'cmdScheduleMode', data);
  }),

  /**
   * POST /api/v1/devices/:deviceId/actuator/pump
   * Manual pump override.
   */
  controlPump: asyncHandler((req, res) => {
    const data = actuatorSchema.parse(req.body);
    const status = actuatorStatus(data.on);

    return sendCommand(
      res,
      req.params.deviceId,
      'cmdPump',
      { pump: data.on ? 1 : 0, on: data.on },
      () => deviceService.updateActuatorState(req.params.deviceId, { pumpStatus: status })
    );
  }),

  /**
   * POST /api/v1/devices/:deviceId/actuator/fan
   * Manual fan/floor pump override.
   */
  controlFan: asyncHandler((req, res) => {
    const data = actuatorSchema.parse(req.body);
    const status = actuatorStatus(data.on);

    return sendCommand(
      res,
      req.params.deviceId,
      'cmdFan',
      { fan: data.on ? 1 : 0, on: data.on },
      () => deviceService.updateActuatorState(req.params.deviceId, { floorPumpStatus: status })
    );
  }),
};

module.exports = controlController;
