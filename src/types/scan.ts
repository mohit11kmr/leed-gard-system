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
  security?: SecurityCheck;
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

export type ScanStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ScanStatusResponse {
  id: string;
  url: string;
  status: ScanStatus;
  score: number | null;
  result: ScanResult | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface HistoryEntry {
  id: string;
  url: string;
  score: number | null;
  status: ScanStatus;
  error: string | null;
  result: ScanResult | null;
  scannedAt: string;
}

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
