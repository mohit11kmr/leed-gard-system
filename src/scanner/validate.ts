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
  let isValid = true;
  let issue: string | null = null;
  let suggestedFix: string | null = null;

  if (phone === null) {
    isValid = false;
    issue = "No phone number found inside the WhatsApp link.";
  } else if (/^9191/.test(phone) && phone.length > 12) {
    isValid = false;
    issue = `Double +91 country code detected (number has ${phone.length} digits). This chat fails to open in the WhatsApp mobile app — customers think nobody is listening.`;
    const fixed = phone.slice(2);
    if (/^91[6-9]\d{9}$/.test(fixed)) {
      suggestedFix = `Change the link to https://wa.me/${fixed}`;
    }
  } else if (/^\d{10}$/.test(phone) && /^[6-9]/.test(phone)) {
    isValid = false;
    issue =
      "Missing +91 country code. wa.me links need the full international format, otherwise the chat does not open on many devices.";
    suggestedFix = `Change the link to https://wa.me/91${phone}`;
  } else if (
    !(/^\d{10,15}$/.test(phone) && /^[6-9]\d{9}$/.test(phone.slice(-10)))
  ) {
    isValid = false;
    issue = `Invalid number format (${phone.length} digits). Standard format is 91 + 10-digit Indian mobile starting with 6-9.`;
  }

  return {
    ...link,
    isValid,
    status: isValid ? "WORKING" : "BROKEN",
    issue,
    suggestedFix,
  };
}

export function validatePhoneLink(link: PhoneLink): PhoneLink {
  const normalized =
    link.number.length === 12 && link.number.startsWith("91")
      ? link.number.slice(2)
      : link.number;
  const isValid = isValidIndianPhone(normalized);
  let issue: string | null = null;
  let suggestedFix: string | null = null;
  if (!isValid) {
    issue = `Invalid click-to-call number (${link.number.length} digits). Must be a 10-digit Indian mobile number starting with 6-9.`;
    if (/^[6-9]\d{9}$/.test(normalized.replace(/\D/g, "").slice(-10))) {
      suggestedFix = `Update the link to tel:+91${normalized.replace(/\D/g, "").slice(-10)}`;
    }
  }
  return {
    ...link,
    isValid,
    status: isValid ? "WORKING" : "BROKEN",
    issue,
    suggestedFix,
  };
}

export function validateEmailLink(link: EmailLink): EmailLink {
  const isValid = EMAIL_FORMAT_REGEX.test(link.email);
  let issue: string | null = null;
  let suggestedFix: string | null = null;
  if (!isValid) {
    issue = "Malformed email address in mailto: link. Enquiries sent here bounce or never open a compose window.";
    suggestedFix = "Replace with a valid business email, e.g. info@yourdomain.com";
  }
  return {
    ...link,
    isValid,
    status: isValid ? "WORKING" : "BROKEN",
    issue,
    suggestedFix,
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
