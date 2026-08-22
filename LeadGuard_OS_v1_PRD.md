# LeadGuard OS / RevenueShield v1 — Product Requirements Document (PRD)

**Version:** 1.0 Final Build Specification  
**Date:** 22 August 2026  
**Product Type:** Web SaaS / Website Revenue, Advertising, SEO and Security Diagnostic Platform  
**Primary Market:** India-first, globally extensible  
**Status:** Build-ready

---

## 0. Product Definition

LeadGuard OS is a website diagnostic and protection platform that scans a public website and identifies issues that can directly or indirectly cause revenue loss, advertising waste, SEO visibility loss, or security compromise.

The v1 product is organized into four diagnostic pillars:

1. **Lead Guardian** — WhatsApp, click-to-call, email, review/map and contact-channel health.
2. **AdShield** — Meta Pixel, Google Tag / GTM / GA4 detection and advertising tracking integrity signals.
3. **SEO & Penalty Shield** — indexing, noindex, canonical, robots, sitemap, SSL and other SEO-risk checks.
4. **Cyber & Hack Shield** — suspicious injections, spam/casino/satta keywords, suspicious Base64/obfuscation patterns, malicious-looking scripts, hidden redirects and mobile redirect indicators.

A fifth cross-product layer is the **Conversion Engine**, which turns diagnostic output into clear business impact, a shareable report, monitoring signup, and paid-service opportunities.

---

# 1. Vision

Create the simplest possible tool for a non-technical business owner to answer:

> “Is my website losing customers, advertising money, Google visibility, or trust right now?”

The product must turn technical findings into understandable business impact and actionable fixes.

---

# 2. Problem Statement

Small businesses often know only that “sales are down.” They usually do not know whether the cause is:

- a broken WhatsApp link,
- an invalid phone number,
- missing contact options,
- a broken review link,
- missing or duplicated analytics/ad tracking,
- an accidental `noindex`,
- indexing or canonical mistakes,
- SSL/protocol problems,
- spam/casino content injected into their website,
- suspicious scripts,
- or silent mobile redirects.

Existing website scanners are generally fragmented, highly technical, or designed for developers and agencies rather than business owners.

LeadGuard OS combines these diagnostic categories into one understandable audit.

---

# 3. Goals

## 3.1 Primary Goals

- Let a visitor scan a public website with no login.
- Produce a fast diagnostic report.
- Detect contact-channel problems with India-aware WhatsApp and phone logic.
- Detect basic ad tracking implementation issues.
- Detect high-value SEO/indexing risks.
- Detect obvious website compromise/injection indicators.
- Convert technical findings into an easy-to-understand severity and loss-risk model.
- Provide a public report URL.
- Provide a downloadable branded report path.
- Capture leads for monitoring and human remediation services.

## 3.2 Business Goals

- Free scan as the acquisition engine.
- Paid micro-report / report unlock as an entry product.
- Done-for-you remediation service as immediate cash flow.
- Monitoring subscription as recurring revenue.
- Agency/white-label offer as the scalable distribution layer.

## 3.3 Non-Goals for v1

- Full penetration testing.
- Guaranteed malware detection.
- Guaranteed Google ranking prediction.
- Full browser-based crawling of authenticated dashboards.
- Guaranteed verification of every third-party ad/analytics configuration.
- Automatic code modification of customer websites.
- Replacing a professional security company or SEO agency.

All security and SEO findings must be presented as signals, indicators, or recommendations unless the condition is deterministically verified.

---

# 4. Target Users

## Persona A — Small Business Owner

Needs a simple answer, has limited technical knowledge, cares about lost leads and money.

## Persona B — Digital Marketer

Needs fast audits across multiple sites and shareable results.

## Persona C — Web Developer / Freelancer

Uses the product as a pre-launch and QA tool.

## Persona D — Agency

Needs multi-site scanning, reports, monitoring, and potential white-label usage.

