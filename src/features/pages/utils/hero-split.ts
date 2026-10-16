/**
 * The hero's Split layout options. The value lists are the contract with the schema's Design tab
 * (schemas/sections/hero.ts); the classes are the contract with components/sections/hero/split.tsx.
 * An unset or unknown value gets the first of its list, which is the layout's original look.
 */

export const SPLIT_PROPORTIONS = ['even', 'text', 'image'] as const
export type SplitProportion = (typeof SPLIT_PROPORTIONS)[number]

export const SPLIT_IMAGE_SHAPES = ['rounded', 'square', 'circle', 'arch'] as const
export type SplitImageShape = (typeof SPLIT_IMAGE_SHAPES)[number]

export function splitProportion(value: string | null | undefined): SplitProportion {
  return SPLIT_PROPORTIONS.find((candidate) => candidate === value) ?? SPLIT_PROPORTIONS[0]
}

export function splitImageShape(value: string | null | undefined): SplitImageShape {
  return SPLIT_IMAGE_SHAPES.find((candidate) => candidate === value) ?? SPLIT_IMAGE_SHAPES[0]
}

/**
 * Grid columns on wide screens, as the text (60 or 50 per cent) and the picture sit side by side.
 * The columns are positional, so with the picture on the left the pair is swapped: the text is
 * first in the page but second on screen.
 */
export function splitColumns(proportion: SplitProportion, imageFirst: boolean): string {
  switch (proportion) {
    case 'text':
      return imageFirst
        ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
        : 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'
    case 'image':
      return imageFirst
        ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'
        : 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
    default:
      return 'lg:grid-cols-2'
  }
}

/** The picture's width as a share of the viewport on wide screens, for `sizes`. */
export function splitImageShare(proportion: SplitProportion): number {
  return proportion === 'text' ? 40 : proportion === 'image' ? 60 : 50
}

/**
 * The picture's shape. Rounded and square keep a 4:3 frame, and stop at 24rem tall below the two-column
 * layout so a tablet doesn't get a picture as big as its screen; circle is always 1:1 and arch 4:5, and
 * both are capped and centred in their column so they never grow into a tall slab.
 */
export function splitImageClass(shape: SplitImageShape): string {
  switch (shape) {
    case 'square':
      return 'aspect-[4/3] max-h-96 w-full object-cover lg:max-h-none'
    case 'circle':
      return 'aspect-square w-full max-w-xl justify-self-center rounded-full object-cover'
    case 'arch':
      return 'aspect-[4/5] w-full max-w-lg justify-self-center rounded-t-full object-cover'
    default:
      return 'aspect-[4/3] max-h-96 w-full rounded-card object-cover lg:max-h-none'
  }
}

/**
 * `splitImageClass` in two halves, for a picture that animates inside a frame (the hero's `image` part):
 * where it sits in the column (on the frame) and what it looks like (on the <img>). Together they are
 * the same classes, so an animated picture has the shape of a still one.
 */
export function splitImageFrameClass(shape: SplitImageShape): string {
  switch (shape) {
    case 'circle':
      return 'w-full max-w-xl justify-self-center'
    case 'arch':
      return 'w-full max-w-lg justify-self-center'
    default:
      return 'w-full'
  }
}

export function splitImageShapeClass(shape: SplitImageShape): string {
  switch (shape) {
    case 'square':
      return 'aspect-[4/3] max-h-96 w-full object-cover lg:max-h-none'
    case 'circle':
      return 'aspect-square w-full rounded-full object-cover'
    case 'arch':
      return 'aspect-[4/5] w-full rounded-t-full object-cover'
    default:
      return 'aspect-[4/3] max-h-96 w-full rounded-card object-cover lg:max-h-none'
  }
}
