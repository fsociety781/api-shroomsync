# 🚀 ShroomSync Backend — Deployment Guide

Panduan lengkap untuk deploy ShroomSync API ke berbagai lingkungan (staging, production).

---

## 📋 Daftar Isi

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Verification](#local-verification)
3. [Deployment Methods](#deployment-methods)
4. [Production Configuration](#production-configuration)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Sebelum deploy, pastikan semua item ini terverifikasi:

- [ ] **Code Review** — Semua changes sudah di-review
- [ ] **Testing** — Run smoke tests (jika ada)
  ```bash
  npm test  # atau sesuai test command Anda
  ```
- [ ] **Environment Variables** — Semua env vars sudah set di target environment
- [ ] **Database** — Migration sudah berjalan di target database
- [ ] **MQTT Broker** — Broker accessible dan credentials correct
- [ ] **CORS Whitelist** — Frontend domains sudah di-whitelist
- [ ] **Rate Limits** — Configured sesuai kebutuhan production
- [ ] **Logging** — LOG_LEVEL set ke `info` atau `warn` (bukan debug)
- [ ] **Dependencies** — Semua dependencies up-to-date dan secure
  ```bash
  npm audit
  npm update
  ```

---

## Local Verification

### 1. Build & Compile Check
```bash
# Pastikan tidak ada syntax/compilation errors
npm run db:generate

# Run dependency check
npm audit --fix
```

### 2. Environment Test
```bash
# Copy .env.example
cp .env.example .env

# Edit dengan credentials staging/dev
nano .env

# Test connection
npm run db:push
```

### 3. API Health Check
```bash
# Start server
npm run dev

# In another terminal, test health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {
#   "status": "ok",
#   "service": "ShroomSync API",
#   "version": "1.0.0",
#   "environment": "development"
# }
```

### 4. Run Smoke Tests
```bash
# Test basic endpoints
npm run test:smoke

# Or manually test via Postman/curl
curl http://localhost:3000/api/v1/devices
```

---

## Deployment Methods

### Method 1: Manual SSH Deployment (VPS/Dedicated Server)

#### Step 1: Connect to Server
```bash
ssh username@your-server-ip
cd /app/shroomsync-api
```

#### Step 2: Pull Latest Code
```bash
# If using git
git pull origin main

# Or, upload zip
scp api-shroomsync.zip username@server:/app/
cd /app && unzip api-shroomsync.zip
```

#### Step 3: Update Dependencies
```bash
npm install --production  # Only production deps

# Or for safety, install all then prune
npm install
npm prune --production
```

#### Step 4: Setup Environment
```bash
# Copy .env from secure location
cp /secure/location/.env .env

# Or edit manually
nano .env

# Verify it looks correct
cat .env | grep -v "^#"
```

#### Step 5: Database Migration
```bash
# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:push

# Verify with Prisma Studio (optional)
npm run db:studio
```

#### Step 6: Start Service

**Using systemd (recommended):**
```bash
# Create systemd service
sudo nano /etc/systemd/system/shroomsync-api.service

[Unit]
Description=ShroomSync API Backend
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/app/shroomsync-api
ExecStart=/usr/bin/node /app/shroomsync-api/bin/www
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable & start
sudo systemctl daemon-reload
sudo systemctl enable shroomsync-api
sudo systemctl start shroomsync-api
sudo systemctl status shroomsync-api
```

**Using PM2 (alternative):**
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start bin/www --name "shroomsync-api"

# Save PM2 config
pm2 save

# Auto restart on reboot
pm2 startup

# Monitor
pm2 logs shroomsync-api
pm2 monit
```

---

### Method 2: Docker Deployment

#### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "bin/www"]
```

#### Step 2: Create .dockerignore
```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.example
README.md
test/
```

#### Step 3: Build & Push Image
```bash
# Build image
docker build -t shroomsync-api:1.0.0 .

# Tag for registry
docker tag shroomsync-api:1.0.0 registry.example.com/shroomsync-api:1.0.0

# Push to registry
docker push registry.example.com/shroomsync-api:1.0.0
```

#### Step 4: Deploy with Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    image: registry.example.com/shroomsync-api:1.0.0
    container_name: shroomsync-api
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL}
      MQTT_BROKER_URL: ${MQTT_BROKER_URL}
      MQTT_USERNAME: ${MQTT_USERNAME}
      MQTT_PASSWORD: ${MQTT_PASSWORD}
      CORS_ORIGINS: ${CORS_ORIGINS}
      LOG_LEVEL: info
      PRETTY_LOG: "false"
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  # Optional: MySQL Database
  mysql:
    image: mysql:8.0
    container_name: shroomsync-db
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - db-data:/var/lib/mysql
    restart: always

volumes:
  db-data:
```

**Deploy:**
```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

### Method 3: Kubernetes Deployment

#### Step 1: Create ConfigMap for Environment
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: shroomsync-config
data:
  LOG_LEVEL: "info"
  PRETTY_LOG: "false"
  NODE_ENV: "production"
```

#### Step 2: Create Secrets for Sensitive Data
```bash
kubectl create secret generic shroomsync-secrets \
  --from-literal=DATABASE_URL="mysql://..." \
  --from-literal=MQTT_BROKER_URL="mqtt://..." \
  --from-literal=MQTT_USERNAME="..." \
  --from-literal=MQTT_PASSWORD="..."
```

#### Step 3: Create Deployment
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shroomsync-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shroomsync-api
  template:
    metadata:
      labels:
        app: shroomsync-api
    spec:
      containers:
      - name: api
        image: registry.example.com/shroomsync-api:1.0.0
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: shroomsync-config
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: shroomsync-secrets
              key: DATABASE_URL
        - name: MQTT_BROKER_URL
          valueFrom:
            secretKeyRef:
              name: shroomsync-secrets
              key: MQTT_BROKER_URL
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

**Deploy:**
```bash
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml

# Check status
kubectl get pods
kubectl logs -f deployment/shroomsync-api
```

---

## Production Configuration

### Production .env Template

```env
# ── Server ────────────────────────────────
NODE_ENV=production
PORT=3000

# ── Database ──────────────────────────────
# Use strong credentials & encrypted password
DATABASE_URL="mysql://prod_user:very_strong_password@db.shroomsync.com:3306/shroomsync_prod"

# ── MQTT ───────────────────────────────────
MQTT_BROKER_URL="mqtt://mqtt.shroomsync.com:1883"
MQTT_USERNAME="prod_mqtt_user"
MQTT_PASSWORD="mqtt_secure_password"
MQTT_CLIENT_ID="shroomsync-server-prod"

# ── Security: CORS ─────────────────────────
# STRICT whitelist - only production domains
CORS_ORIGINS="https://dashboard.shroomsync.com,https://mobile.shroomsync.com"

# ── Rate Limiting ──────────────────────────
# More conservative for production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# ── Logging ────────────────────────────────
LOG_LEVEL=info
PRETTY_LOG=false  # JSON logs for parsing

# ── Storage ────────────────────────────────
FIRMWARE_UPLOAD_DIR="/secure/storage/firmware"
TELEMETRY_RETENTION_DAYS=30  # Keep longer history in prod
```

### Security Recommendations

1. **Database**
   - Use separate user account (not root)
   - Enable SSL connections
   - Regular backups

2. **MQTT Broker**
   - Use authentication
   - Enable TLS/SSL
   - Use strong passwords

3. **API Server**
   - Run under non-root user
   - Use reverse proxy (nginx/apache)
   - Enable HTTPS/TLS
   - Implement WAF (Web Application Firewall)

4. **Monitoring**
   - Setup error tracking (Sentry, DataDog, etc.)
   - Monitor logs for security issues
   - Setup alerts for high error rates

### Nginx Reverse Proxy Configuration

```nginx
upstream shroomsync_api {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name api.shroomsync.com;
  
  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.shroomsync.com;

  # SSL Certificates (Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/api.shroomsync.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.shroomsync.com/privkey.pem;

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "no-referrer-when-downgrade" always;

  # Proxy settings
  location / {
    proxy_pass http://shroomsync_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
  limit_req zone=api_limit burst=20 nodelay;
}
```

---

## Post-Deployment Verification

### 1. Health Check
```bash
# Check API health
curl https://api.shroomsync.com/api/health

# Expected 200 response
```

### 2. Database Connectivity
```bash
# Verify DB is accessible
# This should NOT error
npm run db:studio
```

### 3. MQTT Connectivity
```bash
# Check logs for MQTT connection
tail -f /var/log/shroomsync-api.log | grep "MQTT"
```

### 4. API Functionality
```bash
# Test device list endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.shroomsync.com/api/v1/devices

# Should return 200 with device list
```

### 5. Monitor Logs
```bash
# Real-time log monitoring
journalctl -u shroomsync-api -f

# Or with PM2
pm2 logs shroomsync-api

# Or with Docker
docker-compose logs -f api
```

### 6. Performance Baseline
```bash
# Test response times
time curl https://api.shroomsync.com/api/v1/devices

# Should respond in < 500ms for typical loads
```

---

## Troubleshooting

### Issue: Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Issue: Database Connection Timeout
```bash
# Verify credentials
mysql -h db.host -u username -p

# Check firewall rules
sudo iptables -L | grep 3306

# Verify DNS
nslookup db.shroomsync.com
```

### Issue: MQTT Connection Failed
```bash
# Test MQTT broker connectivity
mosquitto_sub -h mqtt.broker.com -t "test"

# Check credentials
# Verify broker is running and accessible
```

### Issue: High Memory Usage
```bash
# Check Node.js process
ps aux | grep node

# Investigate memory leaks
# Use heap snapshots for analysis
npm install -g clinic
clinic doctor -- npm start
```

### Issue: SSL Certificate Error
```bash
# Verify certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Renew certificate (Let's Encrypt)
certbot renew --dry-run
certbot renew
```

---

## Rollback Procedure

If deployment encounters critical issues:

```bash
# Stop current version
systemctl stop shroomsync-api

# Checkout previous version
git revert HEAD
# Or restore from backup
cp -r /backup/shroomsync-api-v1.0.0 /app/shroomsync-api

# Reinstall & restart
npm install
npm run db:push
systemctl start shroomsync-api

# Verify
curl https://api.shroomsync.com/api/health
```

---

## Contact & Support

- **Deployment Issues:** support@shroomsync.com
- **Monitoring Alerts:** devops@shroomsync.com
- **Security Issues:** security@shroomsync.com

---

**Last Updated:** 2026-05-14  
**Version:** 1.0.0
