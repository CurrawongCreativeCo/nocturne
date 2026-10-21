import { createClient } from '@sanity/client'
import { Schema } from '@sanity/schema'
import { validateDocument } from '@sanity/validation'
import { describe, expect, it } from 'vitest'

import { IMAGE_APPEARANCES, IMAGE_FRAMES, IMAGE_MOTIONS } from '../image-design-options'
import { defaultAppearance, imageDesign, imageDesignField } from './image-design'

type Callback = (context: unknown) => boolean
interface FieldLike {
  name: string
  fieldset?: string
  hidden?: Callback
  options?: {
    list?: { value: string; thumbnail?: unknown }[]
    visibleOptions?: (context: unknown) => readonly string[]
    defaultValue?: (context: unknown) => string | undefined
  }
  initialValue?: unknown
}

const fields = imageDesign.fields as FieldLike[]
const field = (name: string): FieldLike => {
  const found = fields.find((f) => f.name === name)
  if (!found) throw new Error(`No ${name} field`)
  return found
}
const hidden = (name: string, parent: Record<string, unknown>) =>
  field(name).hidden?.({ parent }) ?? false

const AGENCY = { roles: [{ name: 'administrator', title: 'Administrator' }] }

describe('imageDesign', () => {
  it('is a frameless object, so its pictures sit straight in the Design tab', () => {
    expect(imageDesign.options).toMatchObject({ frameless: true })
  })

  it('offers an Appearance, a Motion and a Frame as pictures, each with a thumbnail', () => {
    for (const [name, values] of [
      ['appearance', IMAGE_APPEARANCES],
      ['motion', IMAGE_MOTIONS],
      ['frame', IMAGE_FRAMES],
    ] as const) {
      const list = field(name).options?.list ?? []
      expect(list.map((entry) => entry.value)).toEqual([...values])
      for (const entry of list) expect(entry.thumbnail, `${name} ${entry.value}`).toBeTruthy()
    }
  })

  it('stores nothing until an editor chooses, so every section keeps its own look', () => {
    for (const name of ['appearance', 'motion', 'frame']) {
      expect(field(name).initialValue).toBeUndefined()
    }
  })

  it('shows the Frame choices only for the Framed appearance', () => {
    for (const name of ['frame']) {
      expect(hidden(name, { appearance: 'framed' })).toBe(false)
      for (const appearance of [undefined, 'standard', 'rounded', 'circle', 'arch']) {
        expect(hidden(name, { appearance })).toBe(true)
      }
    }
  })

  it('asks for an approved frame only when the custom frame is chosen', () => {
    expect(hidden('customFrame', { appearance: 'framed', frame: 'custom' })).toBe(false)
    expect(hidden('customFrame', { appearance: 'framed', frame: 'thin-line' })).toBe(true)
    expect(hidden('customFrame', { appearance: 'circle', frame: 'custom' })).toBe(true)
  })

  it('keeps the exact values in a collapsed fieldset, shown only to the effects that use them', () => {
    for (const name of ['custom', 'travel', 'direction', 'scale', 'frameColour', 'frameInset']) {
      expect(field(name).fieldset).toBe('more')
    }
    const more = (imageDesign.fieldsets as { name: string; options: unknown }[]).find(
      (fieldset) => fieldset.name === 'more',
    )
    expect(more?.options).toMatchObject({ collapsible: true, collapsed: true })

    // A still, plain picture has none of them.
    for (const name of ['custom', 'travel', 'direction', 'scale', 'frameColour', 'frameInset']) {
      expect(hidden(name, { appearance: 'circle', motion: 'none' })).toBe(true)
    }
    // Parallax: the Custom switch, then distance, direction and scale once it is on.
    expect(hidden('custom', { motion: 'subtle' })).toBe(false)
    for (const name of ['travel', 'direction', 'scale']) {
      expect(hidden(name, { motion: 'subtle' })).toBe(true)
      expect(hidden(name, { motion: 'subtle', custom: true })).toBe(false)
      expect(hidden(name, { motion: 'none', custom: true })).toBe(true)
    }
    // A frame: its colour and inset, but not when the frame is None.
    for (const name of ['frameColour', 'frameInset']) {
      expect(hidden(name, { appearance: 'framed' })).toBe(false)
      expect(hidden(name, { appearance: 'framed', frame: 'none' })).toBe(true)
      expect(hidden(name, { appearance: 'arch', frame: 'thin-line' })).toBe(true)
    }
  })
})

