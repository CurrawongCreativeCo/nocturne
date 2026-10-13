import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { brandColor, brandForegroundColor } from './brand'

const css = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8')
const cssValue = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

describe('brand color', () => {
  it('matches the CSS variables in globals.css', () => {
    expect(brandColor).toBe(cssValue('--color-brand'))
    expect(brandForegroundColor).toBe(cssValue('--color-brand-foreground'))
  })
})