---

# 5. Product Principles

1. **No-login-first:** first value must appear before registration.
2. **Business language first:** “Customers may be unable to contact you” is preferred over technical-only language.
3. **Evidence-backed findings:** every finding should contain evidence or an explicit uncertainty marker.
4. **Safe scanning:** public HTTP/HTTPS only; strong SSRF protection.
5. **No false certainty:** a scanner finding is not automatically a confirmed breach or revenue loss.
6. **Progressive disclosure:** show high-value findings first, technical detail second.
7. **India-first rules:** preserve strong Indian phone/WhatsApp validation, while keeping the engine extensible.
8. **Free core scan:** acquisition requires minimal friction.

---

# 6. Core User Journey

```text
Visitor lands on homepage
        ↓
Enters website URL
        ↓
Click SCAN / AUDIT
        ↓
URL validation + SSRF-safe request
        ↓
Unified diagnostic engine
        ↓
Findings grouped into 4 pillars
        ↓
Overall Health / Revenue Risk summary
        ↓
Critical findings shown immediately
        ↓
Detailed findings + evidence
        ↓
Shareable report + PDF/report unlock
        ↓
24-hour watchdog / monitoring CTA
        ↓
Paid fix / subscription / agency conversion
```

---

# 7. Functional Requirements

## FR-001 — URL Input

- Accept domain, full URL, and URLs with or without scheme.
- Normalize input to HTTPS-first where safe.
- Reject localhost, loopback, private IP ranges, link-local addresses, internal hostnames and unsupported protocols.
- Validate hostname before fetching.
- Limit redirects.
- Impose response size limits.

## FR-002 — Scan Lifecycle

Statuses:

- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`
- `BLOCKED`
- `TIMEOUT`

The API must return a scan ID and status.

## FR-003 — Lead Guardian

### WhatsApp

Detect:

- `https://wa.me/...`
- `https://api.whatsapp.com/send?phone=...`
- relevant WhatsApp deep-link forms discovered in anchors.

Checks:

- numeric normalization,
- valid international length,
- India-specific 10-digit mobile validation where applicable,
- common double-country-code error such as `9191...`,
- malformed or empty phone parameter,
- malformed URI encoding.

Every finding contains:

- URL,
- extracted number when safe,
- validation status,
- issue reason,
- confidence/evidence.

### Click-to-Call

Detect `tel:` anchors.

India-aware validation:

- last 10 digits,
- first digit 6–9,
- country-code normalization.

Do not label all non-Indian telephone numbers as broken; international formats should be classified separately.

### Email

Detect `mailto:` links.

Checks:

- basic syntax,
- empty local/domain part,
- malformed address.

### Review / Maps

Detect Google review/map related URLs including common Google Maps / `g.page` patterns.

Classify as:

- detected,
- malformed,
- missing from expected CTA context when the page type suggests a review CTA.

Do not claim that a review page itself is reachable unless it has actually been verified.

### Social Links

Detect common public links for Facebook, Instagram, X/Twitter, LinkedIn and YouTube. Social links are primarily classified as detected/undetected in v1; they are not treated as broken solely because the scanner cannot prove destination reachability.

## Contact Coverage

Report whether the page contains:

- WhatsApp CTA,
- phone CTA,
- email CTA,
- review CTA,
- social CTA.

A “no contact channel detected” finding is high business importance but must not be counted as a broken link.

---

# 8. AdShield Requirements

## FR-004 — Meta Tracking Detection

Detect signals for:

- Meta Pixel base code,
- common Meta pixel initialization markers,
- Meta conversion-related signals where statically visible.

Report:

- detected / not detected,
- evidence snippet or source location when safe,
- confidence.

The product must NOT claim that an ad account is profitable or that event delivery is correct unless browser/runtime verification is actually performed.

## FR-005 — Google Tracking Detection

Detect:

