# Warpgate - Development Guide

This guide divides the build into sequential phases.
Each phase produces a working, testable slice of the system.
Don't move to the next phase until the current one is stable.

---

## Phase 0 - Repo & Scaffold

**Goal:** Everyone can clone and run a skeleton in under 5 minutes.

- Initialize Go module (`go mod init`)
- Set up Fiber app with health check endpoint (`GET /api/health`)
- Project folder structure (see below)
- `.env.example` with all required keys documented
- `docker-compose.yml` - PostgreSQL + Redis + API
- `Makefile` - `make dev`, `make build`, `make migrate`
- Structured logger (zerolog or slog)
- Config loader (viper - reads env + yaml)
- GitHub Actions CI: lint + test on push

```
warpgate/
├── cmd/api/         # main.go entrypoint
├── internal/
│   ├── config/      # viper config structs
│   ├── db/          # GORM setup, migrations
│   ├── cache/       # Redis client
│   ├── storage/     # Local / S3 adapter interface
│   ├── engine/      # whatsmeow wrapper (added in Phase 3)
│   ├── api/         # Fiber routes, handlers, middleware
│   │   ├── auth/
│   │   ├── user/
│   │   ├── session/
│   │   ├── message/
│   │   ├── webhook/
│   │   └── middleware/
│   ├── models/      # GORM models
│   ├── services/    # Business logic
│   └── jobs/        # Background workers
├── dashboard/       # React frontend
├── migrations/      # SQL migration files
├── .env.example
├── docker-compose.yml
└── Makefile
```

---

## Phase 1 - Auth & User System

**Goal:** Users can register, log in, and manage their account. This is the SaaS foundation.

### Backend
- **Models:** `User`, `Plan` (free/pro/enterprise), `APIKey`
- **Endpoints:**
  - `POST /api/auth/register`
  - `POST /api/auth/login` → returns JWT
  - `POST /api/auth/refresh`
  - `GET  /api/users/me`
  - `PUT  /api/users/me`
  - `POST /api/users/me/api-keys` - generate named API key
  - `GET  /api/users/me/api-keys`
  - `DELETE /api/users/me/api-keys/:id`
- **Auth middleware:** JWT for dashboard routes, API Key header (`X-API-Key`) for API routes
- **Security:** bcrypt passwords, API keys stored as SHA-256 hashes, rate-limit login endpoint
- **Email verification** (optional at this phase, flag it)

### Dashboard (React)
- Register / Login pages
- Account settings page
- API Keys management (create, list, revoke, copy)
- JWT stored in `httpOnly` cookie or memory (not localStorage)

---

## Phase 2 - Session Management (No WA yet)

**Goal:** Users can create and manage session records. No real WhatsApp yet - just the data layer.

### Backend
- **Model:** `Session` - belongs to User, has name, status (`disconnected`/`connecting`/`connected`/`banned`), phone number, proxy config
- **Endpoints:**
  - `POST   /api/sessions`
  - `GET    /api/sessions`
  - `GET    /api/sessions/:id`
  - `DELETE /api/sessions/:id`
  - `PUT    /api/sessions/:id` (rename, proxy settings)
- **Tenant isolation:** every query scoped to `user_id` from JWT/API key
- **Plan limits:** enforce max sessions per plan tier in service layer

### Dashboard
- Sessions list page with status badges
- Create/delete session modal
- Session detail page (placeholder for QR code, will be wired in Phase 3)

---

## Phase 3 - WhatsApp Engine

**Goal:** Sessions come alive. Users can scan QR codes and connect real WhatsApp numbers.

### Engine Layer (`internal/engine/`)
- **`Manager`** - `sync.Map` of `sessionID → Client`, handles lifecycle
- **`Client`** - wraps a `whatsmeow.Client` per session:
  - QR code generation and streaming (SSE or polling endpoint)
  - Connection state machine → writes status back to DB
  - Event handler → publishes events to an internal channel
- Use `whatsmeow/store/sqlstore` for WA key/session persistence (separate from app DB or same PG instance, your call)

### New Endpoints
- `POST /api/sessions/:id/start` - allocate engine slot, begin connect
- `POST /api/sessions/:id/stop`
- `POST /api/sessions/:id/logout`
- `GET  /api/sessions/:id/qr` - returns QR as base64 PNG or SSE stream
- `GET  /api/sessions/:id/status`

### On Server Restart
- On boot, query all `connected` sessions from DB and re-initialize their engine clients automatically.

---

## Phase 4 - Messaging API

**Goal:** Fully functional REST API for WhatsApp operations.

