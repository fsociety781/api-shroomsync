// ============================================
// ShroomSync — Device Service
// ============================================

const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError } = require('../utils/errors');
const fs = require('fs').promises;
const path = require('path');
const socketService = require('./socket.service');

class DeviceService {
  /**
   * List all registered devices with their config and online status.
   */
  async listDevices() {
    return prisma.device.findMany({
      include: { config: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single device by deviceId (e.g. "ShroomSync-ESP32-ABCD").
   */
  async getDevice(deviceId) {
    const device = await prisma.device.findUnique({
      where: { deviceId },
      include: { config: true },
    });
    if (!device) {
      throw new NotFoundError(`Device "${deviceId}" not found`);
    }
    return device;
  }

  /**
   * Register a new device. Auto-creates a default DeviceConfig.
   */
  async createDevice(data) {
    const existing = await prisma.device.findUnique({
      where: { deviceId: data.deviceId },
    });
    if (existing) {
      throw new ConflictError(`Device "${data.deviceId}" already registered`);
    }

    const newDevice = await prisma.device.create({
      data: {
        deviceId: data.deviceId,
        name: data.name || null,
        hardwareVersion: data.hardwareVersion || '1.0',
        firmwareVersion: data.firmwareVersion || '1.0.0',
        config: {
          create: {}, // all defaults from schema
        },
      },
      include: { config: true },
    });

    await this._generateDeviceJsonFile(newDevice);

    return newDevice;
  }

  /**
   * Delete a device and all related records (cascade).
   */
  async deleteDevice(deviceId) {
    const device = await prisma.device.findUnique({
      where: { deviceId },
    });
    if (!device) {
      throw new NotFoundError(`Device "${deviceId}" not found`);
    }

    await prisma.device.delete({ where: { deviceId } });
    return { deleted: true };
  }

  /**
   * Mark device as online and update lastSeenAt.
   * Called by MQTT service when a message arrives from this device.
   * Uses throttling to prevent spamming DB on rapid MQTT bursts.
   */
  async markOnline(deviceId) {
    if (!this._onlineCache) this._onlineCache = new Map();
    const lastUpdate = this._onlineCache.get(deviceId) || 0;
    
    // Only update DB once every 10 seconds per device
    if (Date.now() - lastUpdate < 10000) {
      return;
    }
    
    try {
      await prisma.device.update({
        where: { deviceId },
        data: {
          isOnline: true,
          lastSeenAt: new Date(),
        },
      });
      this._onlineCache.set(deviceId, Date.now());
    } catch {
      // Device not registered yet — auto-register
      await this.ensureDevice(deviceId);
      this._onlineCache.set(deviceId, Date.now());
    }
  }

  /**
   * Mark device as offline.
   * Emits Socket.IO event to notify connected clients.
   */
  async markOffline(deviceId) {
    try {
      const device = await prisma.device.update({
        where: { deviceId },
        data: { isOnline: false },
      });

      // Emit Socket.IO event to notify clients
      socketService.emitDeviceOffline(deviceId);
      console.log(`[DeviceService] Device ${deviceId} marked offline`);

      return device;
    } catch (error) {
      // ignore if device doesn't exist
      console.debug(`[DeviceService] Failed to mark ${deviceId} offline:`, error.message);
    }
  }

  /**
   * Ensure a device exists (auto-register on first telemetry).
   */
  async ensureDevice(deviceId) {
    const existing = await prisma.device.findUnique({
      where: { deviceId },
    });
    if (existing) return existing;

    const newDevice = await prisma.device.create({
      data: {
        deviceId,
        name: deviceId,
        config: { create: {} },
      },
    });

    await this._generateDeviceJsonFile(newDevice);

    return newDevice;
  }

  /**
   * Update device config fields (partial update).
   */
  async updateConfig(deviceId, configData) {
    // Ensure device exists
    await this.ensureDevice(deviceId);

    return prisma.deviceConfig.upsert({
      where: { deviceId },
      update: configData,
      create: {
        deviceId,
        ...configData,
      },
    });
  }

  /**
   * Helper to generate a {deviceId}.json file in storage/devices.
   */
  async _generateDeviceJsonFile(device) {
    try {
      const devicesDir = path.join(__dirname, '../../storage/devices');
      await fs.mkdir(devicesDir, { recursive: true });
      
      const fileData = {
        device_id: device.deviceId,
        hardware_version: device.hardwareVersion,
        firmware_version: device.firmwareVersion,
        manufactured_at: device.createdAt ? device.createdAt.toISOString() : new Date().toISOString()
      };
      
      const filePath = path.join(devicesDir, `${device.deviceId}.json`);
      await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
      console.log(`[DeviceService] Generated device file: ${filePath}`);
    } catch (err) {
      console.error(`[DeviceService] Failed to generate JSON file for ${device.deviceId}:`, err.message);
    }
  }
}

module.exports = new DeviceService();
