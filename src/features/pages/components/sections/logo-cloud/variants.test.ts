import { readdirSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { LOGO_CLOUD_VARIANTS } from '@/features/pages/schemas/sections/logo-cloud'

/** Files in the folder that are not layouts: the dispatcher, the shared logo, the Pause button and its lazy wrapper. */
const SHARED = ['index', 'logo-item', 'marquee-toggle', 'marquee-toggle-lazy']

describe('logo cloud variants', () => {
  it('has one component file per variant in the schema, and no others', () => {
    const files = readdirSync(__dirname)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => file.replace(/\.tsx$/, ''))
      .filter((name) => !SHARED.includes(name))
    expect(files.sort()).toEqual(LOGO_CLOUD_VARIANTS.map((variant) => variant.value).sort())
  })

  it('stays within four variants, the grid first', () => {
    expect(LOGO_CLOUD_VARIANTS.length).toBeLessThanOrEqual(4)
    expect(LOGO_CLOUD_VARIANTS[0].value).toBe('grid')
  })
})
