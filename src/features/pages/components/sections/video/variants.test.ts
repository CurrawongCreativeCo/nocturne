import { readdirSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { VIDEO_VARIANTS } from '@/features/pages/schemas/sections/video'

/** Files in the folder that are not layouts: the dispatcher, the two client components and the Ambient lazy wrapper (the facade's is shared with Embed, in ../lazy-facade). */
const SHARED = ['index', 'video-facade', 'video-frame', 'ambient-player', 'ambient-player-lazy']

describe('video variants', () => {
  it('has one component file per variant in the schema, and no others', () => {
    const files = readdirSync(__dirname)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => file.replace(/\.tsx$/, ''))
      .filter((name) => !SHARED.includes(name))
    expect(files.sort()).toEqual(VIDEO_VARIANTS.map((variant) => variant.value).sort())
  })

  it('stays within four variants, the click-to-load embed first', () => {
    expect(VIDEO_VARIANTS.length).toBeLessThanOrEqual(4)
    expect(VIDEO_VARIANTS[0].value).toBe('embed')
  })
})
