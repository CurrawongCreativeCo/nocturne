export type Orientation = 'landscape' | 'portrait' | 'square'

export interface ImageGuidance {
  /** Target shape as 'width:height', e.g. '3:2'. */
  aspect?: `${number}:${number}`
  /** Narrowest width, in pixels, that still looks sharp in this spot. */
  minWidth?: number
  /** Shape to ask for when no exact aspect matters. Taken from `aspect` when that is set. */
  orientation?: Orientation
}

export interface Dimensions {
  width: number
  height: number
}

/** How far the shape may stray from `aspect` before we warn (15%). */
export const ASPECT_TOLERANCE = 0.15

/** Ratios this close to 1 are called square. */
const SQUARE_TOLERANCE = 0.05

/** Width ÷ height for '3:2', or undefined when the string isn't a usable ratio. */
export function parseAspect(aspect: string | undefined): number | undefined {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect ?? '')
  if (!match) return undefined
  const ratio = Number(match[1]) / Number(match[2])
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined
}

export function orientationOf({ width, height }: Dimensions): Orientation {
  const ratio = width / height
  if (Math.abs(ratio - 1) <= SQUARE_TOLERANCE) return 'square'
  return ratio > 1 ? 'landscape' : 'portrait'
}

/** The shape the spot wants: the stated orientation, else the one implied by `aspect`. */
function wantedOrientation({ aspect, orientation }: ImageGuidance): Orientation | undefined {
  if (orientation) return orientation
  const ratio = parseAspect(aspect)
  return ratio ? orientationOf({ width: ratio, height: 1 }) : undefined
}

/** "Recommended: 2400 × 1600 px, landscape." Empty when there is nothing to recommend. */
export function recommendation(guidance: ImageGuidance): string {
  const { minWidth } = guidance
  const ratio = parseAspect(guidance.aspect)
  const shape = wantedOrientation(guidance)
  let size = ''
  if (minWidth && ratio) size = `${minWidth} × ${Math.round(minWidth / ratio)} px`
  else if (minWidth) size = `at least ${minWidth} px wide`
  const parts = [size, shape].filter(Boolean)
  return parts.length ? `Recommended: ${parts.join(', ')}.` : ''
}

/**
 * Plain-English warning when the picture is too narrow or the wrong shape for its spot, or
 * undefined when it's fine. Pure: the Studio validator only fetches the dimensions.
 */
export function describeImageProblem(
  actual: Dimensions,
  guidance: ImageGuidance,
): string | undefined {
  const { minWidth } = guidance
  const ratio = parseAspect(guidance.aspect)
  const shape = wantedOrientation(guidance)

  const tooNarrow = minWidth !== undefined && actual.width < minWidth
  const wrongShape = ratio
    ? Math.abs(actual.width / actual.height / ratio - 1) > ASPECT_TOLERANCE
    : shape !== undefined && orientationOf(actual) !== shape
  if (!tooNarrow && !wrongShape) return undefined

  const wants = [
    shape ? `a ${shape} image` : 'an image',
    minWidth ? `at least ${minWidth} px wide` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return `This image is ${actual.width} × ${actual.height} (${orientationOf(actual)}). This spot looks best with ${wants}.`
}
