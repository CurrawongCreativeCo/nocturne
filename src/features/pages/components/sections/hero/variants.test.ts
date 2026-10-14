import { readdirSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { HERO_VARIANTS } from '@/features/pages/schemas/sections/hero'

/** Files in the folder that are not layouts: the dispatcher and the words every layout shares. */
const SHARED = ['index', 'hero-text']

describe('hero variants', () => {
  it('has one component file per variant in the schema, and no others', () => {
    const files = readdirSync(__dirname)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => file.replace(/\.tsx$/, ''))
      .filter((name) => !SHARED.includes(name))
    expect(files.sort()).toEqual(HERO_VARIANTS.map((variant) => variant.value).sort())
  })

  it('stays within four variants, the default first', () => {
    expect(HERO_VARIANTS.length).toBeLessThanOrEqual(4)
    expect(HERO_VARIANTS[0].value).toBe('overlay')
  })
})
