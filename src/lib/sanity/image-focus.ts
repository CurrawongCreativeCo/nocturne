import type { SanityImageCrop, SanityImageHotspot } from '@/types/sanity.types'

import { framingMode, type AssetSize, type Hotspot, type Rect } from './image-framing'

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
export function hotspotObjectPosition(
  image: FocusSource | null | undefined,
  /** The part of the upload actually served (explicit rect), when it is not the crop: the hotspot is measured against it. */
  served?: { asset: AssetSize; area: Rect },
): string | undefined {
  const hotspot = image?.hotspot
  if (!hotspot) return undefined

  if (served) {
    const { asset, area } = served
    return `${percent((hotspot.x * asset.width - area.left) / area.width)} ${percent((hotspot.y * asset.height - area.top) / area.height)}`
  }

  const left = image.crop?.left ?? 0
  const right = image.crop?.right ?? 0
  const top = image.crop?.top ?? 0
  const bottom = image.crop?.bottom ?? 0
  const width = 1 - left - right
  const height = 1 - top - bottom
  if (width <= 0 || height <= 0) return undefined

  return `${percent((hotspot.x - left) / width)} ${percent((hotspot.y - top) / height)}`
}

/**
 * The position a covering background (one with no fixed shape, so no crop to place) takes from the hotspot:
 * "Focus mode" (task 177). Undefined, so centred, when no hotspot is stored. It asks `framingMode`, as the
 * editor's Focus dialog does, and is `hotspotObjectPosition` for what it returns.
 */
export function coverPosition(image: FocusSource | null | undefined): string | undefined {
  return framingMode(image, 'cover') === 'focus' ? hotspotObjectPosition(image) : undefined
}

/** A point on the picture as the page serves it, each side 0 to 1 (0.5, 0.5 is the centre). */
export interface Focus {
  x: number
  y: number
}

/** The frames Focus mode previews a background in: indicative, as a section's height follows its text. */
export interface FocusFrame {
  label: string
  /** Width over height. */
  aspect: number
  /** The width the frame stands for, in CSS pixels. */
  widthPx: number
}

export const FOCUS_FRAMES: readonly FocusFrame[] = [
  { label: 'Phone', aspect: 0.6, widthPx: 390 },
  { label: 'Tablet', aspect: 1.25, widthPx: 768 },
  { label: 'Desktop', aspect: 2.2, widthPx: 1440 },
]

/** The size a Focus hotspot gets when none is stored: the position is all a background reads. */
const DEFAULT_FOCUS_SIZE = 0.3

/**
 * The stored hotspot as a point on the picture the page serves (the CDN serves it cut to its crop), or
 * undefined when none is stored. The inverse of `hotspotFromFocus`; `hotspotObjectPosition` is this point as a percentage.
 */
export function focusOf(image: FocusSource | null | undefined): Focus | undefined {
  const hotspot = image?.hotspot
  if (!hotspot) return undefined
  const left = image.crop?.left ?? 0
  const top = image.crop?.top ?? 0
  const width = 1 - left - (image.crop?.right ?? 0)
  const height = 1 - top - (image.crop?.bottom ?? 0)
  if (width <= 0 || height <= 0) return undefined
  return { x: clamp((hotspot.x - left) / width), y: clamp((hotspot.y - top) / height) }
}

/**
 * The hotspot that puts the focus where the editor chose, measured on the whole upload as Sanity stores it. Only the
 * hotspot is written: the crop, the asset and the alt text are never touched, and a hotspot already stored keeps its size.
 */
export function hotspotFromFocus(
  image: FocusSource | null | undefined,
  focus: Focus,
): Pick<Hotspot, 'x' | 'y' | 'width' | 'height'> {
  const left = image?.crop?.left ?? 0
  const top = image?.crop?.top ?? 0
  const width = 1 - left - (image?.crop?.right ?? 0)
  const height = 1 - top - (image?.crop?.bottom ?? 0)
  const round = (value: number) => Math.round(value * 10000) / 10000
  return {
    x: round(left + clamp(focus.x) * width),
    y: round(top + clamp(focus.y) * height),
    width: image?.hotspot?.width ?? DEFAULT_FOCUS_SIZE,
    height: image?.hotspot?.height ?? DEFAULT_FOCUS_SIZE,
  }
}

/** One keyboard step of the focus point, as a fraction of the picture: 2%, or 10% with Shift. */
export function stepFocus(
  focus: Focus,
  direction: 'up' | 'down' | 'left' | 'right',
  far = false,
): Focus {
  const step = far ? 0.1 : 0.02
  const dx = direction === 'left' ? -step : direction === 'right' ? step : 0
  const dy = direction === 'up' ? -step : direction === 'down' ? step : 0
  return { x: clamp(focus.x + dx), y: clamp(focus.y + dy) }
}
