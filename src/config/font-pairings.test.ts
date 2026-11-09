import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { FONT_MOODS, FONT_PAIRINGS } from './font-pairings'

const FONT_DATA = JSON.parse(
  readFileSync('node_modules/next/dist/compiled/@next/font/dist/google/font-data.json', 'utf8'),
) as Record<string, { weights: string[] }>

const roles = FONT_PAIRINGS.flatMap((pairing) => [
  { id: pairing.id, role: 'display', font: pairing.display },
  { id: pairing.id, role: 'body', font: pairing.body },
])

describe('font pairings', () => {
  it('lists six to eight pairings with unique ids', () => {
    expect(FONT_PAIRINGS.length).toBeGreaterThanOrEqual(6)
    expect(FONT_PAIRINGS.length).toBeLessThanOrEqual(8)
    expect(new Set(FONT_PAIRINGS.map((pairing) => pairing.id)).size).toBe(FONT_PAIRINGS.length)
  })

  it('gives every pairing a title, a use and at least one known mood', () => {
    for (const pairing of FONT_PAIRINGS) {
      expect(pairing.title, pairing.id).toBeTruthy()
      expect(pairing.suits, pairing.id).toBeTruthy()
      expect(pairing.moods.length, pairing.id).toBeGreaterThan(0)
      for (const mood of pairing.moods) expect(FONT_MOODS).toContain(mood)
    }
  })

  it.each(roles)(
    '$id $role: the family, import name and weights exist in next/font',
    ({ font }) => {
      const entry = FONT_DATA[font.family]
      expect(entry, font.family).toBeDefined()
      expect(font.nextFont).toBe(font.family.replaceAll(' ', '_'))
      for (const weight of font.weights) expect(entry?.weights).toContain(weight)
    },
  )

  it('starts with the font the site loads today, and offers a mood for each heading style', () => {
    expect(FONT_PAIRINGS[0]).toMatchObject({ id: 'inter', display: { family: 'Inter' } })
    const layout = readFileSync('src/app/layout.tsx', 'utf8')
    expect(layout).toContain("import { Inter } from 'next/font/google'")
    for (const mood of ['editorial', 'modern', 'classic']) {
      expect(FONT_PAIRINGS.some((pairing) => pairing.moods.includes(mood as never))).toBe(true)
    }
  })

  it('loads nothing: it imports no font module', () => {
    expect(readFileSync('src/config/font-pairings.ts', 'utf8')).not.toMatch(/from 'next\/font/)
  })
})
