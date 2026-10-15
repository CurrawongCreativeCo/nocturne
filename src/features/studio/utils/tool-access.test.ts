import { describe, expect, it } from 'vitest'

import { filterTools } from './tool-access'

const tools = [
  'structure',
  'presentation',
  'start-here',
  'vision',
  'content-health',
  'ai-settings',
  'other',
].map((name) => ({ name }))
const names = (list: { name: string }[]) => list.map((t) => t.name)

describe('filterTools', () => {
  it('keeps every tool, in order, for agency staff', () => {
    expect(names(filterTools(tools, 'agency'))).toEqual(names(tools))
  })

  it.each(['editor', 'contributor'] as const)(
    'hides agency-only tools and puts Start here, then Presentation, first for a %s',
    (audience) => {
      expect(names(filterTools(tools, audience))).toEqual([
        'start-here',
        'presentation',
        'structure',
        'other',
      ])
    },
  )

  it('does not change the input', () => {
    const copy = [...tools]
    filterTools(tools, 'editor')
    expect(tools).toEqual(copy)
  })
})
