import type { Locator, Page } from '@playwright/test'

/**
 * What the picture-depth browser specs (Team, Events Featured) share: the card's measured geometry, and a reading
 * of whether the card's edge shows a shadow that was cut off. Both are measured from the rendered page.
 */

export interface Geometry {
  card: { w: number; h: number }
  slot: { h: number }
  img: { x: number; y: number; w: number; h: number }
  textTop: number
}

/** The card's outer size, its portrait slot, the portrait and where the text starts: all relative to the card. */
export const geometry = (card: Locator): Promise<Geometry> =>
  card.evaluate((el) => {
    const need = (node: Element | null): Element => {
      if (!node) throw new Error('the card is missing a part')
      return node
    }
    const rect = (node: Element | null) => need(node).getBoundingClientRect()
    const c = rect(el)
    const slot = rect(el.firstElementChild)
    const img = rect(el.querySelector('img'))
    const text = rect(el.querySelector('h2, h3, h4'))
    return {
      card: { w: c.width, h: c.height },
      slot: { h: slot.height },
      img: { x: img.x - c.x, y: img.y - c.y, w: img.width, h: img.height },
      textTop: text.top - c.top,
    }
  })

/**
 * Whether the card's edge shows a shadow that was cut off, read from a screenshot of the card. It compares how
 * tinted the pixels just inside the left, right and top edges are, beside the picture, with how tinted the
 * strongest part of the shadow is (just under the picture). A shadow that has faded out before the edge is a
 * small fraction of that; one the card cuts off is about as strong as the shadow itself. Returns both.
 */
export const edgeReading = async (page: Page, card: Locator) => {
  // The site's sticky header is drawn over whatever scrolls under it, and a card nearly as tall as the screen
  // always has its top rows under it: a screenshot would read the header's frosted overlay as the card's own
  // shadow. So fixed and sticky elements outside the card are hidden for the screenshot, and put back after.
  await card.evaluate((el) => {
    el.scrollIntoView({ block: 'center' })
    const hidden: HTMLElement[] = []
    for (const node of document.body.querySelectorAll<HTMLElement>('*')) {
      const position = getComputedStyle(node).position
      if (
        (position === 'fixed' || position === 'sticky') &&
        !el.contains(node) &&
        !node.contains(el)
      ) {
        node.dataset.pictureDepthHidden = node.style.visibility
        node.style.visibility = 'hidden'
        hidden.push(node)
      }
    }
  })
  await card.page().waitForTimeout(100)
  const png = (await card.screenshot()).toString('base64')
  await card.page().evaluate(() => {
    for (const node of document.querySelectorAll<HTMLElement>('[data-picture-depth-hidden]')) {
      node.style.visibility = node.dataset.pictureDepthHidden ?? ''
      delete node.dataset.pictureDepthHidden
    }
  })
  const box = await geometry(card)
  return page.evaluate(
    async ([data, img]) => {
      const image = new Image()
      image.src = `data:image/png;base64,${data}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no canvas')
      ctx.drawImage(image, 0, 0)
      const scale = image.width / (img.cardWidth || image.width)
      const at = (x: number, y: number) => [
        ...ctx.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data.slice(0, 3),
      ]
      // The card's own background: the commonest colour in a band along its bottom, where there is mostly padding.
      const counts = new Map<string, number[]>()
      for (let x = img.cardWidth * 0.1; x <= img.cardWidth * 0.9; x += 7) {
        for (let y = img.cardHeight - 14; y <= img.cardHeight - 4; y += 5) {
          const rgb = at(x, y)
          const key = rgb.join(',')
          counts.set(key, [...rgb, (counts.get(key)?.[3] ?? 0) + 1])
        }
      }
      const background = [...counts.values()].sort((a, b) => (b[3] ?? 0) - (a[3] ?? 0))[0] ?? [
        255, 255, 255, 0,
      ]
      const diff = (x: number, y: number) =>
        Math.max(...at(x, y).map((value, i) => Math.abs(value - (background[i] ?? 0))))
      // The strongest of the shadow: just below the picture, along its middle.
      let strongest = 0
      for (let dy = 1; dy <= 8; dy++) {
        for (let x = img.x + img.w * 0.3; x <= img.x + img.w * 0.7; x += 6) {
          strongest = Math.max(strongest, diff(x, img.y + img.h + dy))
        }
      }
      // The edges, beside the picture, in the first pixel inside the card's 1px ring. 8/255 (about 3%) is the
      // tint the room for each depth was measured to (depth-options.ts), the same as the ring's own.
      let edge = 0
      let where = ''
      const note = (value: number, label: string) => {
        if (value > edge) {
          edge = value
          where = label
        }
      }
      for (let y = img.y + 8; y <= img.y + img.h - 8; y += 4) {
        note(diff(1, y), `left, y=${Math.round(y)}`)
        note(diff(img.cardWidth - 2, y), `right, y=${Math.round(y)}`)
      }
      for (let x = img.x + 8; x <= img.x + img.w - 8; x += 4)
        note(diff(x, 1), `top, x=${Math.round(x)}`)
      return { strongest, edge, where }
    },
    [
      png,
      {
        x: box.img.x,
        y: box.img.y,
        w: box.img.w,
        h: box.img.h,
        cardWidth: box.card.w,
        cardHeight: box.card.h,
      },
    ] as const,
  )
}
