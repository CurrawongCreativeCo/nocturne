import { expect, test, type Locator } from '@playwright/test'

/** The cursor the browser would show over the control (globals.css, "Cursors"). */
const cursorOf = (target: Locator) => target.evaluate((el) => getComputedStyle(el).cursor)

async function expectCursor(target: Locator, cursor: string) {
  await expect(target.first()).toBeVisible()
  // Retried: the control can be swapped out as the page hydrates, which reads as an empty cursor.
  await expect.poll(() => cursorOf(target.first())).toBe(cursor)
}

test.describe('cursors', () => {
  test('links and buttons show the pointer; body text does not', async ({ page }) => {
    await page.goto('/')
    await expectCursor(page.locator('header').getByRole('link').first(), 'pointer')
    await expectCursor(page.locator('main a[href]'), 'pointer')
    // Cookie settings is a real <button> in the footer.
    await expectCursor(page.getByRole('button', { name: 'Cookie settings' }), 'pointer')
    expect(['auto', 'text']).toContain(await cursorOf(page.locator('main p').first()))
  })

  test('a whole blog card is one link with the pointer', async ({ page }) => {
    await page.goto('/blog')
    const card = page.locator('article').first()
    await expect(card.getByRole('link')).toHaveCount(1)
    // The link's ::after stretches over the card, so the card's own image shows the pointer
    // through hit-testing: the element under the card's centre is the link.
    const box = await card.boundingBox()
    if (!box) throw new Error('The card has no box')
    const underCentre = await page.evaluate(
      ([x, y]: [number, number]) => {
        const el = document.elementFromPoint(x, y)
        return el ? getComputedStyle(el).cursor : null
      },
      [box.x + box.width / 2, box.y + box.height / 2] as [number, number],
    )
    expect(underCentre).toBe('pointer')
  })

  test('form controls: pointer when enabled, not-allowed while sending, text in text fields', async ({
    page,
  }) => {
    await page.goto('/contact')
    const form = page.getByRole('form', { name: 'Get in touch' })
    await expectCursor(form.getByRole('textbox', { name: 'Your name' }), 'text')
    await expectCursor(form.getByRole('combobox', { name: 'Topic' }), 'pointer')
    await expectCursor(form.getByRole('checkbox', { name: 'I agree to be contacted' }), 'pointer')
    await expectCursor(form.locator('label[for]').first(), 'pointer')
    const send = form.getByRole('button', { name: 'Send message' })
    await expectCursor(send, 'pointer')

    // Hold the server action open so the button stays in its sending state.
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/contact', async (route) => {
      if (route.request().method() === 'POST') await held
      await route.continue()
    })
    await form.getByLabel('Your name').fill('Ann Author')
    await form.getByLabel('Email address').fill('ann@example.com')
    await form.getByLabel('Topic').selectOption('Support')
    await form.getByLabel('Message').fill('Hello there.')
    await form.getByLabel('I agree to be contacted').check()
    await send.click()
    await expect(send).toHaveAttribute('aria-disabled', 'true')
    expect(await cursorOf(send)).toBe('not-allowed')
    release()
    await expect(page.getByText('Thanks, Ann!')).toBeVisible()
  })

  test.describe('first visit', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('the cookie banner buttons show the pointer', async ({ page }) => {
      await page.goto('/')
      const banner = page.getByRole('region', { name: 'Your privacy choices' })
      await expect(banner).toBeVisible()
      await expectCursor(banner.getByRole('button', { name: 'Accept all' }), 'pointer')
    })
  })

  test('the mobile menu button shows the pointer', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only')
    await page.goto('/')
    await expectCursor(page.locator('header summary'), 'pointer')
  })
})
