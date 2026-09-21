// ============================================
// ShroomSync — MQTT Bridge Service
// The heart of the server — subscribes to all
// ESP32 device topics and processes messages.
// ============================================

const mqtt = require('mqtt');
const config = require('../config');
const logger = require('../utils/logger');
const { SUBSCRIBE_PATTERNS, SERVER_CLIENT_ID } = require('../constants/mqtt-topics');
const deviceService = require('./device.service');
const telemetryService = require('./telemetry.service');
const otaService = require('./ota.service');
const socketService = require('./socket.service');
const prisma = require('../utils/prisma');

let client = null;

const SHROOMSYNC_OTA_STATUS_TOPIC_RE = /^shroomsync\/ota\/[^/]+\/status$/;
const SCHEDULE_SLOT_ROUTE_RE = /^state\/schedule\/slot\/[1-3]$/;
const SHROOMSYNC_DEVICE_ID_RE = /^(SCM|SS|SMC|SH|SHROOMSYNC)[-_]/i;
const STANDARD_TOPIC_ROUTES = new Set([
  'telemetry/sensor',
  'telemetry/history',
  'telemetry/heartbeat',
  'state/actuator',
  'state/control/mode',
  'state/setpoint/auto',
  'state/timer/auto',
  'state/timer/floor',
  'state/schedule/mode',
  'state/schedule/floor',
  'activation/check',
  'legacy/ota/status',
]);

function normalizeActuatorStatus(value) {
  if (value == null) return undefined;

  if (typeof value === 'boolean') {
    return value ? 'ON' : 'OFF';
  }

  if (typeof value === 'number') {
    return value === 0 ? 'OFF' : 'ON';
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (['1', 'ON', 'TRUE', 'ACTIVE', 'HIGH'].includes(normalized)) return 'ON';
    if (['0', 'OFF', 'FALSE', 'INACTIVE', 'LOW'].includes(normalized)) return 'OFF';
  }

  return undefined;
}

function readActuatorStatus(data, keys) {
  for (const key of keys) {
    const status = normalizeActuatorStatus(data[key]);
    if (status !== undefined) return status;
  }
  return undefined;
}

