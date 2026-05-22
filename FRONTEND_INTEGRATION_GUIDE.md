# 🌐 ShroomSync — Frontend Integration Guide

Panduan lengkap untuk Frontend Developer yang mengintegrasikan ShroomSync API ke aplikasi web/mobile mereka.

---

## 📋 Quick Navigation

1. [Setup & Configuration](#setup-configuration)
2. [API Client Setup](#api-client-setup)
3. [Common Patterns](#common-patterns)
4. [Error Handling](#error-handling)
5. [Real-time Updates](#real-time-updates)
6. [Rate Limit Handling](#rate-limit-handling)
7. [Complete Examples](#complete-examples)

---

## Setup & Configuration

### Base URL & Environment

```javascript
// config.js
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000/api/v1',
    wsURL: 'http://localhost:3000',
  },
  staging: {
    baseURL: 'https://api-staging.shroomsync.com/api/v1',
    wsURL: 'https://api-staging.shroomsync.com',
  },
  production: {
    baseURL: 'https://api.shroomsync.com/api/v1',
    wsURL: 'https://api.shroomsync.com',
  },
};

const config = API_CONFIG[process.env.REACT_APP_ENV || 'development'];
export default config;
```

### Initialize API Client

#### Using Fetch API (vanilla JavaScript)
```javascript
// api-client.js
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.defaultHeaders, ...options.headers },
      });

      const data = await response.json();

      // Handle non-2xx responses
      if (!response.ok) {
        throw new APIError(data.message, response.status, data.errors);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError('Network error', 0, null, error);
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

class APIError extends Error {
  constructor(message, statusCode, errors, originalError) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.originalError = originalError;
  }
}

export default APIClient;
```

#### Using Axios
```javascript
// api-client.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response.data, // Return only data
  error => {
    const { response } = error;
    if (response) {
      // API error response
      return Promise.reject({
        message: response.data.message,
        status: response.status,
        errors: response.data.errors,
      });
    }
    // Network error
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## API Client Setup

### Service Layer Pattern (Recommended)

```javascript
// services/DeviceService.js
import apiClient from '../api-client';

class DeviceService {
  // Get all devices
  async getAllDevices(limit = 50, offset = 0) {
    return apiClient.get(`/devices?limit=${limit}&offset=${offset}`);
  }

  // Get single device
  async getDevice(deviceId) {
    return apiClient.get(`/devices/${deviceId}`);
  }

  // Register new device
  async createDevice(name, hardwareVersion = '1.0') {
    return apiClient.post('/devices', {
      deviceId: name, // Usually same as name for registration
      name,
      hardwareVersion,
    });
  }

  // Update device control mode
  async updateControlMode(deviceId, mode) {
    return apiClient.post(`/devices/${deviceId}/control/mode`, { mode });
  }

  // Set temperature/humidity setpoints
  async updateSetpoint(deviceId, setpoints) {
    return apiClient.post(`/devices/${deviceId}/setpoint`, setpoints);
  }

  // Update spray timer
  async updateTimer(deviceId, minute, second) {
    return apiClient.post(`/devices/${deviceId}/timer`, { minute, second });
  }

  // Update floor pump timer
  async updateFloorTimer(deviceId, minute, second) {
    return apiClient.post(`/devices/${deviceId}/timer/floor`, { minute, second });
  }

  // Update daily schedule
  async updateSchedule(deviceId, schedule, floorSchedule) {
    return apiClient.post(`/devices/${deviceId}/schedule/update`, {
      schedule,
      floorSchedule,
    });
  }

  // Control pump
  async controlPump(deviceId, on) {
    return apiClient.post(`/devices/${deviceId}/actuator/pump`, { on });
  }

  // Delete device
  async deleteDevice(deviceId) {
    return apiClient.delete(`/devices/${deviceId}`);
  }
}

export default new DeviceService();
```

```javascript
// services/TelemetryService.js
import apiClient from '../api-client';

class TelemetryService {
  // Get sensor history
  async getSensorData(deviceId, limit = 100, offset = 0) {
    return apiClient.get(
      `/devices/${deviceId}/telemetry/sensor?limit=${limit}&offset=${offset}`
    );
  }

  // Get latest sensor reading
  async getLatestSensor(deviceId) {
    return apiClient.get(`/devices/${deviceId}/telemetry/sensor/latest`);
  }

  // Get system history
  async getHistory(deviceId, limit = 50, offset = 0) {
    return apiClient.get(
      `/devices/${deviceId}/telemetry/history?limit=${limit}&offset=${offset}`
    );
  }

  // Get latest system action
  async getLatestHistory(deviceId) {
    return apiClient.get(`/devices/${deviceId}/telemetry/history/latest`);
  }
}

export default new TelemetryService();
```

```javascript
// services/OTAService.js
import apiClient from '../api-client';

class OTAService {
  // Trigger update for single device
  async triggerUpdate(deviceId, firmwareUrl, version, changelog = '') {
    return apiClient.post(`/ota/trigger/${deviceId}`, {
      firmwareUrl,
      firmwareVersion: version,
      changelog,
    });
  }

  // Broadcast update to all devices
  async broadcastUpdate(firmwareUrl, version) {
    return apiClient.post('/ota/broadcast', {
      firmwareUrl,
      firmwareVersion: version,
    });
  }

  // Get OTA update logs
  async getUpdateLogs(deviceId, limit = 20, offset = 0) {
    return apiClient.get(
      `/ota/logs/${deviceId}?limit=${limit}&offset=${offset}`
    );
  }
}

export default new OTAService();
```

---

## Common Patterns

### React Hooks Pattern

```javascript
// hooks/useDevices.js
import { useState, useEffect } from 'react';
import DeviceService from '../services/DeviceService';

function useDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const result = await DeviceService.getAllDevices();
        setDevices(result.data || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();

    // Poll every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  return { devices, loading, error, refetch: async () => {
    const result = await DeviceService.getAllDevices();
    setDevices(result.data || []);
  } };
}

export default useDevices;
```

```javascript
// hooks/useTelemetry.js
import { useState, useEffect } from 'react';
import TelemetryService from '../services/TelemetryService';

function useTelemetry(deviceId, interval = 10000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deviceId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await TelemetryService.getLatestSensor(deviceId);
        setData(result.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchData();

    // Then poll at intervals
    const intervalId = setInterval(fetchData, interval);
    return () => clearInterval(intervalId);
  }, [deviceId, interval]);

  return { data, loading, error };
}

export default useTelemetry;
```

### Vue 3 Composition API

```javascript
// composables/useDevice.js
import { ref, onMounted, computed } from 'vue';
import DeviceService from '@/services/DeviceService';

export function useDevice(deviceId) {
  const device = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchDevice = async () => {
    try {
      loading.value = true;
      const result = await DeviceService.getDevice(deviceId);
      device.value = result.data;
      error.value = null;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const isOnline = computed(() => device.value?.isOnline || false);

  const updateMode = async (mode) => {
    try {
      await DeviceService.updateControlMode(deviceId, mode);
      device.value.config.controlMode = mode;
    } catch (err) {
      error.value = err.message;
    }
  };

  onMounted(() => {
    fetchDevice();
    // Auto-refresh every 30s
    setInterval(fetchDevice, 30000);
  });

  return { device, loading, error, isOnline, updateMode };
}
```

---

## Error Handling

### Comprehensive Error Handler

```javascript
// utils/error-handler.js
class APIError extends Error {
  constructor(message, statusCode, errors, originalError) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.originalError = originalError;
  }

  // User-friendly message
  getUserMessage() {
    switch (this.statusCode) {
      case 400:
        return 'Invalid input - please check your entries';
      case 404:
        return 'Resource not found';
      case 409:
        return 'This record already exists';
      case 429:
        return 'Too many requests - please wait before trying again';
      case 500:
        return 'Server error - please contact support';
      default:
        return this.message;
    }
  }

  // Format errors for form display
  getFormErrors() {
    if (!this.errors || !Array.isArray(this.errors)) {
      return {};
    }

    return this.errors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {});
  }
}

// Usage in React
function MyComponent() {
  const [errors, setErrors] = useState({});

  const handleSubmit = async (data) => {
    try {
      await DeviceService.updateSetpoint(deviceId, data);
    } catch (error) {
      if (error instanceof APIError) {
        setErrors(error.getFormErrors());
        toast.error(error.getUserMessage());
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="minSuhu"
        aria-invalid={!!errors.minSuhu}
      />
      {errors.minSuhu && (
        <span className="error">{errors.minSuhu}</span>
      )}
    </form>
  );
}
```

---

## Real-time Updates

### Polling Strategy (Simple)

```javascript
// Best for: Dashboard with 10-30s refresh interval
function DeviceDashboard({ deviceId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch immediately
    const fetchData = () => {
      DeviceService.getDevice(deviceId)
        .then(res => setData(res.data))
        .catch(err => console.error(err));
    };

    fetchData();

    // Then poll every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [deviceId]);

  if (!data) return <Loading />;
  return <DeviceCard device={data} />;
}
```

### Socket.IO Real-time (Advanced)

```javascript
// socket-service.js
import io from 'socket.io-client';
import config from './config';

class SocketService {
  constructor() {
    this.socket = io(config.wsURL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // Subscribe to device telemetry
  onDeviceTelemetry(deviceId, callback) {
    this.socket.on(`device:${deviceId}:telemetry`, callback);
  }

  // Subscribe to device status changes
  onDeviceStatus(deviceId, callback) {
    this.socket.on(`device:${deviceId}:status`, callback);
  }

  // Unsubscribe
  offDeviceTelemetry(deviceId) {
    this.socket.off(`device:${deviceId}:telemetry`);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export default new SocketService();
```

```javascript
// Usage in React
function RealTimeDashboard({ deviceId }) {
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    SocketService.onDeviceTelemetry(deviceId, (data) => {
      setTelemetry(data);
    });

    return () => SocketService.offDeviceTelemetry(deviceId);
  }, [deviceId]);

  return (
    <div>
      <p>Temperature: {telemetry?.suhu}°C</p>
      <p>Humidity: {telemetry?.kelembaban}%</p>
    </div>
  );
}
```

---

## Rate Limit Handling

Backend default menonaktifkan rate limiter (`RATE_LIMIT_ENABLED=false`) supaya dashboard bisa polling dan mengirim command secara kontinu. Gunakan pola berikut hanya kalau rate limiter sengaja diaktifkan di environment backend.

### Exponential Backoff Retry

```javascript
// utils/retry.js
async function retryWithBackoff(
  fn,
  maxRetries = 3,
  initialDelay = 1000
) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if it's a rate limit error
      if (error.statusCode === 429 && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

// Usage
try {
  const result = await retryWithBackoff(
    () => DeviceService.getAllDevices(),
    3,
    1000
  );
} catch (error) {
  console.error('Failed after retries:', error);
}
```

### Rate Limit Queue

```javascript
// utils/request-queue.js
class RequestQueue {
  constructor(maxConcurrent = 5) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      this.running++;
      const { fn, resolve, reject } = this.queue.shift();

      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        this.running--;
        this.process();
      }
    }
  }
}

const queue = new RequestQueue(5);

// Usage
queue.add(() => DeviceService.getAllDevices())
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

---

## Complete Examples

### React Dashboard Component

```javascript
// components/DeviceDashboard.jsx
import React, { useState, useEffect } from 'react';
import DeviceService from '../services/DeviceService';
import TelemetryService from '../services/TelemetryService';

function DeviceDashboard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [telemetry, setTelemetry] = useState(null);

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const result = await DeviceService.getAllDevices();
        setDevices(result.data);
        if (result.data.length > 0) {
          setSelectedDevice(result.data[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch telemetry for selected device
  useEffect(() => {
    if (!selectedDevice) return;

    const fetchTelemetry = async () => {
      try {
        const result = await TelemetryService.getLatestSensor(
          selectedDevice.deviceId
        );
        setTelemetry(result.data);
      } catch (err) {
        console.error('Failed to fetch telemetry:', err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const handleModeChange = async (mode) => {
    try {
      await DeviceService.updateControlMode(selectedDevice.deviceId, mode);
      setSelectedDevice({
        ...selectedDevice,
        config: { ...selectedDevice.config, controlMode: mode },
      });
    } catch (err) {
      alert(`Failed to update mode: ${err.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="dashboard">
      <div className="sidebar">
        <h2>Devices</h2>
        {devices.map(device => (
          <div
            key={device.id}
            className={`device-item ${
              selectedDevice?.id === device.id ? 'active' : ''
            }`}
            onClick={() => setSelectedDevice(device)}
          >
            <div className="device-name">{device.name}</div>
            <div className={`status ${device.isOnline ? 'online' : 'offline'}`}>
              {device.isOnline ? '🟢 Online' : '🔴 Offline'}
            </div>
          </div>
        ))}
      </div>

      <div className="main-content">
        {selectedDevice && (
          <>
            <h1>{selectedDevice.name}</h1>

            <div className="telemetry-section">
              {telemetry && (
                <>
                  <div className="metric">
                    <span>Temperature</span>
                    <strong>{telemetry.suhu}°C</strong>
                  </div>
                  <div className="metric">
                    <span>Humidity</span>
                    <strong>{telemetry.kelembaban}%</strong>
                  </div>
                </>
              )}
            </div>

            <div className="control-section">
              <h3>Controls</h3>
              <div className="mode-selector">
                <label>Mode</label>
                <select
                  value={selectedDevice.config?.controlMode || 1}
                  onChange={(e) =>
                    handleModeChange(parseInt(e.target.value))
                  }
                >
                  <option value={1}>Manual</option>
                  <option value={2}>Auto</option>
                  <option value={3}>Schedule</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DeviceDashboard;
```

---

## Debugging Tips

### Network Request Inspector

```javascript
// Add this to intercept all API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('API Call:', args[0], args[1]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Response:', response.status);
      return response;
    });
};
```

### Check Rate Limit Status

```javascript
async function checkRateLimit() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/devices');
    console.log({
      limit: response.headers.get('RateLimit-Limit'),
      remaining: response.headers.get('RateLimit-Remaining'),
      reset: response.headers.get('RateLimit-Reset'),
    });
  } catch (error) {
    console.error(error);
  }
}
```

---

## Need Help?

- **API Documentation:** See [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- **MQTT Details:** See [MQTT Protocol](../API_DOCUMENTATION.md#mqtt-protocol)
- **Issues:** Contact backend team or create issue
- **Features:** Submit feature request via GitHub

---

**Last Updated:** 2026-05-14  
**Version:** 1.0.0
