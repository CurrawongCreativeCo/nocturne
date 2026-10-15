/**
 * One-off: renders Currawong's default browser icons from the brand mark.
 *
 *   node scripts/make-default-icons.mjs
 *
 * Writes src/app/icon.png (512 × 512) and src/app/apple-icon.png (180 × 180) from
 * src/assets/brand/currawong/mark-no-text.webp. Next.js file-based icons can't be WebP, so the
 * result is committed. Uses sharp, which Next.js already installs; it is not a project dependency
 * and nothing here runs at build or request time. The artwork is only cropped, scaled and placed on
 * paper (#F4EFE6); it is never redrawn.
 */
import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const SOURCE = fileURLToPath(
  new URL('../src/assets/brand/currawong/mark-no-text.webp', import.meta.url),
)
const APP = fileURLToPath(new URL('../src/app/', import.meta.url))
const PAPER = '#F4EFE6'

// The mark's bounds in the 2000 px source (measured, ignoring the stray wordmark fragments that
// the "no text" file keeps below y = 1700).
const ART = { left: 291, right: 1770, top: 264, bottom: 1697 }
const CENTRE = { x: (ART.left + ART.right) / 2, y: (ART.top + ART.bottom) / 2 }
const ART_WIDTH = ART.right - ART.left

/** The mark centred in a square on white; `fill` is how much of the square the mark's width takes. */
async function square(fill) {
  const side = Math.round(ART_WIDTH / fill)
  const pad = 400
  const canvas = 2000 + pad * 2
  // Erase the stray fragments below the mark: white over white, nothing of the mark is touched.
  const cleaned = await sharp(SOURCE)
    .composite([
      {
        input: {
          create: { width: 2000, height: 2000 - 1710, channels: 3, background: '#ffffff' },
        },
        left: 0,
        top: 1710,
      },
    ])
    .png()
    .toBuffer()
  const padded = await sharp({
    create: { width: canvas, height: canvas, channels: 3, background: '#ffffff' },
  })
    .composite([{ input: cleaned, left: pad, top: pad }])
    .png()
    .toBuffer()
  // Extracting is a separate step: sharp applies `extract` before `composite`.
  return sharp(padded)
    .extract({
      left: Math.round(pad + CENTRE.x - side / 2),
      top: Math.round(pad + CENTRE.y - side / 2),
      width: side,
      height: side,
    })
    .png()
    .toBuffer()
}

/** The artwork is opaque near-white, so multiplying it onto paper keeps the colours and turns the white into paper. */
async function onPaper(art, size) {
  const resized = await sharp(art).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 3, background: PAPER } })
    .composite([{ input: resized, blend: 'multiply' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

const files = {
  'icon.png': await onPaper(await square(0.88), 512),
  'apple-icon.png': await onPaper(await square(0.72), 180),
}
for (const [name, data] of Object.entries(files)) {
  await writeFile(`${APP}${name}`, data)
  console.log(`src/app/${name}  sha256 ${createHash('sha256').update(data).digest('hex')}`)
}
console.log('Update DEFAULT_ICON_SHA256 in scripts/launch-check/leftovers.mjs with these hashes.')
