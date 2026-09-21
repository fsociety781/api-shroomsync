# 🤝 Contributing to ShroomSync API

Terima kasih berminat berkontribusi pada ShroomSync API! Dokumentasi ini menjelaskan bagaimana cara berkontribusi dengan baik.

---

## 📋 Daftar Isi

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Messages](#commit-messages)
6. [Pull Request Process](#pull-request-process)
7. [Testing](#testing)
8. [Documentation](#documentation)

---

## Code of Conduct

Kami berkomitmen pada lingkungan yang ramah dan inklusif:

- Hargai semua kontributor
- Beri feedback yang konstruktif
- Fokus pada kode, bukan orang
- Jangan ada harassment atau discrimination
- Buat semua merasa welcome

---

## Getting Started

### 1. Fork & Clone Repository
```bash
# Fork di GitHub, kemudian clone
git clone https://github.com/YOUR_USERNAME/api-shroomsync.git
cd api-shroomsync

# Add upstream remote
git remote add upstream https://github.com/fsociety781/api-shroomsync.git
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Development Environment
```bash
# Copy environment template
cp .env.example .env

# Update .env dengan local dev credentials
nano .env
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Verify Setup
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Should see: {"status": "ok", "service": "ShroomSync API", ...}
```

---

## Development Workflow

### Create Feature Branch
```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bugfix
git checkout -b fix/your-bug-name
```

### Branch Naming Convention
```
feature/add-websocket-support
fix/mqtt-connection-timeout
docs/api-documentation
refactor/error-handler
test/add-device-service-tests
```

### Make Changes
```bash
# Edit files...
git add src/

# Commit (see commit message guide below)
git commit -m "feature: add WebSocket support for real-time updates"
```

### Keep Branch Updated
```bash
# Before submitting PR, sync with upstream
git fetch upstream
git rebase upstream/main

# Or merge if rebase causes issues
git merge upstream/main
```

### Push & Create PR
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Fill in the PR template with details
```

---

## Coding Standards

### Code Style

**File Structure:**
```javascript
// 1. File header comment
// ============================================
// ShroomSync — Description
// ============================================

// 2. Imports
const express = require('express');
const logger = require('../utils/logger');

// 3. Constants (if any)
const MAX_RETRIES = 3;

// 4. Main code
// 5. Exports
module.exports = myFunction;
```

**Naming Conventions:**
- `camelCase` untuk variables dan functions
- `PascalCase` untuk classes dan components
- `CONSTANT_CASE` untuk constants
- Descriptive names (hindari singkat/cryptic)

```javascript
// ✅ Good
const getUserDevices = async (userId) => { ... }
class DeviceManager { ... }
const MAX_DEVICES = 100;

// ❌ Bad
const getUD = async (uid) => { ... }
class DM { ... }
const max = 100;
```

**Function Documentation:**
```javascript
/**
 * Update device control mode
 * @param {string} deviceId - Device identifier
 * @param {number} mode - Control mode (1=Manual, 2=Auto, 3=Schedule)
 * @returns {Promise<Object>} Updated device configuration
 * @throws {NotFoundError} If device not found
 * @throws {ValidationError} If mode is invalid
 */
async function updateControlMode(deviceId, mode) {
  // Implementation
}
```

### Code Quality

**Use Async/Await (not callbacks or unhandled promises):**
```javascript
// ✅ Good
async function getDevice(deviceId) {
  try {
    const device = await prisma.device.findUnique({ where: { deviceId } });
    return device;
  } catch (error) {
    throw new NotFoundError('Device not found');
  }
}

// ❌ Bad
function getDevice(deviceId, callback) {
  Device.findById(deviceId, (err, device) => {
    callback(err, device);
  });
}
```

**Error Handling:**
```javascript
// ✅ Good
try {
  const device = await getDevice(deviceId);
  if (!device) throw new NotFoundError();
  return device;
} catch (error) {
  logger.error({ deviceId, error: error.message });
  throw error;
}

// ❌ Bad
const device = await getDevice(deviceId);
return device; // Might be null
```

**Use Constants:**
```javascript
// ✅ Good
const CONTROL_MODES = { MANUAL: 1, AUTO: 2, SCHEDULE: 3 };
if (mode === CONTROL_MODES.AUTO) { ... }

// ❌ Bad
if (mode === 2) { ... } // Magic number
```

**Validation:**
```javascript
// ✅ Good
const createDeviceSchema = z.object({
  deviceId: z.string().min(5),
  name: z.string().optional(),
});

// ❌ Bad
if (!deviceId || deviceId.length < 5) {
  throw new Error('Invalid deviceId');
}
```

---

## Commit Messages

Gunakan **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `refactor` — Code refactoring (tidak ada behavior change)
- `test` — Add/update tests
- `chore` — Maintenance, dependencies
- `perf` — Performance improvement

### Scope
- `device` — Device-related changes
- `telemetry` — Telemetry data
- `mqtt` — MQTT communication
- `ota` — OTA updates
- `api` — General API
- `config` — Configuration
- `docs` — Documentation

### Examples
```bash
# Good commits
git commit -m "feat(device): add device online status tracking"
git commit -m "fix(mqtt): handle broker reconnection properly"
git commit -m "refactor(error-handler): improve error messages"
git commit -m "docs: update API documentation with examples"
git commit -m "test(device): add test cases for device creation"
```

---

## Pull Request Process

### Before Submitting
- [ ] Code sesuai style guidelines
- [ ] Self-review diri sendiri
- [ ] Add comments untuk logika kompleks
- [ ] Update documentation
- [ ] Add test cases (jika applicable)
- [ ] No console.log atau debug code
- [ ] No unhandled promises

### PR Description Template
```markdown
## Description
Jelaskan apa yang diubah dan mengapa.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing Done
Jelaskan bagaimana Anda test perubahan ini.

## Checklist
- [ ] Code sesuai style guidelines
- [ ] Semua tests pass
- [ ] Documentation updated
- [ ] Tidak ada breaking changes (atau documented)
```

### Review Process
1. Automated checks run (linting, tests)
2. Code review oleh maintainer
3. Perbaiki feedback jika ada
4. Approval & merge

---

## Testing

### Run Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- device.service.test.js

# Run with coverage
npm test -- --coverage
```

### Write Tests
```javascript
// device.service.test.js
const { describe, it, expect, beforeEach } = require('@jest/globals');
const deviceService = require('../device.service');

describe('DeviceService', () => {
  describe('createDevice', () => {
    it('should create a new device', async () => {
      const result = await deviceService.createDevice({
        deviceId: 'TEST-001',
        name: 'Test Device',
      });

      expect(result).toHaveProperty('id');
      expect(result.deviceId).toBe('TEST-001');
      expect(result.name).toBe('Test Device');
    });

    it('should throw error for duplicate deviceId', async () => {
      await deviceService.createDevice({ deviceId: 'DUP-001' });
      
      expect(() => 
        deviceService.createDevice({ deviceId: 'DUP-001' })
      ).rejects.toThrow('already exists');
    });
  });
});
```

---

## Documentation

### Update Docs When:
- Adding new endpoint
- Changing existing behavior
- Adding new configuration option
- Fixing incorrect documentation

### Documentation Files:
- **API_DOCUMENTATION.md** — API endpoint reference
- **FRONTEND_INTEGRATION_GUIDE.md** — Frontend developer guide
- **DEPLOYMENT_GUIDE.md** — Deployment instructions
- **Code comments** — Inline code documentation
- **README.md** — Quick start & overview

### Keep Docs Clear:
- Use examples untuk kompleks topics
- Update table of contents jika ada new sections
- Check links masih valid
- Grammar & spelling check

---

## Project Structure

Ketika menambah fitur baru, ikuti struktur:

```
src/
├── controllers/
│   └── new-feature.controller.js   // HTTP handlers
├── services/
│   └── new-feature.service.js      // Business logic
├── routes/
│   └── new-feature.routes.js       // URL routing
├── middleware/                     // Jika needed
└── utils/                          // Helpers

test/
└── new-feature.test.js            // Unit tests
```

---

## Questions & Support

- **Development Help:** Create GitHub Discussion
- **Bug Report:** Create GitHub Issue
- **Feature Request:** GitHub Issue with `enhancement` label
- **Direct Contact:** Contact core team

---

## License

Dengan kontribusi, Anda setuju code-nya di-license di bawah MIT License.

---

**Thank you for contributing! 🎉**

Last Updated: 2026-05-14
