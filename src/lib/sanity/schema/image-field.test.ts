import { Schema } from '@sanity/schema'
import { describe, expect, it } from 'vitest'

import { imageField } from './image-field'

function compile(field: ReturnType<typeof imageField>) {
  const schema = Schema.compile({
    types: [{ name: 'doc', type: 'document', fields: [field] }],
  }) as unknown as {
    get: (name: string) => { fields: { name: string; type: { description?: string } }[] }
  }
  return schema.get('doc').fields[0]?.type
}

describe('imageField guidance', () => {
  it('adds the recommendation to the description', () => {
    expect(compile(imageField({ name: 'a', aspect: '3:2', minWidth: 2400 }))?.description).toBe(
      'Recommended: 2400 × 1600 px, landscape.',
    )
  })

  it('keeps an existing description and mentions SVG for logos', () => {
    const type = compile(
      imageField({
        name: 'logo',
        description: 'SVG or transparent PNG.',
        preferSvg: true,
        minWidth: 400,
      }),
    )
    expect(type?.description).toBe(
      'SVG or transparent PNG. SVG preferred. Recommended: at least 400 px wide.',
    )
  })

  it('leaves the description alone without guidance', () => {
    expect(compile(imageField({ name: 'a', description: 'Plain.' }))?.description).toBe('Plain.')
  })
})
