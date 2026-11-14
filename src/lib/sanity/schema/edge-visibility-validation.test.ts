import { describe, expect, it, vi } from 'vitest'

import type { SectionStyleInput } from '@/components/ui/section-style'

import { edgeVisibilityFor } from './edge-visibility-validation'

const DARK_LAGOON: SectionStyleInput = {
  tone: 'inverse',
  edge: 'lagoon',
  edgePalette: 'highlight',
  edgeStrength: 'strong',
}

/** Brand colours as Design settings returns them: nothing set, so the defaults. */
type Client = Parameters<typeof edgeVisibilityFor>[1]
const reading = () => {
  const fetch = vi.fn(() => Promise.resolve(null))
  return { fetch, client: { fetch } as unknown as Client }
}

describe('the Studio’s visibility advisory', () => {
  it('measures a faint layer against the site’s colours', async () => {
    const result = await edgeVisibilityFor(DARK_LAGOON, reading().client)
    expect(result.state).toBe('faint')
    expect(result.message).toMatch(/1\.14:1/)
  })

  it('gives no number when the colour read fails, and points to Preview', async () => {
    const failing = {
      fetch: vi.fn(() => Promise.reject(new Error('offline'))),
    } as unknown as Client
    // The read is shared for a moment; wait it out so this one is asked for afresh.
    await new Promise((resolve) => setTimeout(resolve, 3100))
    const result = await edgeVisibilityFor(DARK_LAGOON, failing)
    expect(result.state).toBe('unchecked')
    expect(result.message).toMatch(/could not be read/)
    expect(result.message).toMatch(/Preview/)
    expect(result.message).not.toMatch(/\d:1/)
  }, 10000)

  it('does not ask for the site’s colours when there is no generated edge', async () => {
    const { client, fetch } = reading()
    expect((await edgeVisibilityFor({ tone: 'alt', edge: 'wave' }, client)).state).toBe('none')
    expect((await edgeVisibilityFor(undefined, client)).state).toBe('none')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('leaves the style it was given untouched', async () => {
    const style = Object.freeze({ ...DARK_LAGOON })
    await edgeVisibilityFor(style, reading().client)
    expect(style).toEqual(DARK_LAGOON)
  })
})

describe('the Colours field’s validation', async () => {
  const { sectionStyle } = await import('./section-style')
  type Check = (value: unknown, context: unknown) => unknown
  interface Recorded {
    check: Check
    level: string
  }
  const field = (sectionStyle.fields as unknown as { name: string; validation?: unknown }[]).find(
    (f) => f.name === 'edgePalette',
  )

  /** A stand-in for Sanity's Rule that records each custom check and the level it was given. */
  const recorded = (): Recorded[] => {
    const make = (): unknown => {
      const rule = {
        custom: (check: Check) => ({
          warning: () => ({ check, level: 'warning' }),
          info: () => ({ check, level: 'info' }),
        }),
      }
      return rule
    }
    const build = field?.validation as (rule: unknown) => Recorded[]
    return build(make())
  }
  const context = (parent: unknown, fetch = () => Promise.resolve(null)) => ({
    parent,
    getClient: () => ({ fetch }),
  })

  it('carries three checks: the stale-value warning, the faint-layer warning and the unchecked note', () => {
    expect(recorded().map((rule) => rule.level)).toEqual(['warning', 'warning', 'info'])
  })

  it('shows one advisory at a time: a warning for a faint layer, a note for an unknown scene, nothing for a clean one', async () => {
    const [, faint, note] = recorded()
    const run = async (parent: unknown) => [
      await faint?.check(undefined, context(parent)),
      await note?.check(undefined, context(parent)),
    ]
    const [warn, quiet] = await run(DARK_LAGOON)
    expect(warn).toMatch(/second layer above the edge/)
    expect(quiet).toBe(true)
    const [noWarn, info] = await run({ ...DARK_LAGOON, gradient: 'forest-dusk' })
    expect(noWarn).toBe(true)
    expect(info).toMatch(/Preview/)
    expect(await run({ tone: 'alt', edge: 'lagoon' })).toEqual([true, true])
    expect(await run({ tone: 'alt', edge: 'wave' })).toEqual([true, true])
  })

  it('still warns about a stepped control left on another shape', () => {
    const [stale] = recorded()
    expect(stale?.check('ink', { parent: { edge: 'wave' } })).toMatch(/Still water/)
  })
})
