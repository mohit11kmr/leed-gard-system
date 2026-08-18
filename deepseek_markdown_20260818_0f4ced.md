markdown

# LeadGuard Scanner – PRD (Product Requirements Document)

## 1. Project Overview
**Product Name:** LeadGuard Scanner  
**Tagline:** *Check if your WhatsApp & call links are broken*  
**Type:** Web Application (SaaS)  
**Target Audience:** Small business owners, marketers, freelancers, website owners who rely on WhatsApp, phone, and review links for lead generation.

**Problem Statement:**  
Businesses lose potential customers every day because their WhatsApp buttons, phone numbers, or review links are broken, outdated, or incorrectly formatted on their websites. There is no easy, free tool to quickly audit these links and get a health score.

**Solution:**  
A one-click web scanner that crawls any given URL, extracts all contact-related links (WhatsApp, phone, review, social, email), validates them, and provides a clear health score along with a detailed report.

---

## 2. Goals & Objectives
- **Primary Goal:** Provide a free, fast, and accurate website link scanner.
- **Secondary Goals:**
  - Generate leads for a future paid monitoring service (auto‑alerts).
  - Build a brand as a trusted tool for digital presence auditing.
  - Collect anonymous usage data to improve the algorithm.

---

## 3. User Personas
1. **Small Business Owner (Ravi)**  
   - Has a website but no technical knowledge.  
   - Needs to ensure all contact links work.  
   - Willing to pay ₹99/month for automatic monitoring.

2. **Digital Marketer (Priya)**  
   - Manages multiple client websites.  
   - Needs a quick audit tool for client reporting.  
   - Wants to export results as PDF/JSON.

3. **Freelance Developer (Amit)**  
   - Builds websites for clients.  
   - Uses the tool as a quality‑check before delivery.

---

## 4. User Stories
| ID | As a … | I want to … | So that … |
|----|--------|-------------|-----------|
| US‑1 | Visitor | Enter a URL and click “Scan” | I can check all my contact links at once |
| US‑2 | Visitor | See a clear health score (0‑100) | I instantly know my site’s link health |
| US‑3 | Visitor | View detailed lists of WhatsApp, phone, review, social, and email links | I can fix each broken link individually |
| US‑4 | Visitor | Copy or open each link directly | I can verify or reuse the link easily |
| US‑5 | Visitor | Export results as JSON | I can share or store reports |
| US‑6 | Visitor | See my past scans in a history panel | I don’t have to re‑scan the same URLs |
| US‑7 | User | Register and log in | I can manage my scans and webhooks |
| US‑8 | User | Create webhooks | I can get notifications when scans complete |
| US‑9 | Admin | View global scan statistics | I can monitor system health and usage |

---

## 5. Functional Requirements

### 5.1 Core Scanner
- Accept a URL (with or without `http://`).
- Fetch the HTML (timeout 10s, retry 2 times).
- Clean the HTML (remove scripts, styles, comments).
- Extract:
  - **WhatsApp links:** `wa.me/*` and `api.whatsapp.com/send?phone=*`. Validate phone number length (10‑15 digits).
  - **Phone links:** `tel:*`. Validate Indian phone numbers (10 digits, starting with 6‑9).
  - **Review links:** Google Maps, `g.page`, `goo.gl/maps`. Mark as detected.
  - **Social links:** Facebook, Instagram, Twitter/X, LinkedIn, YouTube. Mark as detected.
  - **Email links:** `mailto:*`. Validate email format.
- For each extracted link, classify as WORKING or BROKEN.
- Calculate a **score** starting from 100, deduct:
  - 25 points for each broken WhatsApp link.
  - 20 points for each invalid phone link.
  - 15 points for each invalid email link.
  - No deduction for review/social (only detection).
- Score cannot go below 0.
- Return `totalLinks`, `workingLinks`, `brokenLinks`, `successRate`.
- Include performance metrics (fetch, parse, total time).

### 5.2 User Management
- Registration: email, password, name. Generate unique API key.
- Login: email, password → JWT token.
- Role: USER (default) and ADMIN.
- JWT expiration configurable.

### 5.3 Asynchronous Processing
- When a scan is requested, it is added to a queue (BullMQ).
- The API responds immediately with a `scanId`.
- Frontend polls the status endpoint until completion.
- User can check status anytime via the API.

### 5.4 Webhooks
- Users can register a webhook URL with optional secret.
- On scan completion, send a POST request with the result.
- Include HMAC‑SHA256 signature if secret is provided.
- Retry up to 3 times with exponential backoff.

