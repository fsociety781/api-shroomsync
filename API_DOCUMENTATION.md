# 📡 ShroomSync API Dokumentasi Lengkap

**Versi:** 1.0.0  
**Base URL:** `http://localhost:3000/api/v1`  
**Terakhir diperbarui:** 2026-05-21

---

## 📌 Daftar Isi
1. [Setup & Konfigurasi](#setup-konfigurasi)
2. [Standar Response](#standar-response)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Device Management](#device-management)
6. [Device Control](#device-control)
7. [Telemetry Data](#telemetry-data)
8. [Mushroom Cycles & Harvest](#mushroom-cycles--harvest)
9. [OTA Updates](#ota-updates)
10. [MQTT Protocol](#mqtt-protocol)
11. [Contoh Implementasi](#contoh-implementasi)

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
RATE_LIMIT_ENABLED=false             # Default false; set true only if limiter is needed
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

Rate limiting bersifat opt-in. Default `RATE_LIMIT_ENABLED=false`, supaya frontend bisa polling telemetry dan mengirim command tanpa terkena `429`.

Jika `RATE_LIMIT_ENABLED=true`:
- **Global Limit:** 100 requests per 15 menit
- **Control Endpoints:** 20 requests per 15 menit (5x lebih ketat)
- **OTA Endpoints:** 20 requests per 15 menit (5x lebih ketat)
- **Health Check:** Tidak dibatasi
- **Telemetry Routes:** Dipasang sebelum strict limiter, jadi tidak ikut limit control endpoint

### Rate Limit Headers

Saat rate limiter aktif, response menyertakan header:

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

Endpoint control mengirimkan perintah ke ESP32 melalui MQTT. Response berisi topic dan payload command yang dikirim; konfigurasi database diperbarui saat device mengirim state balik melalui MQTT.

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
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/control/mode",
    "payload": {
      "mode": 2
    }
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
  "MinS": 20,
  "MidS": 28,
  "MinK": 70,
  "MidK": 85
}
```

**Body Parameters:**
| Field | Type | Range | Deskripsi |
|-------|------|-------|-----------|
| `MinS` | number | 0-60 | Minimum suhu (°C) |
| `MidS` | number | 0-60 | Target suhu (°C) |
| `MinK` | number | 0-100 | Minimum kelembaban (%) |
| `MidK` | number | 0-100 | Target kelembaban (%) |

**Response (200):**
```json
{
  "status": "success",
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/setpoint/auto",
    "payload": {
      "MinS": 20,
      "MidS": 28,
      "MinK": 70,
      "MidK": 85
    }
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
  "Menit": 1,
  "Detik": 30
}
```

**Body Parameters:**
| Field | Type | Range | Deskripsi |
|-------|------|-------|-----------|
| `Menit` | number | 0-59 | Menit |
| `Detik` | number | 0-59 | Detik |

**Response (200):**
```json
{
  "status": "success",
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/timer/auto",
    "payload": {
      "Menit": 1,
      "Detik": 30
    }
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
  "FlrMenit": 2,
  "FlrDetik": 0
}
```

**Body Parameters:**
| Field | Type | Range | Deskripsi |
|-------|------|-------|-----------|
| `FlrMenit` | number | 0-59 | Menit pompa lantai |
| `FlrDetik` | number | 0-59 | Detik pompa lantai |

**Response (200):**
```json
{
  "status": "success",
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/timer/floor",
    "payload": {
      "FlrMenit": 2,
      "FlrDetik": 0
    }
  }
}
```

---

#### POST /devices/:deviceId/schedule
Mengatur jadwal operasi harian (hingga 3 slot waktu).

**Request:**
```http
POST /api/v1/devices/SS-0426-001/schedule
Content-Type: application/json

{
  "jam1": 7,
  "menit1": 0,
  "jam2": 12,
  "menit2": 30,
  "jam3": 18,
  "menit3": 0
}
```

**Body Parameters:**
| Field | Type | Range | Deskripsi |
|-------|------|-------|-----------|
| `jam1`, `jam2`, `jam3` | number | 0-23 | Jam schedule slot 1-3 |
| `menit1`, `menit2`, `menit3` | number | 0-59 | Menit schedule slot 1-3 |

**Response (200):**
```json
{
  "status": "success",
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/schedule/update",
    "payload": {
      "jam1": 7,
      "menit1": 0,
      "jam2": 12,
      "menit2": 30,
      "jam3": 18,
      "menit3": 0
    }
  }
}
```

---

#### POST /devices/:deviceId/schedule/floor
Mengatur jadwal pompa lantai.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/schedule/floor
Content-Type: application/json

{
  "FlrJam": 8,
  "FlrMenit": 0
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/schedule/floor",
    "payload": {
      "FlrJam": 8,
      "FlrMenit": 0
    }
  }
}
```

---

#### POST /devices/:deviceId/schedule/mode
Mengatur mode schedule.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/schedule/mode
Content-Type: application/json

{
  "mode": 2
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/schedule/mode",
    "payload": {
      "mode": 2
    }
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
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/actuator/pump",
    "payload": {
      "pump": 1,
      "on": true
    }
  }
}
```

---

#### POST /devices/:deviceId/actuator/fan
Manual override untuk mengontrol fan/floor pump langsung.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/actuator/fan
Content-Type: application/json

{
  "on": true
}
```

**Body Parameters:**
| Field | Type | Deskripsi |
|-------|------|-----------|
| `on` | boolean | `true` = fan/floor pump ON, `false` = OFF |

**Response (200):**
```json
{
  "status": "success",
  "message": "Command sent",
  "data": {
    "topic": "SS-0426-001/cmd/actuator/fan",
    "payload": {
      "fan": 1,
      "on": true
    }
  }
}
```

---

## Telemetry Data

### 📊 Data Telemetry

Telemetry dibagi menjadi 2 kategori untuk optimasi:

1. **Sensor Data** — Suhu & kelembaban real-time (ringan, sering diupdate)
2. **History Data** — Snapshot sistem berisi sensor, mode, dan status aktuator

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
| `from` | string | - | Filter mulai dari waktu ISO 8601 |
| `to` | string | - | Filter sampai waktu ISO 8601 |
| `limit` | number | 100 | Jumlah data per request (max 1000) |
| `offset` | number | 0 | Jumlah data yang di-skip |

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid-1",
      "deviceId": "SS-0426-001",
      "temperature": 30.32998,
      "humidity": 62.83971,
      "recordedAt": "2026/05/16 14:35:44",
      "createdAt": "2026-05-16T07:35:44.000Z"
    },
    {
      "id": "uuid-2",
      "deviceId": "SS-0426-001",
      "temperature": 30.39941,
      "humidity": 63.02281,
      "recordedAt": "2026/05/16 14:39:57",
      "createdAt": "2026-05-16T07:39:57.000Z"
    }
  ],
  "pagination": {
    "total": 1200,
    "limit": 100,
    "offset": 0
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
    "temperature": 30.32998,
    "humidity": 62.83971,
    "recordedAt": "2026/05/16 14:35:44",
    "createdAt": "2026-05-16T07:35:44.000Z"
  }
}
```

**Usage Tips:**
- Gunakan endpoint ini untuk real-time dashboard display
- Update UI setiap 5-10 detik
- Jangan polling lebih cepat dari 5 detik untuk menghindari rate limit

---

#### GET /devices/:deviceId/telemetry/history
Mendapatkan history snapshot sistem (sensor, mode, dan status pompa).

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
      "temperature": 30.39941,
      "humidity": 63.02281,
      "mode": "AUTO",
      "pumpStatus": "OFF",
      "floorPumpStatus": "OFF",
      "recordedAt": "2026/05/16 14:39:57",
      "createdAt": "2026-05-16T07:39:57.000Z"
    },
    {
      "id": "uuid-history-2",
      "deviceId": "SS-0426-001",
      "temperature": 30.1,
      "humidity": 62.5,
      "mode": "MANUAL",
      "pumpStatus": "ON",
      "floorPumpStatus": "OFF",
      "recordedAt": "2026/05/16 14:34:57",
      "createdAt": "2026-05-16T07:34:57.000Z"
    }
  ],
  "pagination": {
    "total": 450,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### GET /devices/:deviceId/telemetry/history/latest
Mendapatkan snapshot sistem terbaru.

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
    "temperature": 30.39941,
    "humidity": 63.02281,
    "mode": "AUTO",
    "pumpStatus": "OFF",
    "floorPumpStatus": "OFF",
    "recordedAt": "2026/05/16 14:39:57",
    "createdAt": "2026-05-16T07:39:57.000Z"
  }
}
```

---

## Mushroom Cycles & Harvest

Fitur ini dipakai untuk mencatat satu periode budidaya jamur per device/kumbung dan semua panen di dalam siklus tersebut. Untuk jamur tiram, satu siklus biasanya berjalan 3-4 bulan dan harvest bisa dicatat setiap hari.

Status siklus yang didukung:
- `active` — siklus sedang berjalan
- `completed` — siklus selesai
- `cancelled` — siklus dibatalkan

---

#### GET /devices/:deviceId/cycles
Melihat daftar siklus budidaya pada device.

**Request:**
```http
GET /api/v1/devices/SS-0426-001/cycles?status=active&limit=20&offset=0
```

**Query Parameters:**
| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `status` | string | - | Filter `active`, `completed`, atau `cancelled` |
| `from` | date | - | Filter `startedAt` mulai tanggal tertentu |
| `to` | date | - | Filter `startedAt` sampai tanggal tertentu |
| `limit` | number | 100 | Jumlah data per request (max 1000) |
| `offset` | number | 0 | Jumlah data yang di-skip |

---

#### POST /devices/:deviceId/cycles
Membuat atau memulai siklus budidaya baru.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/cycles
Content-Type: application/json

{
  "name": "Siklus Mei 2026 - Kumbung A",
  "mushroomType": "Jamur Tiram",
  "strain": "Tiram Putih",
  "baglogCount": 1200,
  "startedAt": "2026-05-21",
  "expectedEndedAt": "2026-09-21",
  "notes": "Batch awal musim kemarau"
}
```

**Body Parameters:**
| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `name` | string | ❌ | Nama siklus |
| `mushroomType` | string | ❌ | Default `Jamur Tiram` |
| `strain` | string | ❌ | Varian/strain jamur |
| `baglogCount` | number | ❌ | Jumlah baglog awal |
| `startedAt` | date | ❌ | Tanggal mulai, default waktu request |
| `expectedEndedAt` | date | ❌ | Estimasi selesai siklus |
| `status` | string | ❌ | Default `active` |
| `notes` | string | ❌ | Catatan siklus |

**Response (201):**
```json
{
  "status": "success",
  "message": "Cultivation cycle created successfully",
  "data": {
    "id": "cycle-uuid",
    "deviceId": "SS-0426-001",
    "name": "Siklus Mei 2026 - Kumbung A",
    "mushroomType": "Jamur Tiram",
    "strain": "Tiram Putih",
    "baglogCount": 1200,
    "startedAt": "2026-05-21T00:00:00.000Z",
    "expectedEndedAt": "2026-09-21T00:00:00.000Z",
    "endedAt": null,
    "status": "active",
    "_count": {
      "harvests": 0
    }
  }
}
```

---

#### GET /devices/:deviceId/cycles/:cycleId
Melihat detail satu siklus.

**Request:**
```http
GET /api/v1/devices/SS-0426-001/cycles/cycle-uuid
```

---

#### PATCH /devices/:deviceId/cycles/:cycleId
Update metadata atau status siklus.

**Request:**
```http
PATCH /api/v1/devices/SS-0426-001/cycles/cycle-uuid
Content-Type: application/json

{
  "baglogCount": 1180,
  "notes": "20 baglog rusak dikeluarkan"
}
```

---

#### POST /devices/:deviceId/cycles/:cycleId/complete
Menandai siklus selesai.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/cycles/cycle-uuid/complete
Content-Type: application/json

{
  "endedAt": "2026-09-15",
  "notes": "Siklus selesai, kumbung dibersihkan"
}
```

---

#### DELETE /devices/:deviceId/cycles/:cycleId
Menghapus siklus beserta semua catatan harvest di dalamnya.

**Request:**
```http
DELETE /api/v1/devices/SS-0426-001/cycles/cycle-uuid
```

---

#### GET /devices/:deviceId/cycles/:cycleId/harvests
Melihat daftar catatan panen di dalam siklus.

**Request:**
```http
GET /api/v1/devices/SS-0426-001/cycles/cycle-uuid/harvests?from=2026-06-01&to=2026-06-30
```

**Query Parameters:**
| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `from` | date | - | Filter `harvestedAt` mulai tanggal tertentu |
| `to` | date | - | Filter `harvestedAt` sampai tanggal tertentu |
| `limit` | number | 100 | Jumlah data per request (max 1000) |
| `offset` | number | 0 | Jumlah data yang di-skip |

---

#### POST /devices/:deviceId/cycles/:cycleId/harvests
Mencatat panen. Endpoint ini bisa dipanggil setiap hari, atau lebih dari sekali per hari jika panen dilakukan beberapa batch.

**Request:**
```http
POST /api/v1/devices/SS-0426-001/cycles/cycle-uuid/harvests
Content-Type: application/json

{
  "harvestedAt": "2026-06-10T08:30:00.000Z",
  "weightKg": 18.75,
  "pricePerKg": 18000,
  "grade": "A",
  "notes": "Panen pagi"
}
```

**Body Parameters:**
| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `harvestedAt` | date | ❌ | Waktu panen, default waktu request |
| `weightKg` | number | ✅ | Berat panen dalam kg |
| `pricePerKg` | number | ❌ | Harga per kg, dipakai untuk summary revenue |
| `grade` | string | ❌ | Grade/kualitas panen |
| `notes` | string | ❌ | Catatan panen |

**Response (201):**
```json
{
  "status": "success",
  "message": "Harvest recorded successfully",
  "data": {
    "id": "harvest-uuid",
    "cycleId": "cycle-uuid",
    "harvestedAt": "2026-06-10T08:30:00.000Z",
    "weightKg": 18.75,
    "pricePerKg": 18000,
    "grade": "A",
    "notes": "Panen pagi"
  }
}
```

---

#### PATCH /devices/:deviceId/cycles/:cycleId/harvests/:harvestId
Update catatan panen.

**Request:**
```http
PATCH /api/v1/devices/SS-0426-001/cycles/cycle-uuid/harvests/harvest-uuid
Content-Type: application/json

{
  "weightKg": 19.1,
  "notes": "Revisi setelah timbang ulang"
}
```

---

#### DELETE /devices/:deviceId/cycles/:cycleId/harvests/:harvestId
Menghapus catatan panen.

**Request:**
```http
DELETE /api/v1/devices/SS-0426-001/cycles/cycle-uuid/harvests/harvest-uuid
```

---

#### GET /devices/:deviceId/cycles/:cycleId/summary
Melihat resume dan analisis hasil panen per siklus.

**Request:**
```http
GET /api/v1/devices/SS-0426-001/cycles/cycle-uuid/summary
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "cycle": {
      "id": "cycle-uuid",
      "deviceId": "SS-0426-001",
      "name": "Siklus Mei 2026 - Kumbung A",
      "mushroomType": "Jamur Tiram",
      "baglogCount": 1200,
      "startedAt": "2026-05-21T00:00:00.000Z",
      "status": "active",
      "_count": {
        "harvests": 2
      }
    },
    "summary": {
      "totalHarvests": 2,
      "totalWeightKg": 36.25,
      "totalRevenue": 652500,
      "cycleAgeDays": 21,
      "harvestDays": 2,
      "averageWeightPerHarvestKg": 18.125,
      "averageWeightPerCycleDayKg": 1.726,
      "averageWeightPerHarvestDayKg": 18.125,
      "yieldPerBaglogKg": 0.03,
      "firstHarvestAt": "2026-06-10T08:30:00.000Z",
      "latestHarvestAt": "2026-06-11T08:15:00.000Z",
      "peakHarvestDay": {
        "date": "2026-06-10",
        "harvestCount": 1,
        "totalWeightKg": 18.75,
        "totalRevenue": 337500
      }
    },
    "dailyBreakdown": [
      {
        "date": "2026-06-10",
        "harvestCount": 1,
        "totalWeightKg": 18.75,
        "totalRevenue": 337500
      },
      {
        "date": "2026-06-11",
        "harvestCount": 1,
        "totalWeightKg": 17.5,
        "totalRevenue": 315000
      }
    ]
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
  "action": "update",
  "hardware_version": "1.0",
  "firmware_version": "1.1.0",
  "url": "https://storage.shroomsync.com/firmware/v1.1.0.bin",
  "checksum_sha256": "optional-sha256",
  "force": false
}
```

**Body Parameters:**
| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `action` | string | ❌ | Aksi OTA, default `update` |
| `hardware_version` | string | ✅ | Versi hardware target |
| `firmware_version` | string | ✅ | Versi firmware target |
| `url` | string | ✅ | URL download firmware (.bin file) |
| `checksum_sha256` | string | ❌ | SHA-256 firmware untuk verifikasi |
| `force` | boolean | ❌ | Paksa update walau versi sama, default `false` |

**Response (200):**
```json
{
  "status": "success",
  "message": "OTA trigger sent to SS-0426-001",
  "data": {
    "topic": "shroomsync/ota/SS-0426-001/trigger",
    "payload": {
      "action": "update",
      "hardware_version": "1.0",
      "firmware_version": "1.1.0",
      "url": "https://storage.shroomsync.com/firmware/v1.1.0.bin",
      "checksum_sha256": "optional-sha256",
      "force": false
    }
  }
}
```

---

#### POST /ota/legacy-trigger/:deviceId
Memicu update firmware untuk device legacy.

**Request:**
```http
POST /api/v1/ota/legacy-trigger/SS-0426-001
Content-Type: application/json

{
  "action": "update",
  "hardware_version": "1.0",
  "firmware_version": "1.1.0",
  "url": "https://storage.shroomsync.com/firmware/v1.1.0.bin",
  "force": false
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Legacy OTA trigger sent to SS-0426-001",
  "data": {
    "topic": "SS-0426-001/legacy/ota/trigger",
    "payload": {
      "action": "update",
      "hardware_version": "1.0",
      "firmware_version": "1.1.0",
      "url": "https://storage.shroomsync.com/firmware/v1.1.0.bin",
      "force": false
    }
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
  "action": "update",
  "hardware_version": "1.0",
  "firmware_version": "1.1.0",
  "url": "https://storage.shroomsync.com/firmware/v1.1.0.bin",
  "force": false
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "OTA broadcast sent to all devices",
  "data": {
    "topic": "shroomsync/ota/broadcast",
    "payload": {
      "action": "update",
      "hardware_version": "1.0",
      "firmware_version": "1.1.0",
      "url": "https://storage.shroomsync.com/firmware/v1.1.0.bin",
      "force": false
    }
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
      "firmwareVersion": "1.1.0",
      "firmwareUrl": "https://storage.shroomsync.com/firmware/v1.1.0.bin",
      "progress": 100,
      "status": "completed",
      "triggeredAt": "2026-05-16T07:30:00.000Z",
      "completedAt": "2026-05-16T07:32:15.000Z"
    }
  ]
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
{deviceId}/telemetry/heartbeat
{deviceId}/state/actuator
{deviceId}/state/control/mode
{deviceId}/state/setpoint/auto
{deviceId}/state/timer/auto
{deviceId}/state/timer/floor
{deviceId}/state/schedule/mode
{deviceId}/state/schedule/slot/1
{deviceId}/state/schedule/slot/2
{deviceId}/state/schedule/slot/3
{deviceId}/state/schedule/floor
{deviceId}/legacy/ota/status
shroomsync/ota/{deviceId}/status
```

Server hanya memproses topic ShroomSync yang dikenal. Topic asing seperti `lock/state` diabaikan sebelum JSON parsing.

**Format Envelope dari ESP32:**
```json
{
  "device_id": "SS-0426-001",
  "seq": 47,
  "uptime_ms": 308527,
  "data": {
    "...": "payload efektif sesuai topic"
  },
  "clientId": "SS-ESP32-DB4EB580"
}
```

Backend membaca field efektif dari `data`. `device_id` harus sama dengan prefix topic `{deviceId}` jika dikirim.

**Contoh Payload — Sensor Data:**
```text
Topic: SS-0426-001/telemetry/sensor
QoS: 0
```
```json
{
  "device_id": "SS-0426-001",
  "seq": 47,
  "uptime_ms": 308527,
  "data": {
    "suhu": 30.32998,
    "kelembaban": 62.83971,
    "waktu": "2026/05/16 14:35:44"
  },
  "clientId": "SS-ESP32-DB4EB580"
}
```

**Contoh Payload — History Data:**
```text
Topic: SS-0426-001/telemetry/history
QoS: 0
```
```json
{
  "device_id": "SS-0426-001",
  "seq": 58,
  "uptime_ms": 561593,
  "data": {
    "suhu": 30.39941,
    "kelembaban": 63.02281,
    "mode": "AUTO",
    "waktu": "2026/05/16 14:39:57",
    "floorPump": "OFF",
    "pump": "OFF"
  },
  "clientId": "SS-ESP32-DB4EB580"
}
```

**Contoh Payload — Heartbeat:**
```text
Topic: SS-0426-001/telemetry/heartbeat
QoS: 0
```
```json
{
  "device_id": "SS-0426-001",
  "seq": 59,
  "uptime_ms": 595550,
  "data": {
    "status": "online",
    "uptime_ms": 595549,
    "rssi_dbm": -64,
    "mode": "AUTO",
    "sensor_valid": true,
    "waktu": "2026/05/16 14:40:31",
    "firmware_version": "1.1.0",
    "hardware_version": "1.0"
  },
  "clientId": "SS-ESP32-DB4EB580"
}
```

**Contoh Payload — State Setpoint:**
```text
Topic: SS-0426-001/state/setpoint/auto
```
```json
{
  "device_id": "SS-0426-001",
  "seq": 60,
  "uptime_ms": 601000,
  "data": {
    "MinS": 20,
    "MidS": 28,
    "MinK": 70,
    "MidK": 85
  },
  "clientId": "SS-ESP32-DB4EB580"
}
```

**Field State yang Didukung:**
| Topic | Field `data` |
|-------|--------------|
| `{deviceId}/state/actuator` | Free-form status aktuator, diteruskan ke Socket.IO |
| `{deviceId}/state/control/mode` | `mode` |
| `{deviceId}/state/setpoint/auto` | `MinS`, `MidS`, `MinK`, `MidK` |
| `{deviceId}/state/timer/auto` | `Menit`, `Detik` |
| `{deviceId}/state/timer/floor` | `FlrMenit`, `FlrDetik` |
| `{deviceId}/state/schedule/mode` | `smode` |
| `{deviceId}/state/schedule/slot/1` | `Jam1`, `Menit1` |
| `{deviceId}/state/schedule/slot/2` | `Jam2`, `Menit2` |
| `{deviceId}/state/schedule/slot/3` | `Jam3`, `Menit3` |
| `{deviceId}/state/schedule/floor` | `FlrJam`, `FlrMenit` |

**Contoh Payload — OTA Status:**
```text
Topic: shroomsync/ota/SS-0426-001/status
```
```json
{
  "device_id": "SS-0426-001",
  "seq": 61,
  "uptime_ms": 700000,
  "data": {
    "status": "completed",
    "progress": 100,
    "firmware_version": "1.1.0"
  },
  "clientId": "SS-ESP32-DB4EB580"
}
```

---

#### Server Publish (Kirim ke ESP32)

Semua command MQTT dari server dibungkus otomatis dalam envelope berikut:
```json
{
  "data": {
    "...": "payload command"
  },
  "clientId": "shroomsync-server"
}
```

**1. Ubah Mode Control:**
```text
Topic: {deviceId}/cmd/control/mode
Data:
{
  "mode": 2
}
```

**2. Ubah Setpoint (Auto Mode):**
```text
Topic: {deviceId}/cmd/setpoint/auto
Data:
{
  "MinS": 20,
  "MidS": 28,
  "MinK": 70,
  "MidK": 85
}
```

**3. Ubah Timer Spray:**
```text
Topic: {deviceId}/cmd/timer/auto
Data:
{
  "Menit": 1,
  "Detik": 30
}
```

**4. Ubah Timer Lantai:**
```text
Topic: {deviceId}/cmd/timer/floor
Data:
{
  "FlrMenit": 2,
  "FlrDetik": 0
}
```

**5. Update Jadwal:**
```text
Topic: {deviceId}/cmd/schedule/update
Data:
{
  "jam1": 7,
  "menit1": 0,
  "jam2": 12,
  "menit2": 30,
  "jam3": 18,
  "menit3": 0
}
```

**6. Update Jadwal Lantai:**
```text
Topic: {deviceId}/cmd/schedule/floor
Data:
{
  "FlrJam": 6,
  "FlrMenit": 30
}
```

**7. Ubah Mode Jadwal:**
```text
Topic: {deviceId}/cmd/schedule/mode
Data:
{
  "mode": 2
}
```

**8. Manual Control Pompa:**
```text
Topic: {deviceId}/cmd/actuator/pump
Data:
{
  "pump": 1,
  "on": true
}
```

**9. Manual Control Fan/Floor Pump:**
```text
Topic: {deviceId}/cmd/actuator/fan
Data:
{
  "fan": 1,
  "on": true
}
```

**10. Trigger OTA Update:**
```text
Topic: shroomsync/ota/{deviceId}/trigger
Data:
{
  "action": "update",
  "hardware_version": "1.0",
  "firmware_version": "1.1.0",
  "url": "https://storage.shroomsync.com/firmware/v1.1.0.bin",
  "checksum_sha256": "optional-sha256",
  "force": false
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
