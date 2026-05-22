// ============================================
// ShroomSync — Device Status Service
// Manages device online/offline detection
// via timeout-based tracking
// ============================================

const prisma = require('../utils/prisma');
const socketService = require('./socket.service');
const config = require('../config');
const logger = require('../utils/logger');

let timeoutJobInterval = null;

const deviceStatusService = {
  /**
   * Start background job to check for offline devices.
   * Runs every DEVICE_STATUS_CHECK_INTERVAL_MS and marks devices offline
   * if they haven't sent any data within DEVICE_OFFLINE_TIMEOUT_MS.
   */
  startTimeoutJob() {
    if (timeoutJobInterval) {
      logger.warn('Device timeout job already running');
      return;
    }

    const checkInterval = config.deviceStatus.checkIntervalMs;
    const offlineTimeout = config.deviceStatus.offlineTimeoutMs;

    logger.info(
      { checkInterval, offlineTimeout },
      'Starting device offline timeout job'
    );

    timeoutJobInterval = setInterval(async () => {
      try {
        await this.checkDeviceTimeout();
      } catch (error) {
        logger.error(
          { error: error.message },
          'Error in device timeout check job'
        );
      }
    }, checkInterval);
  },

  /**
   * Stop the timeout job.
   */
  stopTimeoutJob() {
    if (timeoutJobInterval) {
      clearInterval(timeoutJobInterval);
      timeoutJobInterval = null;
      logger.info('Device offline timeout job stopped');
    }
  },

  /**
   * Check all online devices and mark them offline if they exceed timeout.
   * Called by the background job.
   */
  async checkDeviceTimeout() {
    const offlineTimeout = config.deviceStatus.offlineTimeoutMs;
    const cutoffTime = new Date(Date.now() - offlineTimeout);

    try {
      // Find all online devices that haven't been seen in the timeout window
      const devicesThatTimedOut = await prisma.device.findMany({
        where: {
          isOnline: true,
          lastSeenAt: {
            lt: cutoffTime,
          },
        },
      });

      if (devicesThatTimedOut.length === 0) {
        return; // No devices timed out
      }

      logger.debug(
        { count: devicesThatTimedOut.length },
        'Found devices that timed out'
      );

      // Mark all timed out devices as offline
      const updates = await prisma.device.updateMany({
        where: {
          isOnline: true,
          lastSeenAt: {
            lt: cutoffTime,
          },
        },
        data: {
          isOnline: false,
        },
      });

      logger.info(
        { count: updates.count },
        'Marked devices as offline due to timeout'
      );

      // Emit Socket.IO events for each device that went offline
      for (const device of devicesThatTimedOut) {
        logger.debug(
          { deviceId: device.deviceId, lastSeenAt: device.lastSeenAt },
          'Device marked offline'
        );
        socketService.emitDeviceOffline(device.deviceId);
      }
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to check device timeouts');
      throw error;
    }
  },

  /**
   * Get device status information.
   * Returns online count and detailed status.
   */
  async getDevicesStatus() {
    try {
      const devices = await prisma.device.findMany({
        select: {
          deviceId: true,
          isOnline: true,
          lastSeenAt: true,
        },
      });

      const onlineCount = devices.filter(d => d.isOnline).length;

      return {
        total: devices.length,
        online: onlineCount,
        offline: devices.length - onlineCount,
        devices,
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to get devices status');
      throw error;
    }
  },
};

module.exports = deviceStatusService;
