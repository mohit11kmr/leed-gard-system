# LeadGuard OS / RevenueShield v1 — UI/UX Specification

**Version:** 1.0 Final Build Specification  
**Date:** 22 August 2026  
**Design Direction:** High-Conversion Dark Slate / Trust + Risk Clarity  
**Priority:** Mobile-first, desktop-ready

---

# 1. Design Objective

The UI must make a non-technical business owner understand three things within seconds:

1. Is something wrong?
2. How serious is it?
3. What should I do next?

The interface must look like a professional diagnostic/security product, not a generic AI tool.

---

# 2. Design Language

## Visual Style

- Dark slate foundation.
- Strong whitespace.
- Clear diagnostic cards.
- Large score numbers.
- High-contrast severity chips.
- Minimal decorative effects.
- Motion only when it improves understanding.

## Core Tokens

```css
--bg: #020617;
--surface: #0f172a;
--surface-2: #111827;
--border: #1e293b;
--text: #f8fafc;
--muted: #94a3b8;
--danger: #ef4444;
--warning: #f59e0b;
--success: #10b981;
--info: #38bdf8;
--primary: #8b5cf6;
```

These tokens can be implemented through Tailwind theme variables or CSS custom properties.

---

# 3. Typography

Recommended:

- Inter or equivalent modern sans-serif.
- Strong numeric typography for scores.
- 14–16px minimum body text.
- 44–72px hero score on desktop.
- Avoid overly condensed text.

---

# 4. Global Layout

```text
┌──────────────────────────────────────────────────────────────────┐
│ LeadGuard OS                            Pricing   Login   Menu   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        Main Content                              │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Footer: Product | Security | Terms | Privacy | Contact         │
└──────────────────────────────────────────────────────────────────┘
```

Desktop max width: approximately 1200–1280px.

Mobile: 16px side padding.

---

# 5. Screen 1 — Homepage / Scan Hero

Route: `/`

