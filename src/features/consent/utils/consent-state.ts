export const CONSENT_STORAGE_KEY = 'consent'

/** Bump when the categories change, so visitors are asked again. */
export const CONSENT_VERSION = 1

/** `necessary` is always on: the site cannot work without it, so it is never a choice. */
export interface Consent {
  necessary: true
  analytics: boolean
  marketing: boolean
}

/** A saved choice. `savedAt` records when it was made. */
export interface StoredConsent extends Consent {
  version: number
  savedAt: string
}

export const ACCEPT_ALL: Consent = { necessary: true, analytics: true, marketing: true }
export const REJECT_ALL: Consent = { necessary: true, analytics: false, marketing: false }

export function serializeConsent(consent: Consent, now: Date): string {
  const stored: StoredConsent = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    savedAt: now.toISOString(),
  }
  return JSON.stringify(stored)
}

/** Reads what `serializeConsent` wrote. Anything unreadable or from another version counts as "no choice yet". */
export function parseConsent(raw: string | null): StoredConsent | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<StoredConsent> | null
    if (
      value?.version !== CONSENT_VERSION ||
      typeof value.analytics !== 'boolean' ||
      typeof value.marketing !== 'boolean' ||
      typeof value.savedAt !== 'string'
    ) {
      return null
    }
    return {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: value.analytics,
      marketing: value.marketing,
      savedAt: value.savedAt,
    }
  } catch {
    return null
  }
}
