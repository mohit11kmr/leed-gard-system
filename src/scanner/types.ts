export type LinkStatus = "WORKING" | "BROKEN" | "DETECTED";

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
}

export interface PhoneLink {
  url: string;
  number: string;
  status: LinkStatus;
  isValid: boolean;
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
}

export interface ScanResult {
  score: number;
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