- Google Tag Manager,
- Google Analytics / GA4 measurement markers,
- Google tag (`gtag`) patterns,
- common container identifiers when visible.

Report duplicate, missing, or conflicting basic implementation signals.

## FR-006 — Ad Budget Bleed Signals

The initial v1 model may estimate tracking-risk exposure, but must clearly label it as an estimate.

Inputs may include:

- tracking missing,
- major conversion page missing tracking,
- duplicate tags,
- broken tracking indicators.

No unsupported hard ₹ loss claim is permitted. If a monetary value is shown, UI must label it as an estimated scenario based on configurable assumptions.

---

# 9. SEO & Penalty Shield Requirements

## FR-007 — Indexing Checks

Inspect:

- `meta[name="robots"]`,
- `meta[name="googlebot"]`,
- `noindex`,
- `nofollow`,
- canonical tag,
- canonical conflicts or obvious malformed canonical URLs,
- `robots.txt`,
- sitemap discovery,
- HTTPS usage and mixed protocol signals where observable.

## FR-008 — SEO Risk Classification

Use:

- Critical,
- High,
- Medium,
- Low,
- Informational.

Example:

- accidental `noindex` on the primary page → Critical,
- missing canonical → Medium/Low depending on context,
- missing sitemap → Low/Informational.

The engine must avoid declaring “Google penalty” from static HTML alone. Use wording such as “de-indexation risk” or “SEO risk signal.”

---

# 10. Cyber & Hack Shield Requirements

## FR-009 — Suspicious Content Detection

Scan HTML and relevant visible/static resources for suspicious indicators such as:

- gambling/satta/casino spam terms,
- known SEO spam patterns,
- suspicious obfuscated code patterns,
- suspicious Base64-heavy inline scripts,
- injected external scripts from unusual domains,
- hidden iframes or suspicious redirects,
- suspicious mobile redirect logic.

## FR-010 — Base64 / Obfuscation Heuristic

Flag only heuristically suspicious patterns such as:

- long Base64-looking strings inside script contexts,
- repeated decoding functions,
- suspicious dynamic script construction.

Never state that a Base64 string is malicious solely because Base64 is present.

## FR-011 — Redirect Indicators

Detect:

- suspicious meta refresh,
- JavaScript location replacement,
- device/mobile user-agent branching where statically visible,
- suspicious iframe redirects.

Where browser-level behavior is not verified, label as “possible redirect indicator.”

## FR-012 — Safety Notice

The product must display that this is an automated diagnostic scan and not a substitute for a professional penetration test or malware forensic investigation.

---

# 11. Unified Scoring

The product requires separate scores per pillar plus an overall health score.

Recommended structure:

```text
Lead Score        0–100
AdShield Score    0–100
SEO Score         0–100
Cyber Score       0–100
Overall Score     0–100
```

The scoring engine must store:

- finding severity,
- rule ID,
- penalty value,
- confidence,
- evidence.

Do not blindly subtract a fixed score for every finding. A site with 20 identical malformed links should not become mathematically meaningless.

Use category caps and weighted aggregation.

Example:

```text
Lead Score = 100 - weighted lead penalties
Ad Score   = 100 - weighted ad penalties
SEO Score  = 100 - weighted SEO penalties
Cyber Score= 100 - weighted security penalties
Overall    = weighted combination
```

Recommended v1 weights:

- Lead Guardian: 35%
- AdShield: 20%
- SEO Shield: 20%
- Cyber Shield: 25%

Weights must be configuration, not hard-coded business logic.

---

# 12. Revenue-Risk Messaging

The system may estimate “revenue risk,” but must distinguish:

1. **Observed defect**
2. **Potential impact**
3. **Estimated scenario**
4. **Confirmed user-provided monetary loss**

Example:

> “1 broken WhatsApp contact channel detected. Customers using that channel may be unable to contact the business.”

Avoid:

> “You definitely lost ₹7,500.”