```text
┌────────────────────────────────────────────────────────────────────┐
│ 🛡 LeadGuard OS                          Pricing     Login       │
│                                                                    │
│          KNOW WHAT YOUR WEBSITE IS LOSING                          │
│                                                                    │
│      Customers • Ad Tracking • Google Visibility • Security      │
│                                                                    │
│  Scan your website for revenue-impacting problems in seconds.     │
│                                                                    │
│  ┌───────────────────────────────────────────────┬──────────────┐  │
│  │ https://yourwebsite.com                       │  SCAN NOW → │  │
│  └───────────────────────────────────────────────┴──────────────┘  │
│                                                                    │
│    ✓ Free scan     ✓ No login required     ✓ Public report        │
│                                                                    │
│  [Lead] [Ads] [SEO] [Security]                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Hero copy

Headline:

> Stop losing customers, ad data, Google visibility and trust.

Supporting text:

> Run one automated audit across your website’s contact links, tracking, SEO and security signals.

Primary CTA:

> Scan Website

Secondary CTA:

> See Example Report

---

# 6. Scan Input States

### Empty

Placeholder:

`yourwebsite.com`

### Typing

Show scheme normalization subtly.

### Invalid

Inline message:

> Enter a valid public website URL.

### Blocked

> This destination cannot be scanned for security reasons.

### Loading

Show a progress stage rather than an indefinite spinner.

---

# 7. Screen 2 — Scan Progress

```text
┌───────────────────────────────────────────────────────────────┐
│ Scanning yourwebsite.com                                     │
│                                                               │
│ ██████████████████████████░░░░░░░                            │
│                                                               │
│ ✓ Connecting                                                  │
│ ✓ Reading website                                             │
│ ● Checking customer contact channels                          │
│ ○ Checking advertising tags                                   │
│ ○ Checking SEO                                                 │
│ ○ Checking security                                           │
│                                                               │
│ This may take a few seconds.                                  │
└───────────────────────────────────────────────────────────────┘
```

Do not falsely imply a phase is complete until the backend confirms it.

---

# 8. Screen 3 — Results Summary

This is the most important conversion screen.

```text
┌────────────────────────────────────────────────────────────────────┐
│ AUDIT COMPLETE  •  yourwebsite.com                                 │
│                                                                    │
│       OVERALL HEALTH                                               │
│             62 / 100                                               │
│       Moderate Risk                                                 │
│                                                                    │
│  Estimated exposure: based on your assumptions                     │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                  │
│  💬 LEAD GUARD       48     🎯 AD SHIELD      75                │
│  🔍 SEO SHIELD       80     🚨 CYBER SHIELD   55                │
│                                                                  │
├────────────────────────────────────────────────────────────────────┤
│  CRITICAL FINDINGS                                                  │
│                                                                    │
│  🔴 WhatsApp contact link malformed                                │
│  🟠 Suspicious mobile redirect indicator                           │
│                                                                  │
└────────────────────────────────────────────────────────────────────┘
```

Important: the result screen must not use fear alone. The first message should always explain the actual finding.

---

# 9. Score Presentation

### 90–100

Very healthy.

### 70–89

Good with improvements.

### 50–69

Needs attention.

### Below 50

High risk.

Accessibility requirement: status must also be shown by text/icon, not just color.

---

# 10. Four Pillar Cards

Each pillar card contains:

- icon,
- score,
- 1-line diagnosis,
- finding count,
- “View findings” action.

Example:

```text
┌───────────────────────────────┐
│ 💬 Lead Guardian              │
│                               │
│ 48 / 100                      │
│ 2 critical • 1 warning        │
│                               │
│ WhatsApp link needs fixing.   │
│                               │
│ [View Findings →]             │
└───────────────────────────────┘
```

---

# 11. Screen 4 — Findings Detail

Tabs:

- All
- Lead
- Ads
- SEO
- Security

Filters:

- Critical
- High
- Medium
- Low
- Info

Each finding row:

```text
🔴 CRITICAL
WhatsApp contact link is malformed

Affected: /contact
Evidence: wa.me/9191...
Why it matters: Customers using this channel may be unable to reach you.
Recommended fix: Replace with a valid WhatsApp number.

[Show Technical Detail]
```

---

# 12. Lead Guardian Detail UI

Sections:

### WhatsApp

Show:

- working count,
- broken count,
- malformed count,
- affected URLs.

### Phone

Show:

- valid count,
- invalid count,
- source URL.

### Email

Show:

- valid syntax,
- invalid syntax.

### Review / Maps

Show detected links and coverage.

---

# 13. AdShield Detail UI

Card groups:

```text
Meta Pixel
✓ Detected
Confidence: High

Google Tag / GA4
✓ Detected
Measurement marker found

GTM
⚠ Detected but verification is static
```

Never show “Ads are definitely broken” unless runtime verification supports it.

---

# 14. SEO Shield Detail UI

Recommended cards:

- Indexability
- Robots
- Canonical
- Sitemap
- HTTPS

Example:

```text
🔴 Indexability Risk
`noindex` detected on the scanned page.

Why it matters:
Search engines may be instructed not to index this page.

[View Evidence]
[How to Fix]
```

---

# 15. Cyber Shield Detail UI

Use stronger warning styling but avoid sensational copy.

Example:

```text
🟠 Possible Injection Indicator
Suspicious gambling-related terms were found in page content.

Confidence: Medium

This automated finding should be manually verified.

[View Evidence]
[Security Checklist]
```

---

# 16. Conversion Engine

The report should naturally progress:

```text
Finding
  ↓
Impact
  ↓
Fix
  ↓
