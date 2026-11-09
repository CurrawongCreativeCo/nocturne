import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { FONT_PAIRINGS } from './font-pairings'

describe('README font pairings table', () => {
  const readme = readFileSync('README.md', 'utf8')

  it('lists every pairing with its id and next/font import names', () => {
    for (const pairing of FONT_PAIRINGS) {
      const row = readme.split('\n').find((line) => line.includes(`\`${pairing.id}\``))
      expect(row, pairing.id).toBeDefined()
      expect(row).toContain(`\`${pairing.display.nextFont}\``)
      expect(row).toContain(`\`${pairing.body.nextFont}\``)
      for (const mood of pairing.moods) expect(row).toContain(mood)
    }
  })
})
