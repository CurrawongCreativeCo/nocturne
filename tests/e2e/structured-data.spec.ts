import { expect, type Page } from '@playwright/test'

import { SITE_URL } from './constants'
import { test } from './fixtures/test'
import {
  findDraftIds,
  findIdProblems,
  findMissingWebPage,
  findUnresolvedReferences,
  findWebPageProblems,
  parseJsonLd,
  siteGraphIds,
  type JsonLdNode,
} from '../../src/lib/json-ld-visibility'
import { checkParity } from '../../src/lib/structured-data/parity'

/**
 * Google requires structured data to describe visible content. This crawls every page in the
 * sitemap (the fixture pages) once and checks the JSON-LD against what the page shows, by property
 * class: visible facts as typed values, descriptive text from rendered fields, `areaServed` shown
 * somewhere on the site, technical properties valid (src/lib/structured-data/parity.ts, where
 * deliberately broken fixtures prove the rules fail). The graph rules are in
 * src/lib/json-ld-visibility.ts.
 */
interface Crawled {
  path: string
  nodes: JsonLdNode[]
  /**
   * The rendered text, with closed accordions opened (a visitor can open them) plus the page's
   * <title> and meta description, which are the rendered form of its title and description fields.
   */
  text: string
  /** False on a "Minimal page", whose header and footer hide the business's details. */
  siteDetails: boolean
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
      .evaluateAll((elements) =>
        elements
          // React can leave a streamed section's hidden copy (<div hidden id="S:n">) beside the
          // revealed one; the served HTML has the script once.
          .filter((element) => !element.closest('[hidden]'))
          .map((element) => element.textContent),
      )
    const text = await page.evaluate(() =>
      [
        document.body.innerText,
        document.title,
        document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
      ].join('\n'),
    )
    // A "Minimal page" hides the header and footer, where the business's address and hours are shown.
    const chromeHidden = await page.evaluate(() => {
      const chrome = document.querySelector('[data-site-chrome]')
      return chrome !== null && getComputedStyle(chrome).display === 'none'
    })
    const { nodes, errors } = parseJsonLd(scripts)
    return { nodes, errors, text, siteDetails: !chromeHidden }
  }

  const response = await page.goto(path)
  if (!response?.ok()) {
    return {
      path,
      nodes: [],
      text: '',
      siteDetails: true,
      problems: [`${path}: the sitemap lists it but it answered ${response?.status()}`],
    }
  }

  // Streamed sections can land just after the load event; give them a moment before reporting.
  await expect
    .poll(async () => (await snapshot()).nodes.length, { timeout: 5_000 })
    .toBeGreaterThan(1)
    .catch(() => undefined)
  const { nodes, errors, text, siteDetails } = await snapshot()

  return {
    path,
    nodes,
    text,
    siteDetails,
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

  test('every JSON-LD value matches what the page shows, by property class', () => {
    expect(crawled.flatMap(({ problems }) => problems)).toEqual([])
    const siteText = crawled.map(({ text }) => text).join('\n')
    const found = crawled.flatMap(({ path, nodes, text, siteDetails }) =>
      checkParity(nodes, {
        origin: SITE_URL,
        text,
        siteText,
        siteDetails,
        businessType: 'ProfessionalService',
      }).map(({ property, value, reason }) => `${path} › ${property}: "${value}" ${reason}`),
    )
    expect(found).toEqual([])
    // Not vacuous: the fixtures carry each kind of structured data.
    const types = new Set(crawled.flatMap(({ nodes }) => nodes.map((node) => node['@type'])))
    for (const type of [
      'ProfessionalService',
      'WebSite',
      'WebPage',
      'FAQPage',
      'Article',
      'Person',
      'Event',
      'Service',
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

  test('every page has a WebPage node keyed by its own URL', () => {
    const problems = crawled.flatMap(({ path, nodes }) =>
      findMissingWebPage(nodes, new URL(path, SITE_URL).toString()).map(
        (problem) => `${path}: ${problem}`,
      ),
    )
    expect(problems).toEqual([])
  })

  test('no @id contains a draft or release-version document id', () => {
    const problems = crawled.flatMap(({ path, nodes }) =>
      findDraftIds(nodes).map((problem) => `${path}: ${problem}`),
    )
    expect(problems).toEqual([])
  })

  test('every @id a page refers to is defined on the page or in the site graph', () => {
    const siteGraph = siteGraphIds(crawled.map(({ nodes }) => nodes))
    // The Organization and WebSite are in the site shell, so they are on every page.
    expect(siteGraph.size).toBeGreaterThanOrEqual(2)
    const problems = crawled.flatMap(({ path, nodes }) =>
      findUnresolvedReferences(nodes, siteGraph).map((problem) => `${path}: ${problem}`),
    )
    expect(problems).toEqual([])
  })
})
