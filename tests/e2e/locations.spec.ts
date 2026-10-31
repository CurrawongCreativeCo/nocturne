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
 * Location pages and their structured data (README, "Locations"). Parramatta is a branch with every
 * field; Western Sydney is a service area that still holds a phone number and hours it must neither
 * show nor mark up; Newtown is a branch with only the required fields, so each optional part is
 * absent, heading and markup included.
 */

const BRANCH = '/locations/parramatta'
const AREA = '/locations/western-sydney'
const BARE = '/locations/newtown'

/** Every node on the page, with `@graph` flattened. */
const jsonLd = async (page: Page): Promise<JsonLdNode[]> =>
  parseJsonLd(
    await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => script.textContent)),
  ).nodes

/**
 * As structured-data.spec.ts reads a page: the body, plus the <title> and meta description, which are
 * the rendered form of the title and description fields (the WebSite node's description).
 */
const pageText = (page: Page) =>
  page.evaluate(() =>
    [
      document.body.innerText,
      document.title,
      document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    ].join('\n'),
  )

const region = (page: Page, name: string) => page.getByRole('region', { name })

test.describe('a branch page with everything', () => {
  test('shows the branch under a single <h1>, with its summary, picture and description', async ({
    page,
  }) => {
    await page.goto(BRANCH)
    const main = page.locator('#main-content')
    await expect(main.locator('h1')).toHaveText('Parramatta')
    await expect(main).toContainText('Our Parramatta branch, two minutes from the station.')
    await expect(main.getByRole('img', { name: 'The Parramatta branch front door' })).toBeVisible()
    await expect(
      main.getByText('Park behind the building and use the side entrance.'),
    ).toBeVisible()
  })

  test('shows the address, a directions link, the phone and email, and the opening hours', async ({
    page,
  }) => {
    await page.goto(BRANCH)
    const visit = region(page, 'Visit or contact us')
    await expect(visit).toContainText('1 Church St')
    await expect(visit).toContainText('Parramatta NSW 2150')
    await expect(visit.getByRole('link', { name: 'Phone (02) 9000 0000' })).toHaveAttribute(
      'href',
      'tel:+61290000000',
    )
    await expect(visit.getByRole('link', { name: 'Email parramatta@example.com' })).toHaveAttribute(
      'href',
      'mailto:parramatta@example.com',
    )
    const directions = visit.getByRole('link', { name: 'Get directions' })
    await expect(directions).toHaveAttribute('href', /google\.com\/maps\/dir/)
    await expect(directions).toHaveAttribute('target', '_blank')

    const hours = region(page, 'Opening hours')
    await expect(hours).toContainText('Mon–Fri')
    await expect(hours).toContainText('7:00 am – 5:00 pm')
    await expect(hours).toContainText('Sat')
  })

  test('lists the services offered here, including ones offered everywhere, and who works here', async ({
    page,
  }) => {
    await page.goto(BRANCH)
    const services = region(page, 'Services here')
    await expect(services.getByRole('link')).toHaveText(['Blocked drains', 'Emergency plumbing'])
    await expect(services.getByRole('link', { name: 'Emergency plumbing' })).toHaveAttribute(
      'href',
      '/services/emergency-plumbing',
    )
    const people = region(page, 'Who works here')
    await expect(people.getByRole('listitem')).toHaveText(['Ann Lee, Principal solicitor'])
    await expect(people.getByRole('link', { name: 'Ann Lee' })).toHaveAttribute(
      'href',
      '/team/ann-lee',
    )
  })

  test('has metadata, a canonical address and the picture as the share image', async ({ page }) => {
    await page.goto(BRANCH)
    await expect(page).toHaveTitle('Parramatta | Test Co')
    const meta = (attr: string, value: string) =>
      page.locator(`meta[${attr}="${value}"]`).getAttribute('content')
    expect(await meta('name', 'description')).toBe(
      'Our Parramatta branch, two minutes from the station.',
    )
    expect(await meta('property', 'og:url')).toBe(`${SITE_URL}${BRANCH}`)
    expect(await meta('property', 'og:image')).toContain('cdn.sanity.io/images')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}${BRANCH}`,
    )
  })
})

test.describe('the JSON-LD of a branch', () => {
  test('is the business type keyed by document, with the organisation as its parent', async ({
    page,
  }) => {
    await page.goto(BRANCH)
    const nodes = await jsonLd(page)
    const branch = nodes.find((node) => node['@id'] === `${SITE_URL}/#location-place-parramatta`)
    expect(branch).toMatchObject({
      '@type': 'ProfessionalService',
      name: 'Parramatta',
      url: `${SITE_URL}${BRANCH}`,
      description: 'Our Parramatta branch, two minutes from the station.',
      parentOrganization: { '@id': `${SITE_URL}/#organization` },
      telephone: '+61290000000',
      email: 'parramatta@example.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '1 Church St',
        addressLocality: 'Parramatta',
        addressRegion: 'NSW',
        postalCode: '2150',
        addressCountry: 'AU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: -33.8151, longitude: 151.0011 },
    })
    expect(branch?.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '07:00',
        closes: '17:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '08:00',
        closes: '12:00',
      },
    ])
    for (const key of ['aggregateRating', 'review', 'areaServed', 'offers'])
      expect(branch).not.toHaveProperty(key)
    // The page's WebPage is about the branch, by the same @id.
    expect(nodes.find((node) => node['@type'] === 'WebPage')).toMatchObject({
      '@id': `${SITE_URL}${BRANCH}#webpage`,
      about: { '@id': `${SITE_URL}/#location-place-parramatta` },
    })
  })

  test('says nothing the page does not show, and the graph holds together', async ({ page }) => {
    await page.goto(BRANCH)
    const nodes = await jsonLd(page)
    const text = await pageText(page)
    expect(
      checkParity(nodes, { origin: SITE_URL, text, siteText: text, siteDetails: true }),
    ).toEqual([])
    expect(findWebPageProblems(nodes, SITE_URL)).toEqual([])
    expect(findMissingWebPage(nodes, `${SITE_URL}${BRANCH}`)).toEqual([])
    expect(findDraftIds(nodes)).toEqual([])
    expect(
      findUnresolvedReferences(
        nodes,
        new Set([`${SITE_URL}/#organization`, `${SITE_URL}/#website`]),
      ),
    ).toEqual([])
  })
})

