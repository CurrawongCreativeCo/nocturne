import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

/**
 * The site-wide button style and the form cards (task 148; README, "Buttons"): Brand colours → Buttons, as the
 * browser draws it. The fake Content Lake serves a gradient main button with Raised depth and Strong glow and a
 * Soft secondary only while this spec asks (POST /__fixture/button-style/on), together with an arrow on the home
 * hero's two buttons and a Cards box on the contact form, the newsletter and an embed. Playwright runs it after
 * every other spec (the `button-style` project), so no other test or baseline sees the style; it switches the
 * style off and expires the cache again when it ends, as design-settings.spec.ts does for its palettes.
 */
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const TONES = ['surface', 'alt', 'inverse', 'accent'] as const
const GRADIENT = 'linear-gradient(135deg, rgb(37, 99, 235), rgb(124, 58, 237))'

type Mode = 'on' | 'off'

/** Serves the style (or none), then expires the cached settings and pages the way the Sanity webhook does. */
async function useStyle(request: APIRequestContext, mode: Mode, design = 'off') {
  expect(
    (
      await request.post(`http://localhost:${FAKE_SANITY_PORT}/__fixture/button-style/${mode}`)
    ).status(),
  ).toBe(204)
  expect(
    (
      await request.post(`http://localhost:${FAKE_SANITY_PORT}/__fixture/design/${design}`)
    ).status(),
  ).toBe(204)
  for (const type of ['designSettings', 'page']) {
    const body = JSON.stringify({ _type: type, _id: type })
    const webhook = await request.post('/api/revalidate', {
      data: body,
      headers: {
        'content-type': 'application/json',
        [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
      },
    })
    expect(webhook.status()).toBe(200)
  }
}

/** The first request after an expiry may still get the old copy: reload until the page says otherwise. */
const settled = (page: Page, path: string, ready: () => Promise<boolean>) =>
  expect
    .poll(
      async () => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        return ready()
      },
      { timeout: 30_000, intervals: [250, 500, 1000] },
    )
    .toBe(true)

const styled = (page: Page) => async () =>
  (
    await mainButton(page).evaluate((element) => getComputedStyle(element).backgroundImage)
  ).includes('linear-gradient')

const hero = (page: Page) => page.locator('main section').first()
const mainButton = (page: Page) => hero(page).getByRole('link', { name: 'About us' })
const secondButton = (page: Page) => hero(page).getByRole('link', { name: 'Learn more' })

interface Look {
  image: string
  shadow: string
  color: string
  background: string
  position: string
  translate: string
  scale: string
  outline: string
  outlineOffset: string
  after: { content: string; opacity: string; shadow: string }
}

const look = (locator: Locator): Promise<Look> =>
  locator.evaluate((element) => {
    const s = getComputedStyle(element)
    const a = getComputedStyle(element, '::after')
    return {
      image: s.backgroundImage,
      shadow: s.boxShadow,
      color: s.color,
      background: s.backgroundColor,
      position: s.position,
      translate: s.translate,
      scale: s.scale,
      outline: `${s.outlineStyle} ${s.outlineWidth}`,
      outlineOffset: s.outlineOffset,
      after: { content: a.content, opacity: a.opacity, shadow: a.boxShadow },
    }
  })

/** How far the button's indicator is moved across (0 at rest). */
const shift = (button: Locator) =>
  button.locator('[data-action-motion]').evaluate((svg) => {
    const value = getComputedStyle(svg).translate
    return value === 'none' ? 0 : Number.parseFloat(value)
  })

/** Tabs until the element has keyboard focus (so :focus-visible applies), or fails. */
async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 80; step++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error('The button never took keyboard focus.')
}

/** The sRGB of any CSS colour (the browser reports tokens.json's oklch as such). */
const toRgb = (page: Page, colour: string) =>
  page.evaluate((value) => {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) throw new Error('No canvas')
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
    return [r, g, b] as const
  }, colour)

