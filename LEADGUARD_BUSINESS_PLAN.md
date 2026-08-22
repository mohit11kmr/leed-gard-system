# LeadGuard Scanner — Business Plan (India)

**Version:** 1.0 | **Date:** 18 Aug 2026
**Product:** LeadGuard Scanner — website contact-link health check (WhatsApp / phone / email)
**Status:** MVP live & verified (307 real sites scanned, 116 found losing leads)

---

## 1. Executive Summary

LeadGuard is a tool that finds broken WhatsApp, phone, email, and review links on
websites — the exact reason small Indian businesses quietly lose leads every day.

We already proved the problem is real: **116 of 307 scanned Indian SME websites
have dead contact links, no contact links at all, or are unreachable.**

The business is a **3-tier hybrid**:

1. **Tier 1 — Paid Audit & Fix** (one-time, ₹2,999–4,999): use the scanner to
   produce a branded PDF report, fix the links, deliver proof.
2. **Tier 2 — Monitoring SaaS** (₹99–499/month): scheduled re-scans + WhatsApp /
   email alerts when a link breaks.
3. **Tier 3 — Agency / White-label** (₹999+/month): web agencies resell the
   tool to their own clients under their brand.

Start with Tier 1 using the existing 116-site lead list. No code needed to sell
the first audits — the scanner already works.

---

## 2. Problem & Solution

### Problem
- WhatsApp buttons with dead numbers (`wa.me/+9199…` wrong format, 11-digit
  numbers, stale owner numbers).
- `tel:` links with the country code pasted twice (`91208091333638`) → calls fail.
- Sites with **zero** click-to-chat links → customers can't reach the business.
- Businesses don't know. They only see "sales kam hain".

### Proof (from this project's live scans)
| Finding | Sites |
|---|---|
| Broken contact links (WA/phone/email) | 80 |
| Zero contact links (no WhatsApp/call button) | 26 |
| Completely unreachable (site down / DNS / 403) | 10 |
| **Total losing-lead sites** | **116** |

### Solution
One-click scan → 0–100 health score → clear report of exactly which links are
broken and why → fix → optional monitoring.

---

## 3. Business Model & Pricing (₹)

### Tier 1 — Audit & Fix (one-time)
| Offer | Price | Includes |
|---|---|---|
| **Quick Audit** | ₹2,999 | PDF report (score, broken links, fixes) |
| **Audit + Fix** | ₹4,999 | Report + repair all WA/phone/email links (1–2 hrs) |
| **Audit + Fix + Setup Monitoring** | ₹6,999 | Report + fix + 30-day monitoring trial |

Delivery: report within 24 hrs, fix within 48 hrs. Deposit 50% before start.

### Tier 2 — Monitoring SaaS (subscription)
| Plan | Price | Includes |
|---|---|---|
| **Starter** | ₹99/mo | 1 site, weekly re-scan, email alert on break |
| **Pro** | ₹299/mo | 5 sites, daily re-scan, WhatsApp + email alert |
| **Agency** | ₹999/mo | 25 sites, white-label report, client dashboard |

Tier 2 is the recurring engine: ₹299 × 100 clients = ₹29,900/month MRR.

### Tier 3 — White-label for agencies
Agencies pay ₹999/mo, charge their clients ₹1,999/mo under their brand. Zero
outreach cost for us; partner-driven distribution.

---

## 4. Target Market (TAM/SAM/SOM)

- **TAM:** ~40M+ Indian SMBs (Census/MSME data). All need working contact links.
- **SAM:** SMBs with a website that uses WhatsApp/phone for leads —
  coaching, real estate, clinics/dental, salons, travel, interior design,
  jewellery, boutiques, CA firms, gyms, restaurants, repair shops (the exact
  categories we scanned).
- **SOM (12 months):** 300 paying sites. Realistic at our scale:
  - 116 existing leads → target 8–12 paid Tier-1 audits (≈₹35–60k) in first 90 days
  - convert 30% of audit clients to Pro monitoring (₹299/mo)
  - 2–3 agency partners in year 1

---

## 5. Sales & Marketing Funnel

```
Scan free (tool itself) ──► Free report shown in UI
        │
        ▼
Outreach (116 leads already in lost-leads-report.csv)
        │
        ▼
Paid audit (Tier 1) ──► PDF report delivered
        │
        ▼
Monitoring upsell (Tier 2) ──► recurring revenue
        │
        ▼
Agency/white-label partners (Tier 3)
```

### Outreach channels
1. **WhatsApp** — direct to the 116 businesses (best for Indian SMBs)
2. **Email** — PDF of *their own site's* broken report = impossible to ignore
3. **Web developers / agencies** — find who built these sites, pitch white-label
4. **Google Business Profile communities, local business FB groups** — content marketing

### Cold outreach script (WhatsApp / email) — Hinglish

> Namaste [Owner name],
> Maine aapki website scan ki — **aapka WhatsApp button aaj bhi us number pe ja
> raha hai jo abhi kaam nahi kar raha.** Matlab jo customer aapko WhatsApp karna
> chahta hai, wo pohoch nahi paata.
>
> Maine poori site ka ek free report banayi hai: [link to their report page]
> Isme exact broken links aur fix dikhta hai. Agar chaho to 24 ghante me fix kar
> ke de deta hu (₹4,999, report free).
>
> Batao, report dekhna chaho? — [Your name]

