import { defineField, defineType, type SchemaTypeDefinition } from 'sanity'
import { describe, expect, it, vi } from 'vitest'

import { SERVICE_EXCLUDED_SECTIONS, withServiceSections } from './service-sections-field'

// The section schemas read the Sanity project at import time; any value will do for this test.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})

const doc = (name: string): SchemaTypeDefinition =>
  defineType({ name, type: 'document', fields: [defineField({ name: 'title', type: 'string' })] })

const fieldNames = (type: SchemaTypeDefinition | undefined) =>
  type && 'fields' in type ? (type.fields ?? []).map((field) => field.name) : []

describe('withServiceSections', () => {
  const types = withServiceSections([doc('page'), doc('service')])

  it('adds a sections field to the service and to nothing else', () => {
    expect(fieldNames(types.find((type) => type.name === 'service'))).toEqual(['title', 'sections'])
    expect(fieldNames(types.find((type) => type.name === 'page'))).toEqual(['title'])
  })

  it('offers the page builder sections except the ones a service page cannot draw', () => {
    const service = types.find((type) => type.name === 'service')
    const sections = service && 'fields' in service ? service.fields?.at(-1) : undefined
    const offered = (sections as { of?: { type: string }[] } | undefined)?.of?.map((m) => m.type)
    expect(offered).toContain('richText')
    expect(offered).toContain('faq')
    for (const excluded of SERVICE_EXCLUDED_SECTIONS) expect(offered).not.toContain(excluded)
    // No shared sections: they are references, and a service page has no members gate.
    expect(offered).not.toContain('reference')
  })

  it('leaves a site without a service type unchanged', () => {
    const only = [doc('page')]
    expect(withServiceSections(only)).toEqual(only)
  })
})
