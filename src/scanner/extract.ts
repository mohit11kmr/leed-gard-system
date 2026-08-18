import {
  EmailLink,
  PhoneLink,
  ReviewLink,
  SocialLink,
  SocialPlatform,
  WhatsAppLink,
} from "./types";

export const WA_REGEX =
  /(?:href=["'])?(https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)[^\s"'<>]+)/gi;
export const TEL_REGEX = /href=["'](tel:[^"']+)["']/gi;
export const REVIEW_REGEX =
  /(https?:\/\/(?:g\.page|maps\.google\.com|goo\.gl\/maps|google\.com\/maps)[^\s"'<>]*)/gi;
export const EMAIL_REGEX = /href=["']mailto:([^"'?]+)["']/gi;
export const FACEBOOK_REGEX = /(https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+)/gi;
export const INSTAGRAM_REGEX = /(https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+)/gi;
export const TWITTER_REGEX = /(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+)/gi;
export const LINKEDIN_REGEX = /(https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+)/gi;
export const YOUTUBE_REGEX =
  /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<>]+)/gi;

const PLATFORM_MAP: Array<{ regex: RegExp; platform: SocialPlatform }> = [
  { regex: FACEBOOK_REGEX, platform: "facebook" },
  { regex: INSTAGRAM_REGEX, platform: "instagram" },
  { regex: TWITTER_REGEX, platform: "twitter" },
  { regex: LINKEDIN_REGEX, platform: "linkedin" },
  { regex: YOUTUBE_REGEX, platform: "youtube" },
];

function uniqueUrls(list: string[]): string[] {
  return Array.from(new Set(list));
}

function extractWithRegex(html: string, regex: RegExp): string[] {
  const matches: string[] = [];
  regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    matches.push(m[1] ?? m[0]);
  }
  return uniqueUrls(matches);
}

export function extractWhatsAppLinks(html: string): WhatsAppLink[] {
  return extractWithRegex(html, WA_REGEX).map((url) => ({
    url,
    phone: extractWhatsAppPhone(url),
    status: "WORKING" as const,
    isValid: true,
  }));
}

export function extractPhoneLinks(html: string): PhoneLink[] {
  return extractWithRegex(html, TEL_REGEX).map((href) => {
    const url = href.startsWith("tel:") ? href : `tel:${href}`;
    const raw = href.replace(/^tel:/i, "");
    const number = raw.replace(/\D/g, "");
    return { url, number, status: "WORKING" as const, isValid: true };
  });
}

export function extractReviewLinks(html: string): ReviewLink[] {
  return extractWithRegex(html, REVIEW_REGEX).map((url) => {
    let platform = "Google Maps";
    if (/g\.page/.test(url)) platform = "Google Page";
    if (/goo\.gl/.test(url)) platform = "Google Short Link";
    return { url, platform, status: "DETECTED" as const, isValid: true };
  });
}

export function extractSocialLinks(html: string): SocialLink[] {
  const found: SocialLink[] = [];
  for (const { regex, platform } of PLATFORM_MAP) {
    for (const url of extractWithRegex(html, regex)) {
      found.push({ url, platform, status: "DETECTED" as const, isValid: true });
    }
  }
  const seen = new Set<string>();
  return found.filter((l) => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

export function extractEmailLinks(html: string): EmailLink[] {
  return extractWithRegex(html, EMAIL_REGEX).map((email) => ({
    email: email.trim(),
    url: `mailto:${email.trim()}`,
    status: "WORKING" as const,
    isValid: true,
  }));
}

export function extractWhatsAppPhone(url: string): string | null {
  const u = new URL(url);
  if (u.hostname === "wa.me") {
    return u.pathname.replace(/^\/+/, "").split("/")[0] || null;
  }
  if (u.hostname === "api.whatsapp.com") {
    return u.searchParams.get("phone");
  }
  return null;
}

export function extractAllLinks(html: string): {
  whatsappLinks: WhatsAppLink[];
  phoneLinks: PhoneLink[];
  reviewLinks: ReviewLink[];
  socialLinks: SocialLink[];
  emailLinks: EmailLink[];
} {
  return {
    whatsappLinks: extractWhatsAppLinks(html),
    phoneLinks: extractPhoneLinks(html),
    reviewLinks: extractReviewLinks(html),
    socialLinks: extractSocialLinks(html),
    emailLinks: extractEmailLinks(html),
  };
}