test.describe('a service area page', () => {
  test('shows its name and summary but no address, phone, hours or directions', async ({
    page,
  }) => {
    await page.goto(AREA)
    const main = page.locator('#main-content')
    await expect(main.locator('h1')).toHaveText('Western Sydney')
    await expect(main).toContainText(
      'We travel across Western Sydney, from Parramatta to the Blue Mountains.',
    )
    // The document still holds a phone number, a suburb and hours; none of them is shown.
    for (const heading of ['Visit or contact us', 'Opening hours'])
      await expect(main.getByRole('heading', { level: 2, name: heading })).toHaveCount(0)
    await expect(main.getByText('9111 1111')).toHaveCount(0)
    await expect(main.getByText('Penrith')).toHaveCount(0)
    await expect(main.getByRole('link', { name: 'Get directions' })).toHaveCount(0)
    await expect(
      region(page, 'Services here').getByRole('link', { name: 'Emergency plumbing' }),
    ).toBeVisible()
  })

  test('is a Place with a name, a page and a description, and nothing a place cannot show', async ({
    page,
  }) => {
    await page.goto(AREA)
    const nodes = await jsonLd(page)
    expect(
      nodes.find((node) => node['@id'] === `${SITE_URL}/#location-place-western-sydney`),
    ).toEqual({
      '@type': 'Place',
      '@id': `${SITE_URL}/#location-place-western-sydney`,
      name: 'Western Sydney',
      url: `${SITE_URL}${AREA}`,
      description: 'We travel across Western Sydney, from Parramatta to the Blue Mountains.',
    })
    const text = await pageText(page)
    expect(
      checkParity(nodes, { origin: SITE_URL, text, siteText: text, siteDetails: true }),
    ).toEqual([])
  })
})

test.describe('a branch page with only the required fields', () => {
  test('leaves out every optional part, heading and markup included', async ({ page }) => {
    await page.goto(BARE)
    const main = page.locator('#main-content')
    await expect(main.locator('h1')).toHaveText('Newtown')
    await expect(main).toContainText('Newtown NSW 2042')
    for (const heading of ['Opening hours', 'Who works here'])
      await expect(main.getByRole('heading', { level: 2, name: heading })).toHaveCount(0)
    // No phone, email or street: the address is there, but there is nothing to dial or write to.
    await expect(main.locator('a[href^="tel:"], a[href^="mailto:"]')).toHaveCount(0)

    const node = (await jsonLd(page)).find(
      (n) => n['@id'] === `${SITE_URL}/#location-place-newtown`,
    )
    expect(node).toMatchObject({ address: { addressLocality: 'Newtown' } })
    for (const key of ['telephone', 'email', 'geo', 'openingHoursSpecification', 'description'])
      expect(node).not.toHaveProperty(key)
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  for (const path of [BRANCH, AREA, BARE]) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('unknown locations', () => {
  test('are a 404', async ({ page, request }) => {
    await page.goto('/locations/does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect((await request.get('/locations/does-not-exist')).status()).toBe(404)
  })
})

test.describe('the sitemap', () => {
  test('lists every location page', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()
    for (const path of [BRANCH, AREA, BARE]) expect(sitemap).toContain(`${SITE_URL}${path}`)
  })
})
