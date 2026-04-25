// ============================================
// ShroomSync Backend — Express Application
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Routes
const deviceRoutes = require('./src/routes/device.routes');
const controlRoutes = require('./src/routes/control.routes');
const telemetryRoutes = require('./src/routes/telemetry.routes');
const otaRoutes = require('./src/routes/ota.routes');

// Middleware
const errorHandler = require('./src/middleware/error-handler');

const app = express();

// ── Security ──────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*' }));

// ── Parsing ───────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────
app.use(morgan('dev'));

// ── Health Check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ShroomSync API',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes (v1) ───────────────────────────
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/devices', controlRoutes);
app.use('/api/v1/devices', telemetryRoutes);
app.use('/api/v1/ota', otaRoutes);

// ── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ── Global Error Handler ──────────────────────
app.use(errorHandler);

module.exports = app;
