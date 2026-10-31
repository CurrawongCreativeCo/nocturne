import { describe, expect, it } from 'vitest'

import {
  HERO_DEFAULTS,
  HERO_PRESETS,
  HERO_PRESET_LABELS,
} from '@/features/pages/schemas/sections/hero'
import {
  mediaText,
  SPLIT_DEFAULTS,
  SPLIT_PRESET_LABELS,
  SPLIT_PRESETS,
  splitSubtitle,
} from '@/features/pages/schemas/sections/media-text'
import { blocksForSlot } from '@/features/pages/slots/registry'
import { buildPresetOperations } from '@/features/studio/components/preset-picker/presets'
import { withClientEditableHiding } from '@/lib/sanity/client-editable'
import { splitMediaFields, splitSupportingFields } from '@/lib/sanity/fragments'
import { describePresetState, matchPreset, presetStateText } from '@/lib/sanity/schema/preset-match'

const state = (value: unknown) => describePresetState(SPLIT_PRESETS, value, SPLIT_DEFAULTS)
const text = (value: unknown) => presetStateText(state(value), SPLIT_PRESET_LABELS)

/** What editors must never lose to a Reset: words, media, extra content and buttons. */
const CONTENT = {
  eyebrow: 'Our story',
  title: 'Built locally',
  body: [{ _type: 'block' }],
  ctas: [{ _key: 'c' }],
  media: [{ _key: 'm', _type: 'slotImage' }],
  supporting: [{ _key: 's', _type: 'slotVideo' }],
  image: { asset: { _ref: 'image-1' } },
}

describe('Image + text presets', () => {
  it('matches a section that was never touched: Media right, as before layouts existed', () => {
    expect(matchPreset(SPLIT_PRESETS, {}, SPLIT_DEFAULTS)?.value).toBe('media-right')
  })

  it.each([
    ['media-right', { variant: 'side', imagePosition: 'right' }],
    ['media-left', { variant: 'side', imagePosition: 'left' }],
    ['stacked', { variant: 'stacked' }],
    ['text-over-media', { variant: 'overlay', style: { tone: 'inverse' } }],
  ])('recognises %s', (value, fields) => {
    expect(matchPreset(SPLIT_PRESETS, { ...CONTENT, ...fields }, SPLIT_DEFAULTS)?.value).toBe(value)
  })

  it('treats a saved section with only imagePosition left as Media left', () => {
    expect(matchPreset(SPLIT_PRESETS, { imagePosition: 'left' }, SPLIT_DEFAULTS)?.value).toBe(
      'media-left',
    )
  })

  it('sets only the hidden layout, the side and (for Text over media) the tone', () => {
    const keys = SPLIT_PRESETS.flatMap((preset) => Object.keys(preset.set))
    expect(new Set(keys)).toEqual(new Set(['variant', 'imagePosition', 'style.tone']))
  })

  it('stores the layout in a hidden field the presets can reach', () => {
    const fields = mediaText.fields as { name: string; hidden?: unknown }[]
    expect(fields.find((field) => field.name === 'variant')?.hidden).toBe(true)
    expect(fields.some((field) => field.name === 'imagePosition')).toBe(true)
  })
})

describe('Custom and Reset', () => {
  // Text over media in a light tone: the layout matches that preset, the tone does not.
  const custom = { variant: 'overlay', style: { tone: 'surface' } }

  it('names the preset it started from and counts the overrides', () => {
    expect(text(custom)).toBe('Custom · based on Text over media · 1 change (tone)')
  })

  it('updates as the section is edited, and returns to the preset name', () => {
    expect(text({ ...custom, style: { tone: 'alt' } })).toContain('1 change (tone)')
    expect(text({ variant: 'overlay', style: { tone: 'inverse' } })).toBe('Text over media')
    expect(text({ variant: 'stacked', imagePosition: 'left' })).toBe('Stacked')
  })

  it('counts every moved field', () => {
    expect(text({ variant: 'overlay', imagePosition: 'left', style: { tone: 'surface' } })).toBe(
      'Custom · based on Text over media · 1 change (tone)',
    )
  })

  it('breaks a tie between equally close presets towards the one whose layout matches', () => {
    // Text over media in a light tone is one field from Text over media (the tone) and one from
    // Stacked (the layout). The layout is the defining field, so Text over media wins.
    const result = state(custom)
    expect(result.nearest?.value).toBe('text-over-media')
    expect(result.differences).toEqual(['style.tone'])
  })

  it('Reset sets only what the preset controls, and never touches content', () => {
    const operations = buildPresetOperations(state(custom).nearest ?? SPLIT_PRESETS[0], {
      ...CONTENT,
      ...custom,
    })
    expect(operations).toEqual([{ type: 'set', path: ['style', 'tone'], value: 'inverse' }])
    const touched = operations.map((operation) => operation.path[0])
    for (const field of Object.keys(CONTENT)) expect(touched).not.toContain(field)
  })

  it('Reset after Reset changes nothing', () => {
    const reset = { ...CONTENT, variant: 'overlay', style: { tone: 'inverse' } }
    expect(buildPresetOperations(SPLIT_PRESETS[3], reset)).toEqual([])
  })

  it('every preset touches only preset-controlled fields, whatever the section holds', () => {
    for (const preset of SPLIT_PRESETS) {
      const paths = buildPresetOperations(preset, CONTENT).map((operation) => operation.path[0])
      for (const field of Object.keys(CONTENT)) expect(paths, preset.value).not.toContain(field)
    }
  })
})

