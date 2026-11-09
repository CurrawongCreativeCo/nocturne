import { describe, expect, it } from 'vitest'

import { embed } from './embed'
import { formSection } from './form-section'
import { newsletterSignup } from './newsletter-signup'

interface Loose {
  name: string
  type?: string
  initialValue?: unknown
  hidden?: unknown
  group?: string
  fields?: Loose[]
  fieldsets?: { name: string }[]
}
const asAgency = { currentUser: { roles: [{ name: 'administrator' }] }, parent: {} }
const asClient = { currentUser: { roles: [{ name: 'editor' }] }, parent: {} }

describe.each([
  ['formSection', formSection],
  ['newsletterSignup', newsletterSignup],
  ['embed', embed],
] as const)('%s Cards box (task 148)', (_name, section) => {
  const box = (section.fields as unknown as Loose[]).find((field) => field.name === 'cardDesign')

  it('is the shared Cards box, in the Design tab', () => {
    expect(box?.group).toBe('design')
    expect(box?.type).toBe('object')
  })

  it('offers the shared surface and depth fields and nothing else: no text roles, mark or indicator', () => {
    const names = (box?.fields ?? []).map((field) => field.name)
    expect(names).toEqual([
      'background',
      'backgroundStrength',
      'border',
      'borderColour',
      'shadow',
      'glow',
      'glowColour',
    ])
  })

  it('stores nothing until chosen, so a saved section without it is unchanged', () => {
    for (const field of box?.fields ?? []) expect(field.initialValue).toBeUndefined()
  })

  it('is agency only', () => {
    const hidden = box?.hidden as (context: object) => boolean
    expect(hidden(asClient)).toBe(true)
    expect(hidden(asAgency)).toBe(false)
  })

  it('groups the shadow and glow in a Depth and glow box', () => {
    expect(box?.fieldsets?.map((fieldset) => fieldset.name)).toContain('depth')
  })
})
