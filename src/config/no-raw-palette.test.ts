import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Guardrail: components style with the design tokens (bg-surface, text-ink-muted, ...), never raw
 * Tailwind palette classes, so one tokens.json re-skins the whole site. A raw colour class
 * (text-gray-600, bg-white, border-blue-500/50, ring-black, a hex value in brackets) fails this test.
 *
 * Rare exception: put `palette-ok: <reason>` in a comment on the same line or the line above:
 *
 *   {/* palette-ok: brand colour of a third-party logo *\/}
 *   <span className="bg-[#1877f2]" />
 */
const ESCAPE_HATCH = 'palette-ok'

const PREFIXES =
  'bg|text|border(?:-[trblxyse])?|ring|ring-offset|divide|outline|fill|stroke|from|via|to|decoration|placeholder|caret|accent|shadow|inset-ring'
const HUES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

// A class token starts after whitespace, a quote, a backtick or a variant colon (hover:, dark:).
const RAW_PALETTE = new RegExp(
  `(?<![\\w-])(?:${PREFIXES})-(?:(?:(?:${HUES})-\\d{2,3}|white|black)(?![\\w-])|\\[(?:#|rgb|hsl|oklch|color:))`,
  'g',
)

/** Returns `line:class` for each raw palette class not excused by the escape hatch. */
export function findRawPalette(source: string): string[] {
  const lines = source.split('\n')
  const found: string[] = []
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (/^(\/\/|\/\*|\*)/.test(trimmed)) return // comments mention classes in prose
    if (line.includes(ESCAPE_HATCH) || lines[index - 1]?.includes(ESCAPE_HATCH)) return
    for (const match of line.matchAll(RAW_PALETTE)) found.push(`${index + 1}:${match[0]}`)
  })
  return found
}

describe('findRawPalette', () => {
  it('flags palette classes, with variants and opacity', () => {
    expect(
      findRawPalette(
        [
          '<p className="text-gray-600 hover:text-gray-950">',
          '<div className="bg-white/90 border-blue-500 ring-black" />',
          '<i className="bg-[#fff] fill-slate-900 dark:bg-zinc-950" />',
        ].join('\n'),
      ),
    ).toEqual([
      '1:text-gray-600',
      '1:text-gray-950',
      '2:bg-white',
      '2:border-blue-500',
      '2:ring-black',
      '3:bg-[#',
      '3:fill-slate-900',
      '3:bg-zinc-950',
    ])
  })

  it('accepts the semantic tokens and unrelated words', () => {
    expect(
      findRawPalette(
        '<p className="bg-surface text-ink-muted border-line ring-accent text-white-space whitespace-pre grayscale" />',
      ),
    ).toEqual([])
  })

  it('honours the escape hatch on the same line or the line above, and skips comments', () => {
    expect(findRawPalette('<i className="bg-white" /> {/* palette-ok: logo */}')).toEqual([])
    expect(findRawPalette('// palette-ok: partner logo\n<i className="bg-[#1877f2]" />')).toEqual(
      [],
    )
    expect(findRawPalette(' * Use bg-white sparingly\n// text-gray-600 is gone')).toEqual([])
    expect(findRawPalette('<i className="bg-white" />')).toEqual(['1:bg-white'])
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    const isSource = /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
    return isSource && !/(sanity|tokens)\.(generated|types)/.test(entry.name) ? [path] : []
  })
}

describe('components use design tokens, not raw palette classes', () => {
  const root = join(process.cwd(), 'src')
  const offenders = sourceFiles(root).flatMap((file) =>
    findRawPalette(readFileSync(file, 'utf8')).map(
      (hit) => `${relative(process.cwd(), file)}:${hit}`,
    ),
  )

  it('finds none (use a token, or add `palette-ok: <reason>` for a rare exception)', () => {
    expect(offenders).toEqual([])
  })
})
