const pino = require('pino');
const config = require('../config');

// ── Pino Logger Configuration ──────────────────
const loggerConfig = {
  level: config.logging.level,
  timestamp: pino.stdTimeFunctions.isoTime,
};

const loggerOptions = config.isDev && config.logging.prettyPrint
  ? {
      ...loggerConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          singleLine: false,
          levelFirst: true,
          ignore: 'pid,hostname',
        },
      },
    }
  : loggerConfig;

const logger = pino(loggerOptions);

/**
 * Enhanced logger with request context
 * Usage: contextLogger(req).info('message', { extra: 'data' })
 */
function contextLogger(req) {
  return logger.child({
    requestId: req.id || `${Date.now()}-${Math.random()}`,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
}

module.exports = logger;
module.exports.contextLogger = contextLogger;
