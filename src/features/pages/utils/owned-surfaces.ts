import { stegaClean } from 'next-sanity'

import { ownsSurfaces, takesSectionMark } from '@/lib/design/section-surfaces'

/**
 * A section as SectionFrame should draw it: a layout that draws its own surfaces never gets the shared
 * Panel, so its stored Panel choice is left out (lib/design/section-surfaces.ts). The layout is
 * cleaned of draft mode's edit markers first.
 */
export function withoutOwnedPanel<S extends { _type: string }>(section: S): S {
  const { style, variant } = section as { style?: unknown; variant?: unknown }
  if (!style || typeof style !== 'object') return section
  const stored = style as Record<string, unknown>
  // A functional section never takes a mark, whatever is stored (lib/design/section-surfaces.ts).
  const { mark: _mark, ...markless } = stored
  const kept = takesSectionMark(section._type) ? stored : markless
  if (!('panel' in stored || 'panelStrength' in stored)) {
    return kept === stored ? section : { ...section, style: kept }
  }
  const layout = typeof variant === 'string' ? stegaClean(variant) : undefined
  if (!ownsSurfaces(section._type, layout))
    return kept === stored ? section : { ...section, style: kept }
  const { panel: _panel, panelStrength: _strength, ...rest } = kept
  return { ...section, style: rest }
}
