import { Schema } from '@sanity/schema'
import type { ObjectSchemaType, Path, SanityDocument, ValidationMarker } from 'sanity'
import { describe, expect, it, vi } from 'vitest'

import {
  describeValidationPath,
  openValidationProblem,
  publishProblems,
  validationWording,
} from './publish-validation'

const schema = Schema.compile({
  types: [
    {
      name: 'page',
      type: 'document',
      fields: [
        {
          name: 'sections',
          title: 'Sections',
          type: 'array',
          of: [
            {
              name: 'hero',
              title: 'Hero',
              type: 'object',
              groups: [{ name: 'design', title: 'Design' }],
              fields: [
                {
                  name: 'imageDesign',
                  title: 'Image design',
                  type: 'object',
                  group: 'design',
                  fields: [
                    {
                      name: 'appearance',
                      title: 'Appearance',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Circle', value: 'circle' },
                          { title: 'Framed', value: 'framed' },
                        ],
                      },
                    },
                    {
                      name: 'approvedFrame',
                      title: 'Approved frame',
                      type: 'string',
                      hidden: ({ parent }: { parent: { appearance?: string } }) =>
                        parent.appearance !== 'framed',
                    },
                    {
                      name: 'agencySetting',
                      title: 'Agency setting',
                      type: 'string',
                      hidden: true,
                    },
                    {
                      name: 'brokenCondition',
                      title: 'Setting with a broken condition',
                      type: 'string',
                      hidden: () => {
                        throw new Error('Old schema')
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        { name: 'title', title: 'Title', type: 'string' },
      ],
    },
  ],
}).get('page') as ObjectSchemaType

function document(appearance = 'framed'): SanityDocument {
  return {
    _id: 'drafts.page',
    _type: 'page',
    _rev: 'revision',
    _createdAt: '',
    _updatedAt: '',
    sections: [{ _key: 'private-key', _type: 'hero', imageDesign: { appearance } }],
  }
}
const path: Path = ['sections', { _key: 'private-key' }, 'imageDesign', 'approvedFrame']
const context = { document: document(), currentUser: null }

describe('describeValidationPath', () => {
  it('uses titles, including the field group and nested object', () => {
    expect(describeValidationPath(schema, path, context)).toEqual({
      title: 'Sections › Hero › Design › Image design › Approved frame',
      target: path,
    })
  })

  it('explains a hidden choice and targets the choice that reveals the field', () => {
    expect(
      describeValidationPath(schema, path, { ...context, document: document('circle') }),
    ).toMatchObject({
      hidden:
        'This setting is hidden by another choice (Appearance: Circle). Change Appearance to Framed to show it, or ask your agency for help.',
      target: ['sections', { _key: 'private-key' }, 'imageDesign', 'appearance'],
    })
  })

  it.each(['agencySetting', 'brokenCondition'])(
    'sends a hidden %s to the inspector with agency help',
    (field) => {
      const result = describeValidationPath(schema, [...path.slice(0, -1), field], context)
      expect(result.hidden).toContain('Ask your agency')
      expect(result.target).toBeNull()
    },
  )

  it('distinguishes repeated sections by position, for both keyed and numeric paths', () => {
    const doc = document()
    doc.sections = [
      ...(doc.sections as unknown[]),
      { _key: 'second-key', _type: 'hero', imageDesign: {} },
    ]
    for (const item of [{ _key: 'second-key' }, 1]) {
      const result = describeValidationPath(
        schema,
        ['sections', item, 'imageDesign', 'approvedFrame'],
        { ...context, document: doc },
      )
      expect(result.title).toContain('Hero (2)')
      expect(result.title).not.toContain('key')
    }
  })

  it.each<Path>([
    [],
    ['deletedField'],
    ['sections', { _key: 'gone' }, 'secretName'],
    ['sections', [0, 1]],
  ])('safely handles missing, document and range paths: %j', (...parts) => {
    const result = describeValidationPath(schema, parts, context)
    expect(result.target).toBeNull()
    expect(result.title).not.toMatch(/deletedField|secretName|gone|_key/)
  })
})

describe('validationWording', () => {
  it('gives required errors a plain instruction and keeps useful custom messages', () => {
    expect(validationWording('Required', path)).toBe('Add a value for this field.')
    expect(validationWording('Choose an approved frame, or a different frame style', path)).toBe(
      'Choose an approved frame, or a different frame style',
    )
  })
  it.each(['Invalid private-key', 'Invalid _ref', 'Check sections.imageDesign.approvedFrame'])(
    'hides technical details: %s',
    (message) => {
      expect(validationWording(message, path)).toBe(
        'Check this field and correct its value. Ask your agency if you need help.',
      )
    },
  )
  it('keeps errors and warnings distinct and leaves informational markers out', () => {
    const markers: ValidationMarker[] = ['error', 'warning', 'info'].map((level) => ({
      level,
      message: 'Required',
      path: ['title'],
    })) as ValidationMarker[]
    expect(publishProblems(schema, markers, context).map(({ level }) => level)).toEqual([
      'error',
      'warning',
    ])
  })
})

describe('openValidationProblem', () => {
  it('opens nested objects and field groups before focusing the selected path', () => {
    const calls: string[] = []
    const pane = {
      onPathOpen: vi.fn(() => calls.push('open')),
      onFocus: vi.fn(() => calls.push('focus')),
      openInspector: vi.fn(),
    }
    openValidationProblem(path, pane)
    expect(calls).toEqual(['open', 'focus'])
    expect(pane.onFocus).toHaveBeenCalledWith(path)
    expect(pane.openInspector).not.toHaveBeenCalled()
  })
  it('opens Sanity’s validation inspector when a path is hidden, unavailable or unsupported', () => {
    const openInspector = vi.fn()
    openValidationProblem(null, { openInspector })
    openValidationProblem(path, { openInspector })
    openValidationProblem(path, {
      openInspector,
      onPathOpen: () => {
        throw new Error('Unavailable')
      },
      onFocus: vi.fn(),
    })
    expect(openInspector).toHaveBeenCalledTimes(3)
    expect(openInspector).toHaveBeenLastCalledWith('sanity/structure/validation')
  })
})
