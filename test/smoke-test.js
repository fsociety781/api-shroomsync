// Quick smoke test for the ShroomSync API
const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`\n${method} ${path} → ${res.statusCode}`);
          console.log(JSON.stringify(json, null, 2));
          resolve(json);
        } catch {
          console.log(`\n${method} ${path} → ${res.statusCode}: ${data}`);
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== ShroomSync API Smoke Test ===\n');

  // 1. Health check
  await request('GET', '/api/health');

  // 2. Register a device
  await request('POST', '/api/v1/devices', {
    deviceId: 'SHROOMSYNC-ESP32-TEST',
    name: 'Test Mushroom Room 1',
  });

  // 3. List devices
  await request('GET', '/api/v1/devices');

  // 4. Get specific device
  await request('GET', '/api/v1/devices/SHROOMSYNC-ESP32-TEST');

  // 5. Change control mode (sends MQTT command)
  await request('POST', '/api/v1/devices/SHROOMSYNC-ESP32-TEST/control/mode', {
    mode: 1,
  });

  // 6. Update setpoints
  await request('POST', '/api/v1/devices/SHROOMSYNC-ESP32-TEST/setpoint', {
    MinS: 25, MidS: 28, MinK: 75, MidK: 90,
  });

  // 7. Toggle pump
  await request('POST', '/api/v1/devices/SHROOMSYNC-ESP32-TEST/actuator/pump', {
    on: true,
  });

  // 8. Get telemetry (should be empty)
  await request('GET', '/api/v1/devices/SHROOMSYNC-ESP32-TEST/telemetry/sensor');

  // 9. Test validation error (invalid mode)
  await request('POST', '/api/v1/devices/SHROOMSYNC-ESP32-TEST/control/mode', {
    mode: 99,
  });

  // 10. Test 404
  await request('GET', '/api/v1/devices/NON-EXISTENT-DEVICE');

  console.log('\n=== Smoke Test Complete ===');
}

main().catch(console.error);