### 5.5 History
- Store all scans in PostgreSQL.
- Frontend also caches last 20 scans in browser localStorage.

---

## 6. Non‑Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Scan should complete within 15 seconds (including queue wait). API response time under 200ms. |
| **Scalability** | Support up to 100 concurrent scans without degradation. Use BullMQ for horizontal scaling. |
| **Availability** | 99.9% uptime for the API and frontend. |
| **Security** | All passwords hashed with bcrypt. JWT with short expiry. API keys for external services. Rate limiting (5 req/min per user). Block internal IP addresses (SSRF protection). CORS restricted to allowed origins. |
| **Usability** | Intuitive one‑page UI with clear CTAs. Dark/light theme. Mobile‑friendly. |
| **Reliability** | Graceful error handling with user‑friendly messages. Retry failed scans. Queue persistence with Redis. |
| **Maintainability** | Modular code; unit tests for core logic; logging with Winston. |

---

## 7. Success Metrics (KPIs)
- **Weekly active users** ≥ 500 within 3 months.
- **Average scan time** ≤ 12 seconds.
- **User retention** (repeat scans) ≥ 40%.
- **Conversion rate** to paid monitoring ≥ 5% of visitors.
- **Link detection accuracy** ≥ 95%.

---

## 8. Future Scope (Post‑MVP)
- Scheduled monitoring (daily/weekly scans).
- Email/WhatsApp alerts for broken links.
- Multi‑page crawling (entire domain).
- Integration with Google Search Console.
- PDF report generation.
- Team collaboration (shared scans).

---

## 9. Assumptions & Constraints
- Only public websites (no authentication required) can be scanned.
- The tool works best for Indian phone numbers (validation rules).
- Rate limiting per user/IP is sufficient to prevent abuse.
- Free tier will be supported by ads or a paid pro plan.

---

## 10. Glossary
- **Webhook:** A user‑provided endpoint that receives scan results.
- **Queue:** BullMQ uses Redis to manage job processing.
- **Health Score:** A number from 0‑100 indicating link quality.
- **Broken Link:** A link with invalid format or unverifiable number.

markdown

# LeadGuard Scanner – TDD (Technical Design Document)

## 1. Introduction
This document provides the technical architecture, design decisions, and implementation details for the LeadGuard Scanner. It covers the stack, data models, API specifications, queue system, frontend, security, and deployment.

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (React), Tailwind CSS, Framer Motion, React Icons |
| **Backend** | Next.js API Routes (Node.js) |
| **Database** | PostgreSQL 15 with Prisma ORM |
| **Cache & Queue** | Redis 7 (BullMQ for queue, ioredis for client) |
| **Authentication** | JWT + API keys |
| **Validation** | Custom regex and logic |
| **Logging** | Winston |
| **Testing** | Jest (planned) |
| **Deployment** | Vercel (frontend + API), Railway/Render for DB & Redis |

---

## 3. System Architecture

┌─────────────────────────────────────────────────────────────────────────┐
│ Client (Browser) │
└─────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Next.js Frontend (SSR/CSR) │
│ - Page: /app/page.js │
│ - State: URL input, results, history, theme, toast │
│ - Calls: POST /api/scan, GET /api/scan/[id] │
└─────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Next.js API Routes (Serverless) │
│ - /api/auth/register, /api/auth/login │
│ - /api/scan (POST), /api/scan/[id] (GET) │
│ - /api/webhooks (POST, GET) │
│ - Rate limiting middleware (Redis) │
│ - Authentication (withAuth) │
└─────────────────────────────────────────────────────────────────────────┘
│
┌──────────────────────┼──────────────────────┐
│ │ │
▼ ▼ ▼
┌───────────────────────────┐ ┌──────────────┐ ┌─────────────────────┐
│ PostgreSQL (Prisma) │ │ Redis (BullMQ)│ │ Worker (Node.js) │
│ - Users │ │ - Queue │ │ - Listens to queue │
│ - Scans │ │ - Rate limit │ │ - Executes scanner │
│ - Webhooks │ │ - Cache │ │ - Updates DB │
│ - ScanLogs │ │ │ │ - Sends webhooks │
└───────────────────────────┘ └──────────────┘ └─────────────────────┘
text


---

## 4. Data Models (Prisma Schema)

