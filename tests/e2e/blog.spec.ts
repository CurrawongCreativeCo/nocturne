import { expect, test, type Page } from '@playwright/test'

import { SITE_URL } from './constants'

// Headings and text are looked up inside #main-content: under load React can leave its hidden streaming
// segment (<div hidden id="S:n">) in the DOM beside the revealed copy, and strict locators match both.
const jsonLd = (page: Page) =>
  page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent) as Record<string, unknown>),
    )

const cards = (page: Page) => page.locator('main article')

test.describe('blog index', () => {
  test('lists the newest 12 posts under a single <h1>', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.locator('#main-content h1')).toHaveText('Blog')
    await expect(cards(page)).toHaveCount(12)
    await expect(cards(page).first().getByRole('heading', { level: 2 })).toHaveText(
      'Welcome to the blog',
    )
    // One link per card: the title link stretches over the card.
    await expect(cards(page).first().getByRole('link')).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 1 of 2')
    await expect(page.getByRole('link', { name: 'Previous' })).toHaveCount(0)
  })

  test('paginates with ?page, in order, without repeating a post', async ({ page }) => {
    await page.goto('/blog')
    // The list streams in after the page shell; allTextContents() doesn't wait for it.
    await expect(cards(page)).toHaveCount(12)
    const first = await cards(page).getByRole('heading').allTextContents()

    await page.getByRole('link', { name: 'Next' }).click()
    await expect(page).toHaveURL('/blog?page=2')
    await expect(page.locator('#main-content h1')).toHaveText('Blog')
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 2 of 2')
    await expect(cards(page)).toHaveCount(2)
    const second = await cards(page).getByRole('heading').allTextContents()
    expect(second).toEqual(['Archive post 9', 'Hidden post'])
    expect(first).not.toContain('Archive post 9')
    expect(new Set([...first, ...second]).size).toBe(14)

    await expect(page.getByRole('link', { name: 'Next' })).toHaveCount(0)
    await page.getByRole('link', { name: 'Previous' }).click()
    await expect(page).toHaveURL('/blog')
  })

  test('each page is its own canonical URL with its own title', async ({ page }) => {
    await page.goto('/blog')
    await expect(page).toHaveTitle('Blog | Test Co')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}/blog`,
    )

    await page.goto('/blog?page=2')
    await expect(page).toHaveTitle('Blog (page 2) | Test Co')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}/blog?page=2`,
    )
  })

  test('advertises the RSS feed', async ({ page }) => {
    await page.goto('/blog')
    expect(
      await page.locator('link[rel="alternate"][type="application/rss+xml"]').getAttribute('href'),
    ).toBe(`${SITE_URL}/feed.xml`)
  })

  test('a page past the end, or not a number, is a 404', async ({ page }) => {
    for (const query of ['?page=3', '?page=0', '?page=abc', '?page=1.5', '?page=1&page=2']) {
      await page.goto(`/blog${query}`)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Page not found' }),
        query,
      ).toBeVisible()
      await expect(
        page.locator('meta[name="robots"][content="noindex"]').first(),
        query,
      ).toBeAttached()
    }
  })

  test('the category filter lists categories that have posts', async ({ page }) => {
    await page.goto('/blog')
    const nav = page.getByRole('navigation', { name: 'Blog categories' })
    await expect(nav.getByRole('link')).toHaveText(['All', 'Guides', 'News'])
    await expect(nav.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page')
  })
})

