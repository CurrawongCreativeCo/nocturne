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

const AGENCY = { roles: [{ name: 'administrator' }] }

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
