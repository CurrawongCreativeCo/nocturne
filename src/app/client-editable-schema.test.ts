import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { SchemaTypeDefinition } from 'sanity'
import { describe, expect, it, vi } from 'vitest'

import { blogSchemaTypes } from '@/features/blog/schemas'
import { eventsSchemaTypes } from '@/features/events/schemas'
import { experimentSchemaTypes } from '@/features/experiments/schemas'
import { formSchemaTypes } from '@/features/forms/schemas'
import { framesSchemaTypes } from '@/features/frames/schemas'
import { pageSchemaTypes } from '@/features/pages/schemas'
import { panelsSchemaTypes } from '@/features/panels/schemas'
import { pricingSchemaTypes } from '@/features/pricing/schemas'
import { siteSchemaTypes } from '@/features/site/schemas'
import { teamSchemaTypes } from '@/features/team/schemas'
import { AGENCY_ONLY_TYPES, CLIENT_EDITABLE_FIELDS } from '@/lib/sanity/client-editable'
import { sharedSchemaTypes } from '@/lib/sanity/schema'

// The feature schemas read the Sanity project at import time; any value will do for this test.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})

/**
 * The field classification registry (src/lib/sanity/client-editable.ts) against the Studio's real
 * schema: this fails when a field or type is added without deciding whether clients may change it.
 * It lives in src/app because it composes every feature, like sanity.config.ts.
 */

interface SchemaEntry {
  name: string
  type?: string
  // Documents keep their fields at the top level, other types under `value`.
  attributes?: Record<string, unknown>
  value?: { attributes?: Record<string, unknown> }
}

const schemaPath = join(process.cwd(), 'schema.json')
const schema: SchemaEntry[] = existsSync(schemaPath)
  ? (JSON.parse(readFileSync(schemaPath, 'utf8')) as SchemaEntry[])
  : []

/** Stored fields of a type from schema.json, without Sanity's system fields (`_id`, `_type`…). */
function storedFields(name: string): string[] {
  const entry = schema.find((item) => item.name === name)
  const attributes = entry?.attributes ?? entry?.value?.attributes ?? {}
  return Object.keys(attributes).filter((field) => !field.startsWith('_'))
}

/** Documents from schema.json, so a document type in a feature this file doesn't import is still caught. */
const documents = schema
  .filter((item) => item.type === 'document' && !/^(sanity|assist)\./.test(item.name))
  .map((item) => item.name)

const registered = [
  ...pageSchemaTypes,
  ...blogSchemaTypes,
  ...formSchemaTypes,
  ...pricingSchemaTypes,
  ...experimentSchemaTypes,
  ...siteSchemaTypes,
  ...teamSchemaTypes,
  ...eventsSchemaTypes,
  ...framesSchemaTypes,
  ...panelsSchemaTypes,
  ...sharedSchemaTypes,
].filter((type): type is SchemaTypeDefinition & { fields: unknown[] } => 'fields' in type)

describe('client-editable registry', () => {
  it('has a schema.json to check against (run `npm run typegen` if not)', () => {
    expect(schema.length).toBeGreaterThan(0)
  })

  it('classifies every registered document and object type', () => {
    const unclassified = [
      ...new Set([...registered.map((type) => type.name), ...documents]),
    ].filter((name) => !AGENCY_ONLY_TYPES.has(name) && !(name in CLIENT_EDITABLE_FIELDS))
    expect(unclassified, 'add these types to src/lib/sanity/client-editable.ts').toEqual([])
  })

  it('classifies every stored field of a client-editable type', () => {
    const unclassified = Object.entries(CLIENT_EDITABLE_FIELDS).flatMap(([type, entry]) =>
      storedFields(type)
        .filter((field) => !entry.editable.includes(field) && !entry.agencyOnly.includes(field))
        .map((field) => `${type}.${field}`),
    )
    expect(unclassified, 'classify these fields in src/lib/sanity/client-editable.ts').toEqual([])
  })

  it('lists no field twice, and none that no longer exists', () => {
    const problems: string[] = []
    for (const [type, entry] of Object.entries(CLIENT_EDITABLE_FIELDS)) {
      const stored = new Set(storedFields(type))
      if (stored.size === 0) problems.push(`${type}: not in schema.json`)
      for (const field of [...entry.editable, ...entry.agencyOnly]) {
        if (!stored.has(field)) problems.push(`${type}.${field}: not in schema.json`)
      }
      for (const field of entry.editable) {
        if (entry.agencyOnly.includes(field)) problems.push(`${type}.${field}: in both lists`)
      }
    }
    for (const type of AGENCY_ONLY_TYPES) {
      if (type in CLIENT_EDITABLE_FIELDS) problems.push(`${type}: in both registries`)
      if (storedFields(type).length === 0) problems.push(`${type}: not in schema.json`)
    }
    expect(problems).toEqual([])
  })
})
