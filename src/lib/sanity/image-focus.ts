import type { SanityImageCrop, SanityImageHotspot } from '@/types/sanity.types'

interface FocusSource {
  crop?: SanityImageCrop | null
  hotspot?: SanityImageHotspot | null
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const percent = (value: number) => `${Math.round(clamp(value) * 1000) / 10}%`

/**
 * The CSS `object-position` that keeps an image's hotspot in view when `object-cover` crops it, or
 * undefined when the editor set none (the picture stays centred). The CDN serves the picture
 * already cut to the editor's crop, so the hotspot, which is measured on the whole upload, is
 * re-measured against what is left of it.
 */
export function hotspotObjectPosition(image: FocusSource | null | undefined): string | undefined {
  const hotspot = image?.hotspot
  if (!hotspot) return undefined

  const left = image.crop?.left ?? 0
  const right = image.crop?.right ?? 0
  const top = image.crop?.top ?? 0
  const bottom = image.crop?.bottom ?? 0
  const width = 1 - left - right
  const height = 1 - top - bottom
  if (width <= 0 || height <= 0) return undefined

  return `${percent((hotspot.x - left) / width)} ${percent((hotspot.y - top) / height)}`
}
