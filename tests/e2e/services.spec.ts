import { expect, type Page } from '@playwright/test'

import { SITE_URL } from './constants'
import { test } from './fixtures/test'
import {
  findDraftIds,
  findMissingWebPage,
  findUnresolvedReferences,
  findWebPageProblems,
  parseJsonLd,
  type JsonLdNode,
} from '../../src/lib/json-ld-visibility'
import { checkParity } from '../../src/lib/structured-data/parity'

/**
 * Service pages and their structured data (README, "Services"). Emergency plumbing has every optional
 * part (price, audience, two people, proof of work, two questions); Blocked drains has only the
 * required fields, so each optional part must be absent, heading and markup included.
 */

const FULL = '/services/emergency-plumbing'
const BARE = '/services/blocked-drains'

/** Every node on the page, with `@graph` flattened. */
const jsonLd = async (page: Page): Promise<JsonLdNode[]> =>
  parseJsonLd(
    await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => script.textContent)),
  ).nodes

const region = (page: Page, name: string) => page.getByRole('region', { name })

test.describe('a service page with everything', () => {
  test('shows the service under a single <h1>, with its summary, price and picture', async ({
    page,
  }) => {
    await page.goto(FULL)
    const main = page.locator('#main-content')
    await expect(main.locator('h1')).toHaveText('Emergency plumbing')
    await expect(main).toContainText(
      'Burst pipes, blocked drains and gas leaks, fixed the same day.',
    )
    await expect(main.getByText('From $150 per hour')).toBeVisible()
    await expect(main.getByRole('img', { name: 'A plumber repairing a burst pipe' })).toBeVisible()
    await expect(main.getByText('We answer within the hour, any day of the week.')).toBeVisible()
  })

  test('says who it is for and who provides it, linking only members who have a page', async ({
    page,
  }) => {
    await page.goto(FULL)
    await expect(region(page, 'Who it’s for')).toContainText('Households and small businesses')
    const people = region(page, 'Who provides it')
    await expect(people.getByRole('listitem')).toHaveText([
      'Ann Lee, Principal solicitor',
      'Cara Doyle, Office manager',
    ])
    await expect(people.getByRole('link', { name: 'Ann Lee' })).toHaveAttribute(
      'href',
      '/team/ann-lee',
    )
    // Cara has no page address, so she is named without a link.
    await expect(people.getByRole('link', { name: 'Cara Doyle' })).toHaveCount(0)
  })

  test('lists where it is offered, linking each location', async ({ page }) => {
    await page.goto(FULL)
    const where = region(page, 'Where it’s offered')
    await expect(where.getByRole('link')).toHaveText(['Parramatta', 'Western Sydney'])
    await expect(where.getByRole('link', { name: 'Parramatta' })).toHaveAttribute(
      'href',
      '/locations/parramatta',
    )
  })

  test('links proof of work, and leaves out a members-only page', async ({ page }) => {
    await page.goto(FULL)
    const evidence = region(page, 'See it in action')
    await expect(evidence.getByRole('link')).toHaveText(['Welcome to the blog', 'About'])
    await expect(evidence.getByRole('link', { name: 'Welcome to the blog' })).toHaveAttribute(
      'href',
      '/blog/welcome-to-the-blog',
    )
    await expect(evidence.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
    await expect(evidence).not.toContainText('Members area')
  })

  test('lists related articles once, leaving out posts already shown as proof of work', async ({
    page,
  }) => {
    await page.goto(FULL)
    const articles = region(page, 'Related articles')
    await expect(articles.getByRole('link')).toHaveText(['News update'])
    await expect(articles.getByRole('link', { name: 'News update' })).toHaveAttribute(
      'href',
      '/blog/news-update',
    )
  })

  test('offers the enquiry button the editor set, and the extra sections below the page', async ({
    page,
  }) => {
    await page.goto(FULL)
    const main = page.locator('#main-content')
    await expect(main.getByRole('link', { name: 'Get a quote' })).toHaveAttribute(
      'href',
      'https://quotes.example.com/plumbing',
    )
    await expect(
      main.getByRole('heading', { level: 2, name: 'What happens after the job' }),
    ).toBeVisible()
    await expect(main.getByText('We test every repair and leave the site clean.')).toBeVisible()
    // The page keeps its one <h1>.
    await expect(main.locator('h1')).toHaveCount(1)
  })

  test('shows every question and answer without opening anything', async ({ page }) => {
    await page.goto(FULL)
    const faqs = region(page, 'Questions and answers')
    await expect(faqs.getByText('Do you work on weekends?')).toBeVisible()
    await expect(faqs.getByText('Yes. We work every day of the week')).toBeVisible()
    await expect(faqs.getByText('Is there a call-out fee?')).toBeVisible()
    await expect(faqs.getByText('No. You pay the hourly rate')).toBeVisible()
  })

  test('has metadata and the picture as the share image', async ({ page }) => {
    await page.goto(FULL)
    await expect(page).toHaveTitle('Emergency plumbing | Test Co')
    const meta = (attr: string, value: string) =>
      page.locator(`meta[${attr}="${value}"]`).getAttribute('content')
    expect(await meta('name', 'description')).toBe(
      'Burst pipes, blocked drains and gas leaks, fixed the same day.',
    )
    expect(await meta('property', 'og:url')).toBe(`${SITE_URL}${FULL}`)
    expect(await meta('property', 'og:image')).toContain('cdn.sanity.io/images')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}${FULL}`,
    )
  })
})

test.describe('the JSON-LD', () => {
  test('is a Service keyed by document, provided by the organisation, with an Offer for the shown price', async ({
    page,
  }) => {
    await page.goto(FULL)
    const service = (await jsonLd(page)).find((node) => node['@type'] === 'Service')
    expect(service).toMatchObject({
      '@id': `${SITE_URL}/#service-service-emergency-plumbing`,
      name: 'Emergency plumbing',
      url: `${SITE_URL}${FULL}`,
      description: 'Burst pipes, blocked drains and gas leaks, fixed the same day.',
      provider: { '@id': `${SITE_URL}/#organization` },
      offers: {
        '@type': 'Offer',
        price: 150,
        priceCurrency: 'AUD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: 150,
          priceCurrency: 'AUD',
          unitText: 'per hour',
        },
      },
      audience: {
        '@type': 'Audience',
        audienceType: 'Households and small businesses with a plumbing problem that cannot wait.',
      },
      mainEntityOfPage: { '@id': `${SITE_URL}${FULL}#webpage` },
    })
    // The page's WebPage is about the service, by the same @id.
    expect((await jsonLd(page)).find((node) => node['@type'] === 'WebPage')).toMatchObject({
      '@id': `${SITE_URL}${FULL}#webpage`,
      about: { '@id': `${SITE_URL}/#service-service-emergency-plumbing` },
    })
    expect(service?.image as string).toContain('cdn.sanity.io/images')
    for (const key of ['aggregateRating', 'review']) {
      expect(service).not.toHaveProperty(key)
    }
  })

  test('names the locations it lists as areaServed, by @id, and defines each shortly on the page', async ({
    page,
  }) => {
    await page.goto(FULL)
    const nodes = await jsonLd(page)
    const service = nodes.find((node) => node['@type'] === 'Service')
    expect(service?.areaServed).toEqual([
      { '@id': `${SITE_URL}/#location-place-parramatta` },
      { '@id': `${SITE_URL}/#location-place-western-sydney` },
    ])
    expect(nodes.find((node) => node['@id'] === `${SITE_URL}/#location-place-parramatta`)).toEqual({
      '@type': 'ProfessionalService',
      '@id': `${SITE_URL}/#location-place-parramatta`,
      name: 'Parramatta',
      url: `${SITE_URL}/locations/parramatta`,
    })
    expect(
      nodes.find((node) => node['@id'] === `${SITE_URL}/#location-place-western-sydney`),
    ).toMatchObject({ '@type': 'Place', name: 'Western Sydney' })
  })

  test('has one FAQPage for the questions the page shows', async ({ page }) => {
    await page.goto(FULL)
    const faqPages = (await jsonLd(page)).filter((node) => node['@type'] === 'FAQPage')
    expect(faqPages).toHaveLength(1)
    expect(faqPages[0]).toMatchObject({
      '@id': `${SITE_URL}${FULL}#faq`,
      mainEntity: [
        {
          name: 'Do you work on weekends?',
          acceptedAnswer: {
            text: 'Yes. We work every day of the week, including public holidays.',
          },
        },
        {
          name: 'Is there a call-out fee?',
          acceptedAnswer: { text: 'No. You pay the hourly rate from the moment we arrive.' },
        },
      ],
    })
  })

  test('says nothing the page does not show, and the graph holds together', async ({ page }) => {
    await page.goto(FULL)
    const nodes = await jsonLd(page)
    // As structured-data.spec.ts reads a page: the body, plus the <title> and meta description, which
    // are the rendered form of the title and description fields (the WebSite node's description).
    const text = await page.evaluate(() =>
      [
        document.body.innerText,
        document.title,
        document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
      ].join('\n'),
    )
    // The page's own nodes. The site-wide Organization and WebSite are checked, against the pages that
    // show their text, by structured-data.spec.ts (the WebSite description is the home page's).
    const own = nodes.filter(
      (node) =>
        node['@id'] !== `${SITE_URL}/#organization` && node['@id'] !== `${SITE_URL}/#website`,
    )
    expect(checkParity(own, { origin: SITE_URL, text, siteText: text, siteDetails: true })).toEqual(
      [],
    )
    expect(findWebPageProblems(nodes, SITE_URL)).toEqual([])
    expect(findMissingWebPage(nodes, `${SITE_URL}${FULL}`)).toEqual([])
    expect(findDraftIds(nodes)).toEqual([])
    // The organisation and website are defined by the site-wide nodes, which this page also carries.
    expect(
      findUnresolvedReferences(
        nodes,
        new Set([`${SITE_URL}/#organization`, `${SITE_URL}/#website`]),
      ),
    ).toEqual([])
  })
})

