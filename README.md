# ShroomSync IoT Backend

ShroomSync IoT Backend adalah server pusat (berbasis Node.js & Express) yang berfungsi sebagai jembatan komunikasi antara perangkat keras (ESP32) yang mengatur kumbung jamur dengan aplikasi antarmuka pengguna (Dashboard/Mobile).

Sistem ini melayani 3 fungsi utama:
1. **MQTT Bridge:** Berkomunikasi dua arah secara asinkron dengan perangkat ESP32.
2. **REST API Gateway:** Menyediakan HTTP Endpoints untuk aplikasi *frontend* mengontrol dan memantau status kumbung.
3. **Real-Time Engine:** Meneruskan data *telemetry* secara *real-time* ke klien menggunakan Socket.IO.

## 🛠️ Stack Teknologi
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MariaDB / MySQL
- **ORM:** Prisma (`@prisma/client`)
- **IoT Protocol:** MQTT (`mqtt.js`)
- **WebSockets:** Socket.IO
- **Keamanan & Validasi:** Helmet, CORS, Zod

## 🚀 Panduan Instalasi (Setup)

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```

2. **Konfigurasi Environment Variable (.env)**
   Salin `.env.example` ke `.env` dan sesuaikan kredensial Database dan MQTT Anda:
   ```env
   PORT=3000
   DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/shroomsync"
   
   MQTT_BROKER_URL="mqtt://broker.emqx.io:1883"
   MQTT_USERNAME=""
   MQTT_PASSWORD=""
   ```

3. **Inisialisasi Database (Prisma)**
   Gunakan perintah berikut untuk menyinkronkan skema database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Jalankan Server**
   ```bash
   # Mode Development (auto-restart)
   npm run dev

   # Mode Production
   npm start
   ```

## 📁 Struktur Direktori Utama
- `src/controllers/`: Logika *handler* untuk setiap *endpoint* REST API.
- `src/services/`: Logika inti bisnis (MQTT processing, Database query, OTA management).
- `src/routes/`: Pemetaan path URL (REST) ke *controller* yang tepat.
- `src/constants/`: Daftar konfigurasi statis (seperti daftar topik MQTT).
- `prisma/`: Berisi skema database (`schema.prisma`).
- `postman/`: Koleksi Postman siap pakai untuk mengetes API.
- `storage/devices/`: Tempat penyimpanan otomatis file JSON spesifikasi setiap alat (*auto-generated*).

## 📖 Dokumentasi API & MQTT
Untuk melihat daftar Endpoint REST API secara detail dan struktur pengiriman Payload MQTT, silakan baca [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).
