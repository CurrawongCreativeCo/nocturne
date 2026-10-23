import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { SITE_URL } from './constants'
import { test } from './fixtures/test'

/**
 * Team members, the Team section and profile pages (README, "Team"). The fixture team, in order:
 * Ann Lee (every optional field), Ben Ng (a page, no contact details), Cara Doyle (no page
 * address), then Dev Patel (no order, so last). `/team` is a CMS page with two Team sections; the section gallery has the three layouts.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const ORDER = ['Ann Lee', 'Ben Ng', 'Cara Doyle', 'Dev Patel']

const jsonLd = (page: Page) =>
  page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent) as Record<string, unknown>),
    )

const section = (page: Page, heading: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name: heading }) })

test.describe('the Team section', () => {
  test('shows everyone in team order under one <h1>, with names as headings', async ({ page }) => {
    await page.goto('/team')
    await expect(page.locator('#main-content h1')).toHaveText('Our team')
    const everyone = section(page, 'Everyone')
    await expect(everyone.getByRole('heading', { level: 3 })).toHaveText(ORDER)
    const ann = everyone.getByRole('listitem').filter({ hasText: 'Ann Lee' })
    await expect(ann).toContainText('Principal solicitor')
    await expect(ann).toContainText('Ann leads the firm')
    await expect(ann.getByRole('img', { name: 'Portrait of Ann Lee' })).toBeVisible()
  })

  test('shows picked members in the editor’s order', async ({ page }) => {
    await page.goto('/team')
    await expect(section(page, 'Just two').getByRole('heading', { level: 3 })).toHaveText([
      'Ben Ng',
      'Ann Lee',
    ])
  })

  test('links a card to the profile page only when the member has one', async ({ page }) => {
    await page.goto('/team')
    const everyone = section(page, 'Everyone')
    // One link per member: the name's link stretches over the card.
    await expect(everyone.getByRole('link')).toHaveCount(3)
    await expect(everyone.getByRole('link', { name: 'Ann Lee' })).toHaveAttribute(
      'href',
      '/team/ann-lee',
    )
    await expect(everyone.getByRole('link', { name: 'Dev Patel' })).toHaveAttribute(
      'href',
      '/team/dev-patel',
    )
    await expect(everyone.getByRole('link', { name: 'Cara Doyle' })).toHaveCount(0)
    await everyone.getByRole('link', { name: 'Ben Ng' }).click()
    await expect(page).toHaveURL('/team/ben-ng')
  })

  test('the section gallery shows all three layouts', async ({ page }) => {
    await page.goto('/section-gallery')
    const grid = page.locator('[data-gallery-section="team-grid"]')
    await expect(grid.getByRole('heading', { level: 3 })).toHaveText(ORDER)

    const slider = page.locator('[data-gallery-section="team-slider"]')
    // Picked: Dev, then Ann; the pick that is not published is skipped.
    await expect(slider.getByRole('heading', { level: 3 })).toHaveText(['Dev Patel', 'Ann Lee'])
    await expect(slider.getByRole('region', { name: 'Our partners' })).toBeVisible()

    const list = page.locator('[data-gallery-section="team-list"]')
    await expect(list.getByRole('heading', { level: 3 })).toHaveText(ORDER)
  })
})

test.describe('the hover lift', () => {
  test.use({ reducedMotion: 'no-preference' })

  const lift = (page: Page) =>
    page
      .locator('section', { has: page.getByRole('heading', { level: 2, name: 'Everyone' }) })
      .getByRole('listitem')
      .first()
      .locator('> div')

  const translateY = (page: Page) =>
    lift(page).evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42)

  test('raises the card a few pixels, and only on transform', async ({ page }) => {
    await page.goto('/team')
    await lift(page).scrollIntoViewIfNeeded()
    expect(await translateY(page)).toBe(0)
    await lift(page).hover()
    await expect.poll(() => translateY(page)).toBeLessThan(-2)
    await page.mouse.move(0, 0)
    await expect.poll(() => translateY(page)).toBeGreaterThan(-0.5)
  })
})

test.describe('the hover lift with reduced motion', () => {
  test('does not move the card', async ({ page }) => {
    await page.goto('/team')
    const card = page
      .locator('section', { has: page.getByRole('heading', { level: 2, name: 'Everyone' }) })
      .getByRole('listitem')
      .first()
      .locator('> div')
    await card.hover()
    await page.waitForTimeout(600)
    expect(await card.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  })
})

test.describe('a profile page', () => {
  const path = '/team/ann-lee'

  test('shows the member under a single <h1>', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('#main-content h1')).toHaveText('Ann Lee')
    const main = page.locator('#main-content')
    await expect(main).toContainText('Principal solicitor')
    await expect(main.getByText('Ann leads the firm')).toBeVisible()
    await expect(main.getByText('Ann founded the practice in 2004.')).toBeVisible()
    await expect(
      main.getByRole('list', { name: 'Qualifications' }).getByRole('listitem'),
    ).toHaveText(['LLB (Hons)', 'GAICD'])
    await expect(main.getByRole('img', { name: 'Portrait of Ann Lee' })).toBeVisible()
  })

  test('offers email, phone and social links', async ({ page }) => {
    await page.goto(path)
    const contact = page.getByRole('region', { name: 'Get in touch' })
    await expect(contact.getByRole('link', { name: 'ann@example.com' })).toHaveAttribute(
      'href',
      'mailto:ann@example.com',
    )
    await expect(contact.getByRole('link', { name: '02 9876 5432' })).toHaveAttribute(
      'href',
      'tel:0298765432',
    )
    await expect(contact.getByRole('link', { name: 'Ann Lee on LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ann-lee-example',
    )
  })

  test('a member with no contact details has no contact section', async ({ page }) => {
    await page.goto('/team/ben-ng')
    await expect(page.locator('#main-content h1')).toHaveText('Ben Ng')
    await expect(page.getByRole('region', { name: 'Get in touch' })).toHaveCount(0)
    await expect(page.getByRole('list', { name: 'Qualifications' })).toHaveCount(0)
  })

  test('has Person structured data that points at the site organization', async ({ page }) => {
    await page.goto(path)
    const person = (await jsonLd(page)).find((data) => data['@type'] === 'Person')
    expect(person).toMatchObject({
      '@context': 'https://schema.org',
      '@id': `${SITE_URL}${path}#person`,
      url: `${SITE_URL}${path}`,
      name: 'Ann Lee',
      jobTitle: 'Principal solicitor',
      description: 'Ann leads the firm and has acted for local families for twenty years.',
      email: 'ann@example.com',
      telephone: '0298765432',
      sameAs: ['https://www.linkedin.com/in/ann-lee-example'],
      hasCredential: [
        { '@type': 'EducationalOccupationalCredential', name: 'LLB (Hons)' },
        { '@type': 'EducationalOccupationalCredential', name: 'GAICD' },
      ],
      worksFor: { '@id': `${SITE_URL}/#organization` },
    })
    expect(person?.image as string).toContain('cdn.sanity.io/images')
  })

  test('has profile metadata and the portrait as the share image', async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveTitle('Ann Lee, Principal solicitor | Test Co')
    const meta = (attr: string, value: string) =>
      page.locator(`meta[${attr}="${value}"]`).getAttribute('content')
    expect(await meta('property', 'og:type')).toBe('profile')
    expect(await meta('property', 'og:url')).toBe(`${SITE_URL}${path}`)
    expect(await meta('name', 'description')).toContain('Ann leads the firm')
    expect(await meta('property', 'og:image')).toContain('cdn.sanity.io/images')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}${path}`,
    )
  })

  test('unknown slugs are a 404', async ({ page, request }) => {
    await page.goto('/team/does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect((await request.get('/team/does-not-exist')).status()).toBe(404)
  })

  test('a member without a page address is a 404', async ({ request }) => {
    expect((await request.get('/team/cara-doyle')).status()).toBe(404)
  })
})

test('the sitemap lists profile pages, and only those that exist', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  for (const slug of ['ann-lee', 'ben-ng', 'dev-patel']) {
    expect(sitemap).toContain(`<loc>${SITE_URL}/team/${slug}</loc>`)
  }
  expect(sitemap).not.toContain('cara-doyle')
  // The /team page itself is a CMS page, listed with the others.
  expect(sitemap).toContain(`<loc>${SITE_URL}/team</loc>`)
})

test.describe('accessibility', () => {
  // /team and /team/ann-lee are in accessibility.spec.ts; this is the profile with no contact section.
  for (const path of ['/team/ben-ng']) {
    test(`no WCAG 2.2 AA violations on ${path}`, async ({ page }) => {
      await page.goto(path)
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(
        violations.map(
          ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([])
    })
  }
})
