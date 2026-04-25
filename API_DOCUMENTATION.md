# 📡 Dokumentasi ShroomSync API & MQTT

Dokumen ini menjelaskan struktur komunikasi Backend Server baik untuk REST API (Front-End) maupun MQTT (Firmware).

---

## 1. REST API Endpoints
*Base URL: `http://localhost:3000/api/v1`*

### 📱 Device Management
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/devices` | Mendapatkan daftar semua perangkat beserta status Online/Offline. |
| `GET` | `/devices/:deviceId` | Mendapatkan detail spesifik perangkat beserta konfigurasinya (Setpoints, Timers). |
| `POST` | `/devices` | Mendaftarkan perangkat baru. (Server akan otomatis membuat file `.json` di `/storage/devices`). |
| `DELETE` | `/devices/:deviceId` | Menghapus perangkat beserta seluruh riwayat data telemetrinya. |

### 📊 Telemetry Data (Terpisah antara Sensor & History)
Terdapat pemisahan tabel untuk membaca data riwayat yang berat (Snapshot) dan data pergerakan suhu yang ringan.

**Sensor Data (Suhu & Kelembaban):**
- `GET /devices/:deviceId/telemetry/sensor` — Menarik data sensor historis (mendukung parameter `?limit=` dan `?offset=`). Cocok untuk Line Chart.
- `GET /devices/:deviceId/telemetry/sensor/latest` — Mendapatkan 1 baris nilai suhu terkini.

**System History (Status Pompa & Mode):**
- `GET /devices/:deviceId/telemetry/history` — Menarik rekaman riwayat sistem lengkap. Cocok untuk Data Table / Activity Log.
- `GET /devices/:deviceId/telemetry/history/latest` — Mendapatkan status sistem terakhir.

### 🎮 Device Control Commands
Endpoint ini digunakan untuk mengubah konfigurasi. Backend akan memvalidasi *request*, menyimpan ke database, lalu **mengirimkan perintah via MQTT** ke alat (ESP32).

| Method | Endpoint | Payload Contoh |
|---|---|---|
| `POST` | `/devices/:deviceId/control/mode` | `{"mode": 2}` *(1: Manual, 2: Auto, 3: Jadwal)* |
| `POST` | `/devices/:deviceId/setpoint` | `{"MinS": 25, "MidS": 28, "MinK": 75, "MidK": 90}` |
| `POST` | `/devices/:deviceId/timer` | `{"Menit": 1, "Detik": 30}` |
| `POST` | `/devices/:deviceId/timer/floor` | `{"FlrMenit": 2, "FlrDetik": 0}` |
| `POST` | `/devices/:deviceId/schedule/update` | `{"jam1": 7, "menit1": 0, "jam2": 12...}` |
| `POST` | `/devices/:deviceId/actuator/pump` | `{"on": true}` *(Manual Bypass)* |

### 🚀 OTA Updates
| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/ota/trigger/:deviceId` | Memicu *update firmware* untuk satu alat. Membutuhkan Payload berisi `url` dan `firmware_version`. |
| `POST` | `/ota/broadcast` | Memicu *update* massal ke seluruh alat (Berbahaya!). |
| `GET` | `/ota/logs/:deviceId` | Mengecek log keberhasilan/kegagalan OTA. |

---

## 2. Struktur Topik MQTT

Server berkomunikasi dengan ESP32 menggunakan protokol MQTT.
> **Catatan Penting:** *Prefix* perangkat (seperti `SS-0426-001`) tidak lagi di-*hardcode*! Server akan menerima pesan MQTT dari perangkat **apapun** selama ID-nya sudah terdaftar di database `devices` (Dynamic Validation).

Format Envelope untuk payload (Cegah Looping Server):
```json
{
  "clientId": "shroomsync-server",
  "data": { ...isi data disini... }
}
```

### A. Server Menerima Data dari ESP32 (SUBSCRIBE)
Topik *wildcard* yang di-subscribe server:
- `+/telemetry/sensor`
- `+/telemetry/history`
- `+/state/#`
- `shroomsync/ota/+/status`

**Contoh Payload dari ESP32 (ke topik `SS-001/telemetry/sensor`):**
```json
{
  "device_id": "SS-001",
  "data": {
    "suhu": 29.5,
    "kelembaban": 70.0
  }
}
```

### B. Server Mengirim Perintah ke ESP32 (PUBLISH)
Topik tujuan saat Dashboard mengubah pengaturan:

1. **Ubah Setpoint Auto:** `{deviceId}/cmd/setpoint/auto`
2. **Ubah Timer Kabut:** `{deviceId}/cmd/timer/auto`
3. **Ubah Jadwal:** `{deviceId}/cmd/schedule/update`
4. **Manual Switch:** `{deviceId}/cmd/actuator/pump` atau `.../fan`

*(Semua Topic Commands bisa direferensikan pada file `src/constants/mqtt-topics.js`)*
