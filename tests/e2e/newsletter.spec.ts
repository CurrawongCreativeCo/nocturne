import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type TestInfo } from '@playwright/test'

import { test } from './fixtures/test'

import { waitForHydration } from './hydration'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SUCCESS = 'Thanks! Check your inbox to confirm.'

/** Every test sends from its own made-up address: the signup is rate-limited per IP (see forms.spec.ts). */
function fakeIp({ project, title }: TestInfo) {
  let hash = 0
  for (const char of `newsletter:${project.name}:${title}`) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return `10.${(hash >>> 16) & 255}.${(hash >>> 8) & 255}.${hash & 255}`
}

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': fakeIp(testInfo) })
})

/** Opens the signup and waits for it to hydrate: a field filled earlier is lost when the form hydrates. */
async function openSignup(page: Page) {
  await page.goto('/newsletter')
  await waitForHydration(page.getByLabel('Email address'))
}

const subscribe = (page: Page) => page.getByRole('button', { name: 'Subscribe' }).click()
// Next.js adds its own empty role=alert (the route announcer), so match ours by name.
const summary = (page: Page) => page.getByRole('alert', { name: /Please fix|weren’t signed up/ })

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}

test('renders an email field in a form named by the section heading', async ({ page }) => {
  await openSignup(page)
  await expect(page.getByRole('heading', { level: 2, name: 'Stay in the loop' })).toBeVisible()
  const form = page.getByRole('form', { name: 'Stay in the loop' })
  await expect(form.getByRole('textbox', { name: 'Email address' })).toHaveAttribute(
    'type',
    'email',
  )
  await expect(page.locator('h1')).toHaveCount(1)
})

test('an empty email is announced in a summary that takes focus', async ({ page }) => {
  await openSignup(page)
  await subscribe(page)

  await expect(summary(page)).toBeFocused()
  await expect(
    summary(page).getByRole('link', { name: 'Email address is required.' }),
  ).toBeVisible()
  await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true')

  await summary(page).getByRole('link', { name: 'Email address is required.' }).click()
  await expect(page.getByLabel('Email address')).toBeFocused()
})

test('a malformed email names the problem and keeps what was typed', async ({ page }) => {
  await openSignup(page)
  await page.getByLabel('Email address').fill('not-an-email')
  await subscribe(page)

  await expect(summary(page)).toBeFocused()
  await expect(page.locator('[id$="-email-error"]')).toContainText(
    'Email address must be an email address, like name@example.com.',
  )
  await expect(page.getByLabel('Email address')).toHaveValue('not-an-email')
  await expectNoViolations(page)
})

test('a valid email shows the section’s success message in place of the form', async ({ page }) => {
  await openSignup(page)
  await page.getByLabel('Email address').fill('ann@example.com')
  await subscribe(page)

  const success = page.getByRole('status').filter({ hasText: SUCCESS })
  await expect(success).toBeVisible()
  await expect(success).toBeFocused()
  await expect(page.getByRole('form', { name: 'Stay in the loop' })).toHaveCount(0)
  await expectNoViolations(page)
})

test('signing up twice with the same address looks identical', async ({ page }) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    await openSignup(page)
    await page.getByLabel('Email address').fill('ann@example.com')
    await subscribe(page)
    await expect(page.getByRole('status').filter({ hasText: SUCCESS })).toBeVisible()
  }
})

test('a failed spam check signs nobody up and asks to try again', async ({ page }) => {
  await openSignup(page)
  await page.getByLabel('Email address').fill('ann@example.com')
  await page.locator('input[name="cf-turnstile-response"]').evaluate((input: HTMLInputElement) => {
    input.value = 'forged-token'
  })
  await subscribe(page)
  await expect(summary(page)).toContainText('We couldn’t confirm you’re not a robot')
  await expect(page.getByLabel('Email address')).toHaveValue('ann@example.com')
})

test('the sixth signup from one address in ten minutes is refused', async ({ page }) => {
  for (let sent = 1; sent <= 5; sent++) {
    await openSignup(page)
    await page.getByLabel('Email address').fill(`ann${sent}@example.com`)
    await subscribe(page)
    await expect(page.getByRole('status').filter({ hasText: SUCCESS })).toBeVisible()
  }
  await openSignup(page)
  await page.getByLabel('Email address').fill('ann6@example.com')
  await subscribe(page)
  await expect(summary(page)).toContainText('several times in a short while')
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('a plain POST shows the error, then the success message', async ({ page }) => {
    await page.goto('/newsletter')
    await subscribe(page)
    await expect(summary(page)).toContainText('Email address is required.')

    await page.getByLabel('Email address').fill('ann@example.com')
    await subscribe(page)
    await expect(page.getByRole('status').filter({ hasText: SUCCESS })).toBeVisible()
  })
})
