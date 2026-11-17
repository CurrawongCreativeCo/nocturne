import type { CSSProperties } from 'react'

import { CORNER_PX, type FrameShape } from '@/lib/sanity/image-frame-geometry'
import { boxAt, coverBox, type AssetSize, type FramingState } from '@/lib/sanity/image-framing'

/** The shape fills this much of the stage's longer side; the rest shows the picture dimmed. */
export const SHAPE_SHARE_PCT = 80

/**
 * The picture's box on the square stage, as percentages of the stage. A decorative frame sits
 * outside it (the picture is inset), so the box shrinks to leave room for the frame's artwork.
 */
export function shapeBox(aspect: number, insetPct = 0) {
  const share = SHAPE_SHARE_PCT * (1 - (insetPct * 2) / 100)
  const width = aspect >= 1 ? share : share * aspect
  const height = aspect >= 1 ? share / aspect : share
  return { width, height, left: (100 - width) / 2, top: (100 - height) / 2 }
}

export function shapeBoxStyle(aspect: number, insetPct = 0): CSSProperties {
  const box = shapeBox(aspect, insetPct)
  return {
    position: 'absolute',
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  }
}

/**
 * The corner as the page draws it, kept in proportion: percentages of the picture's drawn size. An
 * arch's top is a half circle as wide as the picture (`rounded-t-full`), so its height share
 * depends on the ratio: half the width, as a share of the height.
 */
export function cornerRadius(shape: Pick<FrameShape, 'corner' | 'drawnPx' | 'aspect'>): string {
  switch (shape.corner) {
    case 'circle':
      return '50%'
    case 'arch': {
      const down = Math.round(50 * shape.aspect * 10) / 10
      return `50% 50% 0 0 / ${down}% ${down}% 0 0`
    }
    case 'none':
      return '0'
    default:
      return `${Math.round((CORNER_PX[shape.corner] / shape.drawnPx) * 1000) / 10}%`
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

/**
 * Another shape the same picture is drawn in, as an outline inside the main shape's box: the
 * largest box of that ratio around the same centre, as percentages of the main box.
 */
export function alsoShownOutline(main: FrameShape, other: FrameShape) {
  const wider = other.aspect > main.aspect
  return {
    width: wider ? 100 : (other.aspect / main.aspect) * 100,
    height: wider ? (main.aspect / other.aspect) * 100 : 100,
  }
}

/** The stage's description for assistive technology. */
export const STAGE_INSTRUCTIONS =
  'Arrow keys move the picture. Shift with an arrow key moves it further. Plus and minus zoom. 0 resets.'
