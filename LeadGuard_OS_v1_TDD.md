# LeadGuard OS / RevenueShield v1 — Technical Design Document (TDD)

**Version:** 1.0 Final Build Specification  
**Date:** 22 August 2026  
**Status:** Build-ready

---

# 1. Technical Objectives

Build a secure, modular, low-cost diagnostic SaaS that can:

- accept a public website URL,
- safely fetch and parse it,
- execute multiple diagnostic rule packs,
- persist scan results,
- expose a public report,
- support scheduled monitoring later,
- support monetization without redesigning the core.

The system must remain portable across Vercel/Cloudflare-style frontend hosting and managed PostgreSQL providers.

---

# 2. Recommended Stack

## Application

- Next.js App Router
- React
- TypeScript preferred for production implementation
- Tailwind CSS or equivalent design-token-based CSS

## Backend

- Next.js route handlers for request/response APIs
- Node.js runtime for scanning workloads

## Database

- PostgreSQL
- Prisma ORM or SQL migration layer

## Scheduling

- Provider cron or external cron trigger
- No browser-dependent scheduler

## Queue

For MVP, avoid a mandatory external Redis/BullMQ dependency if scan volume permits synchronous or short-lived server execution.

When scale requires it, introduce:

- Redis,
- BullMQ,
- dedicated worker.

Architecture must keep the scanner engine independent of the queue implementation.

## Validation / Parsing

Recommended implementation libraries:

- WHATWG URL
- HTML parser such as Cheerio
- Zod for API validation

## Security

- bcrypt/Argon2 for passwords if authentication is enabled
- signed tokens
- strong secrets via environment variables
- rate limiting
- SSRF guard

## PDF

- server-side HTML-to-PDF or jsPDF/react-pdf depending on final deployment compatibility

---

# 3. High-Level Architecture

```text
                       ┌───────────────────────┐
                       │       Browser         │
                       └───────────┬───────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │   Next.js Web App     │
                       │ Home / Report / Auth  │
                       └───────────┬───────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │ Scan API / Auth API   │
                       └───────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌────────────┐  ┌─────────────┐
              │ SSRF     │  │ Fetcher    │  │ Rate Limit  │
              │ Guard    │  │ + Parser   │  │ / Abuse     │
              └────┬─────┘  └─────┬──────┘  └─────────────┘
                   │              │
                   └──────┬───────┘
                          ▼
                ┌─────────────────────┐
                │ Unified Scan Engine │
                ├─────────────────────┤
                │ Lead Guardian       │
                │ AdShield             │
                │ SEO Shield           │
                │ Cyber Shield         │
                └──────────┬──────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
             ┌────────────┐  ┌─────────────┐
             │ Scoring    │  │ Evidence    │
             │ Engine     │  │ Builder     │
             └─────┬──────┘  └──────┬──────┘
                   └──────────┬─────┘
                              ▼
                    ┌──────────────────┐
                    │ PostgreSQL       │
                    │ scans/findings   │
                    │ users/monitoring │
                    └─────────┬────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             Public Report         Monitoring
             /report/[id]          /cron/monitor
```

---

# 4. Project Structure

```text
leadguard-os/
├── app/
│   ├── api/
│   │   ├── scan/
│   │   │   └── route.ts
│   │   ├── scan/[id]/
│   │   │   └── route.ts
│   │   ├── report/[id]/pdf/
│   │   │   └── route.ts
│   │   ├── watchdog/subscribe/
│   │   │   └── route.ts
│   │   ├── monitor/
│   │   │   └── route.ts
│   │   ├── auth/
│   │   │   ├── register/route.ts
│   │   │   └── login/route.ts
│   │   └── admin/
│   ├── report/[id]/
│   │   └── page.tsx
│   ├── pricing/
│   ├── login/
│   ├── dashboard/
│   ├── admin/
│   ├── privacy/
│   ├── terms/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── scanner/
│   ├── report/
│   ├── dashboard/
│   ├── pricing/
│   └── shared/
├── lib/
│   ├── scanner/
│   │   ├── index.ts
│   │   ├── fetcher.ts
│   │   ├── normalizer.ts
│   │   ├── ssrf.ts
│   │   ├── parser.ts
│   │   ├── evidence.ts
│   │   ├── scorer.ts
│   │   └── types.ts
│   ├── rules/
│   │   ├── leadGuardian.ts
│   │   ├── adShield.ts
│   │   ├── seoShield.ts
│   │   └── cyberShield.ts
│   ├── auth.ts
│   ├── rateLimit.ts
│   ├── pricing.ts
│   ├── report.ts
│   ├── db.ts
│   └── logger.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── public/
└── package.json
```

