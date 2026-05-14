// ============================================
// ShroomSync — Rate Limiting Middleware
// ============================================

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Global rate limiter
 * Applies to all requests
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.max,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests - please slow down',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Stricter rate limiter for auth-sensitive endpoints
 * Device control, OTA, config changes
 */
const strictLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: Math.floor(config.rateLimiting.max / 5), // 5x stricter
  message: {
    status: 'error',
    message: 'Too many attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + deviceId combination for device control
    const deviceId = req.params.deviceId || req.body?.deviceId || '';
    return `${req.ip}-${deviceId}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many control attempts - please wait before retrying',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

module.exports = { globalLimiter, strictLimiter };
