# 🍄 ShroomSync IoT Backend API

[![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)](.)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](.)
[![License](https://img.shields.io/badge/license-MIT-green)](.)

**ShroomSync** adalah sistem IoT terintegrasi untuk manajemen otomatis kumbung jamur. Backend ini menghubungkan perangkat ESP32 di lapangan dengan dashboard web/mobile melalui protokol MQTT dan REST API.

## ✨ Fitur Utama

- **🌐 REST API** — HTTP endpoints untuk kontrol device & monitoring
- **📡 MQTT Bridge** — Komunikasi real-time dengan ESP32 devices
- **📊 Real-time Telemetry** — Streaming data suhu, kelembaban, & status aktuator
- **🍄 Cultivation Cycles** — Pencatatan siklus budidaya dan harvest harian
- **🔄 OTA Updates** — Update firmware over-the-air untuk semua/sebagian device
- **🔒 Security** — CORS protection, rate limiting, input validation (Zod)
- **📝 Structured Logging** — Pino logger dengan context tracking
- **⚡ Production Ready** — Error handling, graceful shutdown, health check

## 🛠️ Tech Stack

```
├── Runtime: Node.js 18+
├── Framework: Express.js 4.22
├── Database: MariaDB / MySQL
├── ORM: Prisma 5
├── IoT Protocol: MQTT 5.12
├── Real-time: Socket.IO 4.8
├── Validation: Zod 3.25
├── Security: Helmet, CORS, Rate Limiting
└── Logging: Pino 10
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd api-shroomsync

# Install npm packages
npm install
```

### 2. Setup Environment

```bash
# Copy .env.example ke .env
cp .env.example .env

# Edit .env dengan konfigurasi Anda
# - DATABASE_URL (MySQL/MariaDB)
# - MQTT_BROKER_URL
# - CORS_ORIGINS (list domain frontend)
```

**Konfigurasi kunci:**

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/shroomsync"

# MQTT Broker
MQTT_BROKER_URL="mqtt://broker.emqx.io:1883"

# Frontend origins (PENTING untuk production!)
CORS_ORIGINS="http://localhost:3000,https://dashboard.shroomsync.com"

# Rate limiting (optional)
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

### 3. Setup Database

```bash
# Sync Prisma schema ke database
npm run db:push

# Generate Prisma client
npm run db:generate

# (Optional) Buka Prisma Studio untuk manage data
npm run db:studio
```

### 4. Run Server

```bash
# Development mode (auto-restart dengan nodemon)
npm run dev

# Production mode
npm start
```

Server akan berjalan di `http://localhost:3000`

### 5. Verify Installation

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Response:
# {
#   "status": "ok",
#   "service": "ShroomSync API",
#   "version": "1.0.0",
#   "uptime": 123,
#   "timestamp": "2026-05-14T10:30:00Z",
#   "environment": "development"
# }
```

---

## 📚 API Documentation

Dokumentasi lengkap untuk semua endpoints tersedia di [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Contoh Quick Call

**Daftar semua device:**
```bash
curl http://localhost:3000/api/v1/devices
```

**Get detail device:**
```bash
curl http://localhost:3000/api/v1/devices/SS-0426-001
```

**Update control mode:**
```bash
curl -X POST http://localhost:3000/api/v1/devices/SS-0426-001/control/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": 2}'
```

---

## 🏗️ Arsitektur Project

```
api-shroomsync/
├── bin/
│   └── www                          # Entry point / server bootstrap
├── src/
│   ├── config/
│   │   └── index.js                 # Centralized config (env variables)
│   ├── constants/
│   │   └── mqtt-topics.js           # MQTT topic definitions
│   ├── controllers/                 # HTTP request handlers
│   │   ├── device.controller.js
│   │   ├── control.controller.js
│   │   ├── cycle.controller.js
│   │   ├── telemetry.controller.js
│   │   └── ota.controller.js
│   ├── services/                    # Business logic layer
│   │   ├── device.service.js
│   │   ├── cycle.service.js
│   │   ├── mqtt.service.js
│   │   ├── ota.service.js
│   │   ├── socket.service.js
│   │   └── telemetry.service.js
│   ├── routes/                      # URL routing
│   │   ├── device.routes.js
│   │   ├── control.routes.js
│   │   ├── cycle.routes.js
│   │   ├── telemetry.routes.js
│   │   └── ota.routes.js
│   ├── middleware/                  # Express middleware
│   │   ├── error-handler.js         # Global error handling
│   │   ├── rate-limiter.js          # Rate limiting
│   │   └── validate.middleware.js
│   └── utils/                       # Helper functions
│       ├── api-response.js          # Standardized response builder
│       ├── async-handler.js         # Async/await wrapper
│       ├── errors.js                # Custom error classes
│       ├── logger.js                # Pino logger setup
│       ├── prisma.js                # Prisma client
│       └── validators.js            # Zod schemas
├── prisma/
│   └── schema.prisma                # Database schema definition
├── storage/
│   ├── devices/                     # Device config JSON backups
│   └── firmware/                    # OTA firmware files
├── public/                          # Static files
├── postman/                         # Postman API collection
├── app.js                           # Express app setup
├── package.json
├── .env.example
├── API_DOCUMENTATION.md             # Complete API reference
└── README.md                        # This file
```

---

## 🔌 API Endpoints Overview

### Device Management
```
GET    /api/v1/devices                    List all devices
GET    /api/v1/devices/:deviceId          Get device detail
POST   /api/v1/devices                    Register new device
DELETE /api/v1/devices/:deviceId          Delete device
```

### Device Control
```
POST   /api/v1/devices/:deviceId/control/mode           Set mode (1=Manual, 2=Auto, 3=Schedule)
POST   /api/v1/devices/:deviceId/setpoint               Set temperature/humidity targets
POST   /api/v1/devices/:deviceId/timer                  Set spray timer
POST   /api/v1/devices/:deviceId/timer/floor            Set floor pump timer
POST   /api/v1/devices/:deviceId/schedule/update        Set daily schedule
POST   /api/v1/devices/:deviceId/actuator/pump          Manual pump control
```

### Telemetry Data
```
GET    /api/v1/devices/:deviceId/telemetry/sensor      Get temperature/humidity history
GET    /api/v1/devices/:deviceId/telemetry/sensor/latest
GET    /api/v1/devices/:deviceId/telemetry/history     Get system action log
GET    /api/v1/devices/:deviceId/telemetry/history/latest
```

### Cultivation Cycles & Harvest
```
GET    /api/v1/devices/:deviceId/cycles                         List cultivation cycles
POST   /api/v1/devices/:deviceId/cycles                         Create/start cycle
GET    /api/v1/devices/:deviceId/cycles/:cycleId                Get cycle detail
PATCH  /api/v1/devices/:deviceId/cycles/:cycleId                Update cycle
POST   /api/v1/devices/:deviceId/cycles/:cycleId/complete       Complete cycle
GET    /api/v1/devices/:deviceId/cycles/:cycleId/summary        Cycle harvest analytics
GET    /api/v1/devices/:deviceId/cycles/:cycleId/harvests       List harvest records
POST   /api/v1/devices/:deviceId/cycles/:cycleId/harvests       Record harvest
PATCH  /api/v1/devices/:deviceId/cycles/:cycleId/harvests/:id   Update harvest
DELETE /api/v1/devices/:deviceId/cycles/:cycleId/harvests/:id   Delete harvest
```

### OTA Updates
```
POST   /api/v1/ota/trigger/:deviceId     Trigger firmware update for device
POST   /api/v1/ota/broadcast             Broadcast update to all devices
GET    /api/v1/ota/logs/:deviceId        Get update history
```

---

## 📡 MQTT Topics

Device berkomunikasi dengan server menggunakan MQTT protocol.

### Topics from ESP32 (Server Subscribe)
```
{deviceId}/telemetry/sensor          Sensor data (suhu, kelembaban)
{deviceId}/telemetry/history         System action log
{deviceId}/state/#                   Device state updates
shroomsync/ota/{deviceId}/status     OTA update status
```

### Topics to ESP32 (Server Publish)
```
{deviceId}/cmd/control/mode          Change operation mode
{deviceId}/cmd/setpoint/auto         Update setpoint
{deviceId}/cmd/timer/auto            Update spray timer
{deviceId}/cmd/actuator/pump         Control pump
shroomsync/ota/{deviceId}/trigger    Trigger OTA update
```

Lihat [MQTT section di API_DOCUMENTATION.md](./API_DOCUMENTATION.md#mqtt-protocol) untuk detail lengkap.

---

## 🔒 Security Features

### 1. CORS Protection
- **Default:** Terbuka untuk development (`*`)
- **Production:** Whitelist domains melalui `CORS_ORIGINS` env variable

```env
# ✅ Production setup
CORS_ORIGINS="https://dashboard.shroomsync.com,https://mobile.shroomsync.com"
```

### 2. Rate Limiting
- **Global:** 100 requests per 15 menit
- **Control endpoints:** 20 requests per 15 menit (5x stricter)
- **Health check:** Unlimited

Configure via environment:
```env
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

### 3. Input Validation
- Semua input divalidasi dengan **Zod** schema
- Comprehensive error messages untuk debugging
- Automatic type coercion & sanitization

### 4. Error Handling
- Granular error codes dengan detail context
- Sensitive info hidden di production
- Structured logging untuk audit trail

### 5. Helmet Security Headers
- XSS protection
- Content Security Policy
- HSTS enforcement
- Frame busting

---

## 📝 Logging & Monitoring

### Log Levels
```env
LOG_LEVEL=debug          # Verbose: debug, info, warn, error
PRETTY_LOG=true          # Pretty print untuk development
```

### Structured Logging with Context
```javascript
// Automatic request context logging
// Logger automatically captures: requestId, path, method, ip
logger.info('Device update successful');
// Output: {"level": 30, "requestId": "...", "path": "/api/v1/devices/...", ...}
```

### View Logs
```bash
# Real-time logs (development)
npm run dev

# Structured JSON logs (production)
npm start 2>&1 | grep error
```

---

## ⚠️ Common Issues & Solutions

### Issue: CORS error dari frontend
**Solusi:** Update `CORS_ORIGINS` di `.env`
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
```

### Issue: Database connection failed
**Solusi:** Verify `DATABASE_URL`
```bash
# Test connection
npm run db:push
# Jika error, check:
# - MySQL/MariaDB running
# - User & password correct
# - Database exists
```

### Issue: MQTT not connecting
**Solusi:** Verify broker URL & credentials
```bash
# Test MQTT broker (using mosquitto_pub/mosquitto_sub)
mosquitto_sub -h broker.emqx.io -t "test"
```

### Issue: Rate limit blocking requests
**Solusi:** Implement exponential backoff
```javascript
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      } else throw err;
    }
  }
}
```

---

## 🚀 Deployment

### Docker (Optional)
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup (Production)
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
PRETTY_LOG=false

# Database (production instance)
DATABASE_URL="mysql://prod_user:secure_password@db.example.com/shroomsync"

# MQTT (production broker)
MQTT_BROKER_URL="mqtt://mqtt.example.com:1883"

# CORS (strict whitelist)
CORS_ORIGINS="https://dashboard.shroomsync.com,https://mobile.shroomsync.com"

# Rate limiting (stricter)
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_WINDOW_MS=900000
```

### Health Check
```bash
# Kubernetes/Docker health check
curl http://localhost:3000/api/health
```

---

## 📞 Support & Contribution

- **API Issues:** Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Bug Report:** [Open GitHub issue]
- **Feature Request:** Submit PR or contact team
- **Contact:** support@shroomsync.com

---

## 📜 License

MIT © 2026 ShroomSync Team

---

**Last Updated:** 2026-05-14  
**Maintained By:** fsociety781
