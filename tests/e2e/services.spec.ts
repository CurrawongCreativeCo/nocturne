import { expect, type Page } from '@playwright/test'

import { SITE_URL } from './constants'
import { test } from './fixtures/test'
import {
  collectCheckableStrings,
  findHiddenStrings,
  findWebPageProblems,
  type JsonLdNode,
} from '../../src/lib/json-ld-visibility'

/**
 * Service pages and their structured data (README, "Services"). Emergency plumbing has every optional
 * part (price, audience, two people, proof of work, two questions); Blocked drains has only the
 * required fields, so each optional part must be absent, heading and markup included.
 */

const FULL = '/services/emergency-plumbing'
const BARE = '/services/blocked-drains'

const jsonLd = (page: Page) =>
  page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent) as Record<string, unknown>),
    ) as Promise<JsonLdNode[]>

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
      '@context': 'https://schema.org',
      '@id': `${SITE_URL}/#service-service-emergency-plumbing`,
      name: 'Emergency plumbing',
      url: `${SITE_URL}${FULL}`,
      description: 'Burst pipes, blocked drains and gas leaks, fixed the same day.',
      provider: { '@id': `${SITE_URL}/#organization` },
      offers: {
        '@type': 'Offer',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: 150,
          priceCurrency: 'AUD',
          unitText: 'per hour',
        },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${FULL}#webpage` },
    })
    expect(service?.image as string).toContain('cdn.sanity.io/images')
    for (const key of ['areaServed', 'aggregateRating', 'review']) {
      expect(service).not.toHaveProperty(key)
    }
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

  test('says nothing the page does not show, and points its WebPage at the site', async ({
    page,
  }) => {
    await page.goto(FULL)
    const nodes = await jsonLd(page)
    const text = await page.evaluate(() => document.body.innerText)
    expect(findHiddenStrings(collectCheckableStrings(nodes), text)).toEqual([])
    expect(findWebPageProblems(nodes, SITE_URL)).toEqual([])
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
      'Who provides it',
      'See it in action',
      'Questions and answers',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toHaveCount(0)
    }
    await expect(main.getByText('From $')).toHaveCount(0)

    const nodes = await jsonLd(page)
    expect(nodes.map((node) => node['@type'])).toContain('Service')
    expect(nodes.map((node) => node['@type'])).not.toContain('FAQPage')
    expect(nodes.find((node) => node['@type'] === 'Service')).not.toHaveProperty('offers')
  })
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
