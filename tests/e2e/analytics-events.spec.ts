import { expect, type Page, type TestInfo } from '@playwright/test'

import { test } from './fixtures/test'
import { waitForHydration } from './hydration'

/**
 * Conversion events (README, "Analytics and cookie consent"): cta_click and form_submit reach the
 * configured providers only after the visitor accepts analytics. Plausible stands in for them all:
 * its script is stubbed empty (the suite runs offline), so this spec defines `window.plausible`
 * itself and records what the dispatcher hands it.
 */

// A first-time visitor: nothing stored.
test.use({ storageState: { cookies: [], origins: [] } })

type Recorded = [name: string, options: { props: Record<string, string> }]
declare global {
  interface Window {
    __events?: Recorded[]
    plausible?: (name: string, options: { props: Record<string, string> }) => void
  }
}

/** The send action rate-limits by IP, so each test sends from its own made-up address (see forms.spec.ts). */
function fakeIp({ project, title }: TestInfo) {
  let hash = 0
  for (const char of `events:${project.name}:${title}`)
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `10.${(hash >>> 16) & 255}.${(hash >>> 8) & 255}.${hash & 255}`
}

test.beforeEach(async ({ page, context }, testInfo) => {
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': fakeIp(testInfo) })
  await page.route(
    (url) =>
      ['plausible.io', 'us-assets.i.posthog.com', 'www.googletagmanager.com'].includes(
        url.hostname,
      ),
    (route) => route.fulfill({ contentType: 'text/javascript', body: '' }),
  )
  await page.addInitScript(() => {
    window.__events = []
    window.plausible = (name: string, options: { props: Record<string, string> }) => {
      window.__events?.push([name, options])
    }
  })
})

const events = (page: Page) => page.evaluate(() => window.__events ?? [])

async function sendContactForm(page: Page) {
  await page.goto('/contact')
  await waitForHydration(page.getByLabel('Your name'))
  await page.getByLabel('Your name').fill('Ann Analytics')
  await page.getByLabel('Email address').fill('ann@example.com')
  await page.getByLabel('Topic').selectOption('Support')
  await page.getByLabel('Message').fill('Hello there.')
  await page.getByLabel('I agree to be contacted').check()
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'We will reply within two days' }),
  ).toBeVisible()
}

test('no event fires before consent', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Your privacy choices' })).toBeVisible()
  await page.getByRole('link', { name: 'About us' }).click()
  await expect(page).toHaveURL(/\/about$/)
  expect(await events(page)).toEqual([])

  await sendContactForm(page)
  expect(await events(page)).toEqual([])
})

test('no event fires after Reject all', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Reject all' }).click()
  await page.getByRole('link', { name: 'About us' }).click()
  await expect(page).toHaveURL(/\/about$/)
  expect(await events(page)).toEqual([])
})

test('a CTA click sends cta_click with its label and destination after Accept all', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Accept all' }).click()
  await page.getByRole('link', { name: 'About us' }).click()
  await expect(page).toHaveURL(/\/about$/)

  expect(await events(page)).toEqual([
    ['cta_click', { props: { label: 'About us', destination: '/about', page: '/' } }],
  ])
})

test('sending a form sends form_submit with the form’s title after Accept all', async ({
  page,
}) => {
  await page.goto('/contact')
  await page.getByRole('button', { name: 'Accept all' }).click()
  await sendContactForm(page)

  expect(await events(page)).toEqual([['form_submit', { props: { form: 'Contact form' } }]])
})
