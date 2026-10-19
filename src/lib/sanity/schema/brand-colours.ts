import { colorHex } from '@/config/tokens.generated'
import type { ColourSet } from '@/lib/color/heading-contrast'
import { resolveDesignTokens, type DesignOverrides } from '@/lib/color/resolve-design-tokens'

/** The slice of a Studio client this needs, so the Studio and the validation can both pass theirs. */
interface ColourClient {
  fetch: <T>(query: string) => Promise<T>
}

// Published only: the page draws what is published, so that is what a colour is measured against.
const QUERY = `*[_id == "designSettings"][0]{
  appearance, primary, secondary, highlight, surface, surfaceAlt, surfaceInverse, ink, inkMuted, line
}`

export interface BrandColours {
  /** Every colour the page draws: tokens.json's, after the Brand colours in Design settings. */
  colours: ColourSet
  /** Whether Design settings changes any colour, so the Studio can say which it measured. */
  custom: boolean
}

/** What a site with nothing set in Design settings draws (and what a failed request counts as). */
export const DEFAULT_BRAND_COLOURS: BrandColours = { colours: colorHex, custom: false }

// A form asks several times as it renders; share the answer for a moment, but never for long, so a
// colour just published in Design settings turns up on the next look.
const SHARE_MS = 3000
let shared: { at: number; pending: Promise<BrandColours> } | undefined

/**
 * The site's colours for the contrast checks: Design settings' Brand colours resolved the way the
 * page resolves them (`resolveDesignTokens`). A failed request counts as the defaults, so a flaky
 * connection leaves the checks on tokens.json's colours rather than breaking the form.
 */
export function fetchBrandColours(client: ColourClient): Promise<BrandColours> {
  if (shared && Date.now() - shared.at < SHARE_MS) return shared.pending
  const pending = client
    .fetch<DesignOverrides | null>(QUERY)
    .then((overrides) => {
      const { colours } = resolveDesignTokens(overrides)
      const custom = (Object.keys(colorHex) as (keyof typeof colorHex)[]).some(
        (key) => colours[key] !== colorHex[key],
      )
      return { colours, custom }
    })
    .catch(() => DEFAULT_BRAND_COLOURS)
  shared = { at: Date.now(), pending }
  return pending
}
