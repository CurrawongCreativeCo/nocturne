import { describe, expect, it } from 'vitest'

import {
  classifyNewDocument,
  applyEdits,
  constantCase,
  insertAtMarker,
  registryExportName,
  registrySource,
  toFeatureName,
} from './generator-utils.mjs'

describe('naming', () => {
  it('upper-cases a type name for query constants', () => {
    expect(constantCase('caseStudy')).toBe('CASE_STUDY')
    expect(constantCase('faq2')).toBe('FAQ2')
    expect(constantCase('post')).toBe('POST')
  })

  it('gives one feature folder name for any spelling', () => {
    for (const input of ['draft-mode', 'Draft mode', 'draftMode', ' draft_mode '])
      expect(toFeatureName(input)).toBe('draft-mode')
    expect(toFeatureName('2fast')).toBeNull()
    expect(toFeatureName('')).toBeNull()
  })

  it('names a feature registry after the feature', () => {
    expect(registryExportName('events')).toBe('eventsSchemaTypes')
    expect(registryExportName('draft-mode')).toBe('draftModeSchemaTypes')
    expect(registrySource('draft-mode')).toContain(
      'export const draftModeSchemaTypes: SchemaTypeDefinition[] = [',
    )
  })
})

describe('insertAtMarker', () => {
  const source = ['const list = [', '  a,', '  // new:register', ']', ''].join('\n')

  it('inserts above the marker at its indentation and keeps the marker', () => {
    expect(insertAtMarker(source, '// new:register', 'b,\n')).toBe(
      ['const list = [', '  a,', '  b,', '  // new:register', ']', ''].join('\n'),
    )
  })

  it('indents every line of multi-line text and leaves blank lines empty', () => {
    expect(insertAtMarker('  // m', '// m', 'x({\n\n  y: 1,\n})\n')).toBe(
      '  x({\n\n    y: 1,\n  })\n  // m',
    )
  })

  it('inserts in order when run twice', () => {
    const once = insertAtMarker(source, '// new:register', 'b,\n')
    const twice = insertAtMarker(once, '// new:register', 'c,\n')
    expect(twice).toContain('  a,\n  b,\n  c,\n  // new:register')
  })

  it('returns null when the marker is missing', () => {
    expect(insertAtMarker(source, '// new:other', 'b,\n')).toBeNull()
  })

  it('only matches a marker that is a whole comment line', () => {
    expect(insertAtMarker('// new:list', '// new:list', 'x\n')).toBe('x\n// new:list')
    expect(insertAtMarker('// new:listed', '// new:list', 'x\n')).toBeNull()
  })
})

describe('applyEdits', () => {
  const sources = { 'a.ts': '// m1\n// m2\n', 'b.ts': 'import z\n// m3\n' }
  const read = (file) => sources[file]

  it('applies edits per file, in order', () => {
    const result = applyEdits(
      [
        { file: 'a.ts', marker: '// m1', text: '1\n' },
        { file: 'a.ts', marker: '// m2', text: '2\n' },
        { file: 'b.ts', marker: '// m3', text: '3\n' },
      ],
      read,
    )
    expect(result.files.get('a.ts')).toBe('1\n// m1\n2\n// m2\n')
    expect(result.files.get('b.ts')).toBe('import z\n3\n// m3\n')
  })

  it('reports every missing marker and returns no files', () => {
    const result = applyEdits(
      [
        { file: 'a.ts', marker: '// m1', text: '1\n' },
        { file: 'a.ts', marker: '// gone', text: '2\n' },
        { file: 'b.ts', marker: '// also-gone', text: '3\n' },
      ],
      read,
    )
    expect(result.files).toBeUndefined()
    expect(result.missing).toEqual([
      { file: 'a.ts', marker: '// gone' },
      { file: 'b.ts', marker: '// also-gone' },
    ])
  })

  it('skips an edit whose `unless` text is already in the file', () => {
    const result = applyEdits(
      [{ file: 'b.ts', marker: '// m3', text: 'import z\n', unless: 'import z' }],
      read,
    )
    expect(result.files.get('b.ts')).toBe('import z\n// m3\n')
  })
})

describe('classifyNewDocument', () => {
  const source = JSON.stringify({ probes: {}, types: { page: { class: 'probed' } } })

  it('records the new type as published, with a reason that asks for a review', () => {
    const out = JSON.parse(classifyNewDocument(source, 'caseStudy'))
    expect(out.types.caseStudy.class).toBe('published')
    expect(out.types.caseStudy.why).toContain('REVIEW')
    expect(out.types.page).toEqual({ class: 'probed' })
  })

  it('leaves an existing classification alone', () => {
    expect(classifyNewDocument(source, 'page')).toBe(source)
  })
})
