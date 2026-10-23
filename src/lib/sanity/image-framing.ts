/**
 * The maths behind "Adjust picture": a framing is Sanity's own `crop` and `hotspot` on an image
 * field. The editor works in zoom and a centre point; this file converts to and from the stored
 * values, and says what the site draws for them. Plain TypeScript with no React and no Studio
 * imports, so the editor's preview and the renderer call the same functions and can't disagree.
 *
 * Coordinates: `centre`, `crop` and `hotspot` are fractions of the whole upload (0 to 1). A `Rect`
 * is in source pixels. `aspect` is the destination's width ÷ height.
 *
 * Zoom 1 is "cover": the largest box of the destination's ratio that fits inside the picture, so
 * the shape is always full. The stored crop box is the visible area; the hotspot is that box's
 * centre and size, which makes @sanity/image-url serve exactly the box when the ratios match.
 */

export interface AssetSize {
  width: number
  height: number
}

export interface Crop {
  top: number
  bottom: number
  left: number
  right: number
}

export interface Hotspot {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** A box in source pixels. */
export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** What the editor changes: a zoom of at least 1 and the visible box's centre. */
export interface FramingState {
  zoom: number
  centre: Point
}

/** The values Sanity stores on an image field, with their `_type`s. */
export interface StoredFraming {
  crop: Crop & { _type: 'sanity.imageCrop' }
  hotspot: Hotspot & { _type: 'sanity.imageHotspot' }
}

/** The shape a picture is drawn in. `defaultAspect` is what the site asks the CDN for when nothing is stored. */
export interface Placement {
  aspect: number
  /** The ratio the site serves today with no framing (a centred cut), when it isn't `aspect`. */
  defaultAspect?: number
}

/** Everything the editor's moves need to know about the picture and its shape. */
export interface FramingContext {
  asset: AssetSize
  aspect: number
  /** The largest zoom allowed (see `maxZoom`). */
  maxZoom: number
}

export const MAX_ZOOM_CAP = 4
/** Below this many source pixels per drawn pixel, a picture looks soft on a high-density screen. */
export const SOFT_DENSITY = 2
export const STEP_SMALL = 0.01
export const STEP_LARGE = 0.1
export const STEP_ZOOM = 0.05

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** Six places: enough for a pixel on any upload, and no 1e-17 noise in stored values. */
const tidy = (value: number) => Math.round(value * 1e6) / 1e6 || 0

/** The upload's pixel size, read from its asset id (`image-<hash>-<w>x<h>-<ext>`). */
export function assetSizeFromId(assetId: string | null | undefined): AssetSize | undefined {
  const match = /^image-[^-]+-(\d+)x(\d+)-[a-z0-9]+$/i.exec(assetId ?? '')
  const width = Number(match?.[1])
  const height = Number(match?.[2])
  return width > 0 && height > 0 ? { width, height } : undefined
}

/** The visible box at zoom 1, as fractions of the whole upload. */
export function coverBox(asset: AssetSize, aspect: number): { width: number; height: number } {
  return asset.width / asset.height > aspect
    ? { width: (asset.height * aspect) / asset.width, height: 1 }
    : { width: 1, height: asset.width / aspect / asset.height }
}

/** The visible box at a zoom, as fractions of the whole upload. */
export function boxAt(asset: AssetSize, aspect: number, zoom: number) {
  const cover = coverBox(asset, aspect)
  return { width: cover.width / zoom, height: cover.height / zoom }
}

/**
 * The largest zoom: where the box's source pixels fall to the destination's largest drawn width at
 * 1x, never more than 400% and never less than 1. Without a drawn width, just the cap.
 */
export function maxZoom(asset: AssetSize, aspect: number, drawnPx?: number): number {
  if (!drawnPx || drawnPx <= 0) return MAX_ZOOM_CAP
  const coverPx = coverBox(asset, aspect).width * asset.width
  return clamp(Math.floor((coverPx / drawnPx) * 100) / 100, 1, MAX_ZOOM_CAP)
}

/** Whether the box at this zoom has fewer than 2 source pixels per drawn pixel. */
export function isSoft(asset: AssetSize, aspect: number, zoom: number, drawnPx?: number): boolean {
  if (!drawnPx || drawnPx <= 0) return false
  return (coverBox(asset, aspect).width * asset.width) / zoom < SOFT_DENSITY * drawnPx
}

/** Keeps the zoom in range and the box inside the picture. */
export function normalise(state: FramingState, context: FramingContext): FramingState {
  const zoom = clamp(state.zoom, 1, Math.max(1, context.maxZoom))
  const box = boxAt(context.asset, context.aspect, zoom)
  return {
    zoom,
    centre: {
      x: clamp(state.centre.x, box.width / 2, 1 - box.width / 2),
      y: clamp(state.centre.y, box.height / 2, 1 - box.height / 2),
    },
  }
}

/** The crop and hotspot to store for a state: the crop is the visible box, the hotspot is its centre and size. */
export function toCrop({
  asset,
  aspect,
  zoom,
  centre,
}: {
  asset: AssetSize
  aspect: number
  zoom: number
  centre: Point
}): StoredFraming {
  const { centre: at, zoom: z } = normalise(
    { zoom, centre },
    { asset, aspect, maxZoom: MAX_ZOOM_CAP },
  )
  const box = boxAt(asset, aspect, z)
  return {
    crop: {
      _type: 'sanity.imageCrop',
      left: clamp(tidy(at.x - box.width / 2), 0, 1),
      right: clamp(tidy(1 - (at.x + box.width / 2)), 0, 1),
      top: clamp(tidy(at.y - box.height / 2), 0, 1),
      bottom: clamp(tidy(1 - (at.y + box.height / 2)), 0, 1),
    },
    hotspot: {
      _type: 'sanity.imageHotspot',
      x: tidy(at.x),
      y: tidy(at.y),
      width: tidy(box.width),
      height: tidy(box.height),
    },
  }
}

/**
 * The area @sanity/image-url serves for a width and height of this ratio, in source pixels: its
 * `fit()` rule, step for step (crop and hotspot rounded to pixels, the hotspot's centre kept
 * inside the crop). A missing crop is the whole upload; a missing hotspot is the whole upload's
 * centre, as the library defaults them.
 */
export function servedRect({
  asset,
  aspect,
  crop,
  hotspot,
}: {
  asset: AssetSize
  aspect: number
  crop?: Partial<Crop> | null
  hotspot?: Partial<Hotspot> | null
}): Rect {
  const left = Math.round((crop?.left ?? 0) * asset.width)
  const top = Math.round((crop?.top ?? 0) * asset.height)
  const box = {
    left,
    top,
    width: Math.round(asset.width - (crop?.right ?? 0) * asset.width - left),
    height: Math.round(asset.height - (crop?.bottom ?? 0) * asset.height - top),
  }
  // The hotspot's centre, worked out as the library does (from its edges) so halves round alike.
  const spot = { x: 0.5, y: 0.5, width: 1, height: 1, ...hotspot }
  const radiusX = (spot.width * asset.width) / 2
  const radiusY = (spot.height * asset.height) / 2
  const centreX = Math.round(
    (spot.x * asset.width + radiusX - (spot.x * asset.width - radiusX)) / 2 +
      (spot.x * asset.width - radiusX),
  )
  const centreY = Math.round(
    (spot.y * asset.height + radiusY - (spot.y * asset.height - radiusY)) / 2 +
      (spot.y * asset.height - radiusY),
  )

  if (box.width / box.height > aspect) {
    // Wider than the shape: cut from the sides.
    const height = Math.round(box.height)
    const width = Math.round(height * aspect)
    const outTop = Math.max(0, Math.round(box.top))
    let outLeft = Math.max(0, Math.round(centreX - width / 2))
    if (outLeft < box.left) outLeft = box.left
    else if (outLeft + width > box.left + box.width) outLeft = box.left + box.width - width
    return { left: outLeft, top: outTop, width, height }
  }
  // Taller than the shape: cut from the top and bottom.
  const width = box.width
  const height = Math.round(width / aspect)
  const outLeft = Math.max(0, Math.round(box.left))
  let outTop = Math.max(0, Math.round(centreY - height / 2))
  if (outTop < box.top) outTop = box.top
  else if (outTop + height > box.top + box.height) outTop = box.top + box.height - height
  return { left: outLeft, top: outTop, width, height }
}

/**
 * What a picture with no crop or hotspot shows today in this placement: the CDN's centred cut at
 * `defaultAspect`, then the shape's own centred cut of that. Leaving a picture alone never changes it.
 */
export function defaultArea(placement: Placement, asset: AssetSize): Rect {
  const served = servedRect({ asset, aspect: placement.defaultAspect ?? placement.aspect })
  if (placement.defaultAspect === undefined || placement.defaultAspect === placement.aspect) {
    return served
  }
  const inner = servedRect({
    asset: { width: served.width, height: served.height },
    aspect: placement.aspect,
  })
  return {
    left: served.left + inner.left,
    top: served.top + inner.top,
    width: inner.width,
    height: inner.height,
  }
}

export interface FramedImage {
  asset: AssetSize
  crop?: Partial<Crop> | null
  hotspot?: Partial<Hotspot> | null
}

/** Whether the field stores a crop or a hotspot (from this editor or Sanity's own tool). */
export function isFramed(image: { crop?: unknown; hotspot?: unknown } | null | undefined): boolean {
  return Boolean(image?.crop || image?.hotspot)
}

/**
 * The one answer to "what part of the upload does the picture show?", for the renderer and the
 * editor alike: the stored framing, else the default. Null for an uncropped shape (no placement),
 * which shows the whole picture whatever is stored.
 */
export function visibleArea(placement: Placement | null, image: FramedImage): Rect | null {
  if (!placement) return null
  if (!isFramed(image)) return defaultArea(placement, image.asset)
  return servedRect({
    asset: image.asset,
    aspect: placement.aspect,
    crop: image.crop,
    hotspot: image.hotspot,
  })
}

/**
 * The editor's state for a picture: the area the site serves now, so the editor opens on what
 * visitors see, whether the picture was framed here, by Sanity's tool, or not at all.
 */
export function fromImage({
  asset,
  aspect,
  crop,
  hotspot,
  defaultAspect,
}: {
  asset: AssetSize
  aspect: number
  crop?: Partial<Crop> | null
  hotspot?: Partial<Hotspot> | null
  defaultAspect?: number
}): FramingState {
  const area =
    visibleArea({ aspect, defaultAspect }, { asset, crop, hotspot }) ??
    defaultArea({ aspect }, asset)
  const coverPx = coverBox(asset, aspect).width * asset.width
  return normalise(
    {
      zoom: coverPx / area.width,
      centre: {
        x: (area.left + area.width / 2) / asset.width,
        y: (area.top + area.height / 2) / asset.height,
      },
    },
    { asset, aspect, maxZoom: MAX_ZOOM_CAP },
  )
}

/** The context for a picture in a shape; `drawnPx` is the shape's largest drawn width. */
export function framingContext(asset: AssetSize, aspect: number, drawnPx?: number): FramingContext {
  return { asset, aspect, maxZoom: maxZoom(asset, aspect, drawnPx) }
}

/** Moves the box by a fraction of itself (`dx` and `dy` of its width and height), staying inside the picture. */
export function pan(
  state: FramingState,
  context: FramingContext,
  dx: number,
  dy: number,
): FramingState {
  const box = boxAt(context.asset, context.aspect, state.zoom)
  return normalise(
    {
      zoom: state.zoom,
      centre: { x: state.centre.x + dx * box.width, y: state.centre.y + dy * box.height },
    },
    context,
  )
}

/**
 * Zooms by `factor`, keeping the point under the pointer or fingers still. `point` is where it is
 * on the stage, as fractions of the stage (0 to 1, left to top).
 */
export function zoomAt(
  state: FramingState,
  context: FramingContext,
  factor: number,
  point: Point = { x: 0.5, y: 0.5 },
): FramingState {
  const zoom = clamp(state.zoom * factor, 1, Math.max(1, context.maxZoom))
  const before = boxAt(context.asset, context.aspect, state.zoom)
  const after = boxAt(context.asset, context.aspect, zoom)
  return normalise(
    {
      zoom,
      centre: {
        x: state.centre.x + (point.x - 0.5) * (before.width - after.width),
        y: state.centre.y + (point.y - 0.5) * (before.height - after.height),
      },
    },
    context,
  )
}

/** Sets the zoom (the slider), about the box's centre. */
export function setZoom(state: FramingState, context: FramingContext, zoom: number): FramingState {
  return zoomAt(state, context, zoom / state.zoom)
}

export type Direction = 'left' | 'right' | 'up' | 'down'

const DIRECTIONS: Record<Direction, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
}

/** One keyboard or button step: 1% of the visible box, or 10% when `large`. */
export function stepPan(
  state: FramingState,
  context: FramingContext,
  direction: Direction,
  large = false,
): FramingState {
  const step = large ? STEP_LARGE : STEP_SMALL
  const { x, y } = DIRECTIONS[direction]
  return pan(state, context, x * step, y * step)
}

/** One keyboard or button zoom step: 5 points of zoom (100% to 105%). */
export function stepZoom(state: FramingState, context: FramingContext, direction: 1 | -1) {
  return setZoom(state, context, state.zoom + direction * STEP_ZOOM)
}

/**
 * One arrow-key or Move-button step as the editor means it: the picture moves the way the arrow
 * points (as when dragging), so the visible box moves the other way.
 */
export function stepPicture(
  state: FramingState,
  context: FramingContext,
  direction: Direction,
  large = false,
): FramingState {
  return stepPan(state, context, OPPOSITE[direction], large)
}

const OPPOSITE: Record<Direction, Direction> = {
  left: 'right',
  right: 'left',
  up: 'down',
  down: 'up',
}
