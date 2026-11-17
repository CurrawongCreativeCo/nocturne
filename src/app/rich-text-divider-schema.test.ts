import { readFileSync } from 'node:fs'

import { Schema } from '@sanity/schema'
import { describe, expect, it, vi } from 'vitest'

import { RichTextDividerPlugins } from '@/features/studio/components/rich-text-divider-plugin'
import {
  RICH_TEXT_BODY_TYPE,
  withRichTextDividerGuard,
} from '@/features/studio/components/with-rich-text-divider-guard'
import { sharedSchemaTypes } from '@/lib/sanity/schema'
import { blockContent } from '@/lib/sanity/schema/block-content'
import { richTextBody } from '@/lib/sanity/schema/rich-text-body'

vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

/**
 * The Rich text body's divider is isolated (task 151): its own type, with the divider in `of` (so a stored
 * divider is always valid) and the guard attached to that type alone. The other eight Portable Text
 * fields stay `blockContent`, with no divider and no plugin.
 */

const OTHER_CONSUMERS = [
  'src/features/panels/schemas/panel-text.ts',
  'src/features/blog/schemas/post.ts',
  'src/features/team/schemas/team-member.ts',
  'src/features/locations/schemas/location.ts',
  'src/features/events/schemas/event.ts',
  'src/features/pages/schemas/sections/faq.ts',
  'src/features/pages/schemas/sections/media-text.ts',
  'src/features/services/schemas/service.ts',
]
const names = (type: { of?: readonly { type?: string; name?: string }[] }) =>
  (type.of ?? []).map((member) => member.type ?? member.name)

const compile = (types: Parameters<typeof withRichTextDividerGuard>[0]) =>
  Schema.compile({
    name: 'test',
    types: [
      ...types,
      {
        name: 'article',
        type: 'document',
        fields: [
          { name: 'body', type: RICH_TEXT_BODY_TYPE },
          { name: 'plain', type: 'blockContent' },
        ],
      },
    ],
  })
const fieldType = (schema: ReturnType<typeof compile>, field: string) =>
  (
    schema.get('article') as {
      fields: { name: string; type: { components?: { portableText?: { plugins?: unknown } } } }[]
    }
  ).fields.find(({ name }) => name === field)?.type

describe('the Rich text body type', () => {
  it('keeps the divider in `of`, beside the blocks and pictures blockContent has', () => {
    expect(names(richTextBody as never)).toEqual([
      ...names(blockContent as never),
      'decorativeDivider',
    ])
  })

  it('leaves blockContent without a divider', () => {
    expect(names(blockContent as never)).not.toContain('decorativeDivider')
  })

  it('is one of the shared types, so the Rich text section can name it', () => {
    expect(sharedSchemaTypes.map(({ name }) => name)).toContain(RICH_TEXT_BODY_TYPE)
  })
})

describe('withRichTextDividerGuard', () => {
  it('attaches the plugin to the Rich text body type, and only that type', () => {
    const guarded = withRichTextDividerGuard(sharedSchemaTypes)
    for (const type of guarded) {
      const plugins = (type as { components?: { portableText?: { plugins?: unknown } } }).components
        ?.portableText?.plugins
      expect(plugins === RichTextDividerPlugins, type.name).toBe(type.name === RICH_TEXT_BODY_TYPE)
    }
  })

  it('changes nothing else about any type: the others are the very same objects', () => {
    const guarded = withRichTextDividerGuard(sharedSchemaTypes)
    sharedSchemaTypes.forEach((type, index) => {
      if (type.name !== RICH_TEXT_BODY_TYPE) expect(guarded[index]).toBe(type)
    })
  })

  it('reaches a field of that type once the schema is compiled, and no blockContent field', () => {
    const schema = compile(withRichTextDividerGuard(sharedSchemaTypes))
    expect(fieldType(schema, 'body')?.components?.portableText?.plugins).toBe(
      RichTextDividerPlugins,
    )
    expect(fieldType(schema, 'plain')?.components?.portableText).toBeUndefined()
  })

  it('does nothing until it is applied: the bare schema has no plugin anywhere', () => {
    const schema = compile(sharedSchemaTypes)
    expect(fieldType(schema, 'body')?.components?.portableText).toBeUndefined()
  })
})

describe('the other Portable Text fields', () => {
  it.each(OTHER_CONSUMERS)('%s still uses blockContent, not the Rich text body', (path) => {
    const source = readFileSync(path, 'utf8')
    expect(source).toContain("'blockContent'")
    expect(source).not.toContain(RICH_TEXT_BODY_TYPE)
  })

  it('only the Rich text section uses the Rich text body', () => {
    const source = readFileSync('src/features/pages/schemas/sections/rich-text.ts', 'utf8')
    expect(source).toContain(`type: '${RICH_TEXT_BODY_TYPE}'`)
    expect(source).not.toContain("type: 'blockContent'")
  })
})
