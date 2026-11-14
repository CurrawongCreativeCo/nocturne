import type { SectionStyleInput } from '@/components/ui/section-style'
import { edgeVisibility, type EdgeVisibility } from '@/lib/color/edge-visibility'

import { fetchBrandColourState } from './brand-colours'

/** The slice of a Studio client this needs. */
interface ColourClient {
  fetch: <T>(query: string) => Promise<T>
}

/** What the form knows about the section the style belongs to. */
export interface SectionContext {
  /** The layout draws a picture or video of its own behind its content (`sectionHasOwnBackground`). */
  hasOwnBackground?: boolean
}

/**
 * The visibility advisory for a generated edge as Studio asks for it (task 151, Slice 5): the section's style as
 * the form holds it, and the site's colours as published. The style is only read. A colour read that failed is
 * passed on as unknown, so the advisory skips its number instead of measuring against the defaults.
 */
export async function edgeVisibilityFor(
  style: SectionStyleInput | null | undefined,
  client: ColourClient,
  section: SectionContext = {},
): Promise<EdgeVisibility> {
  const { hasOwnBackground = false } = section
  // Nothing to measure for a section with no generated edge: leave the site's colours unasked.
  const needsColours = edgeVisibility({ style, site: null, hasOwnBackground }).state !== 'none'
  if (!needsColours) return edgeVisibility({ style, site: null, hasOwnBackground })
  const state = await fetchBrandColourState(client)
  return edgeVisibility({ style, site: state.known ? state.colours : null, hasOwnBackground })
}

/**
 * The two checks the Colours field carries (section-style.ts), as functions: a warning for a faint layer, and a note
 * for a scene that cannot be judged. At most one has anything to say, so the form shows one advisory.
 */
export async function faintLayerWarning(
  style: SectionStyleInput | null | undefined,
  client: ColourClient,
  section: SectionContext = {},
): Promise<string | true> {
  const result = await edgeVisibilityFor(style, client, section)
  return result.state === 'faint' ? (result.message ?? true) : true
}

export async function uncheckedSceneNote(
  style: SectionStyleInput | null | undefined,
  client: ColourClient,
  section: SectionContext = {},
): Promise<string | true> {
  const result = await edgeVisibilityFor(style, client, section)
  return result.state === 'unchecked' ? (result.message ?? true) : true
}
