# LeadGuard Scanner

Check if your WhatsApp & call links are broken.

One-click website link scanner built from the PRD/TDD in
`deepseek_markdown_20260818_0f4ced.md`. Crawls any public URL, extracts contact
links (WhatsApp, phone, review, social, email), validates them, and returns a
0–100 health score.

## Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Framer Motion, React Icons
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL 15 + Prisma ORM
- **Queue/Cache:** Redis 7 + BullMQ
- **Auth:** JWT + API keys, bcrypt password hashing
- **Logging:** Winston

## Quick start

### Docker (full stack — recommended)

```bash
cp .env.example .env   # optional: set JWT_SECRET, ADMIN_EMAIL/PASSWORD
docker compose up -d --build
```

This starts Postgres (`leadguard-db`, host port 5433), Redis (`leadguard-redis`),
runs migrations + seed, and brings up the app (`http://localhost:3000`) and the
scan worker. Paste a website URL and press **Scan**.

Stop everything with:

```bash
docker compose down
```

> Uses `node:22-bookworm-slim` (Debian) so the Prisma engine loads correctly.

### Local (npm) — using the same dockerized DB/Redis

### 1. Install dependencies

```bash
npm install
```

### 2. Start Postgres + Redis

> `docker compose up -d` now launches the **entire stack** (app + worker too).
> For local dev you only need the infra, so run just the data services:

```bash
docker compose up -d db redis
```

### 3. Configure environment

```bash
cp .env.example .env
# edit JWT_SECRET (and any other values)
```

### 4. Migrate & seed

```bash
npm run prisma:generate
npm run prisma:migrate   # creates tables
npm run prisma:seed      # creates an ADMIN user from ADMIN_EMAIL/ADMIN_PASSWORD
```

### 5. Run the worker (separate process)

```bash
npm run worker
```

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000, paste a website URL, and press **Scan**.

## Architecture

```
Browser ──► Next.js API Routes
                │
                ├── PostgreSQL (Prisma): users, scans, webhooks, scan logs
                └── Redis (BullMQ "scan-queue")
                        │
                        ▼
                Worker (separate process)
                        │  performs scan, updates DB, delivers webhooks
```

- **Anonymous scans:** the frontend auto-creates a guest user on first scan, so
  visitors can use the tool with zero signup. Registered users can use JWT or
  `x-api-key` auth.

## API

| Method | Path                  | Auth | Description                       |
|--------|-----------------------|------|-----------------------------------|
| POST   | `/api/auth/register`  | No   | Register a user                   |
| POST   | `/api/auth/login`     | No   | Login → JWT                       |
| POST   | `/api/auth/guest`     | No   | Create a guest session (IP rate-limited) |
| GET    | `/api/auth/me`        | Yes  | Current user profile              |
| POST   | `/api/scan`           | Yes  | Start scan → `scanId`             |
| GET    | `/api/scan/[id]`      | Yes  | Poll scan status / results        |
| GET    | `/api/scan`           | Yes  | List your recent scans            |
| POST   | `/api/webhooks`       | Yes  | Register a webhook                |
| GET    | `/api/webhooks`       | Yes  | List webhooks                     |
| DELETE | `/api/webhooks/[id]`  | Yes  | Delete a webhook                  |
| GET    | `/api/monitor`        | Yes  | List monitored sites              |
| POST   | `/api/monitor`        | Yes  | Add/update a monitored site       |
| DELETE | `/api/monitor/[id]`   | Yes  | Stop monitoring a site            |
| GET    | `/api/admin/stats`    | ADMIN| Global usage statistics          |

Authenticate with `Authorization: Bearer <jwt>` or `x-api-key: <apiKey>`.
Rate limit: 5 requests/minute per user/IP (429 with `Retry-After`).

### Example: start a scan

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "x-api-key: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"url":"example.com"}'
# → { "success": true, "scanId": "...", "status": "PENDING" }
```

Then poll `GET /api/scan/[scanId]` every 2s until `status === "COMPLETED"`.

## Webhooks

Webhooks receive a POST on scan completion/failure with HMAC-SHA256 signature in
`X-LeadGuard-Signature` when a secret is configured. Retries up to 3 times with
exponential backoff.

## Monitoring (24/7)

Add sites from the dashboard (`/dashboard`) or `POST /api/monitor`. The worker
runs a repeat BullMQ sweeper (`MONITOR_SWEEP_CRON`, default every 15 min) that
re-scans due sites (DAILY/WEEKLY). When a health score drops, broken links
increase, or the site becomes unreachable, an alert is delivered via:

- **Email** — configure `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`
  and the per-site `alertEmail`.
- **Alert webhook** — set the per-site `alertWebhook` to any HTTPS endpoint
  (WhatsApp BSP, Slack, CallMeBot, n8n…). Payload includes an
  `X-LeadGuard-Signature` HMAC when `JWT_SECRET`-independent secrets are added.

## Security notes

- SSRF protection: localhost/private ranges blocked for scan targets,
  redirect hops are re-validated, responses capped at 5 MB.
- Webhook/alert URLs are validated against private hosts at registration time.

## Scanner rules

- WhatsApp: `wa.me/*` and `api.whatsapp.com/send?phone=*` — 10–15 digits valid.
- Phone: `tel:*` — Indian numbers (`/^[6-9]\d{9}$/`).
- Email: `mailto:*` — standard email format.
- Review/social links are detected but not scored.
- Score starts at 100: **−25** per broken WhatsApp, **−20** per invalid phone,
  **−15** per invalid email (min 0).
- SSRF protection: localhost and private/loopback IP ranges are blocked.

## Tests

```bash
npx jest                 # scanner core unit tests
```

## Deployment

- Next.js app: Vercel (or any Node host).
- Worker: Railway/Heroku/EC2 process (`npm run worker:start`).
- PostgreSQL: Neon/Railway/Render.
- Redis: Upstash/Railway.

> **Note:** The spec pins Next.js 14. `npm audit` flags several Next.js 14.x
> advisories (Server Actions / self-hosted scenarios). Before going to
> production, upgrade to the latest Next.js 15/16 and re-run
> `npm audit fix` to clear them.

## Scripts

| Command                 | Description                     |
|-------------------------|---------------------------------|
| `npm run dev`           | Start dev server                |
| `npm run worker`        | Start worker (watch mode)       |
| `npm run build`         | Production build                |
| `npm run typecheck`     | TypeScript check                |
| `npm run prisma:migrate`| Run DB migrations               |
| `npm run prisma:seed`   | Create admin user               |
| `npm run prisma:studio` | Open Prisma Studio              |