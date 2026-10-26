import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The Editor token the publish gate publishes with must never reach the browser (README, "Publish
 * gate"). Studio and the shared client code are browser bundles, so none of them may name the
 * token, the write client or the gate's server code; the Studio's request carries only the
 * signed-in person's own token.
 */
const root = join(import.meta.dirname, '..', '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe('the Editor token stays on the server', () => {
  const browserSide = [
    ...sourceFiles(join(root, 'src/features/studio')),
    ...sourceFiles(join(root, 'src/components')),
    join(root, 'sanity.config.ts'),
  ]

  it('is never named by Studio or shared components', () => {
    for (const file of browserSide) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/SANITY_WRITE_TOKEN|write-client|getWriteClient/)
      expect(source, file).not.toMatch(/publish-gate\/api\//)
    }
  })

  it('has no NEXT_PUBLIC_ name anywhere', () => {
    for (const file of [...browserSide, join(root, '.env.example')]) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/NEXT_PUBLIC_\w*(WRITE|SECRET|TOKEN)/)
    }
  })

  it("keeps the gate's server modules server-only", () => {
    for (const file of [
      'src/lib/sanity/write-client.ts',
      'src/features/publish-gate/api/create-gate-deps.ts',
    ]) {
      expect(readFileSync(join(root, file), 'utf8'), file).toContain("import 'server-only'")
    }
  })
})
