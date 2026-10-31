import { describe, expect, it } from 'vitest'

import {
  FAMILY_TYPES,
  buildDesignManifest,
  evaluateRules,
  listOf,
  missingPurposes,
} from './design-manifest-utils.mjs'

const cta = {
  name: 'cta',
  type: 'object',
  fields: [
    { name: 'label', type: 'string' },
    {
      name: 'variant',
      type: 'string',
      options: { list: [{ title: 'Solid', value: 'solid' }, 'outline'] },
    },
  ],
}

const sectionStyle = {
  name: 'sectionStyle',
  type: 'object',
  fields: [
    {
      name: 'tone',
      type: 'string',
      options: {
        list: [
          { title: 'Page', value: 'surface' },
          { title: 'Dark', value: 'inverse' },
        ],
      },
    },
  ],
}

const designSettings = {
  name: 'designSettings',
  type: 'document',
  fields: [{ name: 'appearance', type: 'string', options: { list: ['light', 'dark'] } }],
}

const banner = {
  name: 'banner',
  title: 'Banner',
  type: 'object',
  options: {
    manifest: { purpose: 'A strip of news.', example: { title: 'Hello' } },
    presets: [{ value: 'dark', title: 'Dark', set: { variant: 'wide', 'style.tone': 'inverse' } }],
  },
  fields: [
    {
      name: 'variant',
      type: 'string',
      options: {
        list: [
          { title: 'Wide', value: 'wide' },
          { title: 'Narrow', value: 'narrow' },
        ],
      },
    },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string', validation: () => [] },
    {
      name: 'details',
      type: 'object',
      fields: [{ name: 'note', type: 'text' }],
    },
    { name: 'buttons', type: 'array', of: [{ type: 'cta' }] },
    { name: 'tags', type: 'array', of: [{ type: 'string', options: { list: ['a', 'b'] } }] },
    { name: 'access', type: 'string' },
    { name: 'style', type: 'sectionStyle' },
  ],
}

const schemaJson = [
  {
    name: 'banner',
    value: {
      type: 'object',
      attributes: {
        title: { type: 'objectAttribute', value: { type: 'string' }, optional: false },
        buttons: {
          type: 'objectAttribute',
          value: {
            type: 'array',
            of: { type: 'object', attributes: {}, rest: { type: 'inline', name: 'cta' } },
          },
          optional: true,
        },
      },
    },
  },
  {
    name: 'cta',
    value: {
      type: 'object',
      attributes: {
        label: { type: 'objectAttribute', value: { type: 'string' }, optional: false },
      },
    },
  },
]

const banner0 = banner

const deps = (overrides = {}) => ({
  version: '9.9.9',
  sectionTypes: [banner],
  sharedTypes: [cta],
  sectionStyle,
  designSettings,
  tokens: { $description: 'x', color: { surface: {}, ink: {} }, radius: { card: '1rem' } },
  schemaJson,
  rulesFor: (type) =>
    type === 'banner'
      ? {
          hasPicture: (section) => section.variant === 'wide',
          fixesAlignment: (section) => section.variant === 'narrow',
        }
      : {},
  isClientEditable: (type, field) => type === 'banner' && ['title', 'buttons'].includes(field),
  limitsFor: (type) => (type === 'banner' ? { title: 50 } : undefined),
  ...overrides,
})