unless the user supplies a measurable conversion/value assumption and the interface explicitly labels the calculation as scenario-based.

---

# 13. Results Requirements

Each scan result must contain:

- scan ID,
- target URL,
- normalized URL,
- timestamps,
- fetch status,
- HTTP status,
- final response URL,
- page title,
- overall score,
- pillar scores,
- findings,
- evidence,
- confidence,
- recommended fix,
- technical details,
- performance timings.

Summary counters:

- total findings,
- critical,
- high,
- medium,
- low,
- informational.

---

# 14. History, Export and Integrations

## Scan History

- Public users may keep a lightweight recent-scan history in the browser.
- Authenticated users may persist scan history in the database.
- Default UI should show the latest 20 scans.

## JSON Export

Completed scans must support structured JSON export for developers/marketers.

## Webhooks

Authenticated users may create webhook subscriptions for events such as `SCAN_COMPLETED` and `SCAN_FAILED`.

Webhook requirements:

- user-configurable URL,
- optional secret,
- HMAC-SHA256 signature when secret is configured,
- retry up to 3 times with exponential backoff,
- delivery status/log,
- disabled after repeated permanent failures.

Webhook payloads must never contain passwords, API secrets, or internal network information.

# 15. Public Shareable Report

Route:

`/report/[id]`

Requirements:

- no login required for a public report token,
- unguessable report ID/token,
- timestamp,
- target domain,
- overall score,
- four pillar summaries,
- critical findings,
- evidence,
- recommended fixes,
- CTA for monitoring and remediation,
- optional branded presentation.

Sensitive secrets, server details and internal addresses must never appear.

---

# 16. PDF / Report Unlock

Report output must support:

- branded title page,
- scan date/time,
- domain,
- summary score,
- pillar scores,
- finding table,
- evidence,
- recommended fixes,
- disclaimer,
- CTA.

Suggested monetization options:

- free summary,
- paid detailed report,
- service lead CTA.

Pricing is configuration, not code-level truth.

---

# 17. Watchdog / Monitoring

### Free trial

A visitor may submit an email/Telegram/other supported contact channel for a limited monitoring trial.

### Paid monitoring

Support:

- daily or weekly scan schedules,
- change detection,
- issue status transition,
- alert on newly discovered Critical/High findings,
- repeated-alert suppression,
- last scan status.

Monitoring must not depend on the user leaving a browser open.

The production scheduler may use a managed cron service or provider-native cron depending on final deployment constraints.

---

# 18. User Accounts

v1 may support:

- optional registration,
- login,
- password reset in later phase,
- scan history,
- monitoring subscriptions,
- report access.

Core public scan does not require login.

Roles:

- USER
- ADMIN

---

# 19. Admin Requirements

Admin dashboard shall show:

- scans/day,
- unique domains/day,
- success/failure rate,
- pillar finding counts,
- most common broken rules,
- monitoring subscribers,
- conversion metrics,
- system errors,
- suspicious traffic/rate-limit events.

Admin must not see passwords or raw secrets.

---

# 20. Monetization

The product architecture must support four commercial paths:

### A. Micro Report

Low-price report unlock.

### B. Done-for-You Fix

Human or partner remediation service.

### C. Monitoring SaaS

Monthly subscription.

### D. Agency / White-label

Multi-site / reseller / branded reporting.

Example starting price configuration from the project history:

- Micro PDF: ₹99
- Express Fix: ₹2,999–₹4,999
- Monitoring: around ₹499/month for bundled AdShield/Hack monitoring
- Agency: around ₹1,999/month

These are commercial experiments, not immutable requirements.

---

# 21. Privacy & Compliance

The public scanner must:

- scan only public resources,
- avoid credential collection,
- minimize stored website content,
- avoid storing full raw HTML longer than necessary unless explicitly required,
- provide privacy policy and terms pages before production monetization,
- log only necessary diagnostics,
- include clear user-facing disclaimers.

---

