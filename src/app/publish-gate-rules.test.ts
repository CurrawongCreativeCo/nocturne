import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { blogSchemaTypes } from '@/features/blog/schemas'
import { eventsSchemaTypes } from '@/features/events/schemas'
import { pageSchemaTypes } from '@/features/pages/schemas'
import { panelsSchemaTypes } from '@/features/panels/schemas'
import { INITIAL_VALUES, REQUIRED_FIELDS } from '@/features/publish-gate/utils/document-rules'
import { siteSchemaTypes } from '@/features/site/schemas'
import { teamSchemaTypes } from '@/features/team/schemas'
import { CLIENT_EDITABLE_FIELDS } from '@/lib/sanity/client-editable'
import { sharedSchemaTypes } from '@/lib/sanity/schema'

// The feature schemas read the Sanity project at import time; any value will do for this test.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})

/**
 * The publish gate's rules (src/features/publish-gate/utils/document-rules.ts) against the Studio's
 * real schema: a required field or an initial value changed there must change there too. It lives
 * in src/app because it composes every feature, like client-editable-schema.test.ts.
 */
interface SchemaEntry {
  name: string
  type?: string
  attributes?: Record<string, { optional?: boolean }>
}

const schemaPath = join(process.cwd(), 'schema.json')
const schema: SchemaEntry[] = existsSync(schemaPath)
  ? (JSON.parse(readFileSync(schemaPath, 'utf8')) as SchemaEntry[])
  : []

interface Field {
  name: string
  initialValue?: unknown
}
const registered = [
  ...pageSchemaTypes,
  ...blogSchemaTypes,
  ...siteSchemaTypes,
  ...teamSchemaTypes,
  ...eventsSchemaTypes,
  ...panelsSchemaTypes,
  ...sharedSchemaTypes,
]
const fieldsOf = (name: string): Field[] => {
  const type = registered.find((item) => item.name === name) as
    { fields?: { name: string; type?: unknown; initialValue?: unknown }[] } | undefined
  return type?.fields ?? []
}

describe.skipIf(schema.length === 0)('publish gate required fields', () => {
  const documents = Object.keys(CLIENT_EDITABLE_FIELDS).filter((name) =>
    schema.some((entry) => entry.name === name && entry.type === 'document'),
  )

  it.each(documents)('%s: REQUIRED_FIELDS matches the schema', (name) => {
    const entry = schema.find((item) => item.name === name)
    const required = Object.entries(entry?.attributes ?? {})
      .filter(([field, attribute]) => !field.startsWith('_') && attribute.optional === false)
      .map(([field]) => field)
    expect([...(REQUIRED_FIELDS[name] ?? [])].sort()).toEqual(required.sort())
  })
})

describe('publish gate initial values', () => {
  // Only static initial values can be compared; a function (a date) is not a protected field's default.
  const documentLevel = Object.entries(INITIAL_VALUES).filter(([name]) => name !== '*')

  it.each(documentLevel)('%s: INITIAL_VALUES agrees with the schema', (name, expected) => {
    const fields = fieldsOf(name)
    for (const [field, value] of Object.entries(expected)) {
      const found = fields.find((item) => item.name === field)
      expect(found, `${name}.${field} is not a field`).toBeDefined()
      // A preset field keeps its initial value on the field's own definition.
      const initial = found?.initialValue
      if (initial !== undefined) expect(initial).toEqual(value)
    }
  })
})
