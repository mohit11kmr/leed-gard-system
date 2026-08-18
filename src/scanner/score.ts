import { DEDUCTIONS } from "./types";

export interface ScoreBreakdown {
  score: number;
  deductions: {
    brokenWhatsApp: number;
    invalidPhone: number;
    invalidEmail: number;
  };
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