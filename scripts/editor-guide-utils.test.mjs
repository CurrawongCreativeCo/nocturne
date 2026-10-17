import { describe, expect, it } from 'vitest'

import {
  buildEditorGuide,
  describeLimits,
  describeSection,
  parseGuide,
  recordLimits,
  splitImageAdvice,
  startCase,
} from './editor-guide-utils.mjs'

const guideText = (extra = '') => `---
title: Change a heading
summary: Edit the words.
order: 2
${extra}---

# Change a heading

<!-- Video: add a link. -->

Body text.
`

describe('parseGuide', () => {
  it('reads the frontmatter and drops the repeated title and authoring notes', () => {
    expect(parseGuide('change-a-heading.md', guideText('feature: blog\nrequires: post\n'))).toEqual(
      {
        id: 'change-a-heading',
        title: 'Change a heading',
        summary: 'Edit the words.',
        order: 2,
        feature: 'blog',
        requires: 'post',
        body: 'Body text.',
      },
    )
  })

  it('asks for frontmatter and a title', () => {
    expect(() => parseGuide('a.md', '# Hi')).toThrow(/frontmatter/)
    expect(() => parseGuide('a.md', '---\nsummary: x\n---\nHi')).toThrow(/title/)
  })
})

describe('startCase', () => {
  it('turns a field name into the title Sanity shows', () => {
    expect(startCase('imagePosition')).toBe('Image position')
    expect(startCase('cta-banner')).toBe('Cta banner')
  })
})

describe('splitImageAdvice', () => {
  it('separates the recommended size from the rest of the description', () => {
    expect(
      splitImageAdvice('A photo. SVG preferred. Recommended: 1600 × 1200 px, landscape.'),
    ).toEqual({
      description: 'A photo. SVG preferred.',
      imageSize: '1600 × 1200 px, landscape.',
    })
  })

  it('leaves a description without advice alone', () => {
    expect(splitImageAdvice('Small label.')).toEqual({
      description: 'Small label.',
      imageSize: undefined,
    })
    expect(splitImageAdvice(undefined)).toEqual({ description: '', imageSize: undefined })
  })
})

describe('recordLimits and describeLimits', () => {
  it('records min, max and required through a chain, including warnings', () => {
    const limits = recordLimits((rule) => rule.required().min(2).max(4).warning('Too long'))
    expect(limits).toEqual({ required: true, min: 2, max: 4 })
  })

  it('handles validators that return a list and ignores custom checks', () => {
    expect(
      recordLimits((rule) => [rule.required().min(1), rule.max(8), rule.custom(() => true)]),
    ).toEqual({
      required: true,
      min: 1,
      max: 8,
    })
  })

  it('survives a validator that reads real Rule internals', () => {
    expect(
      recordLimits(() => {
        throw new Error('needs a real rule')
      }),
    ).toEqual({})
    expect(recordLimits(undefined)).toEqual({})
  })

  it('says the limit as an editor would', () => {
    expect(describeLimits('string', { max: 60 })).toBe('Up to 60 characters')
    expect(describeLimits('array', { min: 2, max: 4 })).toBe('2 to 4 items')
    expect(describeLimits('array', { max: 1 })).toBe('Up to 1 item')
    expect(describeLimits('array', { min: 3 })).toBe('At least 3 items')
    expect(describeLimits('array', { min: 1 })).toBeUndefined()
    expect(describeLimits('image', { max: 3 })).toBeUndefined()
  })
})

const schemaJson = [
  { name: 'post', type: 'document', value: { attributes: {} } },
  {
    name: 'hero',
    type: 'type',
    value: { type: 'object', attributes: { title: {}, eyebrow: {}, image: {}, access: {} } },
  },
]

const agencyOnly = () => true
const heroType = {
  name: 'hero',
  title: 'Hero',
  fields: [
    { name: 'eyebrow', type: 'string', validation: (rule) => rule.max(30) },
    { name: 'title', title: 'Headline', type: 'string', validation: (rule) => rule.required() },
    {
      name: 'image',
      type: 'image',
      description: 'A photo. Recommended: 2400 × 1600 px, landscape.',
    },
    { name: 'style', type: 'sectionStyle', group: 'design' },
    { name: 'access', type: 'string', hidden: agencyOnly },
    { name: 'removed', type: 'string' },
  ],
}

describe('describeSection', () => {
  it('lists the fields a client edits, with sizes and limits', () => {
    expect(describeSection(heroType, schemaJson, agencyOnly)).toEqual({
      name: 'hero',
      title: 'Hero',
      fields: [
        {
          name: 'eyebrow',
          title: 'Eyebrow',
          kind: 'Short text',
          required: false,
          length: 'Up to 30 characters',
        },
        { name: 'title', title: 'Headline', kind: 'Short text', required: true },
        {
          name: 'image',
          title: 'Image',
          kind: 'Image',
          required: false,
          description: 'A photo.',
          imageSize: '2400 × 1600 px, landscape.',
        },
      ],
    })
  })

  it('skips a section schema.json does not have', () => {
    expect(describeSection({ ...heroType, name: 'gone' }, schemaJson, agencyOnly)).toBeUndefined()
  })
})

describe('buildEditorGuide', () => {
  const guides = [
    { id: 'b', title: 'B', summary: '', order: 2, body: 'b' },
    { id: 'a', title: 'A', summary: '', order: 1, body: 'a' },
    {
      id: 'blog',
      title: 'Blog',
      summary: '',
      order: 3,
      body: 'x',
      feature: 'blog',
      requires: 'post',
    },
    {
      id: 'team',
      title: 'Team',
      summary: '',
      order: 4,
      body: 'x',
      feature: 'team',
      requires: 'teamMember',
    },
  ]
  const base = {
    guides,
    sectionTypes: [heroType, { ...heroType, name: 'faq' }],
    schemaJson,
    agencyOnly,
  }

  it('orders guides and keeps only the ones this site uses', () => {
    const result = buildEditorGuide({
      ...base,
      features: { blog: true, team: true },
      clientSections: new Set(['hero']),
    })
    // `team` needs a teamMember type, which schema.json lacks.
    expect(result.guides.map((guide) => guide.id)).toEqual(['a', 'b', 'blog'])
    expect(result.sections.map((section) => section.name)).toEqual(['hero'])
  })

  it('drops a guide whose feature is off', () => {
    const result = buildEditorGuide({
      ...base,
      features: { blog: false },
      clientSections: new Set(),
    })
    expect(result.guides.map((guide) => guide.id)).toEqual(['a', 'b'])
    expect(result.sections).toEqual([])
  })
})
