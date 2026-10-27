import { describe, expect, it } from 'vitest'

import { team } from './team'

const AGENCY = { currentUser: { roles: [{ name: 'administrator' }] } }
const CLIENT = { currentUser: { roles: [{ name: 'editor' }] } }

type Hidden = (context: unknown) => boolean
const field = (name: string) =>
  (team.fields as { name: string; hidden?: Hidden }[]).find((f) => f.name === name)
const hidden = (name: string, parent: object, who = AGENCY) =>
  Boolean(field(name)?.hidden?.({ ...who, parent }))

const DESIGNED = { appearance: 'circle', motion: null }

describe('Team portraits: one picture, one design', () => {
  it('offers Image design on the grid and slider, and Portraits on neither', () => {
    for (const variant of [undefined, 'grid', 'slider']) {
      expect(hidden('imageDesign', { variant })).toBe(false)
      expect(hidden('portraitDesign', { variant })).toBe(true)
    }
  })

  it('offers only Portraits on a list without an Image design', () => {
    expect(hidden('portraitDesign', { variant: 'list' })).toBe(false)
    expect(hidden('imageDesign', { variant: 'list' })).toBe(true)
    // Nulls a query returns for unset fields are not a design.
    const empty = { variant: 'list', imageDesign: { _type: 'imageDesign', appearance: null } }
    expect(hidden('portraitDesign', empty)).toBe(false)
  })

  it('offers only the Image design a list already has, until it is cleared', () => {
    const designed = { variant: 'list', imageDesign: DESIGNED }
    expect(hidden('imageDesign', designed)).toBe(false)
    expect(hidden('portraitDesign', designed)).toBe(true)
    // Clearing Image design makes Portraits available again.
    expect(hidden('portraitDesign', { variant: 'list', imageDesign: undefined })).toBe(false)
    expect(hidden('imageDesign', { variant: 'list', imageDesign: undefined })).toBe(true)
  })

  it('keeps both new design fields away from clients', () => {
    for (const variant of ['grid', 'list']) {
      expect(hidden('imageDesign', { variant }, CLIENT)).toBe(true)
      expect(hidden('portraitDesign', { variant }, CLIENT)).toBe(true)
    }
  })
})
