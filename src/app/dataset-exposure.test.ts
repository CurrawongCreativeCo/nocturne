import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import exposure from '../../scripts/dataset-exposure.json'

/**
 * Every document type in the Studio's schema must be classified in scripts/dataset-exposure.json, and
 * every field that looks personal or secret must be accounted for. This is what stops a new feature
 * quietly storing sensitive data where the public-dataset check (ACCEPT_PUBLIC_DATASET) never looks:
 * the test fails until someone decides whether it needs a probe. The field check is a name heuristic,
 * a tripwire and not a proof. It reads schema.json, which `npm run typegen` regenerates.
 */

interface SchemaEntry {
  name: string
  type?: string
  attributes?: Record<string, unknown>
}

const schemaPath = join(process.cwd(), 'schema.json')
const schema: SchemaEntry[] = existsSync(schemaPath)
  ? (JSON.parse(readFileSync(schemaPath, 'utf8')) as SchemaEntry[])
  : []
const documents = schema.filter((entry) => entry.type === 'document')
const types = exposure.types as Record<string, { class: string; probe?: string; why: string }>
const probes = exposure.probes as Record<string, { label: string; groq: string }>

const fieldsOf = (entry: SchemaEntry) =>
  Object.keys(entry.attributes ?? {}).filter((field) => !field.startsWith('_'))

describe('dataset exposure classification', () => {
  it('has a schema to check, so the tests below are not empty', () => {
    expect(existsSync(schemaPath)).toBe(true)
    expect(documents.length).toBeGreaterThan(15)
  })

  it('classifies every document type, so a new one cannot skip the decision', () => {
    const missing = documents.map((entry) => entry.name).filter((name) => !types[name])
    expect(
      missing,
      `New document type(s) ${missing.join(', ')} are not in scripts/dataset-exposure.json. Decide whether they can hold sensitive data: if so, add a probe that counts it anonymously and mark the type "probed"; otherwise mark it "published", "internal" or "system" with a reason.`,
    ).toEqual([])
  })

  it('has no classification for a type that no longer exists', () => {
    const names = new Set(documents.map((entry) => entry.name))
    expect(Object.keys(types).filter((name) => !names.has(name))).toEqual([])
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
    const unexplained = documents
      .filter((entry) => types[entry.name]?.class !== 'probed')
      .flatMap((entry) =>
        fieldsOf(entry)
          .filter((field) => pattern.test(field) && !allowed[`${entry.name}.${field}`])
          .map((field) => `${entry.name}.${field}`),
      )
    expect(
      unexplained,
      `Field(s) ${unexplained.join(', ')} look personal or secret. Add a probe for the type, or list the field under publicFields in scripts/dataset-exposure.json with why it is fine to publish.`,
    ).toEqual([])
  })

  it('lists no public field that does not exist', () => {
    const real = new Set(
      documents.flatMap((entry) => fieldsOf(entry).map((f) => `${entry.name}.${f}`)),
    )
    expect(Object.keys(exposure.publicFields.fields).filter((key) => !real.has(key))).toEqual([])
  })
})