describe('the same summary on the hero', () => {
  const heroText = (value: unknown) =>
    presetStateText(describePresetState(HERO_PRESETS, value, HERO_DEFAULTS), HERO_PRESET_LABELS)

  it('names the preset, the changes and the moved field', () => {
    expect(heroText({})).toBe('Full background image')
    expect(heroText({ variant: 'split', imagePosition: 'left', style: { tone: 'inverse' } })).toBe(
      'Custom · based on Split, image left · 1 change (tone)',
    )
  })

  it('Reset on a hero leaves its content and slot alone', () => {
    const value = {
      title: 'Hello',
      ctas: [{ _key: 'c' }],
      supporting: [{ _key: 's' }],
      backgroundImage: { asset: { _ref: 'image-1' } },
      variant: 'editorial',
      style: { tone: 'inverse' },
    }
    const nearest = describePresetState(HERO_PRESETS, value, HERO_DEFAULTS).nearest
    const operations = buildPresetOperations(nearest ?? HERO_PRESETS[0], value)
    expect(operations).toEqual([{ type: 'set', path: ['style', 'tone'], value: 'surface' }])
  })
})

describe('the list subtitle', () => {
  it('names the preset and keeps the tone, as the list always showed it', () => {
    expect(splitSubtitle({ imagePosition: 'left', tone: 'alt' })).toBe(
      'Image + text · Media left · Tinted',
    )
    expect(splitSubtitle({ variant: 'stacked' })).toBe('Image + text · Stacked')
  })

  it('names a custom combination by its layout', () => {
    expect(splitSubtitle({ variant: 'overlay', tone: 'surface' })).toContain('Text over media')
  })
})

describe('slots, permissions and the query', () => {
  it('takes a picture or a video as media, and a video as supporting content', () => {
    expect(blocksForSlot('split.media')).toEqual(['slotImage', 'slotVideo'])
    expect(blocksForSlot('split.supporting')).toEqual(['slotVideo'])
  })

  it('projects exactly those blocks, in the page query', () => {
    const types = (fields: string) => [...fields.matchAll(/_type == "(\w+)" =>/g)].map((m) => m[1])
    expect(types(splitMediaFields)).toEqual(blocksForSlot('split.media'))
    expect(types(splitSupportingFields)).toEqual(blocksForSlot('split.supporting'))
  })

  const [wrapped] = withClientEditableHiding([mediaText]) as unknown as [
    { fields: { name: string; hidden?: boolean | ((context: unknown) => boolean) }[] },
  ]
  const hiddenFor = (name: string, role: string) => {
    const { hidden } = wrapped.fields.find((field) => field.name === name) ?? {}
    const context = {
      currentUser: { roles: [{ name: role }] },
      parent: { media: [{ _type: 'slotImage' }], supporting: [{ _type: 'slotVideo' }] },
      value: [{ _type: 'slotVideo' }],
    }
    return typeof hidden === 'function' ? hidden(context) : Boolean(hidden)
  }

  it.each(['variant', 'supporting', 'imageDesign', 'style'])(
    'keeps %s with the agency, even when it holds something',
    (name) => {
      expect(hiddenFor(name, 'editor')).toBe(true)
      expect(hiddenFor(name, 'administrator')).toBe(name === 'variant')
    },
  )

  it.each(['media', 'eyebrow', 'ctas', 'body'])('lets clients change %s', (name) => {
    expect(hiddenFor(name, 'editor')).toBe(false)
  })
})
