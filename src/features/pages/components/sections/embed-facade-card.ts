import { CARD_SHADOW_CLASS } from '@/lib/sanity/depth-options'

/**
 * The facade card's classes with nothing chosen (task 148): the classes the card always had, plus the site's
 * Card depth, which is no shadow until a site chooses one. Kept out of the client component so the server
 * can work out a chosen surface and depth without importing it.
 */
export const EMBED_CARD = `flex flex-col items-center justify-center gap-3 rounded-card bg-surface-alt p-6 text-center ${CARD_SHADOW_CLASS.free} ring-1 ring-line`

/** Which of those classes are the surface's, so a chosen fill or border replaces just those. */
export const EMBED_CARD_SURFACE = {
  background: 'bg-surface-alt',
  border: 'ring-1 ring-line',
  fill: 'var(--color-surface-alt)',
  still: true,
}