test.describe('blog category', () => {
  test('lists only its posts, newest first, under its title', async ({ page }) => {
    await page.goto('/blog/category/news')
    await expect(page.locator('#main-content h1')).toHaveText('News')
    await expect(cards(page).getByRole('heading')).toHaveText([
      'Welcome to the blog',
      'News update',
      'News and guides roundup',
    ])
    await expect(page).toHaveTitle('News | Test Co')
    await expect(
      page.getByRole('navigation', { name: 'Blog categories' }).getByRole('link', { name: 'News' }),
    ).toHaveAttribute('aria-current', 'page')
    // Three posts: no pagination.
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toHaveCount(0)
  })

  test('an unknown category is a real 404', async ({ page, request }) => {
    await page.goto('/blog/category/nope')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect((await request.get('/blog/category/nope')).status()).toBe(404)
    expect((await request.get('/blog/category/nope?page=2')).status()).toBe(404)
  })

  test('a category with no posts shows an empty state, not a 404', async ({ page }) => {
    await page.goto('/blog/category/empty')
    await expect(page.locator('#main-content h1')).toHaveText('Empty')
    await expect(
      page.locator('#main-content').getByText('No posts in this category yet.'),
    ).toBeVisible()
  })
})

test.describe('blog post', () => {
  const path = '/blog/welcome-to-the-blog'

  test('renders the article with exactly one <h1>', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('#main-content h1')).toHaveCount(1)
    await expect(page.locator('#main-content h1')).toHaveText('Welcome to the blog')
    await expect(
      page.locator('#main-content').getByText('Summary of Welcome to the blog.'),
    ).toBeVisible()
    await expect(page.locator('article > header time')).toHaveAttribute(
      'datetime',
      '2026-10-10T09:00:00Z',
    )
    await expect(page.locator('article > header')).toContainText('By Ann Author')
    await expect(page.locator('#main-content').getByText('Ann writes about testing.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'A first heading' })).toBeVisible()
    // Rich text links to CMS pages resolve to their URL.
    await expect(page.getByRole('link', { name: 'about us' })).toHaveAttribute('href', '/about')
  })

  test('links to its categories', async ({ page }) => {
    await page.goto(path)
    await page.getByRole('link', { name: 'Guides', exact: true }).first().click()
    await expect(page).toHaveURL('/blog/category/guides')
  })

  test('related posts share a category, best match first, then newest', async ({ page }) => {
    await page.goto(path)
    const related = page.getByRole('region', { name: 'Related posts' })
    // The roundup shares both categories, so it leads even though it is the oldest of the three.
    await expect(related.getByRole('heading', { level: 3 })).toHaveText([
      'News and guides roundup',
      'News update',
      'How-to guide',
    ])
  })

  test('a post without related posts has no related section', async ({ page }) => {
    await page.goto('/blog/archive-post-1')
    await expect(page.locator('#main-content h1')).toHaveText('Archive post 1')
    await expect(page.getByRole('region', { name: 'Related posts' })).toHaveCount(0)
  })

  test('has Article structured data that points at the site organization', async ({ page }) => {
    await page.goto(path)
    const article = (await jsonLd(page)).find((data) => data['@type'] === 'Article')
    expect(article).toMatchObject({
      '@context': 'https://schema.org',
      headline: 'Welcome to the blog',
      description: 'Summary of Welcome to the blog.',
      datePublished: '2026-10-10T09:00:00Z',
      dateModified: '2026-10-12T00:00:00Z',
      author: { '@type': 'Person', name: 'Ann Author' },
      publisher: { '@id': `${SITE_URL}/#organization` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${path}` },
      articleSection: ['News', 'Guides'],
    })
    expect((article?.image as string[])[0]).toContain('cdn.sanity.io/images')
  })

  test('has article metadata and its main image as the share image', async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveTitle('Welcome to the blog | Test Co')
    const meta = (attr: string, value: string) =>
      page.locator(`meta[${attr}="${value}"]`).getAttribute('content')
    expect(await meta('property', 'og:type')).toBe('article')
    expect(await meta('property', 'og:site_name')).toBe('Test Co')
    expect(await meta('property', 'og:url')).toBe(`${SITE_URL}${path}`)
    expect(await meta('property', 'article:published_time')).toBe('2026-10-10T09:00:00Z')
    expect(await meta('name', 'description')).toBe('Summary of Welcome to the blog.')
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
    expect(await meta('property', 'og:image')).toContain('cdn.sanity.io/images')
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
      `${SITE_URL}${path}`,
    )
  })

  test('a post with no author left still renders, without a byline', async ({ page }) => {
    const response = await page.goto('/blog/archive-post-9')
    expect(response?.status()).toBe(200)
    await expect(page.locator('#main-content h1')).toHaveText('Archive post 9')
    await expect(page.getByText(/By /)).toHaveCount(0)
  })

  test('hidden-from-search posts say so', async ({ page }) => {
    await page.goto('/blog/hidden-post')
    await expect(page.locator('meta[name="robots"][content="noindex, nofollow"]')).toHaveCount(1)
  })

  test('unknown posts are a 404', async ({ page, request }) => {
    await page.goto('/blog/does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect((await request.get('/blog/does-not-exist')).status()).toBe(404)
  })
})

test.describe('feed and sitemap', () => {
  // Server responses don't depend on the browser; run them once.
  test.skip(({ isMobile }) => isMobile, 'Desktop only')

  test('/feed.xml is well-formed RSS 2.0 with absolute URLs', async ({ page, request }) => {
    const response = await request.get('/feed.xml')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('application/rss+xml; charset=utf-8')
    const xml = await response.text()

    // A real XML parser (the browser's) must accept it.
    await page.goto('/')
    const feed = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, 'application/xml')
      const read = (parent: Element, tag: string) =>
        parent.getElementsByTagName(tag)[0]?.textContent
      const channel = doc.getElementsByTagName('channel')[0]
      return {
        parseError: doc.getElementsByTagName('parsererror').length,
        version: doc.documentElement.getAttribute('version'),
        title: channel ? read(channel, 'title') : null,
        link: channel ? read(channel, 'link') : null,
        description: channel ? read(channel, 'description') : null,
        self: doc.getElementsByTagName('atom:link')[0]?.getAttribute('href'),
        items: [...doc.getElementsByTagName('item')].map((item) => ({
          title: read(item, 'title'),
          link: read(item, 'link'),
          guid: read(item, 'guid'),
          permalink: item.getElementsByTagName('guid')[0]?.getAttribute('isPermaLink'),
          pubDate: read(item, 'pubDate'),
          description: read(item, 'description'),
          categories: [...item.getElementsByTagName('category')].map((c) => c.textContent),
        })),
      }
    }, xml)

    expect(feed).toMatchObject({
      parseError: 0,
      version: '2.0',
      title: 'Test Co',
      link: `${SITE_URL}/`,
      description: 'Default description for Test Co.',
      self: `${SITE_URL}/feed.xml`,
    })
    expect(feed.items).toHaveLength(12)
    expect(feed.items[0]).toEqual({
      title: 'Welcome to the blog',
      link: `${SITE_URL}/blog/welcome-to-the-blog`,
      guid: `${SITE_URL}/blog/welcome-to-the-blog`,
      permalink: 'true',
      pubDate: 'Sat, 10 Oct 2026 09:00:00 GMT',
      description: 'Summary of Welcome to the blog.',
      categories: ['News', 'Guides'],
    })
    for (const item of feed.items) {
      expect(item.link?.startsWith(`${SITE_URL}/blog/`)).toBe(true)
      expect(item.pubDate).toMatch(
        /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/,
      )
    }
    expect(xml).not.toContain('localhost')
  })

  test('the sitemap lists the blog index and indexable posts', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain(`<loc>${SITE_URL}/blog</loc>`)
    expect(sitemap).toContain(`<loc>${SITE_URL}/blog/welcome-to-the-blog</loc>`)
    expect(sitemap).toContain(`<loc>${SITE_URL}/blog/archive-post-9</loc>`)
    expect(sitemap).not.toContain('/blog/hidden-post')
    // Pages are still there.
    expect(sitemap).toContain(`<loc>${SITE_URL}/about</loc>`)
  })
})
