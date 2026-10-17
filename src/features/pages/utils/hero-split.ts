/**
 * The hero's Split layout options. The value lists are the contract with the schema's Design tab
 * (schemas/sections/hero.ts); the classes are the contract with components/sections/hero/split.tsx.
 * An unset or unknown value gets the first of its list, which is the layout's original look.
 */

import type { ImageAppearance } from '@/lib/sanity/image-design-options'

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
 * Where the picture sits in the column and how big it may get; its shape, crop and corners are the
 * shared FramedImage's (components/ui/framed-image.tsx), by the resolved appearance. Standard, rounded,
 * square and framed pictures are 4:3 and stop at 24rem tall below the two-column layout so a tablet
 * doesn't get a picture as big as its screen; a circle (1:1) and an arch (4:5) are capped and centred
 * in their column so they never grow into a tall slab.
 */
export function splitImageClass(shape: ImageAppearance): string {
  switch (shape) {
    case 'circle':
      return 'w-full max-w-xl justify-self-center'
    case 'arch':
      return 'w-full max-w-lg justify-self-center'
    default:
      return 'w-full max-h-96 lg:max-h-none'
  }
}

/**
 * `splitImageClass` in two halves, for a picture that animates inside a frame (the hero's `image` part):
 * where it sits in the column (on the frame) and the size limits (on the picture's own box). Together
 * they are the same classes, so an animated picture is placed like a still one.
 */
export function splitImageFrameClass(shape: ImageAppearance): string {
  switch (shape) {
    case 'circle':
      return 'w-full max-w-xl justify-self-center'
    case 'arch':
      return 'w-full max-w-lg justify-self-center'
    default:
      return 'w-full'
  }
}

export function splitImageShapeClass(shape: ImageAppearance): string {
  return shape === 'circle' || shape === 'arch' ? 'w-full' : 'w-full max-h-96 lg:max-h-none'
}
