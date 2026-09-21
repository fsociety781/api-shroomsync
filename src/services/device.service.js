// ============================================
// ShroomSync — Device Service
// ============================================

const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require('../utils/errors');
const fs = require('fs').promises;
const path = require('path');
const socketService = require('./socket.service');

function getSignalQuality(rssiDbm) {
  if (rssiDbm === null || rssiDbm === undefined) return 'Unknown';
  if (rssiDbm >= -55) return 'Excellent';
  if (rssiDbm >= -70) return 'Good';
  if (rssiDbm >= -85) return 'Fair';
  return 'Weak';
}

function formatDeviceProfile(device) {
  if (!device) return null;
  const { uptimeMs, ...safeDevice } = device;
  return {
    ...safeDevice,
    signalStrength: getSignalQuality(device.rssiDbm),
  };
}

class DeviceService {
  /**
   * List all registered devices with their config and online status.
   * Jika userId diberikan dan bukan admin, hanya menampilkan perangkat milik user tersebut.
   */
  async listDevices(userId = null, isAdmin = false) {
    const where = (userId && !isAdmin) ? { userId } : {};
    const devices = await prisma.device.findMany({
      where,
      include: { config: true },
      orderBy: { createdAt: 'desc' },
    });
    return devices.map(formatDeviceProfile);
  }

  /**
   * Aktivasi / pairing perangkat ke akun petani (mendukung input ID atau Scan Barcode).
   * 1 user bisa memiliki banyak device/kumbung.
   */
  async activateDevice({ deviceId, name, userId }) {
    if (!deviceId) {
      throw new ValidationError('Device ID wajib diisi');
    }

    let device = await prisma.device.findUnique({
      where: { deviceId },
      include: { config: true },
    });

    if (!device) {
      device = await this.ensureDevice(deviceId);
    }

    if (device.userId && device.userId !== userId) {
      throw new ConflictError(
        'Perangkat ini sudah diaktivasi oleh akun petani lain. Hubungi pemilik perangkat atau admin sistem.'
      );
    }

    const updated = await prisma.device.update({
      where: { deviceId },
      data: {
        userId,
        name: name || device.name || `Kumbung ${deviceId}`,
        activatedAt: device.activatedAt || new Date(),
      },
      include: { config: true },
      include: { config: true, user: true },
    });

    return formatDeviceProfile(updated);
    const ownerName = updated.user?.fullName || updated.user?.username || 'Petani';
    const kumbungName = updated.name || deviceId;

    // Send MQTT activation command to ESP32: {{device_id}}/activation/status
    try {
      const mqttService = require('./mqtt.service');
      mqttService.publishActivationStatus(deviceId, {
        activated: true,
        owner: ownerName,
        message: `Perangkat berhasil diaktivasi untuk ${kumbungName}`,
      });
    } catch (err) {
      console.error(`[DeviceService] Failed to publish MQTT activation for ${deviceId}:`, err.message);
    }

    const formatted = formatDeviceProfile(updated);
    socketService.emitDeviceActivated(deviceId, formatted);

    return formatted;
  }

  /**
   * Unpair / lepas tautan perangkat dari akun.
   */
  async unpairDevice(deviceId, userId, isAdmin = false) {
    const device = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundError(`Device "${deviceId}" tidak ditemukan`);
    }

    if (!isAdmin && device.userId !== userId) {
      throw new ForbiddenError('Anda tidak memiliki akses untuk melepas perangkat ini');
    }

    await prisma.device.update({
      where: { deviceId },
      data: {
        userId: null,
        activatedAt: null,
      },
    });

    // Send MQTT deactivation command to ESP32: {{device_id}}/activation/status
    try {
      const mqttService = require('./mqtt.service');
      mqttService.publishActivationStatus(deviceId, {
        activated: false,
        owner: '',
        message: 'Perangkat dinonaktifkan oleh pengguna atau administrator',
      });
    } catch (err) {
      console.error(`[DeviceService] Failed to publish MQTT unpair for ${deviceId}:`, err.message);
    }

    socketService.emitDeviceUnpaired(deviceId);

    return { unshared: true, deviceId };
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
    return formatDeviceProfile(device);
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

    return formatDeviceProfile(newDevice);
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
   * Ensure a device exists (auto-register on first telemetry or activation check).
   * Updates firmware/hardware version if provided in extra.
   */
  async ensureDevice(deviceId) {
  async ensureDevice(deviceId, extra = {}) {
    const hw = extra.hardwareVersion || extra.hardware_version;
    const fw = extra.firmwareVersion || extra.firmware_version;

    const existing = await prisma.device.findUnique({
      where: { deviceId },
    });
    if (existing) return existing;

    if (existing) {
      if ((hw && hw !== existing.hardwareVersion) || (fw && fw !== existing.firmwareVersion)) {
        try {
          return await prisma.device.update({
            where: { deviceId },
            data: {
              ...(hw && { hardwareVersion: hw }),
              ...(fw && { firmwareVersion: fw }),
            },
          });
        } catch {
          return existing;
        }
      }
      return existing;
    }

    const newDevice = await prisma.device.create({
      data: {
        deviceId,
        name: deviceId,
        hardwareVersion: hw || '1.0',
        firmwareVersion: fw || '1.0.0',
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
   * Store the latest actuator state on the device record.
   */
  async updateActuatorState(deviceId, state) {
    await this.ensureDevice(deviceId);

    const data = {};
    if (state.pumpStatus !== undefined) data.pumpStatus = state.pumpStatus;
    if (state.floorPumpStatus !== undefined) data.floorPumpStatus = state.floorPumpStatus;

    if (Object.keys(data).length === 0) {
      return this.getDevice(deviceId);
    }

    data.actuatorUpdatedAt = new Date();

    const updated = await prisma.device.update({
      where: { deviceId },
      data,
      include: { config: true },
    });

    return formatDeviceProfile(updated);
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
