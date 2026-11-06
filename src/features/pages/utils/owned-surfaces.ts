import { stegaClean } from 'next-sanity'

import { ownsSurfaces } from '@/lib/design/section-surfaces'

/**
 * A section as SectionFrame should draw it: a layout that draws its own surfaces never gets the shared
 * Panel, so its stored Panel choice is left out (lib/design/section-surfaces.ts). The layout is
 * cleaned of draft mode's edit markers first.
 */
export function withoutOwnedPanel<S extends { _type: string }>(section: S): S {
  const { style, variant } = section as { style?: unknown; variant?: unknown }
  if (!style || typeof style !== 'object' || !('panel' in style || 'panelStrength' in style)) {
    return section
  }
  const layout = typeof variant === 'string' ? stegaClean(variant) : undefined
  if (!ownsSurfaces(section._type, layout)) return section
  const { panel: _panel, panelStrength: _strength, ...rest } = style as Record<string, unknown>
  return { ...section, style: rest }
}
