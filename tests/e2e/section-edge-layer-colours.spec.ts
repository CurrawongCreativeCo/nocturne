import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'
import {
  TOLERANCE,
  expectNear,
  frameOf,
  near,
  part,
  roleIn,
  section,
  srgb,
} from './section-edge-pixels'
import {
  BELOW_OPACITY,
  LAYERED_PRESETS,
  SECOND_OPACITY,
  opacityOf,
} from '../../src/components/ui/edge-presets'

/**
 * Per-layer colours and strengths in a real browser (task 151, Slice 8). `/edge-layer-colours` puts each
 * generated shape beside an identical one with nothing set, over dark, light and Brand followers. What is read
 * is what the browser computes, so a colour stored as a role is checked as the colour the page resolves it to,
 * and nothing is compared as text: computed fills may be oklch(), so every colour is painted onto a canvas and
 * read back as sRGB (section-edge-pixels.ts), and compared within the screenshot tolerance.
 *
 * - an unset section draws the recipe's roles at the preset's own opacities;
 * - a colour changes only its layer's fill, a strength only its layer's fill-opacity, and the rest stay put;
 * - a layer above reads the roles of the section it is in; the layer below those of the section that follows
 *   (inverse and Brand remap the roles, alt leaves the page's own);
 * - what is stored for a layer a shape does not draw is kept and not drawn;
 * - the cut and every layer's path are the same with and without overrides.
 *
 * Reads computed styles only, so it needs no pixel sampling and runs at every size.
 */

const STILL = LAYERED_PRESETS['still-water']
const LAGOON = LAYERED_PRESETS.lagoon
const REEF = LAYERED_PRESETS.reef

test.beforeEach(async ({ page }) => {
  await page.goto('/edge-layer-colours')
})

/** A part's frame element: its roles are the ones the part's own colour resolves from. */
const box = (page: Page, id: string, name: string): Locator =>
  frameOf(page, id).locator(`[data-edge-part="${name}"]`)

const fillOf = (page: Page, id: string, name: string) => srgb(part(page, id, name), 'fill')
const opacityIn = (page: Page, id: string, name: string) =>
  part(page, id, name).evaluate((el) => Number(getComputedStyle(el).fillOpacity))
const pathOf = (page: Page, id: string, name: string) => part(page, id, name).getAttribute('d')
const maskOf = (page: Page, id: string) =>
  frameOf(page, id).evaluate((el) => el.style.getPropertyValue('--edge-mask'))
const names = (page: Page, id: string) =>
  frameOf(page, id)
    .locator('[data-edge-part]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-edge-part')))

/** The role as it resolves in a given section: a probe there takes it as its text colour. */
const roleOf = (page: Page, id: string, role: string) =>
  roleIn(section(page, id), `--color-${role}`)

test.describe('nothing set', () => {
  test('draws the recipe’s roles at the preset’s own opacities, each layer in the colours of where it is drawn', async ({
    page,
  }) => {
    for (const [id, follower, preset, tint] of [
      ['lc-reef-unset', 'lc-reef-unset-f', REEF, REEF.recipes.tint],
      ['lc-still-unset', 'lc-still-unset-f', STILL, STILL.recipes.tint],
      ['lc-lagoon-unset', 'lc-lagoon-unset-f', LAGOON, LAGOON.recipes.tint],
    ] as const) {
      const base = opacityOf(preset, 'standard')
      expectNear(await fillOf(page, id, 'over-1'), await roleOf(page, id, tint.over), `${id} first`)
      expect(await opacityIn(page, id, 'over-1')).toBeCloseTo(base, 5)
      if (preset.uppers === 2) {
        expectNear(
          await fillOf(page, id, 'over-2'),
          await roleOf(page, id, tint.over2 ?? tint.over),
          `${id} second`,
        )
        expect(await opacityIn(page, id, 'over-2')).toBeCloseTo(base * SECOND_OPACITY, 5)
      }
      if (preset.layerBelow !== 'never') {
        expectNear(
          await fillOf(page, id, 'under-1'),
          await roleOf(page, follower, tint.under),
          `${id} below`,
        )
        expect(await opacityIn(page, id, 'under-1')).toBeCloseTo(base * BELOW_OPACITY, 5)
      }
    }
  })
})

