import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

import { MEMBER_EMAIL, MEMBER_PASSWORD, OUTSIDER_EMAIL, SITE_URL } from './constants'

// Headings and text are looked up inside #main-content: under load React can leave its hidden streaming
// segment (<div hidden id="S:n">) in the DOM beside the revealed copy, and strict locators match both.
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Everything the fixtures keep behind the members gate (see tests/e2e/fixtures/dataset.mjs). */
const SECRETS = [
  'Secret members page content.',
  'Secret members hero',
  'Secret members description',
  'Secret members section content.',
  'Secret shared banner',
  'Secret shared action',
  'Secret first hero',
  // The page's real title: anonymous visitors only get "Members only".
  'Members area',
]

/**
 * The page's <h1>s as a user perceives them. After a client-side redirect Next keeps the previous route
 * in the DOM, hidden, so a bare `h1` selector would count its heading too.
 */
const h1 = (page: Page) => page.getByRole('heading', { level: 1 })

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}

async function fillSignIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Signs in through the sign-in page and waits to be sent back to `returnTo`. */
async function signIn(page: Page, returnTo: string) {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`)
  await fillSignIn(page, MEMBER_EMAIL, MEMBER_PASSWORD)
  await expect(page).toHaveURL(returnTo)
  // The sign-in page's <h1> is replaced once the destination has rendered.
  await expect(h1(page)).toHaveCount(1)
}

/** The whole document an anonymous visitor's browser receives, including the streamed parts. */
async function rawHtml(page: Page, path: string) {
  const response = await page.request.get(path)
  expect(response.status()).toBe(200)
  return response.text()
}

test.describe('anonymous visitor', () => {
  test('a members-only page shows a sign-in prompt and none of its content', async ({ page }) => {
    await page.goto('/members')
    await expect(h1(page)).toHaveText('Members only')
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in?callbackUrl=%2Fmembers',
    )
    // Not in the document at all: not rendered, not hidden, not in the streamed payload.
    const html = await rawHtml(page, '/members')
    for (const secret of SECRETS) {
      expect(html).not.toContain(secret)
      await expect(page.getByText(secret)).toHaveCount(0)
    }
    await expect(page).toHaveTitle(/^Members only/)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expectNoViolations(page)
  })

  test('a public page with members-only sections keeps the public ones and prompts for the rest', async ({
    page,
  }) => {
    await page.goto('/mixed')
    await expect(
      page.locator('#main-content').getByText('Public intro on the mixed page.'),
    ).toBeVisible()
    await expect(
      page.locator('#main-content').getByText('Public outro on the mixed page.'),
    ).toBeVisible()
    // One prompt for the plain section, one for the shared section.
    await expect(page.getByRole('heading', { level: 2, name: 'Members only' })).toHaveCount(2)
    await expect(h1(page)).toHaveCount(1)
    const html = await rawHtml(page, '/mixed')
    for (const secret of SECRETS) expect(html).not.toContain(secret)
    // The page itself is public, so search engines may index it.
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expectNoViolations(page)
  })

  test('a members-only first section does not leave the page without its <h1>', async ({
    page,
  }) => {
    await page.goto('/mixed-hero')
    await expect(h1(page)).toHaveText('Members hero page')
    await expect(
      page.locator('#main-content').getByText('Public text under the hero.'),
    ).toBeVisible()
    expect(await rawHtml(page, '/mixed-hero')).not.toContain('Secret first hero')
  })

  test('members-only pages are left out of the sitemap, llms.txt and search', async ({
    page,
    request,
  }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).not.toContain('/members<')
    expect(sitemap).toContain(`<loc>${SITE_URL}/mixed</loc>`)

    const llms = await (await request.get('/llms.txt')).text()
    expect(llms).not.toContain(`${SITE_URL}/members`)
    expect(llms).toContain(`${SITE_URL}/mixed`)

    // Nothing in a members-only page or section can be found, or quoted back as a snippet.
    await page.goto('/search?q=secret')
    await expect(page.locator('main [role="status"]')).toHaveText('No pages found for “secret”.')
    expect(await (await request.get('/api/search?q=secret')).text()).not.toContain('Secret')
    await page.goto('/search?q=intro')
    await expect(page.locator('main li').getByRole('link', { name: 'Mixed access' })).toBeVisible()
    await expect(page.locator('main li')).not.toContainText('Secret')
  })
})

test.describe('signing in', () => {
  test('from the prompt, to the page the visitor came from', async ({ page }) => {
    await page.goto('/members')
    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(h1(page)).toHaveText('Sign in')
    await expectNoViolations(page)

    await fillSignIn(page, MEMBER_EMAIL, MEMBER_PASSWORD)
    await expect(page).toHaveURL('/members')
    await expect(
      page.locator('#main-content').getByText('Secret members page content.'),
    ).toBeVisible()
    // The members-only hero provides the page's single <h1>.
    await expect(h1(page)).toHaveCount(1)
    await expect(h1(page)).toHaveText('Secret members hero')
    await expectNoViolations(page)

    // The session lasts: a reload still shows the content.
    await page.reload()
    await expect(
      page.locator('#main-content').getByText('Secret members page content.'),
    ).toBeVisible()
  })

  test('shows members-only sections in place on a public page', async ({ page }) => {
    await signIn(page, '/mixed')
    await expect(
      page.locator('#main-content').getByText('Secret members section content.'),
    ).toBeVisible()
    await expect(
      page.locator('#main-content').getByText('Secret shared banner text.'),
    ).toBeVisible()
    await expect(
      page.locator('#main-content').getByText('Public intro on the mixed page.'),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Members only' })).toHaveCount(0)
    await expectNoViolations(page)
  })

  test('a members-only hero in first place is a section heading, not a second <h1>', async ({
    page,
  }) => {
    await signIn(page, '/mixed-hero')
    await expect(page.getByRole('heading', { level: 2, name: 'Secret first hero' })).toBeVisible()
    await expect(h1(page)).toHaveText('Members hero page')
  })

  test('a wrong password or an address off the members list is refused', async ({ page }) => {
    await page.goto('/sign-in?callbackUrl=%2Fmembers')
    await fillSignIn(page, MEMBER_EMAIL, 'wrong-password')
    await expect(page.locator('main [role="alert"]')).toHaveText(
      'The email or password is not right.',
    )

    await fillSignIn(page, OUTSIDER_EMAIL, MEMBER_PASSWORD)
    await expect(page.locator('main [role="alert"]')).toHaveText(
      'That account is not on the members list.',
    )

    await page.goto('/members')
    await expect(page.getByText('Secret members page content.')).toHaveCount(0)
    await expect(h1(page)).toHaveText('Members only')
  })

  test('ignores a callback URL that leaves the site', async ({ page }) => {
    await signIn(page, '/')
    await page.context().clearCookies()
    await page.goto('/sign-in?callbackUrl=https%3A%2F%2Fevil.example%2F')
    await fillSignIn(page, MEMBER_EMAIL, MEMBER_PASSWORD)
    await expect(page).toHaveURL('/')
  })

  test('is not indexed', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })
})

test.describe('signing out', () => {
  test('ends the session', async ({ page }) => {
    await signIn(page, '/members')
    await page.goto('/sign-out')
    await expect(h1(page)).toHaveText('Sign out')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expectNoViolations(page)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/')

    await page.goto('/members')
    await expect(h1(page)).toHaveText('Members only')
    await expect(page.getByText('Secret members page content.')).toHaveCount(0)
  })
})
