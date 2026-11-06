import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { builtBy } from '@/lib/sanity/schema/capability-marker'

import { provenanceOf, provenanceSourceProblems, type SourceFile } from './builder-provenance'

const ROOT = join(import.meta.dirname, '..', '..', '..')

function sources(dir: string): SourceFile[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx|mjs)$/.test(name)
      ? [{ path: relative(ROOT, path), source: readFileSync(path, 'utf8') }]
      : []
  })
}

describe('builder provenance', () => {
  it('stamps what a builder makes, for the field it made', () => {
    const field = builtBy('surfaceFields', { name: 'border', type: 'string' }, 'surface')
    expect(provenanceOf(field.options)).toEqual({
      builder: 'surfaceFields',
      capability: 'surface',
      name: 'border',
    })
    // The stamp isn't data: it doesn't survive a JSON round trip, and a typed-in builder isn't one.
    expect(provenanceOf(JSON.parse(JSON.stringify(field.options)))).toBeUndefined()
    expect(provenanceOf({ designBuilder: 'surfaceFields' })).toBeUndefined()
  })

  it('hands out a stamp that can’t be edited to change the proof', () => {
    const field = builtBy('surfaceFields', { name: 'border', type: 'string' }, 'surface')
    const stamp = provenanceOf(field.options)
    expect(stamp).toBeDefined()
    if (!stamp) return
    const forge = (change: () => void) => {
      try {
        change()
      } catch {
        // A frozen stamp refuses the change by throwing; either way it must not take.
      }
    }
    forge(() => {
      ;(stamp as { builder: string }).builder = 'sectionStyle'
    })
    forge(() => {
      ;(stamp as { capability?: string }).capability = 'glass'
    })
    forge(() => {
      ;(stamp as { name?: string }).name = 'shadow'
    })
    forge(() => Reflect.deleteProperty(stamp, 'capability'))
    expect(Object.isFrozen(stamp)).toBe(true)
    // A second read, and the options a copy of the field would carry, still say what the builder made.
    expect(provenanceOf(field.options)).toEqual({
      builder: 'surfaceFields',
      capability: 'surface',
      name: 'border',
    })
  })

  it('is only stamped by each builder’s own module, in this repository', () => {
    expect(
      provenanceSourceProblems([...sources(join(ROOT, 'src')), ...sources(join(ROOT, 'scripts'))]),
    ).toEqual([])
  })

  it('catches a module that claims a builder, stamps directly or copies symbols', () => {
    expect(
      provenanceSourceProblems([
        {
          path: 'src/features/pages/schemas/sections/sparkle.ts',
          source: "const glow = builtBy('surfaceFields', { name: 'glow', type: 'string' })",
        },
        {
          path: 'src/lib/sanity/schema/surface-design.ts',
          source: "builtBy('sectionStyle', field); builtBy(name, field)",
        },
        { path: 'src/lib/anything.ts', source: 'stampProvenance(options, stolen)' },
        { path: 'src/lib/thief.ts', source: 'Object.getOwnPropertySymbols(field.options)' },
        { path: 'src/lib/ok.test.ts', source: "builtBy('surfaceFields', x)" },
      ]),
    ).toEqual([
      'src/features/pages/schemas/sections/sparkle.ts claims the surfaceFields builder, which only src/lib/sanity/schema/surface-design.ts may.',
      "src/features/pages/schemas/sections/sparkle.ts calls a builder stamp but isn't a shared builder's module.",
      "src/lib/sanity/schema/surface-design.ts names a builder that isn't written out, so it can't be checked.",
      'src/lib/sanity/schema/surface-design.ts claims the sectionStyle builder, which only src/lib/sanity/schema/section-style.ts may.',
      'src/lib/anything.ts stamps builder provenance; only src/lib/sanity/schema/capability-marker.ts may.',
      'src/lib/thief.ts reads object symbols, which could copy a builder’s provenance stamp.'.replace(
        '’',
        "'",
      ),
    ])
  })
})