describe('buildDesignManifest', () => {
  const manifest = buildDesignManifest(deps())
  const banner = manifest.sections[0]
  const field = (path) => banner.fields.find((entry) => entry.path === path)

  it('records the version, purpose and example', () => {
    expect(manifest.manifestVersion).toBe('9.9.9')
    expect(banner).toMatchObject({ type: 'banner', title: 'Banner', purpose: 'A strip of news.' })
    expect(banner.example).toEqual({ title: 'Hello' })
  })

  it('reads option lists, and gives a bare value its own title', () => {
    expect(field('variant').list).toEqual([
      { value: 'wide', title: 'Wide' },
      { value: 'narrow', title: 'Narrow' },
    ])
    expect(banner.variants).toHaveLength(2)
    expect(field('tags[]').list).toEqual([
      { value: 'a', title: 'a' },
      { value: 'b', title: 'b' },
    ])
  })

  it('walks nested objects, arrays and named types', () => {
    expect(field('details.note')).toMatchObject({ kind: 'text' })
    expect(field('buttons[].label')).toMatchObject({ kind: 'string', required: true })
    expect(field('buttons[].variant').list.map((entry) => entry.value)).toEqual([
      'solid',
      'outline',
    ])
  })

  it('takes required from schema.json, and max only from LIMITS', () => {
    expect(field('title')).toMatchObject({ required: true, max: 50 })
    expect(field('access').required).toBe(false)
    expect(field('access').max).toBeUndefined()
    expect(field('buttons[].label').max).toBeUndefined()
  })

  it('says when a constraint is undetermined rather than absent', () => {
    // No validation declared: known optional, no maximum.
    expect(field('details.note')).toMatchObject({ required: false })
    expect(field('details.note')).not.toHaveProperty('max')
    // A validator we do not interpret: neither is known.
    expect(field('subtitle')).toMatchObject({ required: null, max: null })
    // schema.json says required, LIMITS gives the maximum.
    expect(field('title')).toMatchObject({ required: true, max: 50 })
  })

  it('flags client-editable fields, including those nested under an editable field', () => {
    expect(field('title').clientEditable).toBe(true)
    expect(field('buttons[].label').clientEditable).toBe(true)
    expect(field('access').clientEditable).toBe(false)
  })

  it('keeps the section style out of the section and lists it once', () => {
    expect(banner.fields.some((entry) => entry.path.startsWith('style.'))).toBe(false)
    expect(manifest.sectionStyle.fields.map((entry) => entry.path)).toEqual(['tone'])
    expect(manifest.sectionStyle.fields[0].clientEditable).toBe(false)
    expect(manifest.designSettings.fields[0].list.map((entry) => entry.value)).toEqual([
      'light',
      'dark',
    ])
  })

  it('lists presets with what they set', () => {
    expect(banner.presets).toEqual([
      { value: 'dark', title: 'Dark', set: { variant: 'wide', 'style.tone': 'inverse' } },
    ])
  })

  it('lists token names by group', () => {
    expect(manifest.tokens).toEqual({ color: ['surface', 'ink'], radius: ['card'] })
  })

  it('reflects a changed option list', () => {
    const changed = {
      ...banner0,
      fields: banner0.fields.map((f) =>
        f.name === 'variant' ? { ...f, options: { list: [{ title: 'Tall', value: 'tall' }] } } : f,
      ),
    }
    const next = buildDesignManifest(deps({ sectionTypes: [changed] })).sections[0]
    expect(next.variants).toEqual([{ value: 'tall', title: 'Tall' }])
    expect(next.rules.map((rule) => rule.variant)).toEqual([null, 'tall'])
  })

  it('is identical every time it is built', () => {
    expect(JSON.stringify(buildDesignManifest(deps()))).toBe(JSON.stringify(manifest))
  })

  it('does not need a family a client site has removed', () => {
    expect(() => buildDesignManifest(deps())).not.toThrow()
    expect(manifest.sections.map((section) => section.type)).toEqual(['banner'])
  })

  it('refuses a family with no purpose', () => {
    const bare = { name: 'hero', type: 'object', fields: [] }
    expect(() => buildDesignManifest(deps({ sectionTypes: [bare] }))).toThrow(/hero/)
  })
})

describe('evaluateRules', () => {
  it('evaluates once with no layout, then once per layout', () => {
    const rules = evaluateRules('banner', [{ value: 'wide' }, { value: 'narrow' }], () => ({
      hasPicture: (section) => section.variant === 'wide',
      fixesAlignment: (section) => section.variant === 'narrow',
    }))
    expect(rules).toEqual([
      { variant: null, hasPicture: false, fixesAlignment: false, hasOwnBackgroundImage: false },
      { variant: 'wide', hasPicture: true, fixesAlignment: false, hasOwnBackgroundImage: false },
      { variant: 'narrow', hasPicture: false, fixesAlignment: true, hasOwnBackgroundImage: false },
    ])
  })

  it('records false for a section that registered nothing', () => {
    expect(evaluateRules('plain', [], () => ({}))).toHaveLength(1)
  })
})

describe('listOf and missingPurposes', () => {
  it('has no list for a plain field', () => {
    expect(listOf({ name: 'x', type: 'string' })).toBeUndefined()
  })

  it('names the families without a purpose', () => {
    const types = [{ name: 'hero', options: { manifest: { purpose: 'x' } } }, { name: 'mediaText' }]
    expect(FAMILY_TYPES).toEqual(['hero', 'mediaText'])
    expect(missingPurposes(types)).toEqual(['mediaText'])
  })
})
