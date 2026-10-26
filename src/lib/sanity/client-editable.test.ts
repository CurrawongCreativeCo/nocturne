import type { SchemaTypeDefinition } from 'sanity'
import { describe, expect, it } from 'vitest'

import { isClientEditable, withClientEditableHiding } from './client-editable'

describe('isClientEditable', () => {
  it('treats unknown fields and types as not editable', () => {
    expect(isClientEditable('page', 'title')).toBe(true)
    expect(isClientEditable('page', 'minimalLayout')).toBe(false)
    expect(isClientEditable('page', 'brandNewField')).toBe(false)
    expect(isClientEditable('brandNewType', 'title')).toBe(false)
    expect(isClientEditable('sectionStyle', 'tone')).toBe(false)
  })
})

describe('withClientEditableHiding', () => {
  const client = { currentUser: { roles: [{ name: 'editor' }] } }
  const agency = { currentUser: { roles: [{ name: 'administrator' }] } }
  type Callback = (context: unknown) => boolean

  const wrapped = withClientEditableHiding([
    {
      name: 'page',
      type: 'document',
      fields: [
        { name: 'title', type: 'string' },
        { name: 'minimalLayout', type: 'boolean' },
        {
          name: 'newField',
          type: 'string',
          hidden: ({ parent }: { parent?: { off?: boolean } }) => Boolean(parent?.off),
        },
      ],
    },
  ] as SchemaTypeDefinition[])
  const fields = (wrapped[0] as unknown as { fields: { name: string; hidden?: Callback }[] }).fields
  const hidden = (name: string, context: object) =>
    fields.find((field) => field.name === name)?.hidden?.(context)

  it('leaves classified editable fields as they were', () => {
    expect(fields.find((field) => field.name === 'title')?.hidden).toBeUndefined()
  })

  it('hides agency-only and unclassified fields from clients, not from agency staff', () => {
    expect(hidden('minimalLayout', client)).toBe(true)
    expect(hidden('minimalLayout', agency)).toBe(false)
    expect(hidden('newField', client)).toBe(true)
    expect(hidden('newField', { ...agency, parent: { off: true } })).toBe(true)
    expect(hidden('newField', agency)).toBe(false)
  })
})
