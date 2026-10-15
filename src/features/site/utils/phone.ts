/**
 * Australian phone numbers for display and links. Accepts landlines and mobiles with or without
 * the +61 / 0 prefix, and the 13 / 1300 / 1800 numbers that can't be dialled from overseas.
 */

export interface AuPhone {
  /** For `tel:` links, e.g. "+61298765432", or "1300123456" for numbers only dialable in Australia. */
  href: string
  /** For structured data, which wants an international number where one exists. */
  telephone: string
}

export function parseAuPhone(value: string): AuPhone | null {
  const digits = value.replace(/[\s().-]/g, '')
  if (/^(13\d{4}|1[38]00\d{6})$/.test(digits)) return { href: digits, telephone: digits }

  const national = /^\+?61(\d{9})$/.exec(digits)?.[1] ?? /^0(\d{9})$/.exec(digits)?.[1]
  // Area codes and mobile prefixes start 2, 3, 4, 7 or 8; 5, 6 and 9 aren't used.
  if (!national || !/^[23478]/.test(national)) return null
  const e164 = `+61${national}`
  return { href: e164, telephone: e164 }
}