```prisma
enum Role { USER ADMIN }
enum ScanStatus { PENDING PROCESSING COMPLETED FAILED }
enum WebhookEvent { SCAN_COMPLETED SCAN_FAILED }
enum LogLevel { INFO WARN ERROR }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  apiKey    String   @unique
  role      Role     @default(USER)
  scans     Scan[]
  webhooks  Webhook[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Scan {
  id           String       @id @default(cuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id])
  url          String
  status       ScanStatus   @default(PENDING)
  result       Json?        // stores extracted links, score, stats
  score        Int?
  totalLinks   Int?
  workingLinks Int?
  brokenLinks  Int?
  error        String?
  queueJobId   String?
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  logs         ScanLog[]

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model Webhook {
  id           String         @id @default(cuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id])
  url          String
  secret       String?
  events       WebhookEvent[]
  isActive     Boolean        @default(true)
  lastTriggered DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@unique([userId, url])
}

model ScanLog {
  id        String   @id @default(cuid())
  scanId    String
  scan      Scan     @relation(fields: [scanId], references: [id])
  level     LogLevel
  message   String
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([scanId])
  @@index([createdAt])
}

5. API Specification
5.1 Authentication

    Headers: Authorization: Bearer <jwt> or x-api-key: <apiKey>

    Public endpoints: /api/auth/register, /api/auth/login

5.2 Endpoints
Method	Path	Description	Auth	Request Body	Response
POST	/api/auth/register	Register new user	No	{ email, password, name }	{ success, user }
POST	/api/auth/login	Login	No	{ email, password }	{ success, token, user }
POST	/api/scan	Start scan	Yes	{ url, webhookUrl? }	{ success, scanId, status }
GET	/api/scan/[id]	Get scan status	Yes	—	{ success, data }
POST	/api/webhooks	Create webhook	Yes	{ url, secret?, events[] }	{ success, webhook }
GET	/api/webhooks	List webhooks	Yes	—	{ success, webhooks }
5.3 Rate Limiting

    Limit: 5 requests per minute per user (or IP if unauthenticated)

    Storage: Redis with sliding window

    Response: 429 Too Many Requests with Retry-After header

6. Queue and Worker Design
6.1 BullMQ Queue

    Name: scan-queue

    Connection: Redis (configurable)

    Default Job Options:

        attempts: 3

        backoff: exponential (2s, 4s, 8s)

        removeOnComplete: 1000 jobs kept

6.2 Worker

    Concurrency: 5 (configurable)

    Limiter: 10 jobs per second

    Processor Function:

        Fetch scan record from DB.

        Update status to PROCESSING.

        Call performScan(url).

        Update scan with results.

        If webhook provided, send notification.

        On error, mark as FAILED and store error.

7. Scanner Implementation Details
7.1 Fetching

    Use fetch with AbortController (10s timeout).

    Retry up to 2 times with 1s delay.

    Follow redirects.

    Validate content‑type is text/html.

7.2 HTML Cleaning

    Remove <script> and <style> tags.

    Remove HTML comments.

    This reduces false positives.

7.3 Regex Patterns
javascript

const waRegex = /(https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=)[^\s"'>]+)/gi;
const telRegex = /href=["'](tel:[^"']+)["']/gi;
const reviewRegex = /(https?:\/\/(g\.page|maps\.google\.com|goo\.gl\/maps|google\.com\/maps)[^\s"'>]+)/gi;
const socialRegex = {
  facebook: /(https?:\/\/(www\.)?facebook\.com\/[^\s"'>]+)/gi,
  instagram: /(https?:\/\/(www\.)?instagram\.com\/[^\s"'>]+)/gi,
  twitter: /(https?:\/\/(www\.)?twitter\.com\/[^\s"'>]+|https?:\/\/(www\.)?x\.com\/[^\s"'>]+)/gi,
  linkedin: /(https?:\/\/(www\.)?linkedin\.com\/[^\s"'>]+)/gi,
  youtube: /(https?:\/\/(www\.)?youtube\.com\/[^\s"'>]+|https?:\/\/(www\.)?youtu\.be\/[^\s"'>]+)/gi,
};
const emailRegex = /href=["']mailto:([^"']+)["']/gi;

7.4 Validation Functions

    isValidIndianPhone(digits): regex /^[6-9]\d{9}$/.

    validateWhatsAppLink(link): extract phone= parameter, ensure 10‑15 digits.

    validateEmail(email): standard email regex.

8. Frontend Design
8.1 Pages

    Single page (/) with all logic.

8.2 State Management

    React useState, useEffect, useRef.

    No external state library needed.

8.3 User Interface Components

    Form: URL input + scan button.

    Progress Bar: animated during polling.

    Results Cards:

        Score with color (green ≥80, yellow 50‑79, red <50).

        Summary stats (total/working/broken).

        Lists for each link type with status badge and action icons.

    History Panel: collapsible, shows last 20 scans from localStorage.

    Theme Toggle: switch between dark/light (persisted in localStorage).

    Toast Notifications: for feedback (copy, export, success, error).

8.4 Interaction Flow

    User enters URL → clicks Scan.

    Frontend calls POST /api/scan.

    If scanId returned → start polling GET /api/scan/[id] every 2s.

    Update progress bar.

    When status === "COMPLETED", display results.

    Save result to history.

    Allow export, share, and copy actions.

9. Security Considerations
Threat	Mitigation
SSRF	Block internal IPs, restrict to HTTP/HTTPS, validate hostname.
Brute‑force login	Rate limiting on auth endpoints.
Injection attacks	Use parameterised queries (Prisma).
API abuse	Rate limiting per user/IP.
Data leakage	Never expose passwords; use minimal data in responses.
JWT tampering	Use strong secret, short expiry, sign with HS256.
Webhook spoofing	Optionally sign payloads with HMAC‑SHA256.
10. Logging & Monitoring

    Winston for structured logging.

    Log levels: info, warn, error.

    Store logs:

        Console in development.

        Rotating files in production (if self‑hosted).

    Scan‑specific logs stored in ScanLog table for debugging.

11. Deployment Strategy
11.1 Backend Services
Service	Provider	Notes
Next.js app	Vercel	Serverless functions for API routes.
PostgreSQL	Railway / Render / Neon	Managed database with backups.
Redis	Upstash / Railway	Managed Redis with persistence.
11.2 Worker

    Run as a separate Node.js process.

    Can be deployed on Railway Worker, Heroku, or a small EC2 instance.

    Use PM2 to keep it running.

11.3 CI/CD

    GitHub repo.

    Vercel auto‑deploys on push to main.

    Worker can be restarted manually or via a CI pipeline.

11.4 Environment Variables (Production)
text

DATABASE_URL=...
REDIS_URL=...
REDIS_PASSWORD=...
JWT_SECRET=...
VALID_API_KEYS=...
QUEUE_NAME=scan-queue
MAX_CONCURRENT_JOBS=5
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=LeadGuard

12. Testing Plan
Test Type	Scope
Unit Tests	Scanner functions, validation utilities, authentication helpers.
Integration Tests	API endpoints with a test database.
End‑to‑End	Full scan flow using a mock website.
Load Testing	Simulate multiple concurrent scans.
13. Performance Optimisation

    Use Redis caching for frequently scanned URLs (TTL 1 hour).

    Optimise regex patterns for large HTML.

    Use Promise.all for concurrent validation where possible.

    Keep HTML cleaning minimal to reduce overhead.

14. Future Technical Enhancements

    Add GraphQL support for flexible queries.

    Use Kafka for high‑throughput queue.

    Implement webhook delivery logging.

    Introduce email report generation via Nodemailer.

    Add browser extension for on‑page scanning.

15. Appendix
A. Example Scan Result Object
json

{
  "score": 85,
  "whatsappLinks": [
    { "url": "https://wa.me/919876543210", "status": "WORKING", "isValid": true }
  ],
  "phoneLinks": [
    { "url": "tel:+919876543210", "number": "9876543210", "status": "WORKING", "isValid": true }
  ],
  "reviewLinks": [
    { "url": "https://g.page/r/abc123", "platform": "Google Page", "status": "DETECTED", "isValid": true }
  ],
  "socialLinks": [
    { "platform": "facebook", "url": "https://facebook.com/example", "status": "DETECTED", "isValid": true }
  ],
  "emailLinks": [
    { "email": "info@example.com", "status": "WORKING", "isValid": true }
  ],
  "scanStats": { "totalLinks": 4, "workingLinks": 4, "brokenLinks": 0 },
  "summary": { "successRate": 100 },
  "performance": { "fetchTime": 320, "parseTime": 45, "totalTime": 365 }
}

B. Webhook Payload
json

{
  "event": "SCAN_COMPLETED",
  "scanId": "clx7p4h2q0000abc123",
  "url": "https://example.com",
  "result": { ... },
  "timestamp": "2026-08-18T12:34:56.789Z"
}
