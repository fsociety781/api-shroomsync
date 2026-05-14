# 📡 ShroomSync API Dokumentasi Lengkap

**Versi:** 1.0.0  
**Base URL:** `http://localhost:3000/api/v1`  
**Terakhir diperbarui:** 2026-05-14

---

## 📌 Daftar Isi
1. [Setup & Konfigurasi](#setup-konfigurasi)
2. [Standar Response](#standar-response)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Device Management](#device-management)
6. [Device Control](#device-control)
7. [Telemetry Data](#telemetry-data)
8. [OTA Updates](#ota-updates)
9. [MQTT Protocol](#mqtt-protocol)
10. [Contoh Implementasi](#contoh-implementasi)

---

## Setup & Konfigurasi

### Environment Variables (.env)

Buat file `.env` di root project dengan konfigurasi berikut:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (MariaDB/MySQL)
DATABASE_URL="mysql://user:password@localhost:3306/shroomsync"

# MQTT Broker
MQTT_BROKER_URL="mqtt://broker.emqx.io:1883"
MQTT_USERNAME=""
MQTT_PASSWORD=""
MQTT_CLIENT_ID="shroomsync-server"

# CORS — Daftar domain yang diizinkan
# Gunakan koma untuk multiple origins
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,https://dashboard.shroomsync.com"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000          # 15 menit (dalam millisecond)
RATE_LIMIT_MAX_REQUESTS=100          # Max request per window

# Logging
LOG_LEVEL=debug                       # debug, info, warn, error
PRETTY_LOG=true                       # Pretty print logs di development

# Storage
FIRMWARE_UPLOAD_DIR="./storage/firmware"
TELEMETRY_RETENTION_DAYS=14
```

### Instalasi Dependencies

```bash
# Install semua dependencies
npm install

# Untuk development (auto-reload)
npm run dev

# Setup database
npm run db:push
npm run db:generate
```

---

## Standar Response

### ✅ Success Response Format

Semua endpoint yang berhasil mengembalikan response dengan struktur ini:

```json
{
  "status": "success",
  "message": "Optional message",
  "data": {
    // Response payload
  }
}
```

**Contoh Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "SS-0426-001",
    "name": "Kumbung A",
    "isOnline": true,
    "firmwareVersion": "2.1.0"
  }
}
```

### ✅ Paginated Response Format

Untuk endpoint yang mengembalikan list data:

```json
{
  "status": "success",
  "data": [
    { /* item 1 */ },
    { /* item 2 */ }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## Error Handling

### ❌ Error Response Format

Semua error mengembalikan response dengan struktur:

```json
{
  "status": "error",
  "message": "Deskripsi error",
  "errors": [
    // Optional: Detail validation errors
    {
      "field": "deviceId",
      "message": "Device ID tidak valid",
      "code": "invalid_string"
    }
  ]
}
```

### HTTP Status Codes

| Code | Arti | Keterangan |
|------|------|-----------|
| `200` | OK | Request berhasil |
| `201` | Created | Resource berhasil dibuat |
| `400` | Bad Request | Validation error - periksa field |
| `404` | Not Found | Resource tidak ditemukan |
| `409` | Conflict | Resource sudah ada (unique constraint) |
| `429` | Too Many Requests | Rate limit tercapai, tunggu sebelum retry |
| `500` | Internal Server Error | Server error - hubungi support |

### Error Code Examples

#### 1. Validation Error (400)
```json
{
  "status": "error",
  "message": "Validation failed - check fields",
  "errors": [
    {
      "field": "hardwareVersion",
      "message": "String must contain at most 20 character(s)",
      "code": "too_big"
    }
  ]
}
```

#### 2. Not Found (404)
```json
{
  "status": "error",
  "message": "Device not found"
}
```

#### 3. Conflict (409)
```json
{
  "status": "error",
  "message": "Record with this value already exists"
}
```

#### 4. Rate Limit (429)
```json
{
  "status": "error",
  "message": "Too many requests - please slow down",
  "retryAfter": "2024-05-14T10:30:00Z"
}
```

---

## Rate Limiting

### 🚦 Rate Limit Policy

- **Global Limit:** 100 requests per 15 menit
- **Control Endpoints:** 20 requests per 15 menit (5x lebih ketat)
- **OTA Endpoints:** 20 requests per 15 menit (5x lebih ketat)
- **Health Check:** Tidak dibatasi

### Rate Limit Headers

Setiap response menyertakan header:

```
RateLimit-Limit: 100           # Max requests dalam window
RateLimit-Remaining: 95        # Sisa requests
RateLimit-Reset: 1715700600    # Unix timestamp saat reset
```

### Handling Rate Limit

```javascript
// JavaScript/Fetch Example
try {
  const response = await fetch('/api/v1/devices', {
    method: 'GET'
  });

  if (response.status === 429) {
    const data = await response.json();
    console.log('Rate limit exceeded, retry after:', data.retryAfter);
    // Implementasi exponential backoff
  }
} catch (error) {
  console.error(error);
}
```

---

## Device Management

### 📱 Endpoints

#### GET /devices
Mendapatkan list semua device yang terdaftar.

**Request:**
```http
GET /api/v1/devices?limit=20&offset=0
Authorization: Bearer {token} (optional untuk future)
```

**Query Parameters:**
| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `limit` | number | 50 | Jumlah data per halaman |
| `offset` | number | 0 | Jumlah data yang di-skip |

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "deviceId": "SS-0426-001",
      "name": "Kumbung A - Shiitake",
      "hardwareVersion": "1.0",
      "firmwareVersion": "2.1.0",
      "isOnline": true,
      "rssiDbm": -65,
      "uptimeMs": 3600000,
      "sensorValid": true,
      "lastSeenAt": "2026-05-14T10:25:30Z",
      "createdAt": "2026-04-01T08:00:00Z",
      "updatedAt": "2026-05-14T10:25:30Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

#### GET /devices/:deviceId
Mendapatkan detail device beserta konfigurasinya.

**Request:**
```http
GET /api/v1/devices/SS-0426-001
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "device": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "deviceId": "SS-0426-001",
      "name": "Kumbung A - Shiitake",
      "hardwareVersion": "1.0",
      "firmwareVersion": "2.1.0",
      "isOnline": true,
      "rssiDbm": -65,
      "uptimeMs": 3600000,
      "sensorValid": true,
      "lastSeenAt": "2026-05-14T10:25:30Z",
      "createdAt": "2026-04-01T08:00:00Z",
      "updatedAt": "2026-05-14T10:25:30Z"
    },
    "config": {
      "controlMode": 2,
      "scheduleMode": 1,
      "minSuhu": 22,
      "midSuhu": 28,
      "minKelembaban": 75,
      "midKelembaban": 90,
      "timerMinute": 1,
      "timerSecond": 30,
      "floorTimerMinute": 2,
      "floorTimerSecond": 0,
      "schedule1Hour": 7,
      "schedule1Minute": 0,
      "schedule2Hour": 12,
      "schedule2Minute": 30,
      "schedule3Hour": 18,
      "schedule3Minute": 0,
      "floorScheduleHour": 8,
      "floorScheduleMinute": 0
    }
  }
}
```

**Response (404):**
```json
{
  "status": "error",
  "message": "Device not found"
}
```

---

#### POST /devices
Registrasi device baru ke sistem.

**Request:**
```http
POST /api/v1/devices
Content-Type: application/json

{
  "deviceId": "SS-0426-001",
  "name": "Kumbung A",
  "hardwareVersion": "1.0"
}
```

**Body Parameters:**
| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `deviceId` | string | ✅ | Unique ID device (contoh: SS-0426-001) |
| `name` | string | ❌ | Nama device (optional) |
| `hardwareVersion` | string | ❌ | Versi hardware (default: "1.0") |

**Response (201):**
```json
{
  "status": "success",
  "message": "Device created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "SS-0426-001",
    "name": "Kumbung A",
    "hardwareVersion": "1.0",
    "firmwareVersion": "1.0.0",
    "isOnline": false,
    "createdAt": "2026-05-14T10:30:00Z",
    "updatedAt": "2026-05-14T10:30:00Z"
  }
}
```

**Response (409) — Device Sudah Ada:**
```json
{
  "status": "error",
  "message": "Record with this value already exists"
}
```

---

#### DELETE /devices/:deviceId
Menghapus device dan semua datanya (⚠️ Tidak dapat dikembalikan).

**Request:**
```http
DELETE /api/v1/devices/SS-0426-001
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Device deleted"
}
```

**Response (404):**
```json
{
  "status": "error",
  "message": "Device not found"
}
```

---

## Device Control

### 🎮 Control Endpoints

Endpoint control mengirimkan perintah ke ESP32 melalui MQTT dan menyimpan konfigurasi ke database.

#### POST /devices/:deviceId/control/mode
Mengubah mode operasi device.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/control/mode
Content-Type: application/json

{
  "mode": 2
}
```

**Mode Values:**
| Value | Nama | Deskripsi |
|-------|------|-----------|
| `1` | Manual | Kontrol manual - user mengatur aktuator secara langsung |
| `2` | Auto | Mode otomatis - device mengikuti setpoint suhu/kelembaban |
| `3` | Schedule | Mode jadwal - device mengikuti schedule waktu yang sudah ditentukan |

**Response (200):**
```json
{
  "status": "success",
  "message": "Control mode updated",
  "data": {
    "deviceId": "SS-0426-001",
    "controlMode": 2
  }
}
```

**Response (400) — Validation Error:**
```json
{
  "status": "error",
  "message": "Validation failed - check fields",
  "errors": [
    {
      "field": "mode",
      "message": "Expected number, received string",
      "code": "invalid_type"
    }
  ]
}
```

---

#### POST /devices/:deviceId/setpoint
Mengatur setpoint suhu dan kelembaban untuk Auto Mode.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/setpoint
Content-Type: application/json

{
  "minSuhu": 20,
  "midSuhu": 28,
  "minKelembaban": 70,
  "midKelembaban": 85
}
```

**Body Parameters:**
| Field | Type | Range | Deskripsi |
|-------|------|-------|-----------|
| `minSuhu` | number | 15-35 | Minimum suhu (°C) |
| `midSuhu` | number | 15-35 | Target suhu (°C) |
| `minKelembaban` | number | 40-100 | Minimum kelembaban (%) |
| `midKelembaban` | number | 40-100 | Target kelembaban (%) |

**Response (200):**
```json
{
  "status": "success",
  "message": "Setpoint updated successfully",
  "data": {
    "deviceId": "SS-0426-001",
    "minSuhu": 20,
    "midSuhu": 28,
    "minKelembaban": 70,
    "midKelembaban": 85
  }
}
```

---

#### POST /devices/:deviceId/timer
Mengatur timer untuk spray kabut.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/timer
Content-Type: application/json

{
  "minute": 1,
  "second": 30
}
```

**Body Parameters:**
| Field | Type | Range | Deskripsi |
|-------|------|-------|-----------|
| `minute` | number | 0-59 | Menit (0-59) |
| `second` | number | 0-59 | Detik (0-59) |

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "deviceId": "SS-0426-001",
    "timerMinute": 1,
    "timerSecond": 30
  }
}
```

---

#### POST /devices/:deviceId/timer/floor
Mengatur timer untuk pompa lantai.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/timer/floor
Content-Type: application/json

{
  "minute": 2,
  "second": 0
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "deviceId": "SS-0426-001",
    "floorTimerMinute": 2,
    "floorTimerSecond": 0
  }
}
```

