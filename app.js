// ============================================
// ShroomSync Backend — Express Application
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Configuration
const config = require('./src/config');

// Routes
const authRoutes = require('./src/routes/auth.routes');
const deviceRoutes = require('./src/routes/device.routes');
const controlRoutes = require('./src/routes/control.routes');
const telemetryRoutes = require('./src/routes/telemetry.routes');
const cycleRoutes = require('./src/routes/cycle.routes');

// Middleware
const errorHandler = require('./src/middleware/error-handler');
const logger = require('./src/utils/logger');

const app = express();

// ── Security: Helmet ──────────────────────────
app.use(helmet());

// ── Security: CORS (Production-ready) ────────
app.use(cors(config.cors));

// ── Parsing ───────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging (Morgan + Structured) ────────────
app.use(morgan('dev'));

// ── Request ID & Context ──────────────────────
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ── Health Check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ShroomSync API',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ── API Routes (v1) ───────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/devices', telemetryRoutes);
app.use('/api/v1/devices', cycleRoutes);
app.use('/api/v1/devices', controlRoutes);

// ── 404 Handler ───────────────────────────────
app.use((req, res) => {
  logger.warn(
    { method: req.method, path: req.path },
    'Route not found'
  );
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// ── Global Error Handler ──────────────────────
app.use(errorHandler);

module.exports = app;
