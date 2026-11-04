import { describe, expect, it } from 'vitest'

import {
  PORTRAIT_NOTICE,
  hasImageDesign,
  portraitNotice,
  teamPortraitControls,
} from './team-portrait'

/** Each of these draws a Team List portrait exactly as the list's own default does. */
const NEUTRAL: [string, unknown][] = [
  ['nothing', undefined],
  ['null', null],
  ['an empty object', {}],
  ['only a type', { _type: 'imageDesign' }],
  ['a projection of nulls', { appearance: null, motion: null, custom: null, customFrameUrl: null }],
  ['empty strings', { appearance: '', motion: '' }],
  ['custom: false (the initial value)', { _type: 'imageDesign', custom: false }],
  ['Standard', { appearance: 'standard' }],
  ['Motion None', { motion: 'none' }],
  ['Standard + None', { appearance: 'standard', motion: 'none' }],
  ['Standard + None + custom: false', { appearance: 'standard', motion: 'none', custom: false }],
  [
    'Standard + None + an old frame, colour and inset',
    {
      appearance: 'standard',
      motion: 'none',
      frame: 'organic-brush',
      frameColour: 'accent',
      frameInset: 6,
    },
  ],
  [
    'Standard + None + an approved frame left behind',
    {
      appearance: 'standard',
      motion: 'none',
      frame: 'custom',
      customFrameUrl: 'https://cdn.sanity.io/files/p/d/f.svg',
    },
  ],
  [
    'Standard + None + inactive travel, direction and scale (custom: true)',
    {
      appearance: 'standard',
      motion: 'none',
      custom: true,
      travel: 5,
      direction: 'up',
      scale: 1.1,
    },
  ],
  ['travel, direction and scale on a still picture', { travel: 4, direction: 'up', scale: 1.1 }],
  ['a frame with no appearance', { frame: 'double-line', frameColour: 'accent' }],
  [
    'Framed with no frame',
    { appearance: 'framed', frame: 'none', frameColour: 'accent', frameInset: 8 },
  ],
  ['an unknown appearance and motion', { appearance: 'wobbly', motion: 'wild' }],
]

/** Each of these changes how a Team List portrait is drawn. */
const EFFECTIVE: [string, unknown][] = [
  ['Circle', { appearance: 'circle' }],
  ['Arch', { appearance: 'arch' }],
  ['Rounded', { appearance: 'rounded' }],
  ['Square corners', { appearance: 'square' }],
  ['Circle + None + custom: false', { appearance: 'circle', motion: 'none', custom: false }],
  ['Circle with a leftover frame', { appearance: 'circle', frame: 'double-line' }],
  ['Subtle parallax', { motion: 'subtle' }],
  ['Medium parallax', { appearance: 'standard', motion: 'medium', custom: false }],
  [
    'Subtle with exact values',
    { appearance: 'standard', motion: 'subtle', custom: true, travel: 5 },
  ],
  ['Framed, no frame chosen (draws the Simple line)', { appearance: 'framed' }],
  ['Framed with a preset frame', { appearance: 'framed', frame: 'corner-brackets' }],
  [
    'Framed with an approved frame',
    {
      appearance: 'framed',
      frame: 'custom',
      customFrameUrl: 'https://cdn.sanity.io/files/p/d/f.svg',
    },
  ],
  [
    'Framed with an approved frame whose file is missing (falls back to the line)',
    { appearance: 'framed', frame: 'custom' },
  ],
]

describe('hasImageDesign: an effective choice', () => {
  it.each(NEUTRAL)('is not one: %s', (_name, design) => {
    expect(hasImageDesign(design)).toBe(false)
  })

  it.each(EFFECTIVE)('is one: %s', (_name, design) => {
    expect(hasImageDesign(design)).toBe(true)
  })

  it('does not change the design it reads', () => {
    const design = {
      appearance: 'standard',
      motion: 'none',
      frame: 'double-line',
      custom: true,
      travel: 5,
    }
    const copy = structuredClone(design)
    hasImageDesign(design)
    expect(design).toEqual(copy)
  })
})

describe('switching from a genuine legacy design to neutral choices', () => {
  it('is legacy while Circle and Subtle are set, and neutral once Standard and None replace them', () => {
    const stored = { _type: 'imageDesign', appearance: 'circle', motion: 'subtle', custom: false }
    expect(hasImageDesign(stored)).toBe(true)
    // Changing only one of the two is still a legacy design.
    expect(hasImageDesign({ ...stored, appearance: 'standard' })).toBe(true)
    expect(hasImageDesign({ ...stored, motion: 'none' })).toBe(true)
    // Both neutral: everything else stays stored and is ignored.
    expect(hasImageDesign({ ...stored, appearance: 'standard', motion: 'none' })).toBe(false)
  })

  it('treats a leftover frame as inactive once the appearance is no longer Framed', () => {
    const stored = {
      appearance: 'framed',
      frame: 'offset-border',
      frameColour: 'accent',
      frameInset: 4,
    }
    expect(hasImageDesign(stored)).toBe(true)
    expect(hasImageDesign({ ...stored, appearance: 'standard' })).toBe(false)
  })
})

describe('teamPortraitControls', () => {
  it('offers Image design only, on Grid, Slider and an unset layout, whatever is stored', () => {
    for (const variant of ['grid', 'slider', undefined, null]) {
      for (const imageDesign of [
        undefined,
        { custom: false },
        { appearance: 'standard', motion: 'none' },
      ]) {
        expect(teamPortraitControls({ variant, imageDesign })).toEqual({
          imageDesign: true,
          portrait: false,
        })
      }
    }
  })

  it.each(NEUTRAL)('offers Portrait only, on a List holding %s', (_name, imageDesign) => {
    expect(teamPortraitControls({ variant: 'list', imageDesign })).toEqual({
      imageDesign: false,
      portrait: true,
    })
  })

  it.each(EFFECTIVE)('offers Image design only, on a List holding %s', (_name, imageDesign) => {
    expect(teamPortraitControls({ variant: 'list', imageDesign })).toEqual({
      imageDesign: true,
      portrait: false,
    })
  })

  it('never offers both, and always offers one', () => {
    for (const variant of ['grid', 'slider', 'list', undefined]) {
      for (const [, imageDesign] of [...NEUTRAL, ...EFFECTIVE]) {
        const { imageDesign: image, portrait } = teamPortraitControls({ variant, imageDesign })
        expect(image && portrait).toBe(false)
        expect(image || portrait).toBe(true)
      }
    }
  })
})

describe('portraitNotice', () => {
  it('is shown on a List that keeps an effective Image design, and says how to reach Portrait', () => {
    expect(portraitNotice({ variant: 'list', imageDesign: { appearance: 'circle' } })).toBe(
      PORTRAIT_NOTICE,
    )
    expect(PORTRAIT_NOTICE).toMatch(/Standard/)
    expect(PORTRAIT_NOTICE).toMatch(/Picture motion to None/)
    expect(PORTRAIT_NOTICE).toMatch(/kept/)
  })

  it('is shown exactly where Image design is the only control on a List, and nowhere else', () => {
    for (const variant of ['grid', 'slider', 'list', undefined]) {
      for (const [, imageDesign] of [...NEUTRAL, ...EFFECTIVE]) {
        const section = { variant, imageDesign }
        const shown = portraitNotice(section) !== null
        expect(shown).toBe(variant === 'list' && teamPortraitControls(section).imageDesign)
      }
    }
  })
})
