import type { CSSProperties } from 'react'

import { CORNER_PX, type FrameShape } from '@/lib/sanity/image-frame-geometry'
import {
  boxAt,
  coverBox,
  defaultArea,
  visibleArea,
  type AssetSize,
  type Crop,
  type FramingState,
  type Hotspot,
  type Rect,
} from '@/lib/sanity/image-framing'

/** The shape fills this much of the stage's longer side; the rest shows the picture dimmed. */
export const SHAPE_SHARE_PCT = 80

/**
 * The picture's box on the square stage, as percentages of the stage. A decorative frame sits
 * outside it (the picture is inset), so the box shrinks to leave room for the frame's artwork.
 */
export function shapeBox(aspect: number, insetPct = 0, sharePct = SHAPE_SHARE_PCT) {
  const share = sharePct * (1 - (insetPct * 2) / 100)
  const width = aspect >= 1 ? share : share * aspect
  const height = aspect >= 1 ? share / aspect : share
  return { width, height, left: (100 - width) / 2, top: (100 - height) / 2 }
}

export function shapeBoxStyle(
  aspect: number,
  insetPct = 0,
  sharePct = SHAPE_SHARE_PCT,
): CSSProperties {
  const box = shapeBox(aspect, insetPct, sharePct)
  return {
    position: 'absolute',
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  }
}

const tenth = (value: number) => Math.round(value * 10) / 10

/**
 * The corner as the page draws it, kept in proportion: percentages of the picture's drawn size. A
 * percentage radius is a share of the width across and of the height down, so a fixed corner (16px
 * on the page) gets its own height share when the shape is not square, or it would be drawn as an
 * ellipse. An arch's top is a half circle as wide as the picture (`rounded-t-full`), so its height
 * share is half the width, as a share of the height.
 */
export function cornerRadius(shape: Pick<FrameShape, 'corner' | 'drawnPx' | 'aspect'>): string {
  switch (shape.corner) {
    case 'circle':
      return '50%'
    case 'arch': {
      const down = tenth(50 * shape.aspect)
      return `50% 50% 0 0 / ${down}% ${down}% 0 0`
    }
    case 'none':
      return '0'
    default: {
      const px = CORNER_PX[shape.corner === 'cardTop' ? 'card' : shape.corner]
      const across = tenth((px / shape.drawnPx) * 100)
      const down = tenth((px / shape.drawnPx) * 100 * shape.aspect)
      if (shape.corner === 'cardTop') return `${across}% ${across}% 0 0 / ${down}% ${down}% 0 0`
      return across === down ? `${across}%` : `${across}% / ${down}%`
    }
  }
}

/**
 * Where the whole picture sits inside the shape's box so the visible area fills it: the picture at
 * zoom 1 (cover) is sized once, then moved and scaled with a transform alone (from the top-left).
 */
export function pictureStyle(
  asset: AssetSize,
  aspect: number,
  { zoom, centre }: FramingState,
): CSSProperties {
  const cover = coverBox(asset, aspect)
  const box = boxAt(asset, aspect, zoom)
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    width: `${100 / cover.width}%`,
    height: `${100 / cover.height}%`,
    maxWidth: 'none',
    transformOrigin: '0 0',
    transform: `translate(${-(centre.x - box.width / 2) * zoom * 100}%, ${-(centre.y - box.height / 2) * zoom * 100}%) scale(${zoom})`,
    userSelect: 'none',
    pointerEvents: 'none',
  }
}

/** The framing that would be stored: a crop and hotspot, or nothing (the automatic fit). */
export interface PendingFraming {
  crop?: Partial<Crop> | null
  hotspot?: Partial<Hotspot> | null
}

/** One other shape the picture is drawn in, placed on the stage. */
export interface AlsoShown {
  label: string
  /** Where it is on the stage, as percentages of the stage. */
  left: number
  top: number
  width: number
  height: number
  /** The part of the upload that placement shows, in source pixels: the renderer's own answer. */
  area: Rect
}

/** The stage keeps this much of each side clear of the outlines (percent), so the line is never cut off. */
const STAGE_MARGIN_PCT = 2

/**
 * Where the other shapes the picture is drawn in fall on the stage, and how large the main shape may be so that all
 * of them fit. Each shape shows what its renderer shows (`visibleArea`, the one answer the page and the editor share)
 * for the framing that would be stored, so it is not inscribed in the main shape: a placement of another ratio can show
 * more of a taller picture, or cut a tall saved crop differently, than the main shape's window does. The area is mapped
 * through the main window (the part of the picture inside the main shape), so it can reach into the dimmed picture
 * around it; the main shape shrinks, and with it everything, when an outline would otherwise leave the stage.
 */
export function alsoShownLayout({
  asset,
  main,
  state,
  pending,
  others,
}: {
  asset: AssetSize
  main: FrameShape
  state: FramingState
  /** What Apply would store now (or what is stored, while nothing has changed); undefined is nothing stored. */
  pending: PendingFraming | undefined
  others: readonly FrameShape[]
}): { sharePct: number; outlines: AlsoShown[] } {
  const window = boxAt(asset, main.aspect, state.zoom)
  const left = state.centre.x - window.width / 2
  const top = state.centre.y - window.height / 2
  const rel = others.map((other) => {
    const area =
      visibleArea(other, { asset, crop: pending?.crop, hotspot: pending?.hotspot }) ??
      defaultArea(other, asset)
    return {
      other,
      area,
      // In units of the main box: 0 to 1 is inside it.
      x: (area.left / asset.width - left) / window.width,
      y: (area.top / asset.height - top) / window.height,
      w: area.width / asset.width / window.width,
      h: area.height / asset.height / window.height,
    }
  })
  const fullBox = shapeBox(main.aspect, main.insetPct)
  const reach = (edge: number) => Math.abs(edge - 0.5)
  const extentX = Math.max(0.5, ...rel.flatMap((o) => [reach(o.x), reach(o.x + o.w)]))
  const extentY = Math.max(0.5, ...rel.flatMap((o) => [reach(o.y), reach(o.y + o.h)]))
  const room = 50 - STAGE_MARGIN_PCT
  const fit = Math.min(1, room / (fullBox.width * extentX), room / (fullBox.height * extentY))
  const sharePct = SHAPE_SHARE_PCT * fit
  const box = shapeBox(main.aspect, main.insetPct, sharePct)
  return {
    sharePct,
    outlines: rel.map(({ other, area, x, y, w, h }) => ({
      label: other.label,
      left: box.left + x * box.width,
      top: box.top + y * box.height,
      width: w * box.width,
      height: h * box.height,
      area,
    })),
  }
}

/** The stage's description for assistive technology. */
export const STAGE_INSTRUCTIONS =
  'Arrow keys move the picture. Shift with an arrow key moves it further. Plus and minus zoom. 0 resets.'
