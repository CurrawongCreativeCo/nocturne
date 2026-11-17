import { describe, expect, it } from 'vitest'

import { isClientEditable } from '@/lib/sanity/client-editable'

import { hero } from './hero'

interface Field {
  name: string
  type: string
  group?: string
  hidden?: (context: unknown) => boolean
}

const field = (hero as unknown as { fields: Field[] }).fields.find(
  (candidate) => candidate.name === 'dividerDesign',
)
const client = { currentUser: { roles: [{ name: 'editor' }] } }
const agency = { currentUser: { roles: [{ name: 'administrator' }] } }

describe('the hero’s divider (task 151)', () => {
  it('is the shared divider type, in the Design tab', () => {
    expect(field?.type).toBe('decorativeDivider')
    expect(field?.group).toBe('design')
  })

  it('is agency only: hidden from clients, and not a client-editable field', () => {
    expect(field?.hidden?.(client)).toBe(true)
    expect(field?.hidden?.(agency)).toBe(false)
    expect(isClientEditable('hero', 'dividerDesign')).toBe(false)
  })
})
