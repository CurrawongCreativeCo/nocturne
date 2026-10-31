import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { sectionTypes } from '@/features/pages/schemas/sections'

import { FAMILY_TYPES } from '../../../../scripts/design-manifest-utils.mjs'

interface Row {
  path: string
  list?: { value: unknown }[]
}
interface Manifest {
  sections: {
    type: string
    purpose?: string
    fields: Row[]
    presets: { value: string; set: Record<string, unknown> }[]
    example?: Record<string, unknown>
  }[]
  sectionStyle: { fields: Row[] }
}

const root = join(__dirname, '../../../..')
const manifest = JSON.parse(
  readFileSync(join(root, 'design-manifest.generated.json'), 'utf8'),
) as Manifest

describe('design-manifest.generated.json', () => {
  it('has every registered section type', () => {
    expect(manifest.sections.map((section) => section.type)).toEqual(
      sectionTypes.map((type) => type.name),
    )
  })

  it('gives every section family a purpose', () => {
    for (const name of FAMILY_TYPES) {
      expect(manifest.sections.find((section) => section.type === name)?.purpose).toBeTruthy()
    }
  })

  it('only sets values that the field offers', () => {
    for (const section of manifest.sections) {
      for (const preset of section.presets) {
        for (const [path, value] of Object.entries(preset.set)) {
          const row = path.startsWith('style.')
            ? manifest.sectionStyle.fields.find((field) => field.path === path.slice(6))
            : section.fields.find((field) => field.path === path)
          expect(row, `${section.type} preset ${preset.value} sets ${path}`).toBeDefined()
          if (row?.list) {
            expect(
              row.list.map((entry) => entry.value),
              `${section.type} preset ${preset.value} sets ${path}`,
            ).toContain(value)
          }
        }
      }
    }
  })

  it('has examples that use fields the section has', () => {
    for (const section of manifest.sections.filter((entry) => entry.example)) {
      for (const key of Object.keys(section.example ?? {})) {
        expect(
          section.fields.map((field) => field.path),
          `${section.type} example ${key}`,
        ).toContain(key)
      }
    }
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('the site does not ship the manifest', () => {
  it('is imported by nothing under src/app', () => {
    const importers = sourceFiles(join(root, 'src/app')).filter((file) =>
      readFileSync(file, 'utf8').includes('design-manifest'),
    )
    expect(importers).toEqual([])
  })
})
