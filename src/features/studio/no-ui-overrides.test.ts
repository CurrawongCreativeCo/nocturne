import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Studio branding goes through the theme, the logo and the icon, never through CSS aimed at
 * Sanity UI's insides. Those class names and attributes change between releases and break silently.
 */
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /data-ui/, why: "a selector on Sanity UI's data-ui attributes" },
  { pattern: /data-testid=["']studio-/, why: "a selector on Sanity's test ids" },
  { pattern: /\bsc-[a-z0-9]{5,}/i, why: "one of styled-components' generated class names" },
  { pattern: /\[class[*^$~|]?=/, why: 'an attribute selector on class names' },
  { pattern: /createGlobalStyle|injectGlobal/, why: 'global styles' },
  { pattern: /<style[\s>]/, why: 'a <style> element' },
  {
    pattern: /querySelector(All)?\(\s*[`'"][^`'"]*(\[data-|\.sc-)/,
    why: 'a DOM query into Sanity UI',
  },
]

/** What is wrong with a source file, as readable lines; empty when it is clean. */
export function findOverrides(source: string): string[] {
  return FORBIDDEN.filter(({ pattern }) => pattern.test(source)).map(({ why }) => why)
}

const studioDir = fileURLToPath(new URL('.', import.meta.url))
const thisFile = fileURLToPath(import.meta.url)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(tsx?|jsx?|css|scss|mdx?)$/.test(entry.name) && path !== thisFile ? [path] : []
  })
}

describe('Studio code does not override Sanity UI internals', () => {
  const files = sourceFiles(studioDir)

  it('scans the Studio feature', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('has no stylesheets: the theme, logo and icon carry the brand', () => {
    expect(
      files.filter((file) => /\.s?css$/.test(file)).map((f) => relative(studioDir, f)),
    ).toEqual([])
  })

  for (const file of files) {
    it(`${relative(studioDir, file)} has no selectors into Sanity UI`, () => {
      expect(findOverrides(readFileSync(file, 'utf8'))).toEqual([])
    })
  }

  it('catches the patterns it is meant to', () => {
    expect(findOverrides('[data-ui="Navbar"] { color: red }')).toHaveLength(1)
    expect(findOverrides('.sc-abc123 { color: red }')).toHaveLength(1)
    expect(findOverrides('div[class*="Card"] {}')).toHaveLength(1)
    expect(findOverrides("document.querySelector('[data-ui=Card]')")).not.toHaveLength(0)
    expect(findOverrides('const style = createGlobalStyle`a{}`')).toHaveLength(1)
    expect(findOverrides('<Flex align="center" style={{ height: 24 }}>')).toEqual([])
  })
})