const luminance = ([r, g, b]: readonly number[]) => {
  const [lr = 0, lg = 0, lb = 0] = [r, g, b].map((value) => {
    const channel = (value ?? 0) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}
const contrast = (a: readonly number[], b: readonly number[]) => {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/** The first opaque background above an element: what its focus outline is drawn against. */
const backdropOf = (page: Page, locator: Locator) =>
  locator.evaluate((element) => {
    for (let node: Element | null = element.parentElement; node; node = node.parentElement) {
      const colour = getComputedStyle(node).backgroundColor
      if (colour !== 'rgba(0, 0, 0, 0)' && colour !== 'transparent') return colour
    }
    return 'rgb(255, 255, 255)'
  })

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/images/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>',
    }),
  )
})

test.afterAll(async ({ request }) => {
  test.setTimeout(30_000)
  await useStyle(request, 'off')
})

test.describe('with nothing chosen, everything is as it was', () => {
  test.beforeAll(async ({ request }) => {
    await useStyle(request, 'off')
  })

  test('the hero’s buttons: a solid fill, no shadow, no hover layer, no indicator, an outline', async ({
    page,
  }) => {
    await settled(
      page,
      '/',
      async () =>
        (await mainButton(page).count()) > 0 && (await look(mainButton(page))).image === 'none',
    )
    const main = await look(mainButton(page))
    expect(main.image).toBe('none')
    expect(main.shadow).toBe('none')
    expect(main.position).toBe('static')
    expect(main.translate).toBe('none')
    expect(main.after.content).toBe('none')
    await expect(mainButton(page).locator('svg')).toHaveCount(0)
    const second = await look(secondButton(page))
    expect(second.image).toBe('none')
    // The outline is a ring, which is a box-shadow; its fill is clear.
    expect(second.background).toBe('rgba(0, 0, 0, 0)')
    expect(second.shadow).toContain('inset')
  })

  test('the forms and the embed draw no card and keep their markup', async ({ page }) => {
    // The cache may still hold the pages from a run that left the style on.
    for (const path of ['/contact', '/newsletter']) {
      await settled(page, path, async () => (await page.locator('[data-form-card]').count()) === 0)
      await expect(page.locator('[data-form-card]')).toHaveCount(0)
    }
    await page.goto(GALLERY)
    await expect(
      page.locator('[data-gallery-section="form-section"] [data-form-card]'),
    ).toHaveCount(0)
    await expect(
      page.locator('[data-gallery-section="newsletter-signup"] [data-form-card]'),
    ).toHaveCount(0)
    const card = page.locator('main div.rounded-card.bg-surface-alt.ring-1').first()
    await settled(
      page,
      '/embed',
      async () => (await card.count()) > 0 && !(await look(card)).shadow.includes('0px 10px 15px'),
    )
    await expect(card).toBeVisible()
    // The facade draws a ring and, with no site Card depth chosen, nothing else.
    expect((await look(card)).shadow).not.toMatch(/rgba\(0, 0, 0, 0\.[1-9]/)
  })

  test('the search and contact buttons are the solid main button', async ({ page }) => {
    for (const [path, name] of [
      ['/search', 'Search'],
      ['/contact', 'Send'],
    ] as const) {
      const submit = page
        .locator('main')
        .getByRole('button', { name: new RegExp(name) })
        .first()
      await settled(page, path, async () => (await look(submit)).image === 'none')
      const style = await look(submit)
      expect(style.image).toBe('none')
      expect(style.shadow).toBe('none')
      expect(style.after.content).toBe('none')
    }
  })

  test('a site Card depth alone gives a form no wrapper, and the embed card inherits it', async ({
    page,
    request,
  }) => {
    await useStyle(request, 'off', 'card-raised')
    await expect
      .poll(
        async () => {
          await page.goto('/embed')
          const card = page.locator('main div.rounded-card.bg-surface-alt.ring-1').first()
          return (await look(card)).shadow
        },
        { timeout: 30_000 },
      )
      .toContain('0px 10px 15px')
    for (const path of ['/contact', '/newsletter']) {
      await page.goto(path)
      await expect(page.locator('[data-form-card]')).toHaveCount(0)
    }
    await useStyle(request, 'off')
  })
})

test.describe('with the style on', () => {
  test.beforeAll(async ({ request }) => {
    await useStyle(request, 'on')
  })

  test('the main button is the gradient with depth and glow; the secondary is a soft tint and never glows', async ({
    page,
  }) => {
    await settled(page, '/', styled(page))
    const main = await look(mainButton(page))
    expect(main.image).toBe(GRADIENT)
    // The text colour is the one chosen to read along the whole gradient.
    expect(main.color).toBe('rgb(255, 255, 255)')
    expect(main.shadow).toContain('0px 10px 15px -3px')
    expect(main.shadow).toMatch(/0px 0px 28px 4px/)
    expect(main.position).toBe('relative')
    expect(main.after.content).toBe('""')
    expect(main.after.opacity).toBe('0')
    const second = await look(secondButton(page))
    expect(second.image).toBe('none')
    expect(second.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(second.shadow).not.toMatch(/28px|15px/)
    expect(second.after.content).toBe('none')
  })

  // The suite runs with reduced motion on (playwright.config.ts); motion is only drawn without it.
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('hover deepens the shadow on a faded layer and lifts the button; the text never changes', async ({
      page,
    }) => {
      await settled(page, '/', styled(page))
      const rest = await look(mainButton(page))
      await mainButton(page).hover()
      await expect.poll(async () => (await look(mainButton(page))).after.opacity).toBe('1')
      const hovered = await look(mainButton(page))
      expect(hovered.translate).toBe('0px -2px')
      expect(hovered.color).toBe(rest.color)
      // Two layers: the veil over the gradient.
      expect(hovered.image.match(/linear-gradient/g)).toHaveLength(2)
      expect(hovered.after.shadow).toContain('0px 20px 40px -12px')
      // The neighbour is untouched.
      expect((await look(secondButton(page))).translate).toBe('none')
      await page.mouse.move(0, 0)
      await expect.poll(async () => (await look(mainButton(page))).after.opacity).toBe('0')
    })

    test('pressing scales the button as before and the hover layer stays', async ({ page }) => {
      await settled(page, '/', styled(page))
      await mainButton(page).hover()
      await page.mouse.down()
      await expect.poll(async () => (await look(mainButton(page))).scale).toBe('0.98')
      const pressed = await look(mainButton(page))
      expect(pressed.image.match(/linear-gradient/g)).toHaveLength(2)
      expect(pressed.color).toBe('rgb(255, 255, 255)')
      await page.mouse.up()
      await page.mouse.move(0, 0)
    })

    test('reduced motion: no hover layer, no lift, no press scale', async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: 'reduce' })
      const page = await context.newPage()
      try {
        await settled(page, '/', styled(page))
        await mainButton(page).hover()
        await page.mouse.down()
        await page.waitForTimeout(400)
        const style = await look(mainButton(page))
        expect(style.after.opacity).toBe('0')
        expect(style.translate).toBe('none')
        expect(style.scale).toBe('none')
        // The static depth and glow are still drawn.
        expect(style.shadow).toContain('0px 10px 15px -3px')
        await page.mouse.up()
      } finally {
        await context.close()
      }
    })

    test('keyboard focus keeps a 2px outline, 2px clear of the glow, that reads against its background', async ({
      page,
    }) => {
      await settled(page, '/', styled(page))
      await tabTo(page, mainButton(page))
      const focused = await look(mainButton(page))
      expect(focused.outline).toBe('solid 2px')
      expect(focused.outlineOffset).toBe('2px')
      // The hover layer fades in over a short transition: polled to its end.
      await expect.poll(async () => (await look(mainButton(page))).after.opacity).toBe('1')
      const outline = await mainButton(page).evaluate((el) => getComputedStyle(el).outlineColor)
      const against = await backdropOf(page, mainButton(page))
      expect(
        contrast(await toRgb(page, outline), await toRgb(page, against)),
      ).toBeGreaterThanOrEqual(3)
    })

    test('two neighbouring buttons with indicators: hover or focus on one never moves the other’s', async ({
      page,
    }) => {
      await settled(page, '/', styled(page))
      const [first, second] = [mainButton(page), secondButton(page)]
      await expect(first.locator('svg[aria-hidden="true"]')).toHaveCount(1)
      await expect(second.locator('svg[aria-hidden="true"]')).toHaveCount(1)
      // The names are the labels: the arrows add nothing to them.
      await expect(first).toHaveAccessibleName('About us')
      await expect(second).toHaveAccessibleName('Learn more')
      expect(await shift(first)).toBe(0)
      expect(await shift(second)).toBe(0)

      await first.hover()
      await expect.poll(() => shift(first)).toBeGreaterThan(0)
      expect(await shift(second)).toBe(0)
      await page.mouse.move(0, 0)
      await expect.poll(() => shift(first)).toBe(0)

      await second.hover()
      await expect.poll(() => shift(second)).toBeGreaterThan(0)
      expect(await shift(first)).toBe(0)
      await page.mouse.move(0, 0)
      await expect.poll(() => shift(second)).toBe(0)

      await tabTo(page, first)
      await expect.poll(() => shift(first)).toBeGreaterThan(0)
      expect(await shift(second)).toBe(0)
      await page.keyboard.press('Tab')
      await expect(second).toBeFocused()
      await expect.poll(() => shift(second)).toBeGreaterThan(0)
      await expect.poll(() => shift(first)).toBe(0)
    })
  })

  test('the home page has no WCAG 2.2 AA violations', async ({ page }) => {
    await settled(page, '/', styled(page))
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })

  for (const tone of TONES) {
    test(`a gradient main button in the ${tone} tone: readable, outlined on focus, no WCAG 2.2 AA violations`, async ({
      page,
    }) => {
      await settled(page, GALLERY, async () => {
        const button = page
          .locator(`[data-gallery-section="media-text-style-${tone}"]`)
          .getByRole('link', { name: 'Read more' })
        return (await button.evaluate((el) => getComputedStyle(el).backgroundImage)).includes(
          'linear-gradient',
        )
      })
      const section = `[data-gallery-section="media-text-style-${tone}"]`
      await expect(page.locator(`${section} section`)).toHaveAttribute('data-tone', tone)
      const button = page.locator(section).getByRole('link', { name: 'Read more' })
      expect((await look(button)).color).toBe('rgb(255, 255, 255)')
      await button.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      const outline = await button.evaluate((el) => getComputedStyle(el).outlineColor)
      const against = await backdropOf(page, button)
      expect(
        contrast(await toRgb(page, outline), await toRgb(page, against)),
      ).toBeGreaterThanOrEqual(3)
      const { violations } = await new AxeBuilder({ page })
        .include(section)
        .withTags(WCAG)
        .analyze()
      expect(
        violations.map(
          ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([])
    })
  }

  for (const tone of ['brand', 'dark', 'light'] as const) {
    test(`the ${tone} banner’s two buttons: gradient main, soft secondary, no WCAG 2.2 AA violations`, async ({
      page,
    }) => {
      await settled(page, GALLERY, async () => {
        const button = page
          .locator(`[data-gallery-section="cta-banner-${tone}"]`)
          .getByRole('link', { name: 'Get started' })
        return (await button.evaluate((el) => getComputedStyle(el).backgroundImage)).includes(
          'linear-gradient',
        )
      })
      const section = `[data-gallery-section="cta-banner-${tone}"]`
      const main = await look(page.locator(section).getByRole('link', { name: 'Get started' }))
      const second = await look(page.locator(section).getByRole('link', { name: 'Learn more' }))
      expect(main.image).toBe(GRADIENT)
      expect(second.image).toBe('none')
      // A card in the Primary colour keeps the outline: a tint of white would take its text under 4.5:1.
      if (tone === 'brand') expect(second.background).toBe('rgba(0, 0, 0, 0)')
      else expect(second.background).not.toBe('rgba(0, 0, 0, 0)')
      const { violations } = await new AxeBuilder({ page })
        .include(section)
        .withTags(WCAG)
        .analyze()
      expect(
        violations.map(
          ({ id, nodes }) =>
            `${id}: ${nodes.map((node) => `${node.target.join(' ')} ${node.any.map((check) => check.message).join(' / ')}`).join(', ')}`,
        ),
      ).toEqual([])
    })
  }

  test('the contact form draws a card with the chosen depth, and its submit button is the gradient', async ({
    page,
  }) => {
    await settled(
      page,
      '/contact',
      async () => (await page.locator('[data-form-card]').count()) > 0,
    )
    const card = page.locator('[data-form-card]')
    await expect(card).toHaveCount(1)
    const style = await look(card)
    // A depth alone: the standard tinted card, with the Raised shadow.
    expect(style.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(style.shadow).toContain('0px 10px 15px -3px')
    expect(await card.locator('form').count()).toBe(1)
    const submit = card.getByRole('button', { name: /Send/ })
    expect((await look(submit)).image).toBe(GRADIENT)
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id }) => id)).toEqual([])
  })

  test('the form still submits from inside its card', async ({ page }) => {
    await settled(
      page,
      '/contact',
      async () => (await page.locator('[data-form-card]').count()) > 0,
    )
    const card = page.locator('[data-form-card]')
    await card.getByRole('button', { name: /Send/ }).click()
    // Validation runs as before: the summary names what is missing.
    await expect(page.getByRole('alert').first()).toBeVisible()
  })

  test('a transparent newsletter card draws no shadow even with a depth chosen', async ({
    page,
  }) => {
    await settled(
      page,
      '/newsletter',
      async () => (await page.locator('[data-form-card]').count()) > 0,
    )
    const style = await look(page.locator('[data-form-card]'))
    expect(style.background).toBe('rgba(0, 0, 0, 0)')
    expect(style.shadow).not.toMatch(/20px 40px/)
  })

  test('the embed facade card takes its chosen depth and border and keeps its button and link', async ({
    page,
  }) => {
    await settled(page, '/embed', async () => {
      const card = page.locator('main div.rounded-card.bg-surface-alt').first()
      return (await look(card)).shadow.includes('0px 0px 0px 3px inset')
    })
    const card = page.locator('main div.rounded-card.bg-surface-alt').first()
    await expect(card).toBeVisible()
    // The facade is still the facade: its button and its link to the provider are where they were.
    await expect(card.getByRole('button').first()).toBeVisible()
    await expect(card.locator('a[href^="https://form.typeform.com"]')).toHaveCount(1)
    const style = await look(card)
    expect(style.shadow).toContain('0px 10px 15px')
    // A thick border is a 3px inset ring (the stale Card depth page of the test above has neither).
    expect(style.shadow).toContain('0px 0px 0px 3px inset')
  })

  test('the gallery’s forms and the embed there stay without a card while others have one', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    await expect(page.locator('[data-form-card]')).toHaveCount(0)
  })

  test('the search button is the gradient main button', async ({ page }) => {
    const submit = page.locator('main').getByRole('button', { name: 'Search' })
    await settled(page, '/search', async () =>
      (await look(submit)).image.includes('linear-gradient'),
    )
    expect((await look(submit)).image).toBe(GRADIENT)
  })
})
