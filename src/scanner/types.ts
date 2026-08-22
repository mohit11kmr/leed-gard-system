export type LinkStatus = "WORKING" | "BROKEN" | "MISSING" | "DETECTED";

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "youtube";

export interface WhatsAppLink {
  url: string;
  phone: string | null;
  status: LinkStatus;
  isValid: boolean;
  issue?: string | null;
  suggestedFix?: string | null;
}

export interface PhoneLink {
  url: string;
  number: string;
  status: LinkStatus;
  isValid: boolean;
  issue?: string | null;
  suggestedFix?: string | null;
}

export interface ReviewLink {
  url: string;
  platform: string;
  status: LinkStatus;
  isValid: boolean;
}

export interface SocialLink {
  url: string;
  platform: SocialPlatform;
  status: LinkStatus;
  isValid: boolean;
}

export interface EmailLink {
  email: string;
  url: string;
  status: LinkStatus;
  isValid: boolean;
  issue?: string | null;
  suggestedFix?: string | null;
}

export type SecurityFindingType =
  | "spam_content"
  | "hidden_links"
  | "suspicious_script";

export interface SecurityFinding {
  type: SecurityFindingType;
  severity: "warning" | "danger";
  detail: string;
  evidence: string[];
  ruleId?: string;
  confidence?: number;
}

export interface SecurityCheck {
  status: "CLEAN" | "WARNING" | "DANGER";
  findings: SecurityFinding[];
}

export interface ScanResult {
  score: number;
  estimatedLoss: number;
  security: SecurityCheck;
  pillars: Pillars;
  tracking: TrackingSignal[];
  adFindings: AdShieldFinding[];
  seoFindings: SeoFinding[];
  whatsappLinks: WhatsAppLink[];
  phoneLinks: PhoneLink[];
  reviewLinks: ReviewLink[];
  socialLinks: SocialLink[];
  emailLinks: EmailLink[];
  scanStats: {
    totalLinks: number;
    workingLinks: number;
    brokenLinks: number;
  };
  summary: {
    successRate: number;
  };
  performance: {
    fetchTime: number;
    parseTime: number;
    totalTime: number;
  };
}

export interface ScanFailure {
  error: string;
  performance?: {
    fetchTime: number;
    parseTime: number;
    totalTime: number;
  };
}

export interface FetchResult {
  html: string;
  finalUrl: string;
  fetchTime: number;
}

export class ScanError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const DEDUCTIONS = {
  brokenWhatsApp: 25,
  invalidPhone: 20,
  invalidEmail: 15,
} as const;

export const DEFAULT_TIMEOUT_MS = 10000;
export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 1000;

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface TrackingSignal {
  platform: "META" | "GOOGLE_TAG" | "GA4" | "GTM";
  detected: boolean;
  evidence: string[];
  confidence: number;
}

export interface AdShieldFinding {
  ruleId: string;
  severity: Severity;
  message: string;
}

export interface SeoFinding {
  ruleId: string;
  severity: Severity;
  message: string;
  source?: string;
}

export interface PillarResult {
  score: number;
  issueCount: number;
  summary: string;
}

export interface Pillars {
  lead: PillarResult;
  adshield: PillarResult;
  seo: PillarResult;
  cyber: PillarResult;
}
