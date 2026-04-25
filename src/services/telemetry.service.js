// ============================================
// ShroomSync — Telemetry Service
// ============================================

const prisma = require('../utils/prisma');
const config = require('../config');

class TelemetryService {
  /**
   * Store a sensor telemetry reading.
   * @param {string} deviceId
   * @param {{ suhu: number, kelembaban: number, waktu?: string }} data
   */
  async storeSensor(deviceId, data) {
    return prisma.sensorTelemetry.create({
      data: {
        deviceId,
        temperature: data.suhu,
        humidity: data.kelembaban,
        recordedAt: data.waktu || null,
      },
    });
  }

  /**
   * Store a history telemetry record (includes actuator status).
   * @param {string} deviceId
   * @param {object} data — { suhu, kelembaban, mode, waktu, pump, floorPump }
   */
  async storeHistory(deviceId, data) {
    return prisma.historyTelemetry.create({
      data: {
        deviceId,
        temperature: data.suhu,
        humidity: data.kelembaban,
        mode: data.mode != null ? String(data.mode) : null,
        pumpStatus: data.pump || null,
        floorPumpStatus: data.floorPump || null,
        recordedAt: data.waktu || null,
      },
    });
  }

  /**
   * Get the latest sensor telemetry reading for a device.
   */
  async getLatestSensor(deviceId) {
    return prisma.sensorTelemetry.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get the latest history telemetry reading for a device.
   */
  async getLatestHistory(deviceId) {
    return prisma.historyTelemetry.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Query sensor telemetry with pagination and optional time range.
   */
  async querySensor(deviceId, { from, to, limit = 100, offset = 0 }) {
    const where = { deviceId };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [records, total] = await Promise.all([
      prisma.sensorTelemetry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.sensorTelemetry.count({ where }),
    ]);

    return { records, total, limit, offset };
  }

  /**
   * Query history telemetry with pagination and optional time range.
   */
  async queryHistory(deviceId, { from, to, limit = 100, offset = 0 }) {
    const where = { deviceId };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [records, total] = await Promise.all([
      prisma.historyTelemetry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.historyTelemetry.count({ where }),
    ]);

    return { records, total, limit, offset };
  }

  /**
   * Purge telemetry records older than retention period.
   * Should be called periodically (e.g. daily cron).
   */
  async purgeOldRecords() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.telemetryRetentionDays);

    const [sensorResult, historyResult] = await Promise.all([
      prisma.sensorTelemetry.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      prisma.historyTelemetry.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
    ]);

    const totalPurged = sensorResult.count + historyResult.count;
    console.log(`[TELEMETRY] Purged ${totalPurged} records older than ${config.telemetryRetentionDays} days`);
    return totalPurged;
  }

  /**
   * Start periodic purge (runs every 24 hours).
   */
  startRetentionJob() {
    // Run once on startup
    this.purgeOldRecords().catch(console.error);

    // Then every 24 hours
    this._purgeInterval = setInterval(() => {
      this.purgeOldRecords().catch(console.error);
    }, 24 * 60 * 60 * 1000);

    console.log(`[TELEMETRY] Retention job started (${config.telemetryRetentionDays} days)`);
  }

  stopRetentionJob() {
    if (this._purgeInterval) {
      clearInterval(this._purgeInterval);
    }
  }
}

module.exports = new TelemetryService();
