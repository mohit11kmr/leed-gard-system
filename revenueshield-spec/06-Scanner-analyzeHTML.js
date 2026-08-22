// lib/scanner.js
export function analyzeHTML(html, baseUrl) {
  const results = {
    score: 100,
    whatsappLinks: [],
    phoneLinks: [],
    emailLinks: [],
    reviewLinks: [],
    socialLinks: [],
    brokenCount: 0
  };

  // 1. WHATSAPP LINK REGEX & INDIAN VALIDATION
  const waRegex = /(https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=)[^\s"'>]+)/gi;
  const waMatches = [...new Set(html.match(waRegex) || [])];

  if (waMatches.length === 0) {
    results.score -= 25;
    results.brokenCount++;
    results.whatsappLinks.push({
      url: 'No WhatsApp CTA detected',
      status: 'MISSING',
      issue: 'Direct chat missing. 60%+ mobile users leave without engaging.',
      isValid: false
    });
  } else {
    waMatches.forEach(link => {
      const digits = link.replace(/\D/g, '');
      const isDoubleCountryCode = digits.startsWith('9191');
      const isValidLength = digits.length >= 10 && digits.length <= 13;
      const isBroken = isDoubleCountryCode || !isValidLength;

      if (isBroken) {
        results.score -= 25;
        results.brokenCount++;
      }

      results.whatsappLinks.push({
        url: link,
        status: isBroken ? 'BROKEN' : 'WORKING',
        issue: isDoubleCountryCode 
          ? 'Double +91 country code detected (Chat fails to open)' 
          : (!isValidLength ? 'Invalid phone number length' : null),
        isValid: !isBroken
      });
    });
  }

  // 2. PHONE LINK VALIDATION (tel: format starting with 6-9)
  const telRegex = /href=["'](tel:[^"']+)["']/gi;
  let match;
  const foundTels = [];
  while ((match = telRegex.exec(html)) !== null) {
    foundTels.push(match[1]);
  }

  foundTels.forEach(tel => {
    const cleanDigits = tel.replace(/\D/g, '').slice(-10);
    const isIndianMobile = /^[6-9]\d{9}$/.test(cleanDigits);
    if (!isIndianMobile) {
      results.score -= 20;
      results.brokenCount++;
    }

    results.phoneLinks.push({
      url: tel,
      status: isIndianMobile ? 'WORKING' : 'BROKEN',
      issue: !isIndianMobile ? 'Invalid Indian phone format (Must be 10 digits starting with 6-9)' : null,
      isValid: isIndianMobile
    });
  });

  // 3. EMAIL LINK VALIDATION
  const mailRegex = /href=["'](mailto:[^"']+)["']/gi;
  while ((match = mailRegex.exec(html)) !== null) {
    const email = match[1].replace('mailto:', '').split('?')[0];
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      results.score -= 15;
      results.brokenCount++;
    }

    results.emailLinks.push({
      url: email,
      status: isValid ? 'WORKING' : 'BROKEN',
      isValid
    });
  }

  results.score = Math.max(0, results.score);
  results.estimatedLoss = results.brokenCount * 7500; // ₹7,500/mo per broken channel
  results.lockedIssuesCount = Math.max(0, results.brokenCount - 1);

  return results;
}