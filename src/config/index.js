// ============================================
// ShroomSync — Centralized Configuration
// ============================================

require('dotenv').config();

// Calculate isDev early (before config object creation)
const isDev = (process.env.NODE_ENV || 'development') === 'development';

const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev,

  // CORS — Production Security
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // Rate Limiting
  rateLimiting: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req) => req.ip,
  },

  // MQTT
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883',
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    clientId: process.env.MQTT_CLIENT_ID || `shroomsync-server-${Date.now()}`,
  },

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'shroomsync-secret-farmer-key-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // OTA
  firmwareUploadDir: process.env.FIRMWARE_UPLOAD_DIR || './storage/firmware',

  // Telemetry
  telemetryRetentionDays: parseInt(process.env.TELEMETRY_RETENTION_DAYS || '14', 10),

  // Device Status Tracking
  deviceStatus: {
    // Timeout in milliseconds before marking device offline (default 5 minutes)
    offlineTimeoutMs: parseInt(process.env.DEVICE_OFFLINE_TIMEOUT_MS || '300000', 10),
    // How often to check for timed out devices (default 30 seconds)
    checkIntervalMs: parseInt(process.env.DEVICE_STATUS_CHECK_INTERVAL_MS || '30000', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    prettyPrint: process.env.PRETTY_LOG !== 'false',
  },
};

module.exports = config;
