import type { SectionStyleInput } from '@/components/ui/section-style'
import { edgeVisibility, type EdgeVisibility } from '@/lib/color/edge-visibility'

import { fetchBrandColourState } from './brand-colours'

/** The slice of a Studio client this needs. */
interface ColourClient {
  fetch: <T>(query: string) => Promise<T>
}

/**
 * The visibility advisory for a generated edge as Studio asks for it (task 151, Slice 5): the section's style as
 * the form holds it, and the site's colours as published. The style is only read. A colour read that failed is
 * passed on as unknown, so the advisory skips its number instead of measuring against the defaults.
 */
export async function edgeVisibilityFor(
  style: SectionStyleInput | null | undefined,
  client: ColourClient,
): Promise<EdgeVisibility> {
  // Nothing to measure for a section with no generated edge: leave the site's colours unasked.
  const needsColours = edgeVisibility({ style, site: null }).state !== 'none'
  if (!needsColours) return edgeVisibility({ style, site: null })
  const state = await fetchBrandColourState(client)
  return edgeVisibility({ style, site: state.known ? state.colours : null })
}
