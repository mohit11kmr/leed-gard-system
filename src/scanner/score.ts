import { DEDUCTIONS } from "./types";

export const MONTHLY_LOSS_PER_BROKEN_LINK = 7500;

export interface ScoreBreakdown {
  score: number;
  deductions: {
    brokenWhatsApp: number;
    invalidPhone: number;
    invalidEmail: number;
  };
}

export function estimateMonthlyLoss(brokenLinks: number): number {
  return brokenLinks * MONTHLY_LOSS_PER_BROKEN_LINK;
}

export function calculateScore(params: {
  brokenWhatsAppCount: number;
  invalidPhoneCount: number;
  invalidEmailCount: number;
}): ScoreBreakdown {
  const brokenWhatsApp = params.brokenWhatsAppCount * DEDUCTIONS.brokenWhatsApp;
  const invalidPhone = params.invalidPhoneCount * DEDUCTIONS.invalidPhone;
  const invalidEmail = params.invalidEmailCount * DEDUCTIONS.invalidEmail;

  const score = Math.max(
    0,
    100 - brokenWhatsApp - invalidPhone - invalidEmail
  );

  return {
    score,
    deductions: { brokenWhatsApp, invalidPhone, invalidEmail },
  };
}
const SEVERITY_MULTIPLIER: Record<string, number> = {
  CRITICAL: 1.0,
  HIGH: 0.75,
  MEDIUM: 0.45,
  LOW: 0.2,
  INFO: 0,
};

const PILLAR_PENALTY_CAP = { adshield: 70, seo: 80, cyber: 90 };

function penalty(
  findings: { severity: string }[],
  cap: number
): number {
  const raw = findings.reduce(
    (sum, f) => sum + 25 * (SEVERITY_MULTIPLIER[f.severity] ?? 0.45),
    0
  );
  return Math.min(cap, raw);
}

export function scoreAdPillar(findings: { severity: string }[]): number {
  return Math.max(30, 100 - penalty(findings, PILLAR_PENALTY_CAP.adshield));
}

export function scoreSeoPillar(findings: { severity: string }[]): number {
  return Math.max(20, 100 - penalty(findings, PILLAR_PENALTY_CAP.seo));
}

export function scoreCyberPillar(
  findings: { severity: "warning" | "danger" }[]
): number {
  const raw = findings.reduce((sum, f) => sum + (f.severity === "danger" ? 35 : 12), 0);
  return Math.max(10, 100 - Math.min(PILLAR_PENALTY_CAP.cyber, raw));
}

function envWeight(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : fallback;
}

const W_LEAD = envWeight("WEIGHT_LEAD", 0.35);
const W_AD = envWeight("WEIGHT_AD", 0.2);
const W_SEO = envWeight("WEIGHT_SEO", 0.2);
const W_CYBER = envWeight("WEIGHT_CYBER", 0.25);

export function calculateOverallScore(input: {
  leadScore: number;
  adScore: number;
  seoScore: number;
  cyberScore: number;
}): number {
  const overall =
    input.leadScore * W_LEAD +
    input.adScore * W_AD +
    input.seoScore * W_SEO +
    input.cyberScore * W_CYBER;
  return Math.round(Math.max(0, Math.min(100, overall)));
}
