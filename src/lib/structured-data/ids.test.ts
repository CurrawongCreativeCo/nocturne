import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  articleId,
  breadcrumbId,
  documentKey,
  eventId,
  faqId,
  locationId,
  organizationId,
  personId,
  serviceId,
  webPageId,
  websiteId,
} from './ids'

const origin = 'https://example.com.au'

describe('documentKey', () => {
  it('removes draft and release-version prefixes', () => {
    expect(documentKey('drafts.4c1e9b7a')).toBe('4c1e9b7a')
    expect(documentKey('versions.rSummer.4c1e9b7a')).toBe('4c1e9b7a')
    expect(documentKey('versions.rSummer.drafts.4c1e9b7a')).toBe('4c1e9b7a')
    expect(documentKey('4c1e9b7a')).toBe('4c1e9b7a')
  })
})

describe('ids', () => {
  it('keys persistent entities by the published document id', () => {
    expect(serviceId(origin, 'drafts.abc')).toBe('https://example.com.au/#service-abc')
    expect(locationId(origin, 'abc')).toBe('https://example.com.au/#location-abc')
    expect(personId(origin, 'versions.r1.abc')).toBe('https://example.com.au/#person-abc')
    expect(eventId(origin, 'abc')).toBe('https://example.com.au/#event-abc')
    expect(articleId(origin, 'abc')).toBe('https://example.com.au/#article-abc')
  })

  it('draft and published documents give identical ids', () => {
    for (const id of [serviceId, locationId, personId, eventId, articleId]) {
      expect(id(origin, 'drafts.abc')).toBe(id(origin, 'abc'))
    }
  })

  it('never emits a draft or version id', () => {
    for (const id of [serviceId, locationId, personId, eventId, articleId]) {
      expect(id(origin, 'drafts.abc')).not.toMatch(/drafts|versions/)
      expect(id(origin, 'versions.r1.abc')).not.toMatch(/drafts|versions/)
    }
  })

  it('singletons use the origin, with or without a trailing slash', () => {
    expect(organizationId(`${origin}/`)).toBe('https://example.com.au/#organization')
    expect(websiteId(origin)).toBe('https://example.com.au/#website')
  })

  it('keys page nodes by URL', () => {
    const url = 'https://example.com.au/services/plumbing'
    expect(webPageId(url)).toBe(`${url}#webpage`)
    expect(breadcrumbId(url)).toBe(`${url}#breadcrumb`)
    expect(faqId(url)).toBe(`${url}#faq`)
  })
})

describe('id construction', () => {
  const root = path.resolve(__dirname, '../..')

  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) return sourceFiles(full)
      return /\.(ts|tsx)$/.test(name) && !/\.(test|d)\.tsx?$/.test(name) ? [full] : []
    })

  /** Code only: line and block comments are removed, so prose may mention an id. */
  const withoutComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  it('builds #organization, #website and #webpage only in ids.ts', () => {
    const offenders = sourceFiles(root)
      .filter((file) => !file.endsWith(path.join('structured-data', 'ids.ts')))
      .filter((file) => !file.endsWith('sanity.types.ts'))
      .filter((file) =>
        /#(organization|website|webpage)/.test(withoutComments(readFileSync(file, 'utf8'))),
      )
      .map((file) => path.relative(root, file))
    expect(offenders).toEqual([])
  })
})
