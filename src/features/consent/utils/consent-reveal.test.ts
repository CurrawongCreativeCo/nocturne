import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { ACCEPT_ALL, REJECT_ALL, parseConsent, serializeConsent } from '@/lib/consent/consent-state'

import { CONSENT_REVEAL_SCRIPT } from './consent-reveal'

describe('consent before first paint', () => {
  it('agrees with the consent store for saved choices, expired versions and malformed storage', () => {
    const date = new Date('2026-10-22T00:00:00Z')
    const saved = serializeConsent(ACCEPT_ALL, date)
    for (const raw of [
      null,
      '',
      '{',
      'null',
      '{}',
      saved,
      serializeConsent(REJECT_ALL, date),
      saved.replace('"version":1', '"version":0'),
      saved.replace('"analytics":true', '"analytics":"true"'),
      saved.replace('"savedAt":"2026-10-22T00:00:00.000Z"', '"savedAt":null'),
    ]) {
      const region = { hidden: true }
      runInNewContext(CONSENT_REVEAL_SCRIPT, {
        document: { currentScript: { parentElement: region } },
        localStorage: { getItem: () => raw },
      })
      expect(region.hidden).toBe(parseConsent(raw) !== null)
    }
  })

  it('shows the controls when storage is blocked', () => {
    const region = { hidden: true }
    runInNewContext(CONSENT_REVEAL_SCRIPT, {
      document: { currentScript: { parentElement: region } },
      localStorage: {
        getItem: () => {
          throw new Error('Blocked')
        },
      },
    })
    expect(region.hidden).toBe(false)
  })
})
