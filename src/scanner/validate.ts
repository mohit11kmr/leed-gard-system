import {
  EmailLink,
  PhoneLink,
  WhatsAppLink,
} from "./types";

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidIndianPhone(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export function validateWhatsAppLink(
  link: WhatsAppLink
): WhatsAppLink {
  const phone = link.phone;
  const isValid =
    phone !== null &&
    /^\d{10,15}$/.test(phone) &&
    /^[6-9]\d{9}$/.test(phone.length === 10 ? phone : phone.slice(-10));
  return {
    ...link,
    isValid,
    status: isValid ? "WORKING" : "BROKEN",
  };
}

export function validatePhoneLink(link: PhoneLink): PhoneLink {
  const number = link.number;
  const normalized =
    number.length === 12 && number.startsWith("91")
      ? number.slice(2)
      : number;
  const isValid = isValidIndianPhone(normalized);
  return {
    ...link,
    isValid,
    status: isValid ? "WORKING" : "BROKEN",
  };
}

export function validateEmailLink(link: EmailLink): EmailLink {
  const isValid = EMAIL_FORMAT_REGEX.test(link.email);
  return {
    ...link,
    isValid,
    status: isValid ? "WORKING" : "BROKEN",
  };
}

export function validateAll(
  whatsappLinks: WhatsAppLink[],
  phoneLinks: PhoneLink[],
  emailLinks: EmailLink[]
): {
  whatsappLinks: WhatsAppLink[];
  phoneLinks: PhoneLink[];
  emailLinks: EmailLink[];
} {
  return {
    whatsappLinks: whatsappLinks.map(validateWhatsAppLink),
    phoneLinks: phoneLinks.map(validatePhoneLink),
    emailLinks: emailLinks.map(validateEmailLink),
  };
}