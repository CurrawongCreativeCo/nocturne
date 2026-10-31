import { expect, type Page } from '@playwright/test'

import { SITE_URL } from './constants'
import { test } from './fixtures/test'

test.describe('pages', () => {
  test('home renders its sections with the hero as the only <h1>', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('Welcome to Test Co')
    for (const heading of [
      'Features',
      'Media without an image',
      'Testimonials',
      'FAQ',
      'Brand banner',
    ]) {
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible()
    }
  })

  test('a page without a leading hero still has exactly one <h1>', async ({ page }) => {
    await page.goto('/about')
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).toHaveText('About')
  })

  test('links that open a new tab say so to screen readers', async ({ page }) => {
    await page.goto('/about')
    const link = page.getByRole('link', { name: 'External site (opens in a new tab)' })
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('image + text without an image uses a single column', async ({ page }) => {
    await page.goto('/')
    const section = page.locator('section', {
      has: page.getByRole('heading', { name: 'Media without an image' }),
    })
    await expect(section).not.toHaveClass(/grid-cols-2/)
  })

  test('a referenced shared section renders as a normal section', async ({ page }) => {
    await page.goto('/shared')
    await expect(page.locator('h1')).toHaveText('Shared')
    await expect(page.getByRole('heading', { name: 'Shared promo banner', level: 2 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'See the promo' })).toBeVisible()
    await expect(page.locator('main section')).toHaveCount(2)
  })

  test('unknown URLs return a 404 page', async ({ page }) => {
    const response = await page.goto('/does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })

  test('search engines get a 404 with noindex', async ({ request }) => {
    // Crawlers get complete HTML rather than streamed metadata; for a 404 that's a minimal
    // shell, which is fine: what search engines act on is the status and noindex.
    const response = await request.get('/does-not-exist', {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    })
    expect(response.status()).toBe(404)
    expect(await response.text()).toContain('<meta name="robots" content="noindex"/>')
  })
})

test.describe('metadata', () => {
  const meta = (page: Page, attr: string, value: string) =>
    page.locator(`meta[${attr}="${value}"]`).getAttribute('content')

  test('pages have complete Open Graph and Twitter tags', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Home | Test Co')
    expect(await meta(page, 'property', 'og:title')).toBe('Home | Test Co')
    expect(await meta(page, 'property', 'og:description')).toBe('Home page description.')
    expect(await meta(page, 'property', 'og:site_name')).toBe('Test Co')
    expect(await meta(page, 'property', 'og:url')).toBe(SITE_URL)
    expect(await meta(page, 'property', 'og:type')).toBe('website')
    expect(await meta(page, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(await meta(page, 'name', 'twitter:title')).toBe('Home | Test Co')
  })

  test('a page without its own description falls back to the site description', async ({
    page,
  }) => {
    await page.goto('/about')
    expect(await meta(page, 'name', 'description')).toBe('Default description for Test Co.')
    expect(await meta(page, 'property', 'og:description')).toBe('Default description for Test Co.')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}/about`,
    )
  })

  test('structured data describes the business and website', async ({ page }) => {
    await page.goto('/')
    const json = await page.locator('script[type="application/ld+json"]').first().textContent()
    const data = JSON.parse(json ?? '{}') as {
      '@graph': { '@type': string; name: string; url: string }[]
    }
    expect(data['@graph'].map((node) => node['@type'])).toEqual(['ProfessionalService', 'WebSite'])
    expect(data['@graph'][0]).toMatchObject({ name: 'Test Co', url: `${SITE_URL}/` })
  })
})

test.describe('share images', () => {
  const ogImages = (page: Page) => page.locator('meta[property="og:image"]')

  test('a page without its own image gets the generated one, served as a PNG', async ({
    page,
    request,
  }) => {
    await page.goto('/about')
    await expect(ogImages(page)).toHaveCount(1)
    const url = (await ogImages(page).getAttribute('content')) ?? ''
    expect(new URL(url).pathname).toBe('/api/og/about')
    expect(await page.locator('meta[name="twitter:image"]').getAttribute('content')).toBe(url)

    const response = await request.get(new URL(url).pathname)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/png')
  })

  test('the home page and titles too long for three lines get one as well', async ({
    page,
    request,
  }) => {
    for (const path of ['/', '/long-title']) {
      await page.goto(path)
      const url = (await ogImages(page).getAttribute('content')) ?? ''
      const response = await request.get(new URL(url).pathname)
      expect(response.headers()['content-type']).toBe('image/png')
    }
  })

  test('a page with its own image emits only that one', async ({ page }) => {
    await page.goto('/own-image')
    await expect(ogImages(page)).toHaveCount(1)
    expect(await ogImages(page).getAttribute('content')).toContain('cdn.sanity.io/images')
  })
})

test.describe('structured data', () => {
  const jsonLd = (page: Page) =>
    page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
      scripts.flatMap((script) => {
        const data = JSON.parse(script.textContent) as Record<string, unknown>
        return (data['@graph'] as Record<string, unknown>[] | undefined) ?? [data]
      }),
    )

  test('the home page FAQ is valid FAQPage JSON-LD with plain-text answers', async ({ page }) => {
    await page.goto('/')
    const faq = (await jsonLd(page)).find((data) => data['@type'] === 'FAQPage')
    // One FAQPage per page, keyed by the page's URL.
    expect(faq).toMatchObject({ '@id': `${SITE_URL}/#faq` })
    const entities = faq?.mainEntity as { name: string; acceptedAnswer: { text: string } }[]
    expect(entities.length).toBeGreaterThan(0)
    for (const { name, acceptedAnswer } of entities) {
      expect(name).toBeTruthy()
      expect(acceptedAnswer.text).toBeTruthy()
      expect(acceptedAnswer.text).not.toContain('<')
    }
  })

  test('a nested page has a BreadcrumbList and a visible breadcrumb nav', async ({ page }) => {
    await page.goto('/services/web/design')
    const nodes = await jsonLd(page)
    const list = nodes.find((data) => data['@type'] === 'BreadcrumbList')
    expect(list?.['@id']).toBe(`${SITE_URL}/services/web/design#breadcrumb`)
    // The page's WebPage node points at the trail by @id.
    expect(nodes.find((data) => data['@type'] === 'WebPage')).toMatchObject({
      '@id': `${SITE_URL}/services/web/design#webpage`,
      breadcrumb: { '@id': `${SITE_URL}/services/web/design#breadcrumb` },
    })
    expect(list?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE_URL}/services` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Web design',
        item: `${SITE_URL}/services/web/design`,
      },
    ])

    const nav = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(nav.getByRole('link')).toHaveText(['Home', 'Services'])
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Web design')
  })

  test('top-level pages have no breadcrumbs', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0)
    expect((await jsonLd(page)).some((data) => data['@type'] === 'BreadcrumbList')).toBe(false)
  })
})