---

# 5. Core Domain Model

## Scan

```prisma
model Scan {
  id             String      @id @default(cuid())
  publicToken    String      @unique
  requestedUrl   String
  normalizedUrl  String
  finalUrl       String?
  domain         String
  status         ScanStatus  @default(PENDING)
  httpStatus     Int?
  title          String?
  overallScore   Int?
  leadScore      Int?
  adScore        Int?
  seoScore       Int?
  cyberScore     Int?
  summary        Json?
  performance    Json?
  createdAt      DateTime    @default(now())
  startedAt      DateTime?
  completedAt    DateTime?
  errorCode      String?
  errorMessage   String?
  findings       Finding[]
  report         Report?
  monitoring    Monitoring[]

  @@index([domain])
  @@index([createdAt])
  @@index([status])
}
```

## Finding

```prisma
model Finding {
  id            String      @id @default(cuid())
  scanId        String
  scan          Scan        @relation(fields: [scanId], references: [id], onDelete: Cascade)
  pillar        Pillar
  ruleId        String
  severity      Severity
  status        FindingStatus
  title         String
  summary       String
  technical     String?
  evidence      Json?
  recommendation String?
  confidence    Float?
  penalty       Int         @default(0)
  createdAt     DateTime    @default(now())

  @@index([scanId])
  @@index([pillar, severity])
}
```

