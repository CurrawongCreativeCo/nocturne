import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Image + text's supporting block, placed (design capability contract, task 275: the slots' placement
 * part): where each layout puts the media and the extra block at phone, tablet and desktop widths,
 * measured in the browser on /media-text-placement. The layouts themselves are not under test here
 * beyond what they already promise (split-contract.spec.ts): the block sits in the media's column,
 * under the picture, and nothing leaves the window.
 */

const PAGE = '/media-text-placement'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#6366f1"/></svg>`
// Tailwind's `lg`: the width at which the two columns start.
const TWO_COLUMNS_FROM = 1024
const WIDTHS = [375, 768, 1280]

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const section = (page: Page, heading: string) =>
  page.locator('main section').filter({ has: page.getByRole('heading', { name: heading }) })

interface Box {
  x: number
  y: number
  width: number
  height: number
}

// Measured in the page, in one scroll position, so the boxes compare with each other.
const boxOf = async (locator: Locator, what: string): Promise<Box> => {
  const found = await locator.first().evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect()
    return { x, y, width, height }
  })
  if (found.width === 0 && found.height === 0) throw new Error(`${what} has no box`)
  return found
}

const bottom = (box: Box) => box.y + box.height
const right = (box: Box) => box.x + box.width

/** Within a pixel: layout rounds, and these are positions, not sizes the page promises to the pixel. */
const SLACK = 1

async function parts(page: Page, heading: string) {
  const frame = section(page, heading)
  await expect(frame).toBeVisible()
  return {
    frame: await boxOf(frame, 'the section'),
    heading: await boxOf(frame.getByRole('heading', { name: heading }), 'the heading'),
    picture: frame.locator('img').first(),
    video: await boxOf(frame.locator('[data-slot-video]'), 'the supporting video'),
  }
}

for (const width of WIDTHS) {
  test.describe(`at ${String(width)}px`, () => {
    test.use({ viewport: { width, height: 900 } })
    const wide = width >= TWO_COLUMNS_FROM

    test('nothing leaves the window on any layout', async ({ page }) => {
      await page.goto(PAGE)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })

    for (const [heading, side] of [
      ['Media on the right', 'right'],
      ['Media on the left', 'left'],
    ] as const) {
      test(`media ${side}: the video sits under the picture, in the picture's column`, async ({
        page,
      }) => {
        await page.goto(PAGE)
        const { picture: pictureLocator, video, heading: title } = await parts(page, heading)
        const picture = await boxOf(pictureLocator, 'the picture')
        expect(video.y).toBeGreaterThanOrEqual(bottom(picture) - SLACK)
        // The video block is at most 36rem wide and starts at the picture's left edge.
        expect(Math.abs(video.x - picture.x)).toBeLessThanOrEqual(SLACK)
        expect(video.width).toBeLessThanOrEqual(picture.width + SLACK)
        if (wide) {
          // Two columns: the text on one side, the picture and the video together on the other.
          if (side === 'right') expect(right(title)).toBeLessThanOrEqual(picture.x + SLACK)
          else expect(right(picture)).toBeLessThanOrEqual(title.x + SLACK)
        } else {
          // One column: the text first, then the picture and the video, as the page reads.
          expect(bottom(title)).toBeLessThanOrEqual(picture.y + SLACK)
        }
      })
    }

    test('stacked: the picture and the video sit above the text, in one column', async ({
      page,
    }) => {
      await page.goto(PAGE)
      const {
        picture: pictureLocator,
        video,
        heading: title,
      } = await parts(page, 'Media above the text')
      const picture = await boxOf(pictureLocator, 'the picture')
      expect(video.y).toBeGreaterThanOrEqual(bottom(picture) - SLACK)
      expect(bottom(video)).toBeLessThanOrEqual(title.y + SLACK)
      // Centred under the picture, never wider than it.
      expect(video.x).toBeGreaterThanOrEqual(picture.x - SLACK)
      expect(right(video)).toBeLessThanOrEqual(right(picture) + SLACK)
    })

    test('text over media: the video is in the text, under the buttons, over the picture', async ({
      page,
    }) => {
      await page.goto(PAGE)
      const heading = 'Text over media'
      const { frame, video, picture: pictureLocator } = await parts(page, heading)
      const picture = await boxOf(pictureLocator, 'the picture')
      const button = await boxOf(
        section(page, heading).getByRole('link', { name: 'Read more' }),
        'the button',
      )
      expect(video.y).toBeGreaterThanOrEqual(bottom(button) - SLACK)
      // The picture is the section's background: the video is drawn over it, inside the section.
      expect(video.x).toBeGreaterThanOrEqual(picture.x - SLACK)
      expect(right(video)).toBeLessThanOrEqual(right(picture) + SLACK)
      expect(bottom(video)).toBeLessThanOrEqual(bottom(frame) + SLACK)
    })

    test('no picture: the video is the media, in its own column on a wide screen', async ({
      page,
    }) => {
      await page.goto(PAGE)
      const { video, heading: title } = await parts(page, 'No picture')
      expect(video.width).toBeGreaterThan(0)
      if (wide) expect(right(title)).toBeLessThanOrEqual(video.x + SLACK)
      else expect(bottom(title)).toBeLessThanOrEqual(video.y + SLACK)
    })
  })
}