---

#### POST /devices/:deviceId/schedule/update
Mengatur jadwal operasi harian (hingga 3 slot waktu).

**Request:**
```http
POST /api/v1/devices/SS-0426-001/schedule/update
Content-Type: application/json

{
  "schedule": [
    { "hour": 7, "minute": 0 },
    { "hour": 12, "minute": 30 },
    { "hour": 18, "minute": 0 }
  ],
  "floorSchedule": { "hour": 8, "minute": 0 }
}
```

**Body Parameters:**
- `schedule` (array): 1-3 slot waktu harian
  - `hour` (number): 0-23
  - `minute` (number): 0-59
- `floorSchedule` (object): Jadwal pompa lantai
  - `hour` (number): 0-23
  - `minute` (number): 0-59

**Response (200):**
```json
{
  "status": "success",
  "message": "Schedule updated",
  "data": {
    "deviceId": "SS-0426-001",
    "schedules": [
      { "hour": 7, "minute": 0 },
      { "hour": 12, "minute": 30 },
      { "hour": 18, "minute": 0 }
    ],
    "floorSchedule": { "hour": 8, "minute": 0 }
  }
}
```

---

#### POST /devices/:deviceId/actuator/pump
Manual override untuk mengontrol pompa langsung.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/actuator/pump
Content-Type: application/json

{
  "on": true
}
```

**Body Parameters:**
| Field | Type | Deskripsi |
|-------|------|-----------|
| `on` | boolean | `true` = pompa ON, `false` = pompa OFF |

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "deviceId": "SS-0426-001",
    "actuator": "pump",
    "state": "on"
  }
}
```

---

## Telemetry Data

### 📊 Data Telemetry

Telemetry dibagi menjadi 2 kategori untuk optimasi:

1. **Sensor Data** — Suhu & kelembaban real-time (ringan, sering diupdate)
2. **History Data** — Log aksi pompa/fan (berat, less frequent)

---

#### GET /devices/:deviceId/telemetry/sensor
Mendapatkan history data sensor (suhu & kelembaban).

**Request:**
```http
GET /api/v1/devices/SS-0426-001/telemetry/sensor?limit=100&offset=0
```

**Query Parameters:**
| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `limit` | number | 50 | Jumlah data per request (max 500) |
| `offset` | number | 0 | Jumlah data yang di-skip |

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid-1",
      "deviceId": "SS-0426-001",
      "suhu": 28.5,
      "kelembaban": 82.3,
      "recordedAt": "2026-05-14T10:30:00Z"
    },
    {
      "id": "uuid-2",
      "deviceId": "SS-0426-001",
      "suhu": 28.4,
      "kelembaban": 82.1,
      "recordedAt": "2026-05-14T10:35:00Z"
    }
  ],
  "pagination": {
    "total": 1200,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### GET /devices/:deviceId/telemetry/sensor/latest
Mendapatkan data sensor terbaru (single record).

**Request:**
```http
GET /api/v1/devices/SS-0426-001/telemetry/sensor/latest
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid-1",
    "deviceId": "SS-0426-001",
    "suhu": 28.5,
    "kelembaban": 82.3,
    "recordedAt": "2026-05-14T10:30:00Z"
  }
}
```

**Usage Tips:**
- Gunakan endpoint ini untuk real-time dashboard display
- Update UI setiap 5-10 detik
- Jangan polling lebih cepat dari 5 detik untuk menghindari rate limit

---

#### GET /devices/:deviceId/telemetry/history
Mendapatkan history aksi sistem (pompa, fan, mode changes).

**Request:**
```http
GET /api/v1/devices/SS-0426-001/telemetry/history?limit=50&offset=0
```

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid-history-1",
      "deviceId": "SS-0426-001",
      "action": "PUMP_ON",
      "details": {
        "reason": "Auto mode - humidity below setpoint",
        "suhu": 28.5,
        "kelembaban": 72.0
      },
      "recordedAt": "2026-05-14T10:30:00Z"
    },
    {
      "id": "uuid-history-2",
      "deviceId": "SS-0426-001",
      "action": "MODE_CHANGED",
      "details": {
        "fromMode": 1,
        "toMode": 2,
        "changedBy": "api"
      },
      "recordedAt": "2026-05-14T10:25:00Z"
    }
  ],
  "pagination": {
    "total": 450,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Action Types:**
| Action | Deskripsi |
|--------|-----------|
| `PUMP_ON` | Pompa menyala |
| `PUMP_OFF` | Pompa mati |
| `FAN_ON` | Fan menyala |
| `FAN_OFF` | Fan mati |
| `MODE_CHANGED` | Mode operasi berubah |
| `SETPOINT_UPDATED` | Setpoint diubah |
| `SCHEDULE_UPDATED` | Jadwal diubah |

---

#### GET /devices/:deviceId/telemetry/history/latest
Mendapatkan aksi sistem terbaru.

**Request:**
```http
GET /api/v1/devices/SS-0426-001/telemetry/history/latest
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid-history-1",
    "deviceId": "SS-0426-001",
    "action": "PUMP_ON",
    "details": {
      "reason": "Auto mode - humidity below setpoint"
    },
    "recordedAt": "2026-05-14T10:30:00Z"
  }
}
```

---

## OTA Updates

### 🚀 Over-The-Air Updates

#### POST /ota/trigger/:deviceId
Memicu update firmware untuk satu device.

**Request:**
```http
POST /api/v1/ota/trigger/SS-0426-001
Content-Type: application/json

{
  "firmwareUrl": "https://storage.shroomsync.com/firmware/v2.2.0.bin",
  "firmwareVersion": "2.2.0",
  "changelog": "Fix: WiFi stability issue"
}
```

**Body Parameters:**
| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `firmwareUrl` | string | ✅ | URL download firmware (.bin file) |
| `firmwareVersion` | string | ✅ | Versi firmware (format: X.Y.Z) |
| `changelog` | string | ❌ | Change log / release notes |

**Response (200):**
```json
{
  "status": "success",
  "message": "OTA update triggered",
  "data": {
    "deviceId": "SS-0426-001",
    "firmwareVersion": "2.2.0",
    "status": "pending",
    "triggeredAt": "2026-05-14T10:30:00Z",
    "estimatedDuration": "120 seconds"
  }
}
```

---

#### POST /ota/broadcast
**⚠️ DANGER** — Memicu update ke semua device sekaligus.

**Request:**
```http
POST /api/v1/ota/broadcast
Content-Type: application/json

{
  "firmwareUrl": "https://storage.shroomsync.com/firmware/v2.2.0.bin",
  "firmwareVersion": "2.2.0"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "OTA broadcast triggered to 5 devices",
  "data": {
    "totalDevices": 5,
    "successCount": 5,
    "failedDevices": [],
    "triggeredAt": "2026-05-14T10:30:00Z"
  }
}
```

---

#### GET /ota/logs/:deviceId
Melihat log update firmware.

**Request:**
```http
GET /api/v1/ota/logs/SS-0426-001?limit=20&offset=0
```

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid-log-1",
      "deviceId": "SS-0426-001",
      "fromVersion": "2.1.0",
      "toVersion": "2.2.0",
      "status": "success",
      "errorMessage": null,
      "startedAt": "2026-05-14T10:30:00Z",
      "completedAt": "2026-05-14T10:32:15Z",
      "durationMs": 135000
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## MQTT Protocol

### 📡 MQTT Topics & Payload

Backend berkomunikasi dengan ESP32 menggunakan MQTT protocol. Semua topik dinamis berdasarkan `deviceId`.

#### Server Subscribe (Terima dari ESP32)

Topik yang di-subscribe server:
```
{deviceId}/telemetry/sensor
{deviceId}/telemetry/history
{deviceId}/state/#
shroomsync/ota/{deviceId}/status
```

**Contoh Payload — Sensor Data:**
```json
{
  "clientId": "esp32-SS-0426-001",
  "data": {
    "suhu": 28.5,
    "kelembaban": 82.3
  }
}
```

**Contoh Payload — OTA Status:**
```json
{
  "clientId": "esp32-SS-0426-001",
  "data": {
    "status": "success",
    "version": "2.2.0",
    "message": "Update completed successfully"
  }
}
```

---

#### Server Publish (Kirim ke ESP32)

**1. Ubah Mode Control:**
```
Topic: {deviceId}/cmd/control/mode
Payload: { "mode": 2 }
```

**2. Ubah Setpoint (Auto Mode):**
```
Topic: {deviceId}/cmd/setpoint/auto
Payload: {
  "minS": 20,
  "midS": 28,
  "minK": 70,
  "midK": 85
}
```

**3. Ubah Timer Spray:**
```
Topic: {deviceId}/cmd/timer/auto
Payload: {
  "minute": 1,
  "second": 30
}
```

**4. Ubah Timer Lantai:**
```
Topic: {deviceId}/cmd/timer/floor
Payload: {
  "minute": 2,
  "second": 0
}
```

**5. Update Jadwal:**
```
Topic: {deviceId}/cmd/schedule/update
Payload: {
  "jam1": 7, "menit1": 0,
  "jam2": 12, "menit2": 30,
  "jam3": 18, "menit3": 0
}
```

**6. Manual Control Pompa:**
```
Topic: {deviceId}/cmd/actuator/pump
Payload: { "on": true }
```

**7. Trigger OTA Update:**
```
Topic: shroomsync/ota/{deviceId}/trigger
Payload: {
  "url": "https://storage.shroomsync.com/firmware/v2.2.0.bin",
  "version": "2.2.0"
}
```

---

## Contoh Implementasi

### React Example — Device List Dashboard

```jsx
import React, { useEffect, useState } from 'react';

const DeviceDashboard = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/v1/devices');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        if (json.status === 'success') {
          setDevices(json.data);
        } else {
          setError(json.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
    // Poll setiap 30 detik
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading devices...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>ShroomSync Dashboard</h1>
      <div className="devices-grid">
        {devices.map(device => (
          <div key={device.id} className="device-card">
            <h3>{device.name}</h3>
            <p>ID: {device.deviceId}</p>
            <p>Status: {device.isOnline ? '🟢 Online' : '🔴 Offline'}</p>
            <p>Firmware: {device.firmwareVersion}</p>
            <p>RSSI: {device.rssiDbm || 'N/A'} dBm</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceDashboard;
```

### JavaScript — Update Device Control

```javascript
async function updateDeviceMode(deviceId, mode) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/v1/devices/${deviceId}/control/mode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      }
    );

    const json = await response.json();

    if (response.ok && json.status === 'success') {
      console.log('Mode updated:', json.data);
      return json.data;
    } else {
      console.error('Update failed:', json.message);
      if (json.errors) {
        json.errors.forEach(err => {
          console.error(`  - ${err.field}: ${err.message}`);
        });
      }
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Usage
await updateDeviceMode('SS-0426-001', 2); // Switch to Auto mode
```

### Python Example — OTA Firmware Update

```python
import requests
import json

API_URL = "http://localhost:3000/api/v1"

def trigger_ota_update(device_id, firmware_url, version):
    endpoint = f"{API_URL}/ota/trigger/{device_id}"
    payload = {
        "firmwareUrl": firmware_url,
        "firmwareVersion": version,
        "changelog": "Stability improvements"
    }
    
    response = requests.post(
        endpoint,
        headers={"Content-Type": "application/json"},
        json=payload
    )
    
    data = response.json()
    if response.status_code == 200:
        print(f"✅ OTA triggered for {device_id}")
        print(f"   Status: {data['data']['status']}")
        print(f"   ETA: {data['data']['estimatedDuration']}")
    else:
        print(f"❌ OTA failed: {data['message']}")
    
    return data

# Usage
trigger_ota_update(
    "SS-0426-001",
    "https://storage.shroomsync.com/firmware/v2.2.0.bin",
    "2.2.0"
)
```

---

## Support & Troubleshooting

### Sering Terjadi Masalah

**Q: Endpoint return 404?**  
A: Pastikan URL benar dan device sudah terdaftar. Gunakan GET /devices untuk verify.

**Q: Rate limit tercapai?**  
A: Implementasi exponential backoff. Tunggu time di response header `Retry-After`.

**Q: Device tidak response?**  
A: Cek MQTT broker connection dan device online status. Lihat device `lastSeenAt` timestamp.

---

**Contact:** support@shroomsync.com  
**Last Updated:** 2026-05-14
