import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { PRELAUNCH_LAUNCH, launchLine, setLaunchInProfile } from './profile-edit.mjs'

const shipped = readFileSync(new URL('../../site.profile.ts', import.meta.url), 'utf8')
const LINE = "launch: { status: 'prelaunch', homepage: 'links' },"

describe('setLaunchInProfile', () => {
  it('writes the pre-launch block', () => {
    expect(launchLine(PRELAUNCH_LAUNCH)).toBe(LINE)
  })

  it('turns on the commented example and changes nothing else', () => {
    const sample = `  features: {},\n  // Left out, the site is live.\n  // launch: { status: 'prelaunch', homepage: 'links', publicPages: [], unknownPaths: 'not-found' },\n  clientSections: [],\n`
    const result = setLaunchInProfile(sample)
    expect(result).toEqual({
      ok: true,
      changed: true,
      text: `  features: {},\n  // Left out, the site is live.\n  ${LINE}\n  clientSections: [],\n`,
    })
  })

  it('round-trips the real site.profile.ts: only the launch line differs', () => {
    const result = setLaunchInProfile(shipped)
    if (!result.ok) throw new Error(result.reason)
    const before = shipped.split('\n')
    const after = result.text.split('\n')
    expect(after).toHaveLength(before.length)
    const changed = after.filter((line, i) => line !== before[i])
    expect(changed).toEqual([`  ${LINE}`])
  })

  it('is idempotent', () => {
    const once = setLaunchInProfile(shipped)
    if (!once.ok) throw new Error(once.reason)
    expect(setLaunchInProfile(once.text)).toEqual({ ok: true, changed: false, text: once.text })
  })

  it('replaces an active launch line, keeping its indent', () => {
    const text = "  client: {},\n    launch: { status: 'live' },\n  clientSections: [],\n"
    expect(setLaunchInProfile(text)).toMatchObject({
      ok: true,
      text: `  client: {},\n    ${LINE}\n  clientSections: [],\n`,
    })
  })

  it('adds the line above clientSections when there is none', () => {
    const text = '  features: {},\n  clientSections: [],\n'
    expect(setLaunchInProfile(text)).toMatchObject({
      ok: true,
      text: `  features: {},\n  ${LINE}\n  clientSections: [],\n`,
    })
  })

  it('leaves a multi-line block, or a file it does not recognise, alone', () => {
    expect(setLaunchInProfile('  launch: {\n    status: "live",\n  },\n')).toMatchObject({
      ok: false,
    })
    expect(setLaunchInProfile('export const x = 1\n')).toMatchObject({ ok: false })
  })
})
