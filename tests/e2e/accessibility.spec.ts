import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const path of ['/', '/about', '/shared', '/services/web/design', '/does-not-exist']) {
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

/** Presses Tab until the focused element has `name`, like a keyboard user would. */
async function tabTo(page: Page, name: string) {
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.textContent.trim() ?? '')
    if (focused === name) return
  }
  throw new Error(`Never reached "${name}" by pressing Tab`)
}

/**
 * The focused element's outline, with its color as relative luminance (0 = black, 1 = white):
 * browsers report colors in lab()/oklch(), so the color is measured by painting it.
 */
function focusRing(page: Page) {
  return page.evaluate(() => {
    const focused = document.activeElement
    if (!focused) throw new Error('Nothing is focused')
    const style = getComputedStyle(focused)
    const context = document.createElement('canvas').getContext('2d')
    if (!context) throw new Error('No canvas')
    context.fillStyle = style.outlineColor
    context.fillRect(0, 0, 1, 1)
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
    const channel = (value: number) => {
      const c = value / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    return {
      style: style.outlineStyle,
      width: style.outlineWidth,
      offset: style.outlineOffset,
      tone: luminance > 0.8 ? 'light' : luminance < 0.05 ? 'dark' : 'mid',
    }
  })
}

const ring = (tone: 'light' | 'dark') => ({ style: 'solid', width: '2px', offset: '2px', tone })

test.describe('keyboard', () => {
  test('the first Tab reaches "Skip to content", which moves focus to the main content', async ({
    page,
  }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })

  test('focus rings are visible on light and dark backgrounds', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Uses the desktop header button')
    await page.goto('/')
    // Buttons animate color changes; poll until the ring has settled.
    const expectRing = (tone: 'light' | 'dark') =>
      expect.poll(() => focusRing(page)).toEqual(ring(tone))

    // Dark button on the white header: dark ring with a gap, so it can't merge into the button.
    await tabTo(page, 'Contact')
    await expectRing('dark')

    // Buttons on the dark hero: white ring, including the ring-styled secondary button.
    await tabTo(page, 'About us')
    await expectRing('light')
    await tabTo(page, 'Learn more')
    await expectRing('light')

    // Dark button on a white section, then a button on the brand-colored banner.
    await tabTo(page, 'Read more')
    await expectRing('dark')
    await tabTo(page, 'Get started')
    await expectRing('light')
  })
})
