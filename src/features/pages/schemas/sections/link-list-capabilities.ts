import { declareCapabilities } from '@/lib/design/capabilities'
import { backgroundFraming, NOT_APPLICABLE } from '@/lib/design/common-policies'

type LinkListLayout = 'stacked' | 'cards' | 'editorial' | 'compact'

const ROWS_ONLY = { notApplicable: 'Row style applies to Stacked only' }

/** The Link list's design capabilities (task 275; README, "Design capability contract"). */
export const linkListCapabilities = declareCapabilities<LinkListLayout>({
  surface: {
    policy: 'required',
    scope: ['card', 'item'],
    layouts: {
      stacked: 'applies',
      cards: 'applies',
      compact: 'applies',
      editorial: { notApplicable: 'Draws no card; the schema hides these fields there' },
    },
  },
  text: {
    policy: 'required',
    scope: ['card', 'item'],
    roles: ['eyebrow', 'label', 'description'],
    note: 'Compact draws the label role only',
  },
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: ['section', 'card', 'item'] },
  depth: {
    policy: 'required',
    scope: ['card', 'item'],
    layouts: {
      stacked: 'applies',
      cards: 'applies',
      compact: 'applies',
      editorial: { notApplicable: 'Has no surface for a shadow' },
    },
  },
  icon: {
    policy: 'required',
    scope: ['card', 'item'],
    layouts: {
      stacked: 'applies',
      cards: 'applies',
      compact: 'applies',
      editorial: { notApplicable: 'Draws no icon' },
    },
  },
  action: {
    policy: 'required',
    scope: ['card', 'item'],
    layouts: {
      stacked: 'applies',
      cards: 'applies',
      editorial: 'applies',
      compact: { notApplicable: 'Draws no arrow' },
    },
  },
  framing: [
    { policy: 'required', scope: 'section', part: 'profile' },
    {
      policy: 'required',
      scope: 'item',
      part: 'thumbnail',
      layouts: {
        stacked: 'applies',
        cards: 'applies',
        editorial: { notApplicable: 'Draws no thumbnails' },
        compact: { notApplicable: 'Draws no thumbnails' },
      },
    },
    backgroundFraming(),
  ],
  pictureDepth: { policy: 'required', scope: 'section' },
  overlay: { policy: 'required', scope: 'section' },
  glass: {
    policy: 'required',
    scope: 'card',
    layouts: { stacked: 'applies', cards: ROWS_ONLY, editorial: ROWS_ONLY, compact: ROWS_ONLY },
  },
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