Monitoring
```

Avoid aggressive dark-pattern behavior.

### CTA stack

Primary:

> Fix My Website

Secondary:

> Download Detailed Report

Tertiary:

> Monitor My Website

---

# 17. Locked / Premium Findings

Where a paid detailed report is used:

```text
┌───────────────────────────────────────────────┐
│ 2 additional detailed findings available     │
│                                               │
│ Evidence, technical details and fix steps    │
│ are included in the full report.             │
│                                               │
│ [Unlock Detailed Report]                      │
└───────────────────────────────────────────────┘
```

Do not fake findings that do not exist merely to create a paywall.

---

# 18. Revenue Scenario Calculator UI

Optional expandable module:

```text
Monthly visitors      [ 10,000 ]
Lead/contact rate     [ 2%     ]
Avg customer value    [ ₹3,000 ]
Affected channel      [ 25%    ]

Estimated exposure: ₹15,000 / month

This is a scenario estimate based on your inputs.
```

The disclaimer must be visible near the result.

---

# 19. Watchdog Signup

```text
┌─────────────────────────────────────────────────────────────┐
│ 🔔 KEEP THIS WEBSITE PROTECTED                              │
│                                                             │
│ Get notified when important website issues return.          │
│                                                             │
│ Email / Telegram                                             │
│ [____________________________]                              │
│                                                             │
│ [ Start Free Monitoring ]                                   │
└─────────────────────────────────────────────────────────────┘
```

Use a clear statement of what will be monitored.

---

# 20. Public Report Page

Route: `/report/[id]`

Top section:

```text
LEADGUARD OS AUDIT REPORT
example.com
Verified: 22 Aug 2026, 00:45 IST

62 / 100
MODERATE RISK
```

Then:

1. Executive summary.
2. Four pillar scores.
3. Critical findings.
4. Detailed evidence.
5. Recommended fixes.
6. Monitoring CTA.
7. Report metadata/disclaimer.

---

# 21. PDF Visual Layout

Page 1:

- Logo
- Domain
- Date
- Overall score
- Executive summary

Page 2:

- Four pillar scores
- Critical findings

Page 3+:

- Detailed findings
- Evidence
- Recommendations

Last page:

- monitoring CTA,
- remediation CTA,
- disclaimer,
- report version.

---

# 22. Pricing Page

Suggested plan presentation:

```text
FREE SCAN
₹0
Instant summary

DETAILED REPORT
₹99
Full findings + PDF

FIX SERVICE
₹2,999+
Done-for-you remediation

MONITORING
~₹499/mo
Scheduled checks + alerts

