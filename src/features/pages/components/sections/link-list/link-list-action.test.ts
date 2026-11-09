import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(join(__dirname, file), 'utf8')

// The distance each layout's arrow moved before ActionIndicator (px): Stacked, Cards and Glass rows
// 2, Editorial 4. Unset sections keep them, so none of these moves to the 3 px Nudge preset.
const LEGACY = {
  'stacked.tsx': 'legacy-small',
  'cards.tsx': 'legacy-small',
  'glass-row.tsx': 'legacy-small',
  'editorial.tsx': 'legacy-large',
} as const

describe('Link list arrows', () => {
  it.each(Object.entries(LEGACY))(
    '%s moves through ActionIndicator at its old distance',
    (file, distance) => {
      const source = read(file)
      expect(source).toContain('<ActionIndicator')
      expect(source).toContain('motion="nudge"')
      expect(source).toContain(`distance="${distance}"`)
    },
  )

  it.each(Object.keys(LEGACY))('%s has no handwritten arrow movement left', (file) => {
    const source = read(file)
    expect(source).not.toMatch(/translate-x|<LinkArrow\b|group-hover:translate/)
  })
})