test.describe('independent overrides', () => {
  test('a colour changes only its layer’s fill, and a strength only its layer’s opacity', async ({
    page,
  }) => {
    const id = 'lc-reef'
    const base = opacityOf(REEF, 'standard')
    // The first layer: a colour only (Text); its opacity is the recipe's.
    expectNear(
      await fillOf(page, id, 'over-1'),
      await roleOf(page, id, 'ink'),
      'first layer colour',
    )
    expect(await opacityIn(page, id, 'over-1')).toBeCloseTo(base, 5)
    // The second: a strength only (Light); its colour is the recipe's.
    expectNear(
      await fillOf(page, id, 'over-2'),
      await roleOf(page, 'lc-reef-unset', REEF.recipes.tint.over2 ?? REEF.recipes.tint.over),
      'second layer colour',
    )
    expect(await opacityIn(page, id, 'over-2')).toBeCloseTo(
      opacityOf(REEF, 'light') * SECOND_OPACITY,
      5,
    )
    // Below: both. Strong, in Primary as the dark follower reads it.
    expect(await opacityIn(page, id, 'under-1')).toBeCloseTo(
      opacityOf(REEF, 'strong') * BELOW_OPACITY,
      5,
    )
    // And the unset section beside it is untouched.
    expect(await opacityIn(page, 'lc-reef-unset', 'over-2')).toBeCloseTo(base * SECOND_OPACITY, 5)
  })

  test('a strength overrides the shared one for its layer; the fill it drew is not the unset one', async ({
    page,
  }) => {
    const set = await fillOf(page, 'lc-still', 'over-1')
    const unset = await fillOf(page, 'lc-still-unset', 'over-1')
    expect(near(set, unset, 2 * TOLERANCE), 'Highlight is not the recipe’s Primary').toBe(false)
    expectNear(set, await roleOf(page, 'lc-still', 'highlight'), 'Highlight')
    expect(await opacityIn(page, 'lc-still', 'over-1')).toBeCloseTo(opacityOf(STILL, 'strong'), 5)
    expect(await opacityIn(page, 'lc-still', 'under-1')).toBeCloseTo(
      opacityOf(STILL, 'light') * BELOW_OPACITY,
      5,
    )
  })

  test('Lagoon’s second layer takes its own colour and strength, and its first layer stays the recipe', async ({
    page,
  }) => {
    expectNear(
      await fillOf(page, 'lc-lagoon', 'over-2'),
      await roleOf(page, 'lc-lagoon', 'highlight'),
      'second layer',
    )
    expect(await opacityIn(page, 'lc-lagoon', 'over-2')).toBeCloseTo(
      opacityOf(LAGOON, 'strong') * SECOND_OPACITY,
      5,
    )
    expectNear(
      await fillOf(page, 'lc-lagoon', 'over-1'),
      await fillOf(page, 'lc-lagoon-unset', 'over-1'),
      'first layer',
    )
    expect(await opacityIn(page, 'lc-lagoon', 'over-1')).toBeCloseTo(
      await opacityIn(page, 'lc-lagoon-unset', 'over-1'),
      6,
    )
  })
})

test.describe('whose colours a layer reads', () => {
  test('the layer below takes the roles of the section that follows: inverse and Brand remap them, alt leaves the page’s own', async ({
    page,
  }) => {
    // The same override (Primary, below) over a dark, a light and a Brand follower.
    const fills: Record<string, number[]> = {}
    for (const [id, follower] of [
      ['lc-reef', 'lc-reef-f'],
      ['lc-reef-light', 'lc-reef-light-f'],
      ['lc-reef-brand', 'lc-reef-brand-f'],
    ] as const) {
      fills[id] = await fillOf(page, id, 'under-1')
      expectNear(fills[id], await roleOf(page, follower, 'accent'), `${id} below`)
    }
    // The three followers do not read Primary alike, so the remap is something the page really does.
    const [dark, light, brand] = [fills['lc-reef'], fills['lc-reef-light'], fills['lc-reef-brand']]
    expect(near(dark, light ?? [], 2 * TOLERANCE), 'inverse remaps Primary').toBe(false)
    expect(near(brand, light ?? [], 2 * TOLERANCE), 'Brand remaps Primary').toBe(false)
    expect(near(dark, brand ?? [], 2 * TOLERANCE), 'inverse and Brand differ').toBe(false)
    // …and an alt follower leaves the page's own Primary.
    expectNear(light, await roleIn(page.locator('main'), '--color-accent'), 'the page’s Primary')
  })

  test('a layer above reads the roles of the section it is in, and the frame’s part is not where the layer below is read', async ({
    page,
  }) => {
    // Lagoon sits in an inverse section: Text over it is the inverse text colour, not the page's.
    expectNear(
      await fillOf(page, 'lc-lagoon-unset', 'over-2'),
      await roleIn(box(page, 'lc-lagoon-unset', 'over-2'), '--color-ink'),
      'inside the section',
    )
    expect((await names(page, 'lc-reef')).sort()).toEqual(['over-1', 'over-2', 'under-1'])
  })
})

test.describe('layers a shape does not draw', () => {
  test('keep what is stored and draw nothing for it', async ({ page }) => {
    // Still water without the switch on: one layer, whatever is stored for a second above and a layer below.
    expect(await names(page, 'lc-still-stale')).toEqual(['over-1'])
    expectNear(
      await fillOf(page, 'lc-still-stale', 'over-1'),
      await fillOf(page, 'lc-still-unset', 'over-1'),
      'the first layer is the recipe',
    )
    expect(await opacityIn(page, 'lc-still-stale', 'over-1')).toBeCloseTo(
      opacityOf(STILL, 'standard'),
      5,
    )
    // Lagoon draws no layer below, whatever is stored.
    expect(await names(page, 'lc-lagoon')).toEqual(['over-1', 'over-2'])
  })
})

test.describe('geometry', () => {
  test('is the same with and without overrides: the cut and every layer’s path', async ({
    page,
  }) => {
    for (const [set, unset, parts] of [
      ['lc-reef', 'lc-reef-unset', ['over-1', 'over-2', 'under-1']],
      ['lc-still', 'lc-still-unset', ['over-1', 'under-1']],
      ['lc-lagoon', 'lc-lagoon-unset', ['over-1', 'over-2']],
      ['lc-still-stale', 'lc-still-unset', ['over-1']],
    ] as const) {
      expect(await maskOf(page, set), `${set} cut`).toBe(await maskOf(page, unset))
      for (const name of parts)
        expect(await pathOf(page, set, name), `${set} ${name}`).toBe(
          await pathOf(page, unset, name),
        )
    }
  })
})
