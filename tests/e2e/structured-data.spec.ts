import { expect, type Page } from '@playwright/test'

import { SITE_URL } from './constants'
import { test } from './fixtures/test'
import {
  collectCheckableStrings,
  findHiddenStrings,
  findIdProblems,
  findWebPageProblems,
  parseJsonLd,
  type JsonLdNode,
} from '../../src/lib/json-ld-visibility'

/**
 * Google requires structured data to describe visible content. This crawls every page in the
 * sitemap (the fixture pages) once and checks the JSON-LD against what the page shows. The pure
 * rules live in src/lib/json-ld-visibility.ts, where a deliberately broken fixture proves they fail.
 */
interface Crawled {
  path: string
  nodes: JsonLdNode[]
  /** "<path> › <property>: …" for each string the page does not show. */
  hidden: string[]
  /** Parse errors, and a page that did not load. */
  problems: string[]
}

async function read(page: Page, path: string): Promise<Crawled> {
  // Answers inside a closed <details> (the FAQ) aren't rendered, so innerText leaves them out; a
  // visitor opens them with a click, so open them all the way a visitor could.
  const snapshot = async () => {
    await page.evaluate(() => {
      for (const details of document.querySelectorAll('details')) details.open = true
    })
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((elements) => elements.map((element) => element.textContent))
    const text = await page.evaluate(() => document.body.innerText)
    // A "Minimal page" hides the header and footer, where the business's address and hours are shown.
    const chromeHidden = await page.evaluate(() => {
      const chrome = document.querySelector('[data-site-chrome]')
      return chrome !== null && getComputedStyle(chrome).display === 'none'
    })
    const { nodes, errors } = parseJsonLd(scripts)
    const hidden = findHiddenStrings(
      collectCheckableStrings(nodes, { siteDetails: !chromeHidden }),
      text,
    )
    return { nodes, errors, hidden }
  }

  const response = await page.goto(path)
  if (!response?.ok()) {
    return {
      path,
      nodes: [],
      hidden: [],
      problems: [`${path}: the sitemap lists it but it answered ${response?.status()}`],
    }
  }

  // Streamed sections can land just after the load event; give them a moment before reporting.
  await expect
    .poll(async () => (await snapshot()).hidden.length, { timeout: 5_000 })
    .toBe(0)
    .catch(() => undefined)
  const { nodes, errors, hidden } = await snapshot()

  return {
    path,
    nodes,
    hidden: hidden.map(
      ({ property, value }) =>
        `${path} › ${property}: "${value}" is not in the page's visible text`,
    ),
    problems: errors.map((error) => `${path}: ${error}`),
  }
}

let crawled: Crawled[] = []

test.describe('structured data describes visible content', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }, testInfo) => {
    test.setTimeout(300_000)
    const context = await browser.newContext(testInfo.project.use)
    try {
      const sitemap = await (await context.request.get('/sitemap.xml')).text()
      const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => {
        const url = new URL((loc ?? '').replaceAll('&amp;', '&'))
        return url.pathname + url.search
      })
      expect(paths.length, 'pages in the sitemap').toBeGreaterThan(10)

      const page = await context.newPage()
      crawled = []
      for (const path of paths) crawled.push(await read(page, path))
    } finally {
      await context.close()
    }
  })

  test('every name, address, opening time and FAQ answer in JSON-LD is on the page', () => {
    expect(crawled.flatMap(({ problems }) => problems)).toEqual([])
    expect(crawled.flatMap(({ hidden }) => hidden)).toEqual([])
    // Not vacuous: the fixtures carry each kind of structured data.
    const types = new Set(crawled.flatMap(({ nodes }) => nodes.map((node) => node['@type'])))
    for (const type of [
      'ProfessionalService',
      'WebSite',
      'FAQPage',
      'Article',
      'Person',
      'Event',
    ]) {
      expect(types, `${type} JSON-LD somewhere in the sitemap`).toContain(type)
    }
  })

  test('@ids are unique on a page and never reused for a different thing', () => {
    const pages = Object.fromEntries(crawled.map(({ path, nodes }) => [path, nodes]))
    expect(findIdProblems(pages)).toEqual([])
  })

  test('every WebPage references the website and the organisation', () => {
    const problems = crawled.flatMap(({ path, nodes }) =>
      findWebPageProblems(nodes, SITE_URL).map((problem) => `${path}: ${problem}`),
    )
    expect(problems).toEqual([])
    const webPages = JSON.stringify(crawled.map(({ nodes }) => nodes)).match(/"@type":"WebPage"/g)
    expect(webPages?.length, 'WebPage nodes in the sitemap pages').toBeGreaterThan(0)
  })
})
