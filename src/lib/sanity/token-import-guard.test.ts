import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const TOKEN_FILE = join(srcDir, 'lib/sanity/token.ts')
const EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs']

function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listSources(path)
    return /\.(ts|tsx|mts|js|jsx|mjs)$/.test(name) && !/\.test\.[a-z]+$/.test(name) ? [path] : []
  })
}

/** Module specifiers from static imports, re-exports and dynamic `import('…')`. */
export function importSpecifiers(source: string): string[] {
  const found: string[] = []
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*|\bimport\s+)(['"])([^'"\n]+)\1/g
  for (const match of source.matchAll(pattern)) found.push(match[2] ?? '')
  return found
}

/** The directive must be the first statement (comments may precede it). */
function hasDirective(source: string, directive: string): boolean {
  const body = source.replace(/^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*/, '')
  return new RegExp(`^(['"])${directive}\\1`).test(body)
}

export const isClientModule = (source: string) => hasDirective(source, 'use client')
/** Next swaps a `'use server'` module for RPC stubs in client bundles, so its imports never ship. */
export const isServerActionModule = (source: string) => hasDirective(source, 'use server')

type Graph = Map<string, { client: boolean; action: boolean; imports: string[] }>

function resolveSpecifier(from: string, specifier: string, files: Set<string>): string | null {
  let base: string
  if (specifier.startsWith('@/')) base = join(srcDir, specifier.slice(2))
  else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier)
  else return null // a package
  for (const candidate of [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => join(base, `index${ext}`)),
  ]) {
    if (files.has(candidate)) return candidate
  }
  return null
}

/** Returns the import chain from each client module to `target`, if one exists. */
export function findLeaks(graph: Graph, target: string): string[][] {
  const leaks: string[][] = []
  for (const [entry, { client }] of graph) {
    if (!client) continue
    const seen = new Set<string>([entry])
    const queue: string[][] = [[entry]]
    for (let chain = queue.shift(); chain; chain = queue.shift()) {
      const node = graph.get(chain.at(-1) ?? '')
      if (node?.action) continue
      for (const next of node?.imports ?? []) {
        if (next === target) {
          leaks.push([...chain, next])
        } else if (!seen.has(next)) {
          seen.add(next)
          queue.push([...chain, next])
        }
      }
    }
  }
  return leaks
}

function buildGraph(sources: Record<string, string>): Graph {
  const files = new Set(Object.keys(sources))
  const graph: Graph = new Map()
  for (const [file, source] of Object.entries(sources)) {
    const imports = importSpecifiers(source)
      .map((specifier) => resolveSpecifier(file, specifier, files))
      .filter((path): path is string => path !== null)
    graph.set(file, {
      client: isClientModule(source),
      action: isServerActionModule(source),
      imports,
    })
  }
  return graph
}

describe('token import guard', () => {
  it('no client module imports lib/sanity/token.ts, directly or indirectly', () => {
    const sources = Object.fromEntries(
      listSources(srcDir).map((file) => [file, readFileSync(file, 'utf8')]),
    )
    expect(Object.keys(sources)).toContain(TOKEN_FILE)
    const leaks = findLeaks(buildGraph(sources), TOKEN_FILE).map((chain) =>
      chain.map((file) => file.slice(srcDir.length + 1)).join(' -> '),
    )
    expect(leaks).toEqual([])
  })

  describe('detector', () => {
    const a = join(srcDir, 'a.tsx')
    const b = join(srcDir, 'b.ts')
    const c = join(srcDir, 'lib/sanity/client.ts')

    it('finds a direct and an indirect import from a client module', () => {
      const graph = buildGraph({
        [a]: "'use client'\nimport { token } from '@/lib/sanity/token'",
        [b]: "import { x } from './lib/sanity/client'",
        [c]: "import { token } from './token'",
        [TOKEN_FILE]: 'export const token = 1',
      })
      expect(findLeaks(graph, TOKEN_FILE)).toEqual([[a, TOKEN_FILE]])

      const indirect = buildGraph({
        [a]: '// note\n"use client"\nimport { x } from "./b"',
        [b]: "export * from '@/lib/sanity/client'",
        [c]: "import { token } from './token'",
        [TOKEN_FILE]: 'export const token = 1',
      })
      expect(findLeaks(indirect, TOKEN_FILE)).toEqual([[a, b, c, TOKEN_FILE]])
    })

    it('stops at server actions, which are RPC stubs in the browser', () => {
      const graph = buildGraph({
        [a]: "'use client'\nimport { send } from './b'",
        [b]: "'use server'\nimport { token } from '@/lib/sanity/token'",
        [TOKEN_FILE]: 'export const token = 1',
      })
      expect(findLeaks(graph, TOKEN_FILE)).toEqual([])
    })

    it('ignores server modules, packages and dynamic imports from the browser side', () => {
      const graph = buildGraph({
        [a]: "'use client'\nimport React from 'react'",
        [b]: "import { token } from '@/lib/sanity/token'",
        [TOKEN_FILE]: 'export const token = 1',
      })
      expect(findLeaks(graph, TOKEN_FILE)).toEqual([])

      const dynamic = buildGraph({
        [a]: "'use client'\nconst load = () => import('./b')",
        [b]: "import { token } from '@/lib/sanity/token'",
        [TOKEN_FILE]: 'export const token = 1',
      })
      expect(findLeaks(dynamic, TOKEN_FILE)).toHaveLength(1)
    })
  })
})
