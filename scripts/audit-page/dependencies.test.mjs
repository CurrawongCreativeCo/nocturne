import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Every package the audit's code imports, following relative and `@/` imports from its entry points. */
function externalPackages(entries) {
  const seen = new Set()
  const packages = new Set()
  const extensions = ['', '.ts', '.tsx', '.mjs', '/index.ts']
  const visit = (file) => {
    if (seen.has(file)) return
    seen.add(file)
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const pattern =
      /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1] ?? match[2]
      if (specifier.startsWith('node:')) continue
      if (specifier.startsWith('.') || specifier.startsWith('@/')) {
        const base = specifier.startsWith('@/')
          ? join(root, 'src', specifier.slice(2))
          : resolve(dirname(file), specifier)
        const found = extensions
          .map((ext) => base + ext)
          .find((path) => existsSync(path) && /\.(ts|tsx|mjs)$/.test(path))
        expect(found, `${specifier} in ${file} resolves`).toBeDefined()
        visit(found)
      } else
        packages.add(
          specifier.startsWith('@')
            ? specifier.split('/').slice(0, 2).join('/')
            : specifier.split('/')[0],
        )
    }
  }
  for (const entry of entries) visit(join(root, entry))
  return [...packages].sort()
}

describe('what the page audit needs installed', () => {
  it('is jiti and nothing else, which is all the Health workflow installs for it', () => {
    // If this fails, either drop the new import or change the install step in .github/workflows/health.yml.
    expect(
      externalPackages([
        'scripts/audit-page.mjs',
        'scripts/audit-page/run.mjs',
        'src/lib/audit/page-audit.ts',
        'src/lib/audit/finding.ts',
        'src/lib/audit/content.ts',
        'src/lib/audit/url.ts',
        'src/lib/audit/rules/links.ts',
      ]),
    ).toEqual(['jiti'])
  })

  it('is a package the lock file pins, with no dependencies of its own', () => {
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
    const jiti = lock.packages['node_modules/jiti']
    expect(jiti.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(jiti.dependencies ?? {}).toEqual({})
  })
})
