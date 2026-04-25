// ============================================
// ShroomSync — MQTT Topic Constants
// Mirrors firmware TopicBuilder.h
// ============================================

/**
 * Build all MQTT topics for a given device ID.
 * This mirrors the TopicBuilder class in the ESP32 firmware.
 *
 * @param {string} deviceId — e.g. "ShroomSync-ESP32-ABCD"
 * @returns {object} topic map
 */
function buildTopics(deviceId) {
  const id = deviceId;
  return {
    // ── ESP32 → Server (PUBLISH / we SUBSCRIBE) ──
    sensor:           `${id}/telemetry/sensor`,
    history:          `${id}/telemetry/history`,
    stateSetpoint:    `${id}/state/setpoint/auto`,
    stateControlMode: `${id}/state/control/mode`,
    stateTimer:       `${id}/state/timer/auto`,
    stateFloorTimer:  `${id}/state/timer/floor`,
    stateScheduleMode:`${id}/state/schedule/mode`,
    stateSchedule1:   `${id}/state/schedule/slot/1`,
    stateSchedule2:   `${id}/state/schedule/slot/2`,
    stateSchedule3:   `${id}/state/schedule/slot/3`,
    stateFloorSchedule: `${id}/state/schedule/floor`,
    otaStatus:        `shroomsync/ota/${id}/status`,

    // ── Server → ESP32 (we PUBLISH / device SUBSCRIBES) ──
    cmdControlMode:   `${id}/cmd/control/mode`,
    cmdSetpoint:      `${id}/cmd/setpoint/auto`,
    cmdTimer:         `${id}/cmd/timer/auto`,
    cmdFloorTimer:    `${id}/cmd/timer/floor`,
    cmdScheduleUpdate:`${id}/cmd/schedule/update`,
    cmdFloorSchedule: `${id}/cmd/schedule/floor`,
    cmdScheduleMode:  `${id}/cmd/schedule/mode`,
    cmdPump:          `${id}/cmd/actuator/pump`,
    cmdFan:           `${id}/cmd/actuator/fan`,
    otaTrigger:       `shroomsync/ota/${id}/trigger`,
  };
}

// Wildcard patterns for server-wide subscription
const SUBSCRIBE_PATTERNS = [
  '+/telemetry/sensor',
  '+/telemetry/history',
  '+/state/#',
  'shroomsync/ota/+/status',
];

// Broadcast OTA topic
const OTA_BROADCAST_TOPIC = 'shroomsync/ota/broadcast';

// Server client ID used in envelope to prevent self-message loops
const SERVER_CLIENT_ID = 'shroomsync-server';

module.exports = {
  buildTopics,
  SUBSCRIBE_PATTERNS,
  OTA_BROADCAST_TOPIC,
  SERVER_CLIENT_ID,
};