## User

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String?
  role         Role      @default(USER)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  monitoring   Monitoring[]
}
```

## Report

```prisma
model Report {
  id          String   @id @default(cuid())
  scanId      String   @unique
  scan        Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  publicToken String   @unique
  brandName   String?
  generatedAt DateTime @default(now())
  expiresAt   DateTime?
}
```

## Webhook

```prisma
model Webhook {
  id            String   @id @default(cuid())
  userId        String
  url           String
  secretHash    String?
  events        Json
  active        Boolean  @default(true)
  lastTriggered DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId, active])
}
```

## Monitoring

```prisma
model Monitoring {
  id              String        @id @default(cuid())
  userId          String?
  user            User?         @relation(fields: [userId], references: [id])
  scanId          String
  scan            Scan          @relation(fields: [scanId], references: [id])
  targetUrl       String
  frequency       MonitorFrequency
  contactType     MonitorContactType
  contactValue    String
  active          Boolean       @default(true)
  lastRunAt       DateTime?
  nextRunAt       DateTime?
  lastStatus      String?
  lastFingerprint String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([active, nextRunAt])
}
```

## Recommended Enums

```prisma
enum ScanStatus { PENDING PROCESSING COMPLETED FAILED BLOCKED TIMEOUT }
enum Pillar { LEAD AD SEO CYBER }
enum Severity { CRITICAL HIGH MEDIUM LOW INFO }
enum FindingStatus { PASS FAIL WARN INFO }
enum Role { USER ADMIN }
enum MonitorFrequency { DAILY WEEKLY }
enum MonitorContactType { EMAIL TELEGRAM }
```

---

# 6. Scanner Pipeline

## Step 1 — Normalize

- trim whitespace,
- add scheme if missing,
- normalize host casing,
- reject unsupported schemes.

## Step 2 — SSRF Guard

The SSRF module must:

- resolve DNS,
- reject loopback,
- reject RFC1918/private IPs,
- reject link-local,
- reject multicast/reserved ranges,
- reject localhost-like hostnames,
- re-check redirects after every hop,
- limit redirect count.

Do not rely only on string checks. Resolve and validate the destination IP.

## Step 3 — Fetch

Defaults:

- timeout: 10 seconds,
- maximum redirects: 5,
- maximum HTML size: configurable, e.g. 2–5 MB,
- follow standard HTTP redirects safely,
- require HTML-compatible content type for page scanner.

## Step 4 — Parse

Extract:

- title,
- anchors,
- scripts,
- meta tags,
- canonical,
- robots metadata,
- visible text,
- iframe tags,
- external resources,
- inline scripts.

## Step 5 — Rule Execution

Run the four rule packs independently.

Each rule returns normalized `Finding[]` records.

## Step 6 — Score

Aggregate penalties using configured weights and caps.

## Step 7 — Persist

Write:

1. Scan
2. Findings
3. Summary

Transaction boundaries should prevent partial scan records from being presented as complete.

---

# 7. Lead Guardian Implementation

## WhatsApp normalizer

Pseudo-code:

```ts
function normalizeWhatsApp(raw: string) {
  // parse wa.me path / query phone
  // keep digits only
  // detect common double-country-code errors
  // classify country context when possible
  // return structured validation result
}
```

India rule:

```regex
^[6-9]\d{9}$
```

Do not treat every malformed non-Indian international number as an Indian-number failure. The rule engine should first determine the applicable country format where possible.

## Phone

```ts
function validateIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits.slice(-10));
}
```

The raw original URI must be retained in evidence.

## Email

Use a conservative syntax validator; do not claim mailbox existence without an actual mail-domain verification flow.

---

# 8. AdShield Implementation

Inspect static HTML for:

### Meta

Known marker examples:

- `fbq(`,
- Meta pixel script references,
- `connect.facebook.net`.

### Google

Known markers:

- `googletagmanager.com`,
- `gtag(`,
- `GoogleAnalyticsObject`,
- GA4 measurement ID style patterns.

### Result model

```ts
type TrackingSignal = {
  platform: 'META' | 'GOOGLE_TAG' | 'GA4' | 'GTM';
  detected: boolean;
  evidence: string[];
  confidence: number;
};
```

Static detection must be clearly different from event-delivery verification.

---

# 9. SEO Shield Implementation

Rules:

- `SEO-NOINDEX-001`
- `SEO-ROBOTS-001`
- `SEO-CANONICAL-001`
- `SEO-SITEMAP-001`
- `SEO-HTTPS-001`
- `SEO-MIXED-PROTOCOL-001` where observable

Example `noindex` detection:

```ts
const robotsMeta = document.querySelector('meta[name="robots"]')
const googlebotMeta = document.querySelector('meta[name="googlebot"]')
```

Finding must include source:

```json
{
  "source": "meta[name=robots]",
  "value": "noindex,follow"
}
```

---

# 10. Cyber Shield Implementation

## Rule categories

- `CYBER-SPAM-001` suspicious gambling/casino/satta content
- `CYBER-OBF-001` suspicious script obfuscation
- `CYBER-BASE64-001` Base64 heuristic
- `CYBER-IFRAME-001` suspicious iframe
- `CYBER-REDIRECT-001` redirect indicator
- `CYBER-MOBILE-001` mobile redirect heuristic
- `CYBER-EXTSCRIPT-001` suspicious external script heuristic

## Important engineering rule

Do not build a “malware detector” claim from regex alone.

Each result must include:

- rule ID,
- exact evidence category,
- confidence,
- reason,
- recommended manual verification.

---

# 11. Scoring Engine

```ts
type ScoreConfig = {
  leadWeight: number;
  adWeight: number;
  seoWeight: number;
  cyberWeight: number;
  penaltyByRule: Record<string, number>;
};
```

Recommended severity multipliers:

```text
CRITICAL  = 1.00
HIGH      = 0.75
MEDIUM    = 0.45
LOW       = 0.20
INFO      = 0.00
```

Each pillar uses a capped penalty range.

Overall score:

```text
overall =
  leadScore  * 0.35 +
  adScore    * 0.20 +
  seoScore   * 0.20 +
  cyberScore * 0.25
```

Round only at the final display layer.

---

# 12. Revenue / Loss Calculator

Use a scenario calculator rather than fake certainty.

Inputs:

- monthly website sessions or monthly leads (optional user input),
- contact conversion rate assumption,
- average customer value,
- affected channel percentage.

Example:

```text
estimated monthly exposure
= sessions × assumed contact rate × affected-channel rate × average customer value
```

If user data is missing, display:

> “Impact estimate requires your traffic/value assumptions.”

Do not hard-code a universal ₹7,500 loss per broken channel.

---

# 13. API Design

## POST `/api/scan`

Request:

```json
{
  "url": "https://example.com"
}
```

Response:

```json
{
  "success": true,
  "scanId": "...",
  "publicToken": "...",
  "status": "PROCESSING"
}
```

If the deployment can safely finish the scan within request limits, the same endpoint may complete synchronously. The public contract remains scan-ID based so asynchronous workers can be introduced without frontend redesign.

## GET `/api/scan/[id]`

Returns status and completed summary.

## Webhook APIs

`POST /api/webhooks` — create subscription.

`GET /api/webhooks` — list current user subscriptions.

`DELETE /api/webhooks/[id]` — disable/delete subscription.

Events:

- `SCAN_COMPLETED`
- `SCAN_FAILED`

Delivery:

- POST JSON payload,
- optional `X-LeadGuard-Signature` HMAC-SHA256 header,
- maximum 3 retries with exponential backoff,
- store delivery result.

## GET `/api/scan/[id]/export`

Returns the completed scan as structured JSON for authenticated/publicly authorized use.

## GET `/report/[id]`

Public HTML report.

## GET/POST `/api/report/[id]/pdf`

Generates/downloads PDF according to access policy.

## POST `/api/watchdog/subscribe`

Request:

```json
{
  "scanId": "...",
  "contactType": "EMAIL",
  "contactValue": "user@example.com"
}
```

## POST `/api/monitor/run`

Protected cron endpoint.

Header:

`Authorization: Bearer <CRON_SECRET>`

## POST `/api/auth/register`

Optional account creation.

## POST `/api/auth/login`

Optional account login.

---

# 14. API Error Contract

All APIs should use a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "Please enter a valid public website URL.",
    "requestId": "..."
  }
}
```

Never return stack traces to the client.

---

# 15. Client History and State

- Keep the latest 20 public scan summaries in browser localStorage.
- Never place passwords, private tokens or webhook secrets in localStorage.
- Authenticated history is sourced from the database.

# 16. Rate Limiting

Recommended starting limits:

- public scan: 5 requests / minute / IP,
- repeated same-domain scan cooldown,
- authenticated user: configurable higher quota,
- report endpoint: separate read limit,
- auth endpoints: strict brute-force protection.

Rate limiter implementation may start with an in-memory/provider KV mechanism and later move to Redis.

---

# 17. Monitoring Architecture

The monitoring scheduler selects active records where:

```text
nextRunAt <= now()
```

For each target:

1. create scan,
2. execute diagnostics,
3. compute fingerprint,
4. compare previous fingerprint,
5. identify newly introduced critical/high findings,
6. deliver notification,
7. update monitoring record,
8. schedule next run.

Notifications must be deduplicated so one persistent issue does not spam the owner.

---

# 18. Fingerprinting

Create a stable fingerprint from normalized findings:

```text
hash(
  ruleId + severity + affectedUrl + normalizedEvidenceKey
)
```

Sort before hashing so ordering changes do not create false “changed” events.

---

# 19. Authentication

For optional account system:

- password hash using bcrypt/Argon2,
- secure, httpOnly cookies preferred for web sessions,
- short-lived access tokens where API tokens are required,
- CSRF protection for cookie-mutating actions,
- email uniqueness,
- account lockout/rate-limit policy.

API keys should be hashed at rest when possible.

For programmatic clients, support `Authorization: Bearer <token>` or `x-api-key: <api-key>` according to deployment configuration. API keys must be scoped and revocable.

---

# 20. SSRF Threat Model

Attackers may submit:

- `http://127.0.0.1`
- `http://localhost`
- private cloud metadata endpoints,
- internal DNS names,
- IPv6 loopback,
- redirects into private networks.

Mitigation must happen at both:

1. initial URL validation,
2. every resolved redirect target.

Never fetch user-supplied arbitrary URL without SSRF defenses.

---

# 21. Data Retention

Recommended default:

- raw scan metadata: retained while report is active,
- raw HTML: transient, not stored unless explicitly required,
- findings: retained for user/report history,
- monitoring history: configurable retention,
- logs: limited production retention.

Provide deletion capability for user-controlled account data where applicable.

---

# 22. Logging

Structured logs should contain:

- request ID,
- scan ID,
- event,
- duration,
- severity,
- error code.

Never log:

- passwords,
- authentication tokens,
- webhook secrets,
- unnecessary personal data.

---

# 23. Observability

Monitor:

- scan success rate,
- timeout rate,
- average/p95 scan duration,
- SSRF blocked attempts,
- rate-limit events,
- database errors,
- cron failures,
- notification failures.

---

# 24. Deployment

## Zero/Low-Cost MVP

- frontend/API on a provider with a free tier where compatible,
- PostgreSQL on a free managed tier where appropriate,
- provider/external cron for monitoring.

Exact provider selection is deployment-time configuration and must be verified against current quotas.

## Scale Mode

```text
CDN / Edge
   ↓
Next.js
   ↓
API
   ↓
Redis Queue
   ↓
Worker Pool
   ↓
PostgreSQL
```

---

# 25. Environment Variables

```text
DATABASE_URL=
APP_BASE_URL=
SESSION_SECRET=
CRON_SECRET=
RATE_LIMIT_PROVIDER_URL=
RATE_LIMIT_PROVIDER_TOKEN=
EMAIL_FROM=
TELEGRAM_BOT_TOKEN=
META_APP_NAME=
GOOGLE_TAG_PATTERNS_VERSION=
SCANNER_TIMEOUT_MS=10000
SCANNER_MAX_BYTES=5242880
SCANNER_MAX_REDIRECTS=5
```

Secrets must not be committed to Git.

---

# 26. Test Architecture

## Unit

- URL normalizer
- SSRF guard
- WhatsApp validator
- phone validator
- email validator
- scoring engine
- finding fingerprinting
- each rule pack

## Integration

- scan endpoint,
- persistence,
- public report,
- watchdog subscription,
- cron monitoring.

## E2E

- user opens homepage,
- scans fixture,
- sees score,
- opens public report,
- downloads report,
- activates monitoring.

## Security

- SSRF attempts,
- redirect-to-private-IP,
- oversized response,
- rate-limit bypass attempts,
- XSS payload in website title/finding evidence,
- malformed URL payloads.

---

# 27. Fixture Design

Keep deterministic fixture websites inside `tests/fixtures/`.

Required fixtures correspond to PRD test matrix.

Fixture pages must intentionally contain:

- valid links,
- broken links,
- noindex,
- tracking markers,
- suspicious snippets,
- redirect indicators.

---

# 28. Security Headers for LeadGuard

Recommended:

- Content-Security-Policy,
- X-Content-Type-Options,
- Referrer-Policy,
- Permissions-Policy,
- Strict-Transport-Security in production,
- frame-ancestors / X-Frame-Options where appropriate.

Public report evidence must be escaped and never inserted as raw executable HTML.

---

# 29. Caching

Cache safe read-heavy operations such as:

- report pages,
- static marketing content.

Avoid caching scan responses without domain-level correctness controls.

Optional scan-result cache:

```text
normalized URL + scan rule version
```

TTL should be configurable.

---

# 30. Versioning the Rule Engine

Every scan must record:

- scanner version,
- rule-pack version,
- scoring version.

This prevents historical reports from changing silently after rule updates.

Example:

```json
{
  "scannerVersion": "1.0.0",
  "ruleVersion": "1.0.0",
  "scoreVersion": "1.0.0"
}
```

---

# 31. Report Security

Public reports must use random/unguessable tokens.

Do not expose sequential database IDs as the only access secret.

Report should have an expiration policy for sensitive/private customer reports if required by commercial plan.

---

# 32. Implementation Rules

1. Rule engines return data, not UI.
2. UI never implements scoring logic.
3. Scanner never directly decides pricing.
4. Pricing is config-driven.
5. Evidence is sanitized before persistence/display.
6. All user-facing technical assertions map to rule IDs.
7. Every external fetch passes through SSRF validation.
8. Every monitor run is idempotent.
9. Public endpoints have abuse controls.
10. Database migrations are version-controlled.

---

# 33. Build Order

### Phase 1

- project bootstrap,
- database,
- URL/SSRF/fetcher,
- scanner domain model.

### Phase 2

- Lead Guardian,
- AdShield,
- SEO Shield,
- Cyber Shield.

### Phase 3

- scoring,
- report persistence,
- public report.

### Phase 4

- production UI,
- report export,
- watchdog capture.

### Phase 5

- account system,
- monitoring scheduler,
- notifications.

### Phase 6

- payment,
- agency,
- white-label.

---

# 34. Definition of Done

Engineering is complete only when:

- all PRD FRs have implementation links,
- rule tests pass,
- scanner security tests pass,
- report rendering passes desktop/mobile checks,
- no critical client-side secret exposure exists,
- production environment variables are documented,
- migration and rollback instructions exist,
- logging and error handling exist,
- monitoring path can run independently of a browser session.

---

# 35. Future Scaling Path

The scanner core must be worker-ready even if v1 begins serverless.

```text
Serverless Scanner
       ↓
Queue abstraction
       ↓
Redis/BullMQ Worker
       ↓
Concurrent scanning
```

Do not couple business logic to a specific queue vendor.
