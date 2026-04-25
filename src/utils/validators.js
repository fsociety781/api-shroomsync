// ============================================
// ShroomSync — Request Validation (Zod)
// ============================================

const { z } = require('zod');

// ── Device ────────────────────────────────────
const createDeviceSchema = z.object({
  deviceId: z.string().min(1, 'device_id is required').max(50),
  name: z.string().max(100).optional(),
  hardwareVersion: z.string().max(20).default('1.0'),
  firmwareVersion: z.string().max(20).default('1.0.0'),
});

// ── Control Mode ──────────────────────────────
const controlModeSchema = z.object({
  mode: z.number().int().min(1).max(3),
});

// ── Setpoint ──────────────────────────────────
const setpointSchema = z.object({
  MinS: z.number().int().min(0).max(60).optional(),
  MidS: z.number().int().min(0).max(60).optional(),
  MinK: z.number().int().min(0).max(100).optional(),
  MidK: z.number().int().min(0).max(100).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one setpoint field is required',
});

// ── Timer ─────────────────────────────────────
const timerSchema = z.object({
  Menit: z.number().int().min(0).max(59),
  Detik: z.number().int().min(0).max(59),
});

// ── Floor Timer ───────────────────────────────
const floorTimerSchema = z.object({
  FlrMenit: z.number().int().min(0).max(59),
  FlrDetik: z.number().int().min(0).max(59),
});

// ── Schedule (all slots at once) ──────────────
const scheduleSchema = z.object({
  jam1: z.number().int().min(0).max(23).optional(),
  menit1: z.number().int().min(0).max(59).optional(),
  jam2: z.number().int().min(0).max(23).optional(),
  menit2: z.number().int().min(0).max(59).optional(),
  jam3: z.number().int().min(0).max(23).optional(),
  menit3: z.number().int().min(0).max(59).optional(),
});

// ── Floor Schedule ────────────────────────────
const floorScheduleSchema = z.object({
  FlrJam: z.number().int().min(0).max(23),
  FlrMenit: z.number().int().min(0).max(59),
});

// ── Schedule Mode ─────────────────────────────
const scheduleModeSchema = z.object({
  mode: z.number().int().min(1).max(3),
});

// ── Actuator (Pump / Fan) ─────────────────────
const actuatorSchema = z.object({
  on: z.boolean(),
});

// ── OTA Trigger ───────────────────────────────
const otaTriggerSchema = z.object({
  action: z.string().default('update'),
  hardware_version: z.string().min(1),
  firmware_version: z.string().min(1),
  url: z.string().url('Must be a valid firmware URL'),
  checksum_sha256: z.string().optional(),
  force: z.boolean().default(false),
});

// ── Telemetry Query ───────────────────────────
const telemetryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  createDeviceSchema,
  controlModeSchema,
  setpointSchema,
  timerSchema,
  floorTimerSchema,
  scheduleSchema,
  floorScheduleSchema,
  scheduleModeSchema,
  actuatorSchema,
  otaTriggerSchema,
  telemetryQuerySchema,
};
