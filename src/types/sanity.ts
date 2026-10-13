import type { StegaBranded } from 'next-sanity'

import type { PAGE_QUERY_RESULT, SanityImageCrop, SanityImageHotspot } from './sanity.types'

/**
 * Shared Sanity shapes used by `components/ui`. Feature-specific types (sections,
 * page data) live in their feature's `types/`.
 *
 * Data is typed `StegaBranded` because in draft mode strings carry invisible
 * Visual Editing markers. Branded strings render and assign to `string` normally;
 * comparing to literals (`variant === 'primary'`) needs `stegaClean()` first.
 */

/** Structural type matching `imageFields`; any query that spreads the fragment satisfies it. */
export interface SanityImageData {
  alt?: string | null
  crop?: SanityImageCrop | null
  hotspot?: SanityImageHotspot | null
  asset?: {
    _id: string
    metadata?: {
      lqip?: string | null
      dimensions?: { width: number; height: number } | null
    } | null
  } | null
}

// `ctaFields` has no standalone query, so its type is read from the first query that projects it.
type HeroResult = Extract<
  NonNullable<NonNullable<PAGE_QUERY_RESULT>['pageBuilder']>[number],
  { _type: 'hero'; ctas: unknown }
>

/** Projection of `ctaFields`. */
export type CtaData = StegaBranded<NonNullable<HeroResult['ctas']>[number]>
