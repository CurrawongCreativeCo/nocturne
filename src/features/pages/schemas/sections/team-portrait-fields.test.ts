import { describe, expect, it } from 'vitest'

import { team } from './team'
import { testimonials } from './testimonials'

type Hidden = (context: Record<string, unknown>) => boolean
interface Field {
  name: string
  group?: string
  hidden?: Hidden
}

const find = (fields: Field[], name: string): Field => {
  const found = fields.find((field) => field.name === name)
  if (!found) throw new Error(`No field ${name}`)
  return found
}
const teamFields = (team as unknown as { fields: Field[] }).fields
const AGENCY = { currentUser: { roles: [{ name: 'administrator' }] } }
const CLIENT = { currentUser: { roles: [{ name: 'editor' }] } }

/** Which of the two picture designs Studio shows for a Team section holding `parent`. */
const shown = (parent: Record<string, unknown>, who = AGENCY) => ({
  imageDesign: !find(teamFields, 'imageDesign').hidden?.({ ...who, parent }),
  portraitDesign: !find(teamFields, 'portraitDesign').hidden?.({ ...who, parent }),
})

describe('Team design controls in Studio', () => {
  it('a new list offers Portrait only', () => {
    expect(shown({ variant: 'list' })).toEqual({ imageDesign: false, portraitDesign: true })
  })

  it('an existing list without an Image design offers Portrait only', () => {
    expect(shown({ variant: 'list', selection: 'all', title: 'Who we are' })).toEqual({
      imageDesign: false,
      portraitDesign: true,
    })
  })

  it('a list with a saved Image design offers that only, whatever Portrait holds', () => {
    expect(
      shown({
        variant: 'list',
        imageDesign: { appearance: 'circle' },
        portraitDesign: { size: 'large' },
      }),
    ).toEqual({ imageDesign: true, portraitDesign: false })
  })

  it('offers Portrait, not Image design, once a list’s Image design is cleared down to custom: false', () => {
    expect(
      shown({ variant: 'list', imageDesign: { _type: 'imageDesign', custom: false } }),
    ).toEqual({ imageDesign: false, portraitDesign: true })
  })

  it('still offers Image design only for a genuine choice beside custom: false', () => {
    expect(shown({ variant: 'list', imageDesign: { appearance: 'arch', custom: false } })).toEqual({
      imageDesign: true,
      portraitDesign: false,
    })
  })

  it('explains how to reach Portrait from the legacy control', () => {
    const field = find(teamFields, 'imageDesign') as Field & { description?: string }
    expect(field.description).toMatch(/clear this to choose Portrait/i)
  })

  it('grid and slider offer Image design only, and keep a stored Portrait out of sight', () => {
    for (const variant of ['grid', 'slider', undefined]) {
      expect(shown({ variant, portraitDesign: { size: 'small' } })).toEqual({
        imageDesign: true,
        portraitDesign: false,
      })
    }
  })

  it('switching layout keeps what is saved: only the controls shown change', () => {
    const section = { imageDesign: { appearance: 'arch' }, portraitDesign: { ring: 'line' } }
    expect(shown({ ...section, variant: 'grid' }).imageDesign).toBe(true)
    expect(shown({ ...section, variant: 'list' }).imageDesign).toBe(true)
    expect(shown({ ...section, variant: 'list' }).portraitDesign).toBe(false)
    expect(shown({ ...section, variant: 'slider' }).portraitDesign).toBe(false)
  })

  it('shows neither to a client', () => {
    expect(shown({ variant: 'list' }, CLIENT as never)).toEqual({
      imageDesign: false,
      portraitDesign: false,
    })
    expect(shown({ variant: 'grid' }, CLIENT as never)).toEqual({
      imageDesign: false,
      portraitDesign: false,
    })
  })

  it('both designs are in the Design tab', () => {
    expect(find(teamFields, 'imageDesign').group).toBe('design')
    expect(find(teamFields, 'portraitDesign').group).toBe('design')
  })
})

describe('Testimonials avatar control', () => {
  it('is in the Design tab, for the agency only', () => {
    const field = find((testimonials as unknown as { fields: Field[] }).fields, 'avatarDesign')
    expect(field.group).toBe('design')
    expect(field.hidden?.(AGENCY)).toBe(false)
    expect(field.hidden?.(CLIENT)).toBe(true)
  })
})