AGENCY
~₹1,999/mo
Multi-site / white-label
```

All prices configurable from backend/admin settings.

---

# 23. Dashboard

Route: `/dashboard`

Sections:

- Overview
- Recent scans
- Monitoring
- Reports
- Billing
- Account

Overview cards:

```text
Total scans
Critical issues
Sites monitored
Active alerts
```

---

# 24. Monitoring Screen

Table columns:

- Site,
- Status,
- Last scan,
- Last change,
- Schedule,
- Alerts,
- Actions.

Actions:

- Run now,
- Pause,
- Edit,
- View report.

---

# 25. Admin UI

Route: `/admin`

Navigation:

- Overview
- Scans
- Findings
- Users
- Monitoring
- Revenue
- System health
- Configuration

Admin metric cards:

- scans today,
- success rate,
- average duration,
- critical finding rate,
- active monitors,
- conversion rate.

---

# 26. Mobile UX

The majority of scan visitors may arrive from mobile.

Rules:

- primary CTA visible without scrolling,
- no horizontal tables,
- stack cards vertically,
- sticky action bar on report pages,
- tap target minimum approximately 44px,
- result filters become horizontal scroll chips.

---

# 27. Desktop UX

Desktop should provide richer side-by-side comparisons:

```text
┌───────────────────────┬───────────────────────────┐
│ Overall Score         │ Critical Findings         │
├───────────────────────┼───────────────────────────┤
│ Lead      48          │ 3 findings               │
│ Ads       75          │                           │
│ SEO       80          │                           │
│ Cyber     55          │                           │
└───────────────────────┴───────────────────────────┘
```

---

# 28. Empty States

### No findings

> Great news — no issues were detected by the current automated rules.

### No contact channels

> We did not detect a clear customer-contact channel on this page.

### Scan failed

> We could not complete the scan. The website may be temporarily unavailable or blocking automated requests.

---

# 29. Error UX

Every error includes:

- what happened,
- what it means,
- what the user can do next.

Avoid raw error codes in the main message.

---

# 30. Microinteractions

Use restrained motion for:

- scan progress,
- score count-up,
- pillar card reveal,
- finding expand/collapse,
- toast confirmation.

Avoid excessive animation during diagnostics because it can imply fake processing.

---

# 31. Copywriting Rules

Prefer:

- “Possible issue detected”
- “Customers may be unable to contact you”
- “Search visibility risk”
- “Suspicious code pattern detected”

Avoid unsupported claims:

- “You are hacked”
- “Google has penalized you”
- “You definitely lost ₹X”

unless verified by stronger evidence or user input.

---

# 32. Trust UI

Important trust elements:

- Scan timestamp,
- scanner version,
- evidence toggle,
- confidence indicator,
- methodology link,
- privacy link,
- security note.

Example:

> Automated diagnostic — not a penetration test.

---

# 33. Accessibility

- semantic headings,
- labeled inputs,
- keyboard support,
- visible focus rings,
- reduced motion support,
- color + text severity indicators,
- accessible modals,
- accessible progress announcements.

---

# 34. SEO / Public Page UI Requirements

Homepage and marketing pages must have:

- semantic H1,
- one primary page intent,
- meaningful link text,
- crawlable pricing/feature pages,
- structured metadata.

Public scan reports should not be indexable by default unless the user or product explicitly enables public SEO indexing.

---

# 35. Responsive Breakpoints

Suggested:

- Mobile: `< 640px`
- Tablet: `640–1023px`
- Desktop: `1024–1279px`
- Wide: `1280px+`

Do not design around exact device-specific pixel widths.

---

# 36. Component Inventory

### Shared

- Header
- Footer
- Button
- Badge
- Tooltip
- Modal
- Toast
- Tabs
- Accordion

### Scanner

- UrlInput
- ScanProgress
- ScoreGauge
- PillarCard
- FindingCard
- SeverityBadge
- EvidencePanel
- ScanSummary

### Report

- ReportHeader
- ReportExecutiveSummary
- PillarGrid
- FindingTable
- ReportCTA
- ReportDisclaimer

### Monitoring

- WatchdogForm
- MonitorTable
- MonitorStatus

### Dashboard

- MetricCard
- RecentScanTable
- AlertList

---

# 37. Interaction Contract

### Scan

`click → POST /api/scan → poll/read status → render result`

### Public report

`result → copy URL → share`

### PDF

`click → access check → generate → download`

### Monitoring

`submit contact → verify/accept → create monitor → confirmation`

---

# 38. UI Acceptance Criteria

The UI is complete when:

- homepage communicates product value in 5 seconds or less,
- scan starts with one primary action,
- mobile layout has no horizontal scrolling,
- results are readable without technical knowledge,
- all four pillars are visible,
- critical findings are obvious but not sensationalized,
- evidence is expandable,
- report URL is shareable,
- PDF CTA is visible,
- monitoring CTA is visible,
- errors have actionable messages,
- accessibility basics pass manual keyboard testing.

---

# 39. Final UI Hierarchy

```text
HOME
  ↓
SCAN
  ↓
OVERALL SCORE
  ↓
4 PILLARS
  ↓
CRITICAL FINDINGS
  ↓
DETAILED FINDINGS
  ↓
EVIDENCE
  ↓
FIX
  ↓
MONITOR
```

The user must never have to understand the internal rule engine to obtain value.
