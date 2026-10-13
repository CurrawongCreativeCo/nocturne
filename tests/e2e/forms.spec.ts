import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SUCCESS = 'Thanks, Ann! We will reply within two days.'

/**
 * The action rate-limits by IP and every test shares one server, so each test sends from its own
 * made-up address (the server reads x-forwarded-for, as it would behind a proxy).
 */
function fakeIp({ project, title }: TestInfo) {
  let hash = 0
  for (const char of `${project.name}:${title}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `10.${(hash >>> 16) & 255}.${(hash >>> 8) & 255}.${hash & 255}`
}

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': fakeIp(testInfo) })
})

async function fillValid(page: Page) {
  await page.getByLabel('Your name').fill('Ann Author')
  await page.getByLabel('Email address').fill('ann@example.com')
  await page.getByLabel('Topic').selectOption('Support')
  await page.getByLabel('Message').fill('Hello there.\nSecond line.')
  await page.getByLabel('I agree to be contacted').check()
}

const submit = (page: Page) => page.getByRole('button', { name: 'Send message' }).click()
// Next.js adds its own empty role=alert (the route announcer), so match ours by name.
const summary = (page: Page) => page.getByRole('alert', { name: /Please fix|wasn’t sent/ })

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(
    violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}

test.describe('form section', () => {
  test('renders native, labelled inputs inside a form named by its heading', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { level: 2, name: 'Get in touch' })).toBeVisible()
    const form = page.getByRole('form', { name: 'Get in touch' })
    await expect(form.getByRole('textbox', { name: 'Your name' })).toBeVisible()
    await expect(form.getByRole('textbox', { name: 'Email address' })).toHaveAttribute(
      'type',
      'email',
    )
    await expect(form.getByRole('textbox', { name: 'Phone number (optional)' })).toHaveAttribute(
      'type',
      'tel',
    )
    await expect(form.getByRole('combobox', { name: 'Topic' })).toBeVisible()
    await expect(form.getByRole('textbox', { name: 'Message' })).toBeVisible()
    await expect(form.getByRole('checkbox', { name: 'I agree to be contacted' })).toBeVisible()
    await expect(
      form.getByRole('checkbox', { name: 'Send me the newsletter (optional)' }),
    ).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('the recipient address never reaches the browser', async ({ page }) => {
    const response = await page.goto('/contact')
    expect(await response?.text()).not.toContain('inbox@example.com')
    expect(await page.content()).not.toContain('inbox@example.com')
  })

  test('the form does not move once the page has settled', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { shift: number }
      w.shift = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number
          hadRecentInput: boolean
        }[]) {
          if (!entry.hadRecentInput) w.shift += entry.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto('/contact')
    // The announcement bar appears after load and moves the page once (see README); start after it.
    await expect(page.getByText('Summer sale')).toBeVisible()
    await page.evaluate(() => {
      ;(window as unknown as { shift: number }).shift = 0
    })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => (window as unknown as { shift: number }).shift)).toBe(0)
  })
})

test.describe('validation', () => {
  test('required fields are announced in an error summary that takes focus', async ({ page }) => {
    await page.goto('/contact')
    await submit(page)

    await expect(summary(page)).toBeVisible()
    await expect(summary(page)).toBeFocused()
    await expect(summary(page)).toContainText('Please fix the following')
    for (const message of [
      'Your name is required.',
      'Email address is required.',
      'Topic is required.',
      'Message is required.',
      'Tick the box for “I agree to be contacted” to continue.',
    ]) {
      await expect(summary(page).getByRole('link', { name: message })).toBeVisible()
    }
    // Optional fields aren't flagged.
    await expect(summary(page).getByRole('link')).toHaveCount(5)

    // Each invalid input says so and points at its own message.
    for (const label of ['Your name', 'Email address', 'Topic', 'Message']) {
      const input = page.getByLabel(label)
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      const describedBy = (await input.getAttribute('aria-describedby')) ?? ''
      await expect(page.locator(`[id="${describedBy}"]`)).toContainText(/is required/)
    }
    await expect(page.getByLabel('Phone number')).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('a link in the summary moves focus to its field', async ({ page }) => {
    await page.goto('/contact')
    await submit(page)
    await summary(page).getByRole('link', { name: 'Email address is required.' }).click()
    await expect(page.getByLabel('Email address')).toBeFocused()
  })

  test('format errors name what is wrong, and what was typed is kept', async ({ page }) => {
    await page.goto('/contact')
    await fillValid(page)
    await page.getByLabel('Email address').fill('not-an-email')
    await page.getByLabel('Phone number').fill('call me')
    await submit(page)

    await expect(summary(page)).toBeFocused()
    await expect(page.locator('[id$="-email-error"]')).toContainText(
      'Email address must be an email address, like name@example.com.',
    )
    await expect(page.locator('[id$="-phone-error"]')).toContainText(
      'Phone number must be a phone number',
    )
    await expect(page.getByLabel('Your name')).toHaveValue('Ann Author')
    await expect(page.getByLabel('Email address')).toHaveValue('not-an-email')
    await expect(page.getByLabel('Topic')).toHaveValue('Support')
    await expect(page.getByLabel('Message')).toHaveValue('Hello there.\nSecond line.')
    await expect(page.getByLabel('I agree to be contacted')).toBeChecked()
  })

  test('the server checks against its own copy of the form, not the browser’s', async ({
    page,
  }) => {
    await page.goto('/contact')
    await fillValid(page)
    // A value the form never offered, as a hand-made request could send.
    await page.getByLabel('Topic').evaluate((select: HTMLSelectElement) => {
      select.append(new Option('Hacking', 'Hacking'))
      select.value = 'Hacking'
    })
    await submit(page)
    await expect(summary(page)).toContainText('Choose one of the options for Topic.')
  })

  test('axe finds nothing in the error state', async ({ page }) => {
    await page.goto('/contact')
    await submit(page)
    await expect(summary(page)).toBeFocused()
    await expectNoViolations(page)
  })
})

test.describe('sending', () => {
  test('a valid submission shows the success message in place of the form', async ({ page }) => {
    await page.goto('/contact')
    const form = page.getByRole('form', { name: 'Get in touch' })
    await fillValid(page)
    const before = (await form.boundingBox())?.height ?? 0
    await submit(page)

    const success = page.getByRole('status').filter({ hasText: SUCCESS })
    await expect(success).toBeVisible()
    await expect(success).toBeFocused()
    await expect(form).toHaveCount(0)
    // The message keeps the form's height, so the content below stays put.
    const after = (await success.locator('..').boundingBox())?.height ?? 0
    expect(after).toBeGreaterThanOrEqual(before - 1)
  })

  test('axe finds nothing in the success state', async ({ page }) => {
    await page.goto('/contact')
    await fillValid(page)
    await submit(page)
    await expect(page.getByRole('status').filter({ hasText: SUCCESS })).toBeVisible()
    await expectNoViolations(page)
  })

  test('a failed spam check sends nothing and asks to try again', async ({ page }) => {
    await page.goto('/contact')
    await fillValid(page)
    await page
      .locator('input[name="cf-turnstile-response"]')
      .evaluate((input: HTMLInputElement) => {
        input.value = 'forged-token'
      })
    await submit(page)
    await expect(summary(page)).toBeFocused()
    await expect(summary(page)).toContainText('We couldn’t confirm you’re not a robot')
    await expect(page.getByLabel('Your name')).toHaveValue('Ann Author')
  })

  test('the sixth message from one address in ten minutes is refused', async ({ page }) => {
    for (let sent = 1; sent <= 5; sent++) {
      await page.goto('/contact')
      await fillValid(page)
      await submit(page)
      await expect(page.getByRole('status').filter({ hasText: SUCCESS })).toBeVisible()
    }
    await page.goto('/contact')
    await fillValid(page)
    await submit(page)
    await expect(summary(page)).toContainText('You’ve sent several messages in a short time')
    await expect(page.getByLabel('Your name')).toHaveValue('Ann Author')
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('a plain POST shows the errors, keeps the answers, and then the success message', async ({
    page,
  }) => {
    await page.goto('/contact')
    await page.getByLabel('Your name').fill('Ann Author')
    await submit(page)

    await expect(summary(page)).toContainText('Email address is required.')
    await expect(page.locator('[id$="-email-error"]')).toContainText('Email address is required.')
    await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Your name')).toHaveValue('Ann Author')

    await fillValid(page)
    await submit(page)
    await expect(page.getByRole('status').filter({ hasText: SUCCESS })).toBeVisible()
  })
})
