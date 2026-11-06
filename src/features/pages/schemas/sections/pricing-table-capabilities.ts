import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, GLASS_CARD, NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The pricing table's design capabilities (task 275). Plans are the one item-level override. */
export const pricingTableCapabilities = declareCapabilities({
  surface: { policy: 'required', scope: ['card', 'item'] },
  text: {
    policy: 'required',
    scope: ['card', 'item'],
    roles: ['title', 'price', 'body', 'label', 'description'],
  },
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: ['section', 'card', 'item'] },
  depth: { policy: 'required', scope: ['card', 'item'] },
  icon: {
    policy: 'conditional',
    scope: 'card',
    trigger: {
      kind: 'setting',
      when: 'A plan lists features, each drawn with a checkmark',
      path: 'plans',
    },
  },
  action: notApplicable('Has buttons, not a whole-card link (148)'),
  framing: backgroundFraming(),
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: { policy: 'required', scope: 'section' },
  glass: [
    { policy: 'required', scope: 'section' },
    { policy: 'conditional', scope: 'card', trigger: GLASS_CARD },
  ],
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
