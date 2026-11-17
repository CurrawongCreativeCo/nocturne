import { declareCapabilities, type ConditionalPolicy } from '@/lib/design/capabilities'
import { backgroundFraming, NOT_APPLICABLE } from '@/lib/design/common-policies'

type LinkListLayout = 'stacked' | 'cards' | 'editorial' | 'compact'

const ICON_LAYOUTS = {
  stacked: 'applies',
  cards: 'applies',
  compact: 'applies',
  editorial: { notApplicable: 'Draws no icon' },
} as const

/** The four places the Link list draws a divider, each with its own centre. */
const DIVIDER_POSITIONS = [
  { position: 'afterCategories', title: 'after-categories' },
  { position: 'afterProfile', title: 'after-profile' },
  { position: 'aboveSocial', title: 'above-social' },
  { position: 'belowSocial', title: 'below-social' },
] as const

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
    layouts: {
      stacked: 'applies',
      cards: 'applies',
      editorial: 'applies',
      compact: { roles: ['label'], reason: 'Compact draws the label role only' },
    },
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
  // Each independently editable icon control is its own part, so one that works never verifies another:
  // the container (shape and colours), which icon a link shows, and the centre icon of each divider
  // position. A part is verified only by evidence for its own field.
  icon: [
    {
      policy: 'required',
      scope: ['card', 'item'],
      part: 'container',
      layouts: ICON_LAYOUTS,
    },
    { policy: 'required', scope: 'item', part: 'identity', layouts: ICON_LAYOUTS },
    ...DIVIDER_POSITIONS.map(({ position, title }): ConditionalPolicy<LinkListLayout> => ({
      policy: 'conditional',
      scope: 'section',
      part: `divider.${position}`,
      trigger: {
        kind: 'setting',
        when: `The ${title} divider’s centre is an icon`,
        path: `dividerDesign.${position}.centre`,
      },
    })),
  ] as const,
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
