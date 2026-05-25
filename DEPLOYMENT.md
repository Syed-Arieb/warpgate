# Deployment Guide

This guide covers deploying Warpgate to a production Linux VPS (Debian 12+).

---

## Table of Contents

- [Docker + Caddy (recommended)](#docker--caddy-recommended)
- [Bare metal with Caddy](#bare-metal-with-caddy)
- [Security & Operations](#security--operations)

---

## Docker + Caddy (recommended)

### Prerequisites

- **Linux VPS** (Debian 12 recommended) with root or sudo access
- **Domain** pointed to your VPS (e.g., `warpgate.example.com`)
- **Ports 80/443** open

### 1. Install Docker & Caddy

```bash
apt update && apt upgrade -y
apt install -y curl git docker.io docker-compose-v2
systemctl enable --now docker

# Install Caddy
apt install -y debian-keyring debian-archive-keyring
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 2. Clone & Configure

```bash
git clone https://github.com/Syed-Arieb/warpgate.git /opt/warpgate
cd /opt/warpgate
cp .env.example .env
```

Edit `.env` with production values:

```ini
PORT=8080
LOG_LEVEL=info

DB_HOST=postgres
DB_PORT=5432
DB_USER=warpgate
DB_PASSWORD=<generate-a-strong-password>
DB_NAME=warpgate
DB_SSLMODE=disable

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

JWT_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h

UPLOAD_DIR=/data/uploads
UPLOAD_URL=/uploads
```

### 3. Start Backend

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api ./api -migrate
```

### 4. Caddyfile

Replace `/etc/caddy/Caddyfile` with:

```caddy
warpgate.example.com {
    # Dashboard static files
    root * /opt/warpgate/dashboard/dist
    try_files {path} /index.html

    # API reverse proxy
    handle_path /api/* {
        reverse_proxy localhost:8080 {
            # SSE support for QR streaming
            flush_interval -1
        }
    }

    # Media uploads
    handle_path /uploads/* {
        reverse_proxy localhost:8080
    }

    # Metrics - private network only
    handle_path /api/metrics {
        @internal {
            remote_ip 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
        }
        handle @internal {
            reverse_proxy localhost:8080
        }
        handle {
            respond 403
        }
    }

    # Log all requests
    log {
        output file /var/log/caddy/warpgate.log
        format json
    }

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

Restart Caddy:

```bash
systemctl restart caddy
```

Caddy automatically provisions and renews TLS from Let's Encrypt - no certbot needed.

### 5. Build Dashboard

```bash
cd /opt/warpgate/dashboard
npm install && npm run build
chown -R caddy:caddy /opt/warpgate/dashboard/dist
```

---

## Bare Metal with Caddy

Same as above but run the Go binary directly instead of Docker.

### 1. Dependencies

```bash
apt update && apt upgrade -y
apt install -y postgresql-16 redis-server git curl caddy
```

### 2. PostgreSQL & Redis

```bash
systemctl start postgresql redis-server
systemctl enable postgresql redis-server
```

Create the database:

```bash
sudo -u postgres psql
```

```sql
CREATE USER warpgate WITH PASSWORD 'your-strong-password';
CREATE DATABASE warpgate OWNER warpgate;
\q
```

### 3. Build & Install

```bash
git clone https://github.com/Syed-Arieb/warpgate.git /opt/warpgate
cd /opt/warpgate

# Build binary
CGO_ENABLED=0 go build -ldflags="-s -w" -o /opt/warpgate/bin/api ./cmd/api

# Build dashboard
cd /opt/warpgate/dashboard && npm install && npm run build
```

Create `/opt/warpgate/.env`:

```ini
PORT=8080
LOG_LEVEL=info
DB_HOST=localhost
DB_PORT=5432
DB_USER=warpgate
DB_PASSWORD=your-strong-password
DB_NAME=warpgate
DB_SSLMODE=disable
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
JWT_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h
UPLOAD_DIR=/opt/warpgate/data/uploads
UPLOAD_URL=/uploads
```

Run migrations:

```bash
cd /opt/warpgate
./bin/api -migrate
```

### 4. Systemd Service

Create `/etc/systemd/system/warpgate.service`:

```ini
[Unit]
Description=Warpgate WhatsApp API Gateway
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=warpgate
Group=warpgate
WorkingDirectory=/opt/warpgate
ExecStart=/opt/warpgate/bin/api
EnvironmentFile=/opt/warpgate/.env
LimitNOFILE=100000
Restart=always
RestartSec=5

# Security
ProtectHome=true
ProtectSystem=full
PrivateTmp=true
NoNewPrivileges=true
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

```bash
useradd -r -s /bin/false -d /opt/warpgate warpgate
chown -R warpgate:warpgate /opt/warpgate
systemctl daemon-reload
systemctl enable --now warpgate
```

### 5. Caddyfile

Same Caddyfile as the Docker section above - configure `/etc/caddy/Caddyfile` and `systemctl restart caddy`.

---

## Security & Operations

### Health checks

```bash
curl https://warpgate.example.com/api/health
curl https://warpgate.example.com/api/ready
curl https://warpgate.example.com/api/metrics
```

### Create admin user

```bash
sudo -u postgres psql -d warpgate -c "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

### Backup (cron)

```bash
0 3 * * * pg_dump -U warpgate warpgate | gzip > /backups/warpgate-$(date +\%Y\%m\%d).sql.gz
```

### Upgrade

```bash
# Docker path
cd /opt/warpgate && git pull && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d && docker compose -f docker-compose.prod.yml exec api ./api -migrate

# Bare metal path
cd /opt/warpgate && git pull && CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/api ./cmd/api && ./bin/api -migrate && systemctl restart warpgate
```

### Port reference

| Port | Service | Bound to | Purpose |
|---|---|---|---|
| 8080 | Warpgate API | `127.0.0.1` | Internal, behind Caddy |
| 5432 | PostgreSQL | `127.0.0.1` | Internal |
| 6379 | Redis | `127.0.0.1` | Internal |
| 80/443 | Caddy (TLS) | `0.0.0.0` | Public |

### Security notes

- Internal services bind to `127.0.0.1` only
- Caddy auto-provisions Let's Encrypt TLS - zero config
- JWT cookies are `HttpOnly` - not accessible from JavaScript
- API keys stored as SHA-256 hashes - plaintext shown once
- Webhook payloads signed with HMAC-SHA256
- Rate limiting per API key via Redis
- CIDR allowlisting per API key
- All requests logged with user_id, IP, latency
