import { describe, expect, it } from 'vitest'

import {
  ACCEPT_ALL,
  CONSENT_VERSION,
  parseConsent,
  REJECT_ALL,
  serializeConsent,
} from './consent-state'

const NOW = new Date('2026-10-13T10:00:00Z')

describe('consent state', () => {
  it('round-trips a choice and records when it was made', () => {
    const stored = parseConsent(serializeConsent({ ...REJECT_ALL, analytics: true }, NOW))
    expect(stored).toEqual({
      version: CONSENT_VERSION,
      necessary: true,
      analytics: true,
      marketing: false,
      savedAt: NOW.toISOString(),
    })
  })

  it('treats a missing, broken or foreign value as no choice yet', () => {
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent('')).toBeNull()
    expect(parseConsent('not json')).toBeNull()
    expect(parseConsent('null')).toBeNull()
    expect(parseConsent('{"version":1,"analytics":"yes","marketing":false}')).toBeNull()
  })

  it('asks again when the version changed', () => {
    const old = serializeConsent(ACCEPT_ALL, NOW).replace(
      `"version":${String(CONSENT_VERSION)}`,
      '"version":0',
    )
    expect(parseConsent(old)).toBeNull()
  })
})