**Rule:** always send *their own data* first. Never pitch blind. The report IS
the sales pitch.

---

## 6. Product Roadmap (code to build — later phases)

| # | Feature | Tier | Priority |
|---|---|---|---|
| 1 | Branded PDF report (logo, colour, watermark) | 1 | P0 — blocks Tier 1 sales |
| 2 | Shareable public report link (no login for client) | 1 | P0 |
| 3 | Scheduled re-scans (node-cron / BullMQ repeat jobs) | 2 | P1 |
| 4 | Email alerts (Nodemailer/SMTP) on break | 2 | P1 |
| 5 | WhatsApp alerts (wa.me deep link or BSP like Twilio) | 2 | P1 |
| 6 | Multi-page domain crawl (sitemap + links) | 3 | P2 |
| 7 | Payment gateway (Razorpay) + plan quotas | 2/3 | P2 |
| 8 | Client dashboard + webhook to WhatsApp notification | 2/3 | P2 |
| 9 | Fix-tooling (bulk rewrite of WA/phone links) | 1 | P2 |

---

## 7. Operations & Delivery

- **Lead pipeline:** scanner DB → qualified list (`lost-leads-report.csv`) →
  outreach tracker (simple spreadsheet or Airtable).
- **Delivery:** audit report auto-generated from scan result + PDF template;
  human does the fix (or a dev tool at P2).
- **Billing:** 50% advance (UPI/bank), balance on delivery. Razorpay later.
- **Support:** WhatsApp business account (single inbox).

---

## 8. Financial Projections (12 months, conservative)

| Item | M1–3 | M4–6 | M7–9 | M10–12 |
|---|---|---|---|---|
| Tier-1 audits (one-time) | ₹45k (12 audits) | ₹30k (8) | ₹30k (8) | ₹30k (8) |
| Tier-2 MRR | ₹3k (10 subs) | ₹15k (50 subs) | ₹30k (100 subs) | ₹45k (150 subs) |
| Tier-3 partners | ₹0 | ₹5k | ₹10k | ₹20k |
| **Total revenue** | **~₹48k** | **~₹50k** | **~₹70k** | **~₹95k** |
| **Year 1 total** | | | | **≈ ₹2.5–3.5 lakh** |

Costs: Vercel/Railway (~₹500/mo), domain/email (~₹300/mo), WhatsApp BSP later.
Margin ≈ 90%.

Breakeven: month 1–2 (fixed costs negligible).

---

## 9. Competition

| Player | Weakness vs us |
|---|---|
| Free link checkers (W3C, brokenlinkcheck.com) | Generic; no WhatsApp/Indian-phone logic, no report, no fix |
| Screaming Frog / paid crawlers | Technical, priced for agencies, not for a small business owner |
| Manual agency audits | Slow, ₹10k+, not data-backed |
| **Us** | WhatsApp-first, Indian phone validation, 0–100 score, fix + monitor, report = sales pitch |

Moats: (1) the scoring algorithm tuned for Indian contact links, (2) the growing
broken-link database, (3) agency partnerships.

---

## 10. Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Low conversion on outreach | Send personalised broken-link proof; follow up 3× (day 1, 3, 7) |
| Site owners don't care | Target categories with highest broken rates; sell "leads recovery", not "link check" |
| Free tools undercut | Free = one-shot check only; we sell fix + monitoring, not just detection |
| Scalability of manual fixes | Build fix-tooling (P2); agencies do fixes themselves in Tier 3 |
| WhatsApp number changes again | Monitoring (Tier 2) = reason to stay subscribed |

---

## 11. 90-Day Action Plan

**Week 1–2 (Setup)**
- [ ] Brand PDF report template (manual design or code P0)
- [ ] Public report links so outreach can point to live proof
- [ ] Outreach tracker + WhatsApp Business account + email (hello@domain)

**Week 3–6 (First sales)**
- [ ] Message the 116 leads (batch 20/day) with their report
- [ ] Deliver first 5–8 paid audits; collect testimonials
- [ ] Measure conversion rate (target ≥ 5%)

**Week 7–10 (Recurring)**
- [ ] Build scheduled re-scan + email alert (P1) → convert audit clients to Pro
- [ ] Price test: ₹299 vs ₹399 for Pro

**Week 11–12 (Scale)**
- [ ] Pitch 3–5 web agencies for white-label (Tier 3)
- [ ] Re-run a fresh 200-site scan to refresh the lead list (new broken sites appear weekly)

---

## 12. KPIs to Track

- Outreach → audit conversion (target ≥ 5%)
- Audit → monitoring conversion (target ≥ 30%)
- MRR & churn (target < 5%/mo)
- Average scan time ≤ 12s (already ~3–5s)
- New broken sites found per re-scan (content engine for outreach)
- Referral rate from happy audit clients

---

## 13. Immediate Next Action (before any code)

1. Pick **10 sites** from `lost-leads-report.csv` with the most broken WhatsApp
   links (highest lead-loss) → generate a one-page PDF/screenshot report for each.
2. Message those 10 owners via WhatsApp with their report.
3. If ≥1 pays → build PDF report feature (P0) properly, then scale outreach.

> **The scanner already generates the value. The business is: package it, prove
> it, sell it, and keep monitoring it.**