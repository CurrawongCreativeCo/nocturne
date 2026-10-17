import type { OverlayPresentation, OverlayWidth } from '@/components/ui/overlay/presentation'

/** What editors choose: how a panel appears. Stored in `panel.presentation`. */
export const PANEL_PRESENTATIONS = ['auto', 'centred', 'side', 'fullscreen'] as const
export type PanelPresentation = (typeof PANEL_PRESENTATIONS)[number]

export const PANEL_WIDTHS = ['narrow', 'medium', 'wide'] as const satisfies readonly OverlayWidth[]

/**
 * The kinds of content a panel holds. `text` and `form` exist; the rest are reserved for the
 * features that will add them (booking embed, event details, link list): the presentation rules
 * already know about booking, so adding it only needs a content type and a renderer.
 */
export type PanelContentKind = 'text' | 'form' | 'booking' | 'event' | 'links'

/** Below Tailwind's `sm` (40 rem): phones, and anything else that narrow. */
export const PHONE_QUERY = '(max-width: 39.999rem)'

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

/** A stored value to a usable one: a panel with nothing chosen (or an old, unknown value) is Auto. */
export function parsePresentation(value: unknown): PanelPresentation {
  return isOneOf(PANEL_PRESENTATIONS, value) ? value : 'auto'
}

export function parseWidth(value: unknown): OverlayWidth {
  return isOneOf(PANEL_WIDTHS, value) ? value : 'medium'
}

interface ResolveInput {
  presentation: PanelPresentation
  /** Whether the viewport is a phone (PHONE_QUERY). */
  phone: boolean
  kinds: readonly PanelContentKind[]
}

/**
 * How a panel actually appears. Auto is a centred window on a desktop and a bottom sheet on a
 * phone, except that a booking embed (it needs the room) takes the whole screen on a phone. The
 * other three are what the editor said, on every screen.
 */
export function resolvePresentation({
  presentation,
  phone,
  kinds,
}: ResolveInput): OverlayPresentation {
  switch (presentation) {
    case 'centred':
      return 'modal'
    case 'side':
      return 'drawer-right'
    case 'fullscreen':
      return 'fullscreen'
    case 'auto':
      if (!phone) return 'modal'
      return kinds.includes('booking') ? 'fullscreen' : 'sheet'
  }
}

/** Whether a presentation uses the Width choice (a sheet and full screen fill their space). */
export function usesWidth(presentation: PanelPresentation): boolean {
  return presentation === 'auto' || presentation === 'centred' || presentation === 'side'
}

/** Whether a presentation can be swiped away: Auto (a sheet on phones) and the side panel. */
export function usesSwipe(presentation: PanelPresentation): boolean {
  return presentation === 'auto' || presentation === 'side'
}