Build each feature group as a sub-service under `internal/services/message/`:

| Endpoint group | Coverage |
|---|---|
| `POST /messages/text` | Plain text |
| `POST /messages/media` | Image, video, audio, document (upload or URL) |
| `POST /messages/reaction` | React to message by ID |
| `POST /messages/bulk` | Send to multiple recipients (rate-limited internally) |
| `GET  /messages` | Paginated history from DB |
| `GET  /contacts` | Fetch contact info, profile picture |
| `GET/POST/DELETE /groups` | Create group, add/remove members, send message |
| `GET /groups/:id` | Group metadata |

**Media handling:**
- Incoming media from WhatsApp → download, encrypt check, store via storage adapter, expose URL
- Outgoing media → accept upload or URL → pass to whatsmeow

**Message status tracking:**
- `delivered`, `read` receipts come in as whatsmeow events → update DB → fire webhook

---

## Phase 5 - Webhooks & Event Pipeline

**Goal:** Users receive real-time WhatsApp events on their own servers.

- **Model:** `Webhook` - URL, secret, list of subscribed events, active flag
- **Endpoints:** CRUD under `/api/sessions/:id/webhooks`
- **Event types to support:**
  - `message.received`, `message.sent`, `message.delivered`, `message.read`
  - `session.connected`, `session.disconnected`, `session.qr`
  - `group.joined`, `group.left`
- **Dispatcher** (`internal/jobs/webhook_dispatcher.go`):
  - Consumes from internal event channel
  - Signs payload with HMAC-SHA256 using the webhook secret
  - Sends HTTP POST with retry (exponential backoff, max 5 attempts)
  - Logs delivery attempts to DB (`WebhookLog` model)
- **Endpoint for logs:** `GET /api/sessions/:id/webhooks/:wid/logs`

---

## Phase 6 - Dashboard (Full SaaS UI)

**Goal:** A polished, self-contained frontend that a non-technical user can operate.

### Pages
| Page | Key content |
|---|---|
| Auth | Register, Login, Forgot password |
| Dashboard home | Usage stats, session health overview |
| Sessions | List, create, delete, QR scan modal, live status |
| Session detail | Messages log, webhook config, proxy settings |
| API Keys | Generate, label, revoke, copy with one click |
| Webhooks | Create/edit webhooks, delivery log table |
| Account | Profile, change password, plan/quota info |
| Docs | Embedded Swagger UI |

### Tech notes
- Vite + React + React Query + Tailwind + shadcn/ui
- All API calls go through a typed client (no raw fetch scattered around)
- SSE connection for QR code streaming on the session detail page
- Dark mode supported from day one

---

## Phase 7 - Plans, Quotas & Audit

**Goal:** SaaS-grade controls - limit abuse, track usage, build billing hooks.

- **Quota enforcement** - max sessions, API calls/day, webhook deliveries per plan
- **Rate limiting** - Fiber middleware backed by Redis sliding window, per API key
- **CIDR allowlist** - per API key, IP-based access control
- **Audit log** - model + table recording who did what (action, resource, IP, timestamp)
  - Exposed as `GET /api/users/me/audit` (paginated)
- **Billing hooks** (optional) - emit events for Stripe/LemonSqueezy on plan change, overages
- **Admin panel** (internal) - simple protected route listing all users, sessions, usage; no public UI needed yet

---

## Phase 8 - Production Hardening

**Goal:** Ship with confidence.

- **Health & readiness probes** - `GET /api/health` (liveness), `GET /api/ready` (checks DB + Redis)
- **Metrics** - Prometheus endpoint (`/metrics`) with: active sessions, messages sent/hr, webhook delivery rate, error rate
- **Graceful shutdown** - disconnect all WA sessions cleanly, flush queues
- **Distributed mode** (optional) - if running multiple API instances, coordinate session ownership via Redis lock so only one node owns a given WA session
- **Structured logging** - every request logs: user_id, session_id, latency, status
- **Docker image** - multi-stage build, final image <50MB
- **Helm chart or Compose production profile** - with TLS via Traefik/Caddy
- **Load test** - k6 script covering: login, create session, send 1000 messages across 10 sessions

---

## General Rules

- Every phase ends with passing tests and a working Docker environment.
- DB changes always go through migration files - never `AutoMigrate` in production.
- All handlers are thin - business logic lives in services, never in route handlers.
- No direct whatsmeow calls outside `internal/engine/` - everything goes through the Manager interface.
- Secrets never logged. API keys only shown once (at creation time).
