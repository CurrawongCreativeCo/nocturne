import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, NOT_APPLICABLE } from '@/lib/design/common-policies'

const ON_A_CARD = {
  kind: 'variant',
  when: 'A layout or look draws its items on a card (the grid has no such option today)',
} as const

/** The features grid's design capabilities (task 275). Task 276 turns it into the cards family. */
export const featuresGridCapabilities = declareCapabilities({
  surface: { policy: 'conditional', scope: 'card', trigger: ON_A_CARD, closingTask: 276 },
  text: { policy: 'required', scope: 'card', roles: ['title', 'body'], closingTask: 276 },
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: 'section' },
  depth: { policy: 'conditional', scope: 'card', trigger: ON_A_CARD },
  icon: { policy: 'required', scope: 'card' },
  action: {
    policy: 'conditional',
    scope: 'card',
    trigger: { kind: 'setting', when: 'An item has a link (the field doesn’t exist today)' },
    // Linked cards belong to the cards family (owner-approved 8 November 2026).
    closingTask: 276,
  },
  framing: backgroundFraming(),
  pictureDepth: notApplicable('Its icons and pictures are drawn whole, with no frame'),
  overlay: { policy: 'required', scope: 'section' },
  glass: [
    { policy: 'required', scope: 'section' },
    {
      policy: 'conditional',
      scope: 'card',
      trigger: { kind: 'setting', when: 'Items are drawn on a card whose surface kind is Glass' },
    },
  ],
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