# 22. Abuse Prevention

Controls:

- IP/user rate limiting,
- URL rate limiting,
- domain scan cooldown,
- maximum response size,
- timeout,
- redirect limit,
- concurrency limit,
- SSRF/IP protection,
- user-agent identification,
- abuse logging,
- optional CAPTCHA only when abuse threshold is reached.

---

# 23. Accessibility

- Keyboard navigable.
- Adequate contrast.
- Visible focus states.
- Accessible form labels.
- Screen-reader-friendly severity indicators.
- Do not rely only on red/green color.

---

# 24. SEO for LeadGuard OS

Public marketing pages must include:

- title,
- meta description,
- Open Graph metadata,
- structured data where appropriate,
- canonical URL,
- robots policy,
- sitemap.

The scanner itself must not expose private scan pages to search engines by default unless explicitly configured.

---

# 25. Analytics

Track product events such as:

- scan_started,
- scan_completed,
- scan_failed,
- critical_finding_viewed,
- report_shared,
- report_download_clicked,
- watchdog_started,
- pricing_viewed,
- checkout_started,
- purchase_completed.

Avoid collecting unnecessary personal data.

---

# 26. Acceptance Criteria

A v1 release is acceptable only when:

- a public URL can be scanned end-to-end,
- SSRF protections reject internal addresses,
- WhatsApp and phone rules work on known test cases,
- ad tags are detected on controlled fixture pages,
- noindex/canonical/robots checks work on controlled fixture pages,
- security heuristics produce deterministic findings on controlled malicious-pattern fixtures,
- results can be persisted and retrieved,
- public report works,
- UI works on mobile and desktop,
- errors are understandable,
- rate limits are enforced,
- no secret appears in client responses,
- all critical paths have automated tests.

---

# 27. Recommended Test Matrix

At minimum include fixture pages for:

1. valid Indian WhatsApp,
2. malformed WhatsApp,
3. double `91` error,
4. valid Indian tel link,
5. invalid tel link,
6. valid mailto,
7. invalid mailto,
8. missing contact channels,
9. Google review link,
10. Meta Pixel,
11. GA4,
12. GTM,
13. duplicate/partial tracking,
14. noindex,
15. canonical conflict,
16. robots disallow,
17. missing sitemap,
18. suspicious casino keyword injection,
19. Base64 heuristic,
20. meta refresh redirect,
21. JS redirect heuristic,
22. unreachable website,
23. timeout,
24. redirect chain,
25. oversized response,
26. SSRF attempt.

---

# 28. Release Phases

## V1.0 — Core Build

- unified scan API,
- 4 diagnostic pillars,
- scoring,
- public report,
- core UI,
- basic persistence,
- rate limiting,
- monitoring data model,
- report generation.

## V1.1

- monitoring scheduler,
- email/Telegram alerts,
- payment integration,
- user dashboard.

## V1.2

- multi-page crawl,
- agency dashboard,
- white-label reports,
- advanced report exports.

## V2

- browser-assisted runtime checks,
- deeper security integrations,
- integrations with analytics/search consoles,
- automatic remediation workflows.

---

# 29. Product Success Metrics

Track:

- scan completion rate,
- average scan duration,
- critical finding rate,
- report share rate,
- visitor-to-watchdog conversion,
- report-to-paid conversion,
- audit-to-monitoring conversion,
- monthly recurring revenue,
- churn,
- repeat scan rate,
- false positive rate.

The earlier project target of 5% paid conversion may be used as an initial experiment, not as a guaranteed benchmark.

---

# 30. Business & Go-To-Market Requirements

The final v1 is NOT just a broken-link checker.

It is a unified website-risk diagnostic platform covering:

**Customer Reach → Ad Tracking → SEO Visibility → Cyber Risk → Revenue-oriented Conversion.**

Every future feature must fit one of these pillars or clearly increase conversion, trust, monitoring, or remediation value.
