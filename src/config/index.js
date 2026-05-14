// ============================================
// ShroomSync — Centralized Configuration
// ============================================

require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // CORS — Production Security
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // Rate Limiting
  rateLimiting: {
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

  // OTA
  firmwareUploadDir: process.env.FIRMWARE_UPLOAD_DIR || './storage/firmware',

  // Telemetry
  telemetryRetentionDays: parseInt(process.env.TELEMETRY_RETENTION_DAYS || '14', 10),

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (config.isDev ? 'debug' : 'info'),
    prettyPrint: process.env.PRETTY_LOG !== 'false',
  },
};

module.exports = config;
