import { describe, expect, it } from 'vitest'

import { cta } from './cta'

interface Loose {
  name: string
  initialValue?: unknown
  hidden?: unknown
  fieldset?: string
}
const field = (name: string) => (cta.fields as readonly Loose[]).find((item) => item.name === name)
const asAgency = { currentUser: { roles: [{ name: 'administrator' }] } }
const asClient = { currentUser: { roles: [{ name: 'editor' }] } }

describe('the cta object’s indicator (task 148)', () => {
  const names = ['actionStyle', 'actionMotion', 'actionColour']

  it('adds the shared action fields beside the label, link and variant, which are unchanged', () => {
    expect(cta.fields.map((item) => item.name)).toEqual(['label', 'link', 'variant', ...names])
    expect(field('variant')?.initialValue).toBe('primary')
  })

  it('stores nothing until chosen: no initial value, so a saved button without it is unchanged', () => {
    for (const name of names) expect(field(name)?.initialValue).toBeUndefined()
  })

  it('is agency only: hidden from a client, shown to an administrator', () => {
    for (const name of names) {
      const hidden = field(name)?.hidden as (context: object) => boolean
      expect(hidden(asClient)).toBe(true)
      expect(hidden(asAgency)).toBe(false)
    }
  })

  it('sits in a collapsed Indicator box', () => {
    const box = cta.fieldsets.find((item) => item.name === 'action')
    expect(box).toMatchObject({ title: 'Indicator', options: { collapsed: true } })
    for (const name of names) expect(field(name)?.fieldset).toBe('action')
  })
})
