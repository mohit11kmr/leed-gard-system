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