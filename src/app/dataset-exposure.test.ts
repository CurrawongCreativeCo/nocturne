import { describe, expect, it, vi } from 'vitest'

import exposure from '../../scripts/dataset-exposure.json'

// The feature schemas read the Sanity project at import time; any value will do for this test.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})

/**
 * Every document type in the Studio's schema must be classified in scripts/dataset-exposure.json, and
 * every field that looks personal or secret must be accounted for. This is what stops a new feature
 * quietly storing sensitive data where the public-dataset check (ACCEPT_PUBLIC_DATASET) never looks:
 * the test fails until someone decides whether it needs a probe. The field check is a name heuristic,
 * a tripwire and not a proof. It reads the schema source files themselves (not the generated
 * schema.json), so it sees a type a generator has just added, and works without typegen.
 */

interface SchemaDefinition {
  name?: unknown
  type?: unknown
  fields?: { name?: unknown }[]
}

const loaders = {
  ...import.meta.glob('/src/features/*/schemas/**/*.ts'),
  ...import.meta.glob('/src/lib/sanity/schema/**/*.ts'),
} as Record<string, () => Promise<Record<string, unknown>>>
// Only schema definitions: importing a test file would run its tests inside this one.
const modules = await Promise.all(
  Object.entries(loaders)
    .filter(([path]) => !/\.test\.tsx?$/.test(path))
    .map(([, load]) => load()),
)

/** Document types from every schema module, with their top-level field names. */
const documents = new Map<string, string[]>()
for (const exports of modules) {
  for (const value of Object.values(exports)) {
    const candidates = Array.isArray(value) ? value : [value]
    for (const candidate of candidates as (SchemaDefinition | null | undefined)[]) {
      if (candidate?.type !== 'document' || typeof candidate.name !== 'string') continue
      documents.set(
        candidate.name,
        (candidate.fields ?? []).flatMap((field) =>
          typeof field.name === 'string' ? [field.name] : [],
        ),
      )
    }
  }
}

const types = exposure.types as Record<string, { class: string; probe?: string; why: string }>
const probes = exposure.probes as Record<string, { label: string; groq: string }>

describe('dataset exposure classification', () => {
  it('has a schema to check, so the tests below are not empty', () => {
    expect(documents.size).toBeGreaterThan(15)
  })

  it('classifies every document type, so a new one cannot skip the decision', () => {
    const missing = [...documents.keys()].filter((name) => !types[name])
    expect(
      missing,
      `New document type(s) ${missing.join(', ')} are not in scripts/dataset-exposure.json. Decide whether they can hold sensitive data: if so, add a probe that counts it anonymously and mark the type "probed"; otherwise mark it "published", "internal" or "system" with a reason.`,
    ).toEqual([])
  })

  it('has no classification for a type that no longer exists', () => {
    // Sanity's own types (assets, assist) are listed for the record but aren't in our source.
    const gone = Object.entries(types)
      .filter(([name, entry]) => entry.class !== 'system' && !documents.has(name))
      .map(([name]) => name)
    expect(gone).toEqual([])
  })

  it('gives every probed type a probe, and every probe a type and a query', () => {
    const used = new Set<string>()
    for (const [name, entry] of Object.entries(types)) {
      expect(['probed', 'published', 'internal', 'system'], name).toContain(entry.class)
      expect(entry.why.length, name).toBeGreaterThan(5)
      if (entry.class === 'probed') {
        expect(probes[entry.probe ?? ''], `${name} names an unknown probe`).toBeDefined()
        used.add(entry.probe ?? '')
      }
    }
    for (const [key, probe] of Object.entries(probes)) {
      expect(used.has(key), `probe "${key}" covers no type`).toBe(true)
      expect(probe.groq).toContain('count(')
      expect(probe.groq).toContain('drafts.**')
    }
  })

  it('accounts for every field whose name looks personal or secret', () => {
    const pattern = new RegExp(exposure.publicFields.pattern, 'i')
    const allowed = exposure.publicFields.fields as Record<string, string>
    const unexplained = [...documents.entries()]
      .filter(([name]) => types[name]?.class !== 'probed')
      .flatMap(([name, fields]) =>
        fields
          .filter((field) => pattern.test(field) && !allowed[`${name}.${field}`])
          .map((field) => `${name}.${field}`),
      )
    expect(
      unexplained,
      `Field(s) ${unexplained.join(', ')} look personal or secret. Add a probe for the type, or list the field under publicFields in scripts/dataset-exposure.json with why it is fine to publish.`,
    ).toEqual([])
  })

  it('lists no public field that does not exist', () => {
    const real = new Set(
      [...documents.entries()].flatMap(([name, fields]) => fields.map((f) => `${name}.${f}`)),
    )
    expect(Object.keys(exposure.publicFields.fields).filter((key) => !real.has(key))).toEqual([])
  })
})
