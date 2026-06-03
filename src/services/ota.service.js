// ============================================
// ShroomSync — OTA Service
// ============================================

const prisma = require('../utils/prisma');

class OtaService {
  /**
   * Create an OTA log entry when a trigger is sent.
   */
  async createLog(deviceId, { firmwareVersion, firmwareUrl }) {
    return prisma.otaLog.create({
      data: {
        deviceId,
        firmwareVersion: firmwareVersion || null,
        firmwareUrl: firmwareUrl || null,
        status: 'pending',
      },
    });
  }

  /**
   * Update OTA log from device progress report.
   */
  async updateProgress(deviceId, { progress, status, firmwareVersion }) {
    // Find the latest pending/active OTA log for this device
    const log = await prisma.otaLog.findFirst({
      where: {
        deviceId,
        status: { notIn: ['completed', 'failed'] },
      },
      orderBy: { triggeredAt: 'desc' },
    });

    if (!log) {
      // Create a new log if none exists (device reported progress without server trigger)
      return prisma.otaLog.create({
        data: {
          deviceId,
          firmwareVersion: firmwareVersion || null,
          progress: progress || 0,
          status: status || 'unknown',
        },
      });
    }

    const updateData = {
      progress: progress || log.progress,
      status: status || log.status,
    };

    if (firmwareVersion) {
      updateData.firmwareVersion = firmwareVersion;
    }

    // Mark completion
    if (status === 'completed' || status === 'failed' || status === 'hw_mismatch') {
      updateData.completedAt = new Date();
    }

    return prisma.otaLog.update({
      where: { id: log.id },
      data: updateData,
    });
  }

  /**
   * Get OTA logs for a device.
   */
  async getLogs(deviceId) {
    return prisma.otaLog.findMany({
      where: { deviceId },
      orderBy: { triggeredAt: 'desc' },
    });
  }
}

module.exports = new OtaService();
