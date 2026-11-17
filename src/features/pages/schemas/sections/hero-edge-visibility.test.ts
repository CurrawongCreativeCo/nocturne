import { describe, expect, it } from 'vitest'

import type { SectionStyleInput } from '@/components/ui/section-style'
import { sectionStyle } from '@/lib/sanity/schema/section-style'

import './hero'

/**
 * The visibility advisory (task 151, Slice 5) reads the section it belongs to, through the real section rules the
 * hero registers: a hero that draws its own picture behind the text is not judged against the style's tone.
 */

const DARK_LAGOON: SectionStyleInput = {
  tone: 'inverse',
  edge: 'lagoon',
  edgePalette: 'highlight',
  edgeStrength: 'strong',
  edgeFlip: true,
  edgeHeight: 'large',
}

type Check = (value: unknown, context: unknown) => unknown
interface Recorded {
  check: Check
  level: string
}

/** The Colours field's own validation, with a stand-in for Sanity's Rule that records each check and its level. */
function colourChecks(): Recorded[] {
  const field = (sectionStyle.fields as unknown as { name: string; validation?: unknown }[]).find(
    (f) => f.name === 'edgePalette',
  )
  const rule = {
    custom: (check: Check) => ({
      warning: () => ({ check, level: 'warning' }),
      info: () => ({ check, level: 'info' }),
    }),
  }
  return (field?.validation as (rule: unknown) => Recorded[])(rule)
}

/** What the form shows for a section with this layout, style and picture: [warning, note]. */
async function advisoryFor(section: Record<string, unknown>) {
  const [, faint, note] = colourChecks()
  const context = {
    parent: DARK_LAGOON,
    document: { _type: 'page', sections: [{ _key: 'a', ...section }] },
    path: ['sections', { _key: 'a' }, 'style', 'edgePalette'],
    getClient: () => ({ fetch: () => Promise.resolve(null) }),
  }
  return [await faint?.check(undefined, context), await note?.check(undefined, context)]
}

describe('the advisory on a hero', () => {
  it('gives a Hero with its own image and an explicit Contrast tone a Preview note, not a numerical verdict', async () => {
    const [warning, note] = await advisoryFor({
      _type: 'hero',
      variant: 'full-bleed',
      image: { asset: { _ref: 'image-a-1x1-png' } },
      style: DARK_LAGOON,
    })
    expect(warning).toBe(true)
    expect(note).toBe(
      'Lagoon’s layers can’t be checked here: this section draws its own picture or video. Look at it in Preview.',
    )
    expect(`${String(note)}${String(warning)}`).not.toMatch(/\d:1/)
  })

  it('judges a hero layout that draws no picture behind the text like any other section', async () => {
    const [warning, note] = await advisoryFor({
      _type: 'hero',
      variant: 'split',
      style: DARK_LAGOON,
    })
    expect(warning).toBe(
      'Lagoon’s second layer may be hard to see on this background. Try Tint, or check it in Preview.',
    )
    expect(note).toBe(true)
  })

  it('still gives a plain section with the same tone and style the faint-layer advisory', async () => {
    const [warning, note] = await advisoryFor({ _type: 'richText', style: DARK_LAGOON })
    expect(warning).toBe(
      'Lagoon’s second layer may be hard to see on this background. Try Tint, or check it in Preview.',
    )
    expect(note).toBe(true)
  })
})
