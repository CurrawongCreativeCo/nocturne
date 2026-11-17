import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The gallery's design capabilities (task 275). Tiles are framed; the lightbox never is. */
export const galleryCapabilities = declareCapabilities<'grid' | 'masonry' | 'slider'>({
  surface: NOT_APPLICABLE.noCardSurface,
  text: NOT_APPLICABLE.headerTextOnly,
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: 'section' },
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: NOT_APPLICABLE.noIcon,
  action: notApplicable('Slider and lightbox controls are excluded (137 item 5)'),
  framing: [
    {
      policy: 'required',
      scope: 'card',
      part: 'tile',
      layouts: {
        grid: 'applies',
        slider: 'applies',
        // Reviewed downgrade (capability-baseline-changes.ts, 18 November 2026).
        masonry: {
          notApplicable:
            'Fixed-tile framing does not apply: Masonry keeps each picture’s own proportions, so there is no fixed tile to reposition it within. A crop saved on the picture still applies there.',
        },
      },
    },
    backgroundFraming(),
  ],
  pictureDepth: { policy: 'required', scope: 'card', note: 'Tiles, never the lightbox' },
  overlay: { policy: 'required', scope: 'section' },
  glass: { policy: 'required', scope: 'section' },
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
