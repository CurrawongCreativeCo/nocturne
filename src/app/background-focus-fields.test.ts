import { describe, expect, it } from 'vitest'

import { hero } from '@/features/pages/schemas/sections/hero'
import { FRAMING_RESOLVERS, wholeNoteFor } from '@/lib/sanity/image-frame-geometry'
import { framingKeyOf } from '@/lib/sanity/schema/image-framing-option'
import { sectionStyle } from '@/lib/sanity/schema/section-style'

/**
 * The fields that carry Focus mode (task 177), as the schemas actually define them: `withPresetPicker` draws
 * "Focus" (or "Adjust picture") under an image field by its `options.framing` key, and the key's resolver says which
 * of the two the stored design gets. These pin the schema half of that routing; the Studio's own check is the real
 * Studio pass recorded in the pull request.
 */

interface Field {
  name: string
  type?: string
  options?: { framing?: string; hotspot?: boolean; capability?: string }
}
const fieldOf = (fields: unknown, name: string): Field => {
  const found = (fields as Field[]).find((field) => field.name === name)
  if (!found) throw new Error(`No field named ${name}`)
  return found
}

describe('the Hero’s picture field', () => {
  const field = fieldOf(hero.fields, 'backgroundImage')

  it('is opted in to the Hero resolver and marked as the framing capability', () => {
    expect(framingKeyOf(field.options)).toBe('heroImage')
    expect(field.options?.capability).toBe('framing')
    // Sanity's own crop and hotspot tool stays available beside it.
    expect(field.options?.hotspot).toBe(true)
  })

  it('gets Focus for Full background and Image with panel, a shape for Split, nothing for Editorial', () => {
    const resolver = FRAMING_RESOLVERS.heroImage
    for (const variant of ['overlay', 'full-bleed']) {
      expect(resolver.focus?.({ variant })?.label).toBe('Hero background')
      expect(resolver.resolve({ variant })).toEqual([])
    }
    expect(resolver.focus?.({ variant: 'split' })).toBeUndefined()
    expect(resolver.resolve({ variant: 'split' })).toHaveLength(1)
    expect(resolver.focus?.({ variant: 'editorial' })).toBeUndefined()
    expect(resolver.resolve({ variant: 'editorial' })).toEqual([])
    // The design is the section itself, one segment up from the field.
    expect(resolver.designPath).toEqual({ drop: 1 })
  })
})

describe('the shared section Background image', () => {
  const field = fieldOf(sectionStyle.fields, 'image')

  it('is opted in to the section background resolver, on the style every section shares', () => {
    expect(framingKeyOf(field.options)).toBe('sectionBackground')
    expect(field.options?.capability).toBe('framing')
    expect(field.options?.hotspot).toBe(true)
    expect(FRAMING_RESOLVERS.sectionBackground.designPath).toEqual({ drop: 1 })
  })

  it('gets Focus where the hotspot decides: Fill the section, Cover the screen and nothing chosen', () => {
    const { focus, resolve } = FRAMING_RESOLVERS.sectionBackground
    for (const imageSize of [undefined, null, 'cover', 'screen']) {
      expect(focus?.({ imageSize })?.label).toBe('Section background')
    }
    // It never has a fixed shape to place a crop in.
    expect(resolve({ imageSize: 'cover' })).toEqual([])
  })

  it('says why there is no focus where Position decides, and keeps what is saved', () => {
    const { focus } = FRAMING_RESOLVERS.sectionBackground
    for (const imageSize of ['contain', 'actual']) {
      expect(focus?.({ imageSize })).toBeUndefined()
      const note = wholeNoteFor(FRAMING_RESOLVERS.sectionBackground, { imageSize })
      expect(note?.unsaved).toMatch(/no focus to set here/)
      expect(note?.saved).toMatch(/saved focus is kept/)
    }
    expect(
      wholeNoteFor(FRAMING_RESOLVERS.sectionBackground, { imageSize: 'contain' })?.unsaved,
    ).toMatch(/Show the whole picture is placed by Position/)
    expect(
      wholeNoteFor(FRAMING_RESOLVERS.sectionBackground, { imageSize: 'actual' })?.unsaved,
    ).toMatch(/Actual size is placed by Position and Repeat/)
  })
})
