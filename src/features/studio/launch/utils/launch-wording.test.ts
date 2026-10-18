import { describe, expect, it } from 'vitest'

import {
  clientSentence,
  domainOf,
  launchBanner,
  launchSteps,
  seesChecklist,
  statusLine,
} from './launch-wording'

const pre = { status: 'prelaunch', homepageTitle: 'Links', domain: 'example.com.au' } as const
const live = { ...pre, status: 'live' } as const

describe('launch wording', () => {
  it('the agency status line says what visitors see, or Live', () => {
    expect(statusLine(pre)).toBe('Pre-launch: visitors see Links at /')
    expect(statusLine(live)).toBe('Live')
  })

  it('the client gets one plain sentence', () => {
    expect(clientSentence(pre)).toBe(
      'Your website is in pre-launch. Visitors see your Link page at example.com.au. Currawong will launch the full site.',
    )
    expect(clientSentence(live)).toBe('Your website is live.')
  })

  it('does not call a Coming soon page a Link page', () => {
    expect(clientSentence({ ...pre, homepageIsLinkPage: false })).toBe(
      'Your website is in pre-launch. Visitors see a temporary page at example.com.au. Currawong will launch the full site.',
    )
    expect(clientSentence({ ...pre, homepageIsLinkPage: true })).toBe(clientSentence(pre))
  })

  it('the Start here banner shows only before launch', () => {
    expect(launchBanner(pre)).toBe(clientSentence(pre))
    expect(launchBanner(live)).toBeNull()
  })

  it('shows the checklist to agency staff only', () => {
    expect(seesChecklist('agency')).toBe(true)
    expect(seesChecklist('editor')).toBe(false)
  })

  it('gives the domain without the scheme', () => {
    expect(domainOf('https://example.com.au/')).toBe('example.com.au')
    expect(domainOf('http://localhost:3000')).toBe('localhost:3000')
    expect(domainOf('example.com.au/')).toBe('example.com.au')
  })

  it('has three launch steps that name the domain and the checks', () => {
    const steps = launchSteps('example.com.au')
    expect(steps).toHaveLength(3)
    expect(steps[1]).toContain("launch.status to 'live'")
    expect(steps[1]).toContain('--bypass --expect-origin=https://example.com.au')
    expect(steps[2]).toContain('npm run launch:check -- https://example.com.au')
  })

  it('uses Australian English', () => {
    const text = [statusLine(pre), clientSentence(pre), ...launchSteps('x.com.au')].join(' ')
    expect(text).not.toMatch(/\b(color|organize|customize)/i)
  })
})
