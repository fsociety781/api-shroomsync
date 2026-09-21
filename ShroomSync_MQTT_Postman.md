# ShroomSync MQTT Postman Guide

Dokumen ini dipakai untuk testing MQTT lewat Postman saat broker masih berada di lingkungan testing.

## Connection

Gunakan konfigurasi berikut di Postman MQTT request:

| Field | Value |
|-------|-------|
| Protocol | `mqtt` |
| Host | `broker.emqx.io` |
| Port | `1883` |
| Auth | None |
| Client ID | `postman-shroomsync-test` atau value unik lain |

Import environment:

```text
docs/postman/ShroomSync_MQTT.postman_environment.json
```

Variable utama:

| Variable | Default | Keterangan |
|----------|---------|------------|
| `mqtt_host` | `broker.emqx.io` | Broker testing |
| `mqtt_port` | `1883` | Port MQTT non-TLS |
| `device_id` | `SCM-ESP32-ABCD` | Ganti sesuai `device_id` provisioning |

## Subscribe Topic untuk Monitoring

Subscribe topic berikut untuk melihat data dari device:

```text
{{device_id}}/telemetry/sensor
{{device_id}}/telemetry/heartbeat
{{device_id}}/state/actuator
{{device_id}}/state/#
{{device_id}}/activation/check
shroomsync/ota/{{device_id}}/status
{{device_id}}/legacy/ota/status
```

## Publish Command

Command dapat dikirim sebagai JSON langsung:

```json
{"mode": 2}
```

Firmware juga menerima command dengan envelope:

```json
{
  "data": {
    "mode": 2
  }
}
```

## Topic Publish dari Device

Payload dari device selalu memakai envelope:

```json
{
  "device_id": "SCM-ESP32-ABCD",
  "seq": 1842,
  "uptime_ms": 123456,
  "data": {
    "suhu": 27.5,
    "kelembaban": 85.2,
    "waktu": "2026-05-03 12:00:00"
  },
  "clientId": "SS-ESP32-A1B2C3D4"
}
```

## Deadband Sensor

`{{device_id}}/telemetry/sensor` tidak dikirim terus-menerus. Firmware hanya publish jika:

- sample pertama setelah connect/reconnect,
- suhu berubah minimal `0.25 C`, atau
- kelembaban berubah minimal `1.0% RH`.

Heartbeat tetap dikirim tiap `60 detik` ke `{{device_id}}/telemetry/heartbeat`, walaupun sensor stabil.

## Command Examples

### Set Control Mode

Topic:

```text
{{device_id}}/cmd/control/mode
```

Payload:

```json
{"mode": 2}
```

Mode:

| Value | Mode |
|-------|------|
| `1` | Manual |
| `2` | Auto |
| `3` | Hybrid |

### Set Auto Setpoint

Topic:

```text
{{device_id}}/cmd/setpoint/auto
```

Payload:

```json
{
  "MinS": 26,
  "MidS": 28,
  "MinK": 80,
  "MidK": 90
}
```

### Set Pump Timer

Topic:

```text
{{device_id}}/cmd/timer/auto
```

Payload:

```json
{
  "Menit": 1,
  "Detik": 30
}
```

### Set Floor Pump Timer

Topic:

```text
{{device_id}}/cmd/timer/floor
```

Payload:

```json
{
  "FlrMenit": 1,
  "FlrDetik": 30
}
```

### Set Schedule Mode

Topic:

```text
{{device_id}}/cmd/schedule/mode
```

Payload:

```json
{"mode": 2}
```

### Set Main Pump Schedule

Topic:

```text
{{device_id}}/cmd/schedule/update
```

Payload:

```json
{
  "jam1": 7,
  "menit1": 0,
  "jam2": 12,
  "menit2": 0,
  "jam3": 17,
  "menit3": 30
}
```

### Set Floor Pump Schedule

Topic:

```text
{{device_id}}/cmd/schedule/floor
```

Payload:

```json
{
  "FlrJam": 7,
  "FlrMenit": 0
}
```

### Manual Pump Override

Topic:

```text
{{device_id}}/cmd/actuator/pump
```

Payload:

```json
{"pump": 1}
```

Command manual actuator efektif pada mode Manual/Hybrid. Pada mode Auto, command actuator diabaikan oleh firmware.

### Manual Floor Pump/Fan Override

Topic:

```text
{{device_id}}/cmd/actuator/fan
```

Payload:

```json
{"fan": 0}
```

### OTA Trigger

Topic per device:

```text
shroomsync/ota/{{device_id}}/trigger
```

Topic broadcast:

```text
shroomsync/ota/broadcast
```

Payload:

```json
{
  "action": "update",
  "hardware_version": "1.0",
  "firmware_version": "1.2.0",
  "url": "http://cdn.example.com/firmware/v1.2.0.bin",
  "checksum_sha256": "",
  "force": false
}
```

---

## Device Activation (Aktivasi Perangkat)

Fitur aktivasi berfungsi untuk memvalidasi kepemilikan perangkat oleh akun petani. Selama perangkat belum aktif, relay terkunci OFF dan telemetri ditahan.

### 1. Monitor Request Cek Aktivasi dari Perangkat

Subscribe topic:

```text
{{device_id}}/activation/check
```

ESP32 yang belum diaktivasi mempublish payload berikut tiap `10 detik`:

```json
{
  "device_id": "SCM-ESP32-ABCD",
  "mac_address": "34:85:18:XX:XX:XX",
  "firmware_version": "1.1.0",
  "hardware_version": "1.0",
  "action": "check"
}
```

### 2. Mengirim Status Aktivasi (Activate Device)

Topic:

```text
{{device_id}}/activation/status
```

Payload untuk mengaktivasi:

```json
{
  "activated": true,
  "owner": "Pak Budi Santoso",
  "message": "Perangkat berhasil diaktivasi untuk kumbung A"
}
```

*Respon perangkat:* LCD menampilkan banner `"TERAKTIVASI!"` disertai nama pemilik, kunci relay dibuka, dan publish telemetri normal dimulai.

### 3. Mengirim Status Deaktivasi (Deactivate / Lock Device)

Topic:

```text
{{device_id}}/activation/status
```

Payload untuk menonaktifkan:

```json
{
  "activated": false,
  "owner": "",
  "message": "Perangkat dinonaktifkan oleh administrator"
}
```

*Respon perangkat:* Perangkat kembali ke status belum teraktivasi, LCD menampilkan lock screen `"BELUM DIAKTIVASI"`, dan seluruh relay seketika dikunci mati (*OFF*).