test.describe('a service page with only the required fields', () => {
  test('leaves out every optional part, and the price and FAQ markup', async ({ page }) => {
    await page.goto(BARE)
    const main = page.locator('#main-content')
    await expect(main.locator('h1')).toHaveText('Blocked drains')
    await expect(main).toContainText('We clear blocked drains and tell you what caused them.')
    for (const heading of [
      'Who it’s for',
      'Where it’s offered',
      'Who provides it',
      'See it in action',
      'Questions and answers',
      'Related articles',
      'What happens after the job',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toHaveCount(0)
    }
    await expect(main.getByText('From $')).toHaveCount(0)
    // No enquiry button is set, so there is none and no invented contact link.
    await expect(main.getByRole('link', { name: 'Get a quote' })).toHaveCount(0)

    const nodes = await jsonLd(page)
    expect(nodes.map((node) => node['@type'])).toContain('Service')
    expect(nodes.map((node) => node['@type'])).not.toContain('FAQPage')
    expect(nodes.find((node) => node['@type'] === 'Service')).not.toHaveProperty('offers')
    // It names no location, so it is offered everywhere and says nothing about where.
    expect(nodes.find((node) => node['@type'] === 'Service')).not.toHaveProperty('areaServed')
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  for (const path of [FULL, BARE]) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('unknown services', () => {
  test('are a 404', async ({ page, request }) => {
    await page.goto('/services/does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect((await request.get('/services/does-not-exist')).status()).toBe(404)
  })
})

test('the sitemap lists service pages', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  for (const slug of ['emergency-plumbing', 'blocked-drains']) {
    expect(sitemap).toContain(`<loc>${SITE_URL}/services/${slug}</loc>`)
  }
  // The /services page itself is a CMS page, listed with the others.
  expect(sitemap).toContain(`<loc>${SITE_URL}/services</loc>`)
})
