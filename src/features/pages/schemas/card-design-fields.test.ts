import { describe, expect, it } from 'vitest'

import { textRoleParts } from '@/lib/sanity/schema/surface-design'

import { cardDesignField, itemDesignField } from './card-design-fields'

interface Field {
  name: string
  hidden?: unknown
  fields?: Field[]
  options?: { designSummary?: { properties: { key: string; part?: string }[] } }
}

const ROLES = [{ role: 'title' as const }, { role: 'price' as const }, { role: 'label' as const }]
const DEFAULTS = { title: 'ink', price: 'ink', label: 'muted' } as const
const item = itemDesignField({
  noun: 'plan',
  roles: ROLES,
  defaults: DEFAULTS,
  itemArray: 'plans',
}) as unknown as Field
const card = cardDesignField({
  inherits: 'the default card',
  roles: ROLES,
  defaults: DEFAULTS,
}) as unknown as Field

describe('a card family’s design fields', () => {
  it('offers the same fields at card and item level, the item behind its switch', () => {
    const names = (field: Field) => (field.fields ?? []).map(({ name }) => name)
    expect(names(item)).toEqual(['appearance', ...names(card)])
    expect(names(card)).toEqual([
      'background',
      'backgroundStrength',
      'border',
      'borderColour',
      'title',
      'price',
      'label',
      'mark',
    ])
  })

  it('hides every item field until the plan is customised, and shows them after', () => {
    const hiddenWhen = (appearance: string | undefined) =>
      (item.fields ?? [])
        .filter(({ name }) => name !== 'appearance')
        .map(({ hidden }) =>
          typeof hidden === 'function'
            ? (hidden as (context: { parent: unknown }) => boolean)({ parent: { appearance } })
            : undefined,
        )
    expect(hiddenWhen(undefined).every((hidden) => hidden === true)).toBe(true)
    expect(hiddenWhen('custom').every((hidden) => hidden === false)).toBe(true)
  })

  it('has a summary that names exactly the fields the form offers', () => {
    const summary = item.options?.designSummary
    expect(summary).toBeDefined()
    const inSummary = (summary?.properties ?? []).map(
      ({ key, part }) => `${key}${part ? `.${part}` : ''}`,
    )
    const roles = ROLES.map(({ role }) => role as string)
    const inForm = (card.fields ?? []).flatMap((field) => {
      if (field.name === 'mark') return ['mark.kind']
      // A role's object holds its parts; a colour or choice is one property.
      return roles.includes(field.name) && field.fields
        ? field.fields.map(({ name }) => `${field.name}.${name}`)
        : [field.name]
    })
    expect([...inSummary].sort()).toEqual([...inForm].sort())
  })
})

describe('textRoleParts', () => {
  it('lists what each role offers', () => {
    expect(textRoleParts('title')).toEqual(['size', 'weight', 'colour'])
    expect(textRoleParts('eyebrow')).toContain('tracking')
    expect(textRoleParts('quote')).toEqual(['size', 'weight', 'colour', 'leading', 'fontStyle'])
  })
})