const mqttService = {
  /**
   * Connect to the MQTT broker and set up subscriptions.
   */
  connect() {
    const opts = {
      clientId: config.mqtt.clientId,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };

    if (config.mqtt.username) {
      opts.username = config.mqtt.username;
      opts.password = config.mqtt.password;
    }

    console.log(`[MQTT] Connecting to ${config.mqtt.brokerUrl}...`);
    client = mqtt.connect(config.mqtt.brokerUrl, opts);

    client.on('connect', () => {
      console.log('[MQTT] ✅ Connected to broker!');
      this._subscribeAll();
    });

    client.on('reconnect', () => {
      console.log('[MQTT] Reconnecting...');
    });

    client.on('error', (err) => {
      console.error('[MQTT] Connection error:', err.message);
    });

    client.on('offline', () => {
      console.log('[MQTT] Offline');
    });

    client.on('message', (topic, payload) => {
      this._handleMessage(topic, payload).catch(err => {
        console.error('[MQTT] Unhandled message error:', err.message);
      });
    });
  },

  /**
   * Disconnect from the MQTT broker.
   */
  disconnect() {
    if (client) {
      client.end(true);
      console.log('[MQTT] Disconnected');
    }
  },

  /**
   * Get the MQTT client instance.
   */
  getClient() {
    return client;
  },

  /**
   * Publish a command to a device via MQTT.
   * Wraps the payload in both flat properties and nested "data" envelope
   * for maximum compatibility across all firmware versions.
   *
   * @param {string} topic — Full MQTT topic
   * @param {object} data — Payload data
   */
  publish(topic, data) {
    if (!client || !client.connected) {
      console.error('[MQTT] Cannot publish — not connected');
      return false;
    }

    const payloadObj = (data && typeof data === 'object' && !Array.isArray(data)) ? data : { value: data };

    const envelope = {
      ...payloadObj,
      data: payloadObj,
      clientId: SERVER_CLIENT_ID,
    };

    const payload = JSON.stringify(envelope);
    client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error(`[MQTT] Publish error on ${topic}:`, err.message);
      } else {
        console.log(`[MQTT] TX: ${topic} → ${payload}`);
      }
    });
    return true;
  },

  /**
   * Publish activation status to device.
   * Topic: {{device_id}}/activation/status
   *
   * @param {string} deviceId
   * @param {{ activated: boolean, owner?: string, message?: string }} payload
   */
  publishActivationStatus(deviceId, { activated, owner = '', message = '' }) {
    const topic = `${deviceId}/activation/status`;
    const payload = {
      activated: Boolean(activated),
      owner: owner || '',
      message: message || '',
    };
    return this.publish(topic, payload);
  },

  // ────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────

  /**
   * Subscribe to all wildcard patterns.
   */
  _subscribeAll() {
    for (const pattern of SUBSCRIBE_PATTERNS) {
      client.subscribe(pattern, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Subscribe error: ${pattern}`, err.message);
        } else {
          console.log(`[MQTT] Subscribed: ${pattern}`);
        }
      });
    }
  },

  /**
   * Route incoming MQTT message to the appropriate handler.
   */
  async _handleMessage(topic, rawPayload) {
    // ── Early filter: Skip messages from non-shroomsync devices ──
    // Messages from lock/*, gboard/*, etc are ignored early
    if (!this._isShroomSyncTopic(topic)) {
      return; // silently skip unrelated topics
    }

    const envelope = this._parsePayload(topic, rawPayload);
    if (!envelope) return;

    // ── Filter self-messages ──
    if (envelope.clientId === SERVER_CLIENT_ID) {
      return;
    }

    // ── Extract deviceId from topic ──
    const deviceId = this._extractDeviceId(topic, envelope.deviceId);
    if (!deviceId) {
      return; // silently skip — can't determine device
    }

    if (envelope.deviceId && envelope.deviceId !== deviceId) {
      logger.debug({ topic, topicDeviceId: deviceId, payloadDeviceId: envelope.deviceId }, 'MQTT device_id mismatch');
      return;
    }

    const shouldProcess = await this._shouldProcessDevice(deviceId);
    if (!shouldProcess) {
      return; // silently skip non-ShroomSync traffic
    }

    // ── Route to handler (all async, catch errors) ──
    this._routeMessage(topic, deviceId, envelope.data).catch(err => {
      logger.error({ topic, deviceId, error: err.message }, 'MQTT handler error');
    });
  },

  /**
   * Parse MQTT JSON and normalize the firmware envelope:
   * { device_id, seq, uptime_ms, data, clientId }.
   * Legacy flat payloads are still accepted as the effective data object.
   */
  _parsePayload(topic, rawPayload) {
    let payload;
    try {
      payload = JSON.parse(rawPayload.toString());
    } catch {
      logger.debug({ topic }, 'Invalid JSON payload on topic');
      return null;
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      logger.debug({ topic }, 'Invalid MQTT payload object');
      return null;
    }

    const nestedData = payload.data;
    const hasNestedData = nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData);

    return {
      raw: payload,
      data: hasNestedData ? nestedData : payload,
      deviceId: typeof payload.device_id === 'string' ? payload.device_id : null,
      seq: payload.seq,
      uptimeMs: payload.uptime_ms,
      clientId: payload.clientId,
    };
  },

  /**
   * Check if topic belongs to ShroomSync devices.
   * Filters out messages from other MQTT devices (lock, gboard, wifi-relay, etc).
   */
  _isShroomSyncTopic(topic) {
    if (SHROOMSYNC_OTA_STATUS_TOPIC_RE.test(topic)) return true;

    const route = this._extractStandardRoute(topic);
    if (!route) return false;

    return STANDARD_TOPIC_ROUTES.has(route) || SCHEDULE_SLOT_ROUTE_RE.test(route);
  },

  /**
   * Extract the topic route after the device id, e.g. telemetry/sensor.
   */
  _extractStandardRoute(topic) {
    const parts = topic.split('/');
    if (parts.length < 3) return null;
    return parts.slice(1).join('/');
  },

  /**
   * Extract deviceId from MQTT topic.
   * Topics follow pattern: {deviceId}/telemetry/... or shroomsync/ota/{deviceId}/status
   */
  _extractDeviceId(topic, payloadDeviceId) {
    // OTA status topic: shroomsync/ota/{deviceId}/status
    const otaMatch = topic.match(/^shroomsync\/ota\/(.+)\/status$/);
    if (otaMatch) return otaMatch[1];

    // Standard topics: {deviceId}/telemetry/... or {deviceId}/state/...
    const parts = topic.split('/');
    if (parts.length >= 2) {
      return parts[0];
    }

    // Fallback to payload device_id
    return payloadDeviceId;
  },

  /**
   * Validate that a deviceId exists in the database.
   * Uses an in-memory cache to prevent DB spam on every MQTT message.
   */
  async _isValidDeviceId(deviceId) {
    if (!deviceId || deviceId.length < 3) return false;
    
    // Check memory cache first (cache invalidates every 5 minutes to catch deletions)
    if (!this._deviceCache) this._deviceCache = new Map();
    const cached = this._deviceCache.get(deviceId);
    if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
      return cached.valid;
    }
    
    // Dynamically check if device is registered in the system
    try {
      const existing = await prisma.device.findUnique({
        where: { deviceId }
      });
      const valid = !!existing;
      this._deviceCache.set(deviceId, { valid, timestamp: Date.now() });
      return valid;
    } catch {
      return false;
    }
  },

  /**
   * Standard ShroomSync IDs can auto-register on first telemetry.
   * Other IDs are accepted only when they already exist in the database.
   */
  async _shouldProcessDevice(deviceId) {
    if (this._looksLikeShroomSyncDeviceId(deviceId)) return true;
    return this._isValidDeviceId(deviceId);
  },

  _looksLikeShroomSyncDeviceId(deviceId) {
    return SHROOMSYNC_DEVICE_ID_RE.test(deviceId);
  },

  /**
   * Route message to appropriate handler.
   */
  async _routeMessage(topic, deviceId, data) {
    let handled = false;

    if (topic.endsWith('/telemetry/sensor')) {
      await this._handleSensorTelemetry(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/telemetry/history')) {
      await this._handleHistoryTelemetry(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/telemetry/heartbeat')) {
      await this._handleHeartbeatTelemetry(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/state/actuator')) {
      await this._handleStateActuator(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/state/control/mode')) {
      await this._handleStateControlMode(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/state/setpoint/auto')) {
      await this._handleStateSetpoint(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/state/timer/auto')) {
      await this._handleStateTimer(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/state/timer/floor')) {
      await this._handleStateFloorTimer(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/state/schedule/mode')) {
      await this._handleStateScheduleMode(deviceId, data);
      handled = true;
    } else if (topic.match(/\/state\/schedule\/slot\/[1-3]$/)) {
      const slotNum = parseInt(topic.charAt(topic.length - 1), 10);
      await this._handleStateScheduleSlot(deviceId, slotNum, data);
      handled = true;
    } else if (topic.endsWith('/state/schedule/floor')) {
      await this._handleStateFloorSchedule(deviceId, data);
      handled = true;
    } else if (topic.endsWith('/activation/check')) {
      await this._handleActivationCheck(deviceId, data);
      handled = true;
    } else if (topic.match(/^shroomsync\/ota\/.+\/status$/) || topic.endsWith('/legacy/ota/status')) {
      await this._handleOtaStatus(deviceId, data);
      handled = true;
    }

    // Only log messages that were actually processed
    if (handled) {
      console.log(`[MQTT] RX: ${topic} (device: ${deviceId})`);
    }
  },

  // ── TELEMETRY HANDLERS ──────────────────────

  async _handleSensorTelemetry(deviceId, data) {
    const suhu = data.suhu ?? data.temperature ?? data.temp;
    const kelembaban = data.kelembaban ?? data.humidity ?? data.hum;
    if (suhu == null || kelembaban == null) return;

    const normalized = {
      ...data,
      suhu: Number(suhu),
      kelembaban: Number(kelembaban),
    };

    // Mark device as online (auto-registers if unknown)
    await deviceService.markOnline(deviceId);

    // Store in database
    await telemetryService.storeSensor(deviceId, normalized);

    // Broadcast via Socket.IO
    socketService.emitSensorTelemetry(deviceId, normalized);
    socketService.emitDeviceOnline(deviceId);
  },

  async _handleHistoryTelemetry(deviceId, data) {
    const suhu = data.suhu ?? data.temperature ?? data.temp;
    const kelembaban = data.kelembaban ?? data.humidity ?? data.hum;
    if (suhu == null || kelembaban == null) return;

    const normalized = {
      ...data,
      suhu: Number(suhu),
      kelembaban: Number(kelembaban),
    };

    await deviceService.markOnline(deviceId);

    // Store in BOTH history and sensor telemetry tables
    await Promise.all([
      telemetryService.storeHistory(deviceId, normalized),
      telemetryService.storeSensor(deviceId, normalized),
    ]);

    // Broadcast both sensor and history to Socket.IO so frontend receives real-time updates
    socketService.emitSensorTelemetry(deviceId, normalized);
    socketService.emitHistoryTelemetry(deviceId, normalized);
    socketService.emitDeviceOnline(deviceId);
  },

  async _handleHeartbeatTelemetry(deviceId, data) {
    await deviceService.markOnline(deviceId);

    // Update firmware/hardware version and diagnostic fields if provided
    if (data.firmware_version || data.hardware_version || data.rssi_dbm != null || data.uptime_ms != null) {
      try {
        const update = {};
        if (data.firmware_version) update.firmwareVersion = data.firmware_version;
        if (data.hardware_version) update.hardwareVersion = data.hardware_version;
        if (data.rssi_dbm != null) update.rssiDbm = parseInt(data.rssi_dbm, 10);
        if (data.uptime_ms != null) update.uptimeMs = parseInt(data.uptime_ms, 10);
        if (data.sensor_valid != null) update.sensorValid = !!data.sensor_valid;
        
        const prisma = require('../utils/prisma');
        await prisma.device.update({
          where: { deviceId },
          data: update,
        });
      } catch (err) {
        console.error(`[MQTT] Failed to update device versions for ${deviceId}:`, err.message);
      }
    }

    // Emit heartbeat and online status via socket
    socketService.emitDeviceOnline(deviceId);
    socketService.emitDeviceState(deviceId, 'heartbeat', data);
  },

  // ── STATE HANDLERS ──────────────────────────
  // These fire when the ESP32 reports its current config state.

  async _handleStateActuator(deviceId, data) {
    const pumpStatus = readActuatorStatus(data, ['pumpStatus', 'pump_status', 'pump']);
    const floorPumpStatus = readActuatorStatus(data, [
      'floorPumpStatus',
      'floor_pump_status',
      'floorPump',
      'floor_pump',
      'fanStatus',
      'fan_status',
      'fan',
    ]);
    const update = {};

    if (pumpStatus !== undefined) update.pumpStatus = pumpStatus;
    if (floorPumpStatus !== undefined) update.floorPumpStatus = floorPumpStatus;

    if (Object.keys(update).length > 0) {
      await deviceService.updateActuatorState(deviceId, update);
    }

    socketService.emitDeviceState(deviceId, 'actuator', data);
  },

  async _handleStateControlMode(deviceId, data) {
    if (data.mode == null) return;
    await deviceService.updateConfig(deviceId, {
      controlMode: parseInt(data.mode, 10),
    });
    socketService.emitDeviceState(deviceId, 'control_mode', data);
  },

  async _handleStateSetpoint(deviceId, data) {
    const update = {};
    if (data.MinS != null) update.minS = parseInt(data.MinS, 10);
    if (data.MidS != null) update.midS = parseInt(data.MidS, 10);
    if (data.MinK != null) update.minK = parseInt(data.MinK, 10);
    if (data.MidK != null) update.midK = parseInt(data.MidK, 10);

    if (Object.keys(update).length > 0) {
      await deviceService.updateConfig(deviceId, update);
      socketService.emitDeviceState(deviceId, 'setpoint', data);
    }
  },

  async _handleStateTimer(deviceId, data) {
    const update = {};
    if (data.Menit != null) update.timerMinute = parseInt(data.Menit, 10);
    if (data.Detik != null) update.timerSecond = parseInt(data.Detik, 10);

    if (Object.keys(update).length > 0) {
      await deviceService.updateConfig(deviceId, update);
      socketService.emitDeviceState(deviceId, 'timer', data);
    }
  },

  async _handleStateFloorTimer(deviceId, data) {
    const update = {};
    if (data.FlrMenit != null) update.floorTimerMinute = parseInt(data.FlrMenit, 10);
    if (data.FlrDetik != null) update.floorTimerSecond = parseInt(data.FlrDetik, 10);

    if (Object.keys(update).length > 0) {
      await deviceService.updateConfig(deviceId, update);
      socketService.emitDeviceState(deviceId, 'floor_timer', data);
    }
  },

  async _handleStateScheduleMode(deviceId, data) {
    if (data.smode == null) return;
    await deviceService.updateConfig(deviceId, {
      scheduleMode: parseInt(data.smode, 10),
    });
    socketService.emitDeviceState(deviceId, 'schedule_mode', data);
  },

  async _handleStateScheduleSlot(deviceId, slotNum, data) {
    const update = {};
    const jamKey = `Jam${slotNum}`;
    const menitKey = `Menit${slotNum}`;

    if (data[jamKey] != null) update[`schedule${slotNum}Hour`] = parseInt(data[jamKey], 10);
    if (data[menitKey] != null) update[`schedule${slotNum}Minute`] = parseInt(data[menitKey], 10);

    if (Object.keys(update).length > 0) {
      await deviceService.updateConfig(deviceId, update);
      socketService.emitDeviceState(deviceId, `schedule_slot_${slotNum}`, data);
    }
  },

  async _handleStateFloorSchedule(deviceId, data) {
    const update = {};
    if (data.FlrJam != null) update.floorScheduleHour = parseInt(data.FlrJam, 10);
    if (data.FlrMenit != null) update.floorScheduleMinute = parseInt(data.FlrMenit, 10);

    if (Object.keys(update).length > 0) {
      await deviceService.updateConfig(deviceId, update);
      socketService.emitDeviceState(deviceId, 'floor_schedule', data);
    }
  },

  // ── OTA HANDLER ─────────────────────────────

  async _handleOtaStatus(deviceId, data) {
    if (!data.status) return;

    // Ensure device exists before creating OTA log
    await deviceService.ensureDevice(deviceId);

    await otaService.updateProgress(deviceId, {
      progress: data.progress,
      status: data.status,
      firmwareVersion: data.firmware_version,
    });

    // Update device firmware version if OTA completed
    if (data.status === 'completed' && data.firmware_version) {
      try {
        const prisma = require('../utils/prisma');
        await prisma.device.update({
          where: { deviceId },
          data: { firmwareVersion: data.firmware_version },
        });
      } catch {
        // ignore — device may not exist
      }
    }

    socketService.emitOtaProgress(deviceId, data);
  },

  // ── ACTIVATION HANDLER ──────────────────────

  /**
   * Handle incoming device activation check: {{device_id}}/activation/check
   * Payload: { device_id, mac_address, firmware_version, hardware_version, action }
   */
  async _handleActivationCheck(deviceId, data = {}) {
    try {
      // 1. Ensure device exists in DB & update firmware/hardware info
      await deviceService.ensureDevice(deviceId, {
        hardwareVersion: data.hardware_version,
        firmwareVersion: data.firmware_version,
      });
      await deviceService.markOnline(deviceId);

      // 2. Query ownership and activation status
      const device = await prisma.device.findUnique({
        where: { deviceId },
        include: { user: true },
      });

      const isActivated = Boolean(device && device.userId && device.activatedAt);

      if (isActivated) {
        const ownerName = device.user?.fullName || device.user?.username || 'Petani ShroomSync';
        const kumbungName = device.name || deviceId;
        this.publishActivationStatus(deviceId, {
          activated: true,
          owner: ownerName,
          message: `Perangkat berhasil diaktivasi untuk ${kumbungName}`,
        });
        console.log(`[MQTT] Activation check for ${deviceId}: ACTIVE (Owner: ${ownerName})`);
      } else {
        this.publishActivationStatus(deviceId, {
          activated: false,
          owner: '',
          message: 'Perangkat belum diaktivasi',
        });
        console.log(`[MQTT] Activation check for ${deviceId}: NOT ACTIVATED`);
      }

      // 3. Emit real-time notification to web/mobile clients
      socketService.emitDeviceActivationCheck(deviceId, {
        deviceId,
        macAddress: data.mac_address,
        firmwareVersion: data.firmware_version,
        hardwareVersion: data.hardware_version,
        isActivated,
        owner: isActivated ? (device.user?.fullName || device.user?.username) : null,
      });
    } catch (err) {
      console.error(`[MQTT] Error in _handleActivationCheck for ${deviceId}:`, err.message);
    }
  },
};

module.exports = mqttService;
