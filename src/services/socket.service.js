// ============================================
// ShroomSync — Socket.IO Service
// ============================================

let io = null;

const socketService = {
  /**
   * Initialize Socket.IO with the HTTP server.
   * @param {import('http').Server} httpServer
   */
  init(httpServer) {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log(`[SOCKET] Client connected: ${socket.id}`);

      // Client joins a device room to receive only that device's events
      socket.on('join:device', (deviceId) => {
        socket.join(`device:${deviceId}`);
        console.log(`[SOCKET] ${socket.id} joined room device:${deviceId}`);
      });

      socket.on('leave:device', (deviceId) => {
        socket.leave(`device:${deviceId}`);
      });

      socket.on('disconnect', () => {
        console.log(`[SOCKET] Client disconnected: ${socket.id}`);
      });
    });

    console.log('[SOCKET] Socket.IO initialized');
  },

  /**
   * Get the Socket.IO instance.
   */
  getIO() {
    return io;
  },

  /**
   * Emit sensor telemetry to all clients watching this device.
   */
  emitSensorTelemetry(deviceId, data) {
    if (!io) return;
    io.to(`device:${deviceId}`).emit('telemetry:sensor', {
      deviceId,
      ...data,
    });
    // Also broadcast to global listeners
    io.emit('telemetry:sensor', { deviceId, ...data });
  },

  /**
   * Emit history telemetry.
   */
  emitHistoryTelemetry(deviceId, data) {
    if (!io) return;
    io.to(`device:${deviceId}`).emit('telemetry:history', {
      deviceId,
      ...data,
    });
  },

  /**
   * Emit device state change.
   */
  emitDeviceState(deviceId, type, data) {
    if (!io) return;
    io.to(`device:${deviceId}`).emit('device:state', {
      deviceId,
      type,
      data,
    });
    io.emit('device:state', { deviceId, type, data });
  },

  /**
   * Emit device online/offline status.
   */
  emitDeviceStatus(deviceId, isOnline) {
    if (!io) return;
    const event = isOnline ? 'device:online' : 'device:offline';
    io.emit(event, { deviceId });
  },

  /**
   * Emit OTA progress.
   */
  emitOtaProgress(deviceId, data) {
    if (!io) return;
    io.to(`device:${deviceId}`).emit('ota:progress', {
      deviceId,
      ...data,
    });
    io.emit('ota:progress', { deviceId, ...data });
  },
};

module.exports = socketService;
