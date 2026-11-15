import type { SectionStyleInput } from '@/components/ui/section-style'
import {
  edgeVisibility,
  type EdgeVisibility,
  type FollowerInput,
} from '@/lib/color/edge-visibility'

import { fetchBrandColourState } from './brand-colours'

/** The slice of a Studio client this needs. */
interface ColourClient {
  fetch: <T>(query: string) => Promise<T>
}

/** What the form knows about the section the style belongs to. */
export interface SectionContext {
  /** The layout draws a picture or video of its own behind its content (`sectionHasOwnBackground`). */
  hasOwnBackground?: boolean
  /** What follows the section on the page, read from the document the form holds (`followerAtStylePath`). */
  follower?: FollowerInput
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
  const { hasOwnBackground = false, follower } = section
  // Nothing to measure for a section with no generated edge: leave the site's colours unasked.
  const needsColours =
    edgeVisibility({ style, site: null, hasOwnBackground, follower }).state !== 'none'
  if (!needsColours) return edgeVisibility({ style, site: null, hasOwnBackground, follower })
  const state = await fetchBrandColourState(client)
  return edgeVisibility({
    style,
    site: state.known ? state.colours : null,
    hasOwnBackground,
    follower,
  })
}

/**
 * The two checks the Colours field carries (section-style.ts), as functions: a warning for a faint layer, and a note
 * for a layer that cannot be judged (above the edge, or the layer below over what follows). They are separate, so a
 * faint layer does not hide a layer that was not looked at, and a layer that passes does not vouch for one that was
 * not assessed.
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
  return result.note ?? true
}