describe('Appearance defaults', () => {
  const inSection = (section: Record<string, unknown>) => ({
    document: { sections: [{ _key: 'a', ...section }] },
    path: ['sections', { _key: 'a' }, 'imageDesign', 'appearance'],
  })

  it('shows what the section draws while nothing is chosen', () => {
    expect(defaultAppearance(inSection({ _type: 'mediaText' }))).toBe('standard')
    expect(defaultAppearance(inSection({ _type: 'gallery' }))).toBe('standard')
    // A team portrait fills the top of its card.
    expect(defaultAppearance(inSection({ _type: 'team' }))).toBe('square')
    // A hero reads its older Image shape.
    expect(defaultAppearance(inSection({ _type: 'hero' }))).toBe('standard')
    expect(defaultAppearance(inSection({ _type: 'hero', imageShape: 'rounded' }))).toBe('standard')
    expect(defaultAppearance(inSection({ _type: 'hero', imageShape: 'circle' }))).toBe('circle')
    expect(defaultAppearance(inSection({ _type: 'hero', imageShape: 'square' }))).toBe('square')
  })

  it('offers Square corners only where a section already had them', () => {
    const visible = field('appearance').options?.visibleOptions
    expect(visible?.(inSection({ _type: 'mediaText' }))).not.toContain('square')
    expect(visible?.(inSection({ _type: 'hero', imageShape: 'square' }))).toContain('square')
    expect(visible?.(inSection({ _type: 'team' }))).toContain('square')
  })
})

describe('imageDesignField', () => {
  it('lives in the agency-only Design tab', () => {
    const design = imageDesignField() as unknown as { group: string; hidden: Callback }
    expect(design.group).toBe('design')
    expect(design.hidden({ currentUser: AGENCY })).toBe(false)
    expect(design.hidden({ currentUser: { roles: [{ name: 'editor' }] } })).toBe(true)
  })

  it('adds a rule of the section’s own on top', () => {
    const design = imageDesignField({
      hidden: ({ parent }) => (parent as { variant?: string }).variant === 'masonry',
    }) as unknown as { hidden: Callback }
    expect(design.hidden({ currentUser: AGENCY, parent: { variant: 'masonry' } })).toBe(true)
    expect(design.hidden({ currentUser: AGENCY, parent: { variant: 'grid' } })).toBe(false)
  })
})

// The same document validator Studio uses, including its inherited reference and list rules.
const validationSchema = Schema.compile({
  types: [
    imageDesign,
    { name: 'frame', type: 'document', fields: [{ name: 'title', type: 'string' }] },
    {
      name: 'page',
      type: 'document',
      fields: [
        {
          name: 'sections',
          type: 'array',
          of: [
            {
              name: 'hero',
              type: 'object',
              fields: [{ name: 'imageDesign', type: 'imageDesign' }],
            },
          ],
        },
      ],
    },
  ],
})
const validationClient = createClient({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2025-01-01',
  apiHost: 'http://localhost:9999',
  useCdn: false,
})
const validateHero = (design: Record<string, unknown>) =>
  validateDocument({
    schema: validationSchema,
    client: validationClient,
    document: {
      _id: 'drafts.hidden-design',
      _createdAt: '2026-10-21T00:00:00Z',
      _updatedAt: '2026-10-21T00:00:00Z',
      _rev: 'fixture',
      _type: 'page',
      sections: [{ _key: 'hero', _type: 'hero', imageDesign: design }],
    },
    getDocumentExists: () => Promise.resolve(false),
  })

describe('hidden image design validation', () => {
  it('allows a round hero with a stale unpublished custom frame and invalid hidden numbers', async () => {
    const result = await validateHero({
      appearance: 'circle',
      frame: 'custom',
      customFrame: {
        _type: 'reference',
        _ref: 'unpublished-frame',
        _weak: true,
        _strengthenOnPublish: { type: 'frame' },
      },
      motion: 'none',
      custom: true,
      travel: 99,
      scale: 9,
      direction: 'old-direction',
      frameInset: 99,
      frameColour: 'old-colour',
    })
    expect(result.markers).toEqual([])
  })

  it('still asks for an approved frame when the visible custom frame is empty', async () => {
    const result = await validateHero({ appearance: 'framed', frame: 'custom' })
    expect(result.markers).toEqual([
      expect.objectContaining({
        level: 'error',
        message: 'Choose an approved frame, or a different frame style',
        path: ['sections', { _key: 'hero' }, 'imageDesign', 'customFrame'],
      }),
    ])
  })

  it('still rejects an unpublished frame while visible and out-of-range values while used', async () => {
    const result = await validateHero({
      appearance: 'framed',
      frame: 'custom',
      customFrame: { _type: 'reference', _ref: 'unpublished-frame', _weak: true },
      motion: 'subtle',
      custom: true,
      travel: 99,
      scale: 9,
      frameInset: 99,
    })
    expect(result.markers.map((marker) => marker.path.at(-1)).sort()).toEqual([
      'customFrame',
      'frameInset',
      'scale',
      'travel',
    ])
  })

  it('disables inline frame creation', () => {
    expect(field('customFrame').options).toMatchObject({ disableNew: true })
  })
})
