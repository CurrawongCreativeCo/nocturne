/**
 * The Image + text family's layouts (README, "Image + text"). Pure, so the schema, the renderer and
 * the tests share one list. The first is the default: the side-by-side layout the section always had,
 * and what content with no `variant` renders.
 */
export const SPLIT_LAYOUTS = ['side', 'stacked', 'overlay'] as const
export type SplitLayout = (typeof SPLIT_LAYOUTS)[number]

/** The layout stored on a section; one this deployment does not know (from a later release) is the default. */
export function splitLayout(variant: string | null | undefined): SplitLayout {
  return SPLIT_LAYOUTS.find((layout) => layout === variant) ?? SPLIT_LAYOUTS[0]
}

/**
 * The layout that is actually drawn. Text over media needs a picture to put the text on. A video
 * starts only on a click and has controls, so with one the section falls back to the side-by-side
 * layout rather than hiding the video behind the text.
 */
export function drawnSplitLayout(
  variant: string | null | undefined,
  mediaKind: 'image' | 'video' | null,
): SplitLayout {
  const layout = splitLayout(variant)
  return layout === 'overlay' && mediaKind !== 'image' ? 'side' : layout
}

/** The parts of a media block the choice needs, already `stegaClean`ed by the caller. */
export interface MediaBlockFacts {
  type?: string
  /** A `slotImage` that holds an uploaded picture. */
  hasPicture?: boolean
  /** A `slotVideo` with something to play: an address for YouTube or Vimeo, a file for an upload. */
  hasVideoSource?: boolean
}

export type MediaChoice = 'block-image' | 'block-video' | 'legacy-image' | null

/**
 * What the section shows as its media. A valid block in the `media` slot wins and the older `image` is
 * not drawn beside it. A block that is empty, half-filled or of a type this deployment does not know
 * (from a later release) is skipped, so a picture saved before the slot existed is never lost to it.
 * Nothing is deleted either way: the older field stays in the content.
 */
export function chooseMedia(
  block: MediaBlockFacts | null | undefined,
  legacyHasPicture: boolean,
): MediaChoice {
  if (block?.type === 'slotImage' && block.hasPicture) return 'block-image'
  if (block?.type === 'slotVideo' && block.hasVideoSource) return 'block-video'
  return legacyHasPicture ? 'legacy-image' : null
}

/** Whether a video block has something to play for its source. An unset source is YouTube, as in the schema. */
export function videoHasSource(video: {
  source?: string | null
  url?: string | null
  fileUrl?: string | null
}): boolean {
  return (video.source ?? 'youtube') === 'upload' ? Boolean(video.fileUrl) : Boolean(video.url)
}
