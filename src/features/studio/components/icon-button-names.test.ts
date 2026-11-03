import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioRoot = join(process.cwd(), 'src/features/studio')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [path] : []
  })
}

describe('Studio buttons', () => {
  it('gives every icon-only Button an accessible name', () => {
    const unnamed: string[] = []
    for (const file of sourceFiles(studioRoot)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/<Button\b([\s\S]*?)\/>/g)) {
        const attributes = match[1] ?? ''
        if (!/\bicon=/.test(attributes)) continue
        if (/\btext=/.test(attributes) || /\baria-label=/.test(attributes)) continue
        const line = source.slice(0, match.index).split('\n').length
        unnamed.push(`${file.slice(studioRoot.length + 1)}:${line}`)
      }
    }
    expect(unnamed).toEqual([])
  })
})
