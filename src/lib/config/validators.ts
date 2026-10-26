import type { SettingFormat } from '@/config/feature-config'

const EMAIL = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/

/** A bare address, or `Name <address>` (the two forms Resend documents for `from`). */
function isEmailWithName(value: string) {
  const named = /^[^<>]*<([^<>]+)>$/.exec(value.trim())
  return EMAIL.test(named?.[1]?.trim() ?? value.trim())
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

const CHECKS: Record<
  SettingFormat,
  { valid: (value: string) => boolean; expects: string; suggestion: string }
> = {
  'sanity-project-id': {
    valid: (value) => /^[a-z0-9-]+$/.test(value),
    expects: 'lowercase letters, numbers and dashes',
    suggestion: 'Copy the Project ID from sanity.io/manage → your project.',
  },
  'sanity-dataset': {
    valid: (value) => /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value),
    expects: 'lowercase letters, numbers, dashes and underscores',
    suggestion:
      'Use the dataset name exactly as sanity.io/manage shows it, for example production.',
  },
  'https-url': {
    valid: isHttpsUrl,
    expects: 'an address starting with https://',
    suggestion: 'Use the full live address, for example https://example.com.au.',
  },
  'email-with-name': {
    valid: isEmailWithName,
    expects: 'an email address, or Name <address>',
    suggestion:
      'Use an address on a domain verified in Resend, for example Site name <forms@example.com.au>.',
  },
  'off-switch': {
    valid: (value) => value === 'off',
    expects: 'the word "off", or nothing',
    suggestion: 'Set it to off to switch the check off, or delete the variable to switch it on.',
  },
}

/**
 * What is wrong with a value, in words, or null when it passes. The text never contains the value
 * (it may be a secret), only what the setting expects.
 */
export function validateFormat(format: SettingFormat, value: string): string | null {
  const check = CHECKS[format]
  return check.valid(value) ? null : `expects ${check.expects}`
}

/** What to change, in words. Never contains the value. */
export function suggestFormat(format: SettingFormat): string {
  return CHECKS[format].suggestion
}
