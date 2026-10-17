import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { CopyPageLink, DownloadQrCode, pageLinkActions } from './page-link-actions'

type Resolver = typeof pageLinkActions
const resolve = (schemaType: string, prev: Parameters<Resolver>[0]) =>
  pageLinkActions(prev, { schemaType } as Parameters<Resolver>[1])

describe('pageLinkActions', () => {
  it('adds Copy link and Download QR code to pages, after the existing actions', () => {
    const prev = [{ action: 'publish' }] as unknown as Parameters<Resolver>[0]
    const actions = resolve('page', prev)
    expect(actions).toHaveLength(3)
    expect(actions.slice(1)).toEqual([CopyPageLink, DownloadQrCode])
  })

  it.each(['post', 'teamMember', 'event', 'siteSettings'])('leaves %s alone', (type) => {
    const prev = [{ action: 'publish' }] as unknown as Parameters<Resolver>[0]
    expect(resolve(type, prev)).toBe(prev)
  })

  it('has no built-in action name, so the client role filter keeps both', () => {
    const builtIn = ['publish', 'unpublish', 'delete', 'duplicate', 'discardChanges', 'restore']
    expect(builtIn).not.toContain(CopyPageLink.action)
    expect(builtIn).not.toContain(DownloadQrCode.action)
  })
})

/**
 * The QR library is for Studio only. Nothing the public site renders may import it, or the file
 * that imports it, so its few KB never reach a visitor's JavaScript.
 */
describe('the QR code stays in Studio', () => {
  const srcDir = fileURLToPath(new URL('../../../', import.meta.url))
  const allowed = [join('features', 'studio', 'qr-code'), join('features', 'studio', 'actions')]

  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return files(path)
      return /\.(tsx?|mjs)$/.test(entry.name) ? [path] : []
    })

  it('is imported only by the Studio action and its own module', () => {
    const importers = files(srcDir)
      .filter((file) => /from ['"](uqr|.*qr-code\/qr-code)['"]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(srcDir, file))
      .filter((file) => !file.endsWith('.test.ts'))
    expect(importers.sort()).toEqual([
      join('features', 'studio', 'actions', 'page-link-actions.tsx'),
      join('features', 'studio', 'qr-code', 'qr-code.ts'),
    ])
    for (const file of importers) expect(allowed.some((dir) => file.startsWith(dir))).toBe(true)
  })

  it('is registered only in sanity.config.ts, the Studio composition root', () => {
    const importers = files(srcDir).filter((file) =>
      /actions\/page-link-actions['"]/.test(readFileSync(file, 'utf8')),
    )
    expect(importers).toEqual([])
    expect(readFileSync(join(srcDir, '..', 'sanity.config.ts'), 'utf8')).toContain(
      'pageLinkActions',
    )
  })
})
