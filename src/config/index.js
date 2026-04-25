// ============================================
// ShroomSync — Centralized Configuration
// ============================================

require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // MQTT
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883',
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    clientId: process.env.MQTT_CLIENT_ID || `shroomsync-server-${Date.now()}`,
  },

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // OTA
  firmwareUploadDir: process.env.FIRMWARE_UPLOAD_DIR || './storage/firmware',

  // Telemetry
  telemetryRetentionDays: parseInt(process.env.TELEMETRY_RETENTION_DAYS || '14', 10),
};

module.exports = config;
