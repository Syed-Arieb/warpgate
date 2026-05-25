# warpgate

> Self-hosted WhatsApp API Gateway - multi-tenant SaaS, built with Go + Fiber + whatsmeow.

---

## What it is

Warpgate lets teams and developers connect to WhatsApp via a clean REST API.
Users sign up, create sessions, manage API keys, and receive events via webhooks - all from a modern dashboard.

No Chromium. No vendor lock-in. One binary.

---

## Stack

| Layer | Tech |
|---|---|
| API | [Go Fiber](https://gofiber.io) |
| WA Protocol | [whatsmeow](https://github.com/tulir/whatsmeow) |
| Auth | JWT + API Keys |
| Database | PostgreSQL (GORM) |
| Cache | Redis |
| Storage | Local / S3-compatible |
| Dashboard | React + Tailwind + shadcn/ui |
| Container | Docker + Docker Compose |

---

## Core Features

- **Multi-tenant** - users own their sessions and API keys
- **Multi-session** - run multiple WhatsApp numbers per account
- **REST API** - send/receive messages, media, groups, reactions
- **Webhooks** - real-time events with HMAC-SHA256 signatures
- **Dashboard** - register, login, manage sessions/keys/webhooks, admin panel
- **Audit logging** - all actions logged with IP and user agent
- **Rate limiting** - per-API-key and per-IP with Redis sliding window
- **IP allowlisting** - CIDR-based access control per API key
- **Plan quotas** - enforce session, API key, webhook, and rate limits per tier
- **Prometheus metrics** - active sessions, messages, engine clients
- **Pluggable adapters** - swap DB, storage, or cache via config

---

## Quick Start

```bash
git clone https://github.com/Syed-Arieb/warpgate.git
cd warpgate
cp .env.example .env
docker compose up -d
# Run migrations
docker compose exec api ./api -migrate
```

| Service | URL |
|---|---|
| API | http://localhost:8080/api |
| Health | http://localhost:8080/api/health |
| Readiness | http://localhost:8080/api/ready |
| Metrics | http://localhost:8080/api/metrics |

---

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for a complete guide covering:

- Docker Compose + Caddy reverse proxy with auto TLS
- Bare metal (systemd + Caddy) for minimal resource usage
- PostgreSQL + Redis setup
- Backup and restore procedures
- Upgrading and monitoring

---

## Development

```bash
# Backend
cp .env.example .env
make dev

# Dashboard
cd dashboard
npm install
npm run dev
```

Requires PostgreSQL and Redis running locally (use `docker compose up -d postgres redis`).

---

## Project Structure

```
warpgate/
├── cmd/api/              # Entry point
├── internal/
│   ├── api/              # Handlers, middleware, router
│   ├── cache/            # Redis client
│   ├── config/           # Viper config
│   ├── db/               # GORM setup
│   ├── engine/           # whatsmeow wrapper (Manager + Client)
│   ├── jobs/             # Webhook dispatcher
│   ├── logger/           # Zerolog
│   ├── models/           # GORM models
│   ├── services/         # Business logic
│   └── storage/          # File adapter
├── dashboard/            # React frontend
├── migrations/           # SQL migration files
└── tests/load/           # k6 load test scripts
```

---

## API Endpoints

| Group | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/refresh` |
| Users | `GET\|PUT /api/users/me`, `GET /api/users/me/audit` |
| API Keys | `CRUD /api/users/me/api-keys/` |
| Sessions | `CRUD /api/sessions`, start/stop/logout, QR streaming, status |
| Messages | `POST /api/messages/text\|media\|reaction\|bulk`, `GET /api/messages/:session_id` |
| Contacts | `GET /api/sessions/:id/contacts` |
| Groups | `CRUD /api/sessions/:id/groups` |
| Webhooks | `CRUD /api/sessions/:id/webhooks`, `GET .../logs` |
| Admin | `GET /api/admin/users\|sessions\|stats`, `DELETE /api/admin/sessions/:id` |
| System | `GET /api/health\|ready\|metrics` |

---

## License

MIT
