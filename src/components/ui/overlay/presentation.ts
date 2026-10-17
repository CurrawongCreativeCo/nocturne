/** How an overlay sits on the page. */
export const OVERLAY_PRESENTATIONS = [
  'modal',
  'drawer-right',
  'drawer-left',
  'sheet',
  'fullscreen',
] as const

export type OverlayPresentation = (typeof OVERLAY_PRESENTATIONS)[number]

export type OverlayWidth = 'narrow' | 'medium' | 'wide'

/** The side a presentation leaves by when swiped away, or null when it can't be swiped. */
export function swipeDirection(
  presentation: OverlayPresentation,
): 'right' | 'left' | 'down' | null {
  switch (presentation) {
    case 'drawer-right':
      return 'right'
    case 'drawer-left':
      return 'left'
    case 'sheet':
      return 'down'
    default:
      return null
  }
}
