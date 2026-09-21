// ============================================
// ShroomSync — Request Validation (Zod)
// ============================================

const { z } = require('zod');

const dateValue = z.coerce.date({
  invalid_type_error: 'Must be a valid date',
});

const optionalDateValue = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  dateValue.optional()
);

const nullableDateValue = z.preprocess(
  (value) => (value === '' ? null : value),
  dateValue.nullable().optional()
);

const nullableText = (max) => z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().min(1).max(max).nullable().optional()
);

const offsetValue = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  z.coerce.number().int().min(0).optional().default(0)
);

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
  offset: offsetValue,
});

// ── Cultivation Cycle ─────────────────────────
const cycleStatusSchema = z.enum(['active', 'completed', 'cancelled']);

const createCycleSchema = z.object({
  name: nullableText(120),
  mushroomType: z.string().trim().min(1).max(100).default('Jamur Tiram'),
  strain: nullableText(100),
  baglogCount: z.number().int().positive().optional().nullable(),
  startedAt: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    dateValue.optional().default(() => new Date())
  ),
  expectedEndedAt: nullableDateValue,
  status: cycleStatusSchema.default('active'),
  notes: nullableText(5000),
}).superRefine((data, ctx) => {
  if (data.expectedEndedAt && data.expectedEndedAt < data.startedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedEndedAt'],
      message: 'expectedEndedAt must be after startedAt',
    });
  }
});

const updateCycleSchema = z.object({
  name: nullableText(120),
  mushroomType: z.string().trim().min(1).max(100).optional(),
  strain: nullableText(100),
  baglogCount: z.number().int().positive().nullable().optional(),
  startedAt: optionalDateValue,
  expectedEndedAt: nullableDateValue,
  endedAt: nullableDateValue,
  status: cycleStatusSchema.optional(),
  notes: nullableText(5000),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one cycle field is required',
});

const completeCycleSchema = z.object({
  endedAt: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    dateValue.optional().default(() => new Date())
  ),
  notes: nullableText(5000),
});

const cycleQuerySchema = z.object({
  status: cycleStatusSchema.optional(),
  from: optionalDateValue,
  to: optionalDateValue,
  offset: offsetValue,
});

// ── Harvest Record ────────────────────────────
const createHarvestSchema = z.object({
  harvestedAt: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    dateValue.optional().default(() => new Date())
  ),
  weightKg: z.number().positive(),
  pricePerKg: z.number().nonnegative().optional().nullable(),
  grade: nullableText(50),
  notes: nullableText(5000),
});

const updateHarvestSchema = z.object({
  harvestedAt: optionalDateValue,
  weightKg: z.number().positive().optional(),
  pricePerKg: z.number().nonnegative().optional().nullable(),
  grade: nullableText(50),
  notes: nullableText(5000),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one harvest field is required',
});

const harvestQuerySchema = z.object({
  from: optionalDateValue,
  to: optionalDateValue,
  offset: offsetValue,
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
  createCycleSchema,
  updateCycleSchema,
  completeCycleSchema,
  cycleQuerySchema,
  createHarvestSchema,
  updateHarvestSchema,
  harvestQuerySchema,
};
