import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, NOT_APPLICABLE } from '@/lib/design/common-policies'

/**
 * The FAQ's design capabilities (task 275). The Divided list (the default) draws no card, so a card's fill,
 * border and mark apply on the Cards item style, a setting (task 156): each look has its own evidence.
 */
export const faqCapabilities = declareCapabilities({
  surface: { policy: 'required', scope: 'card' },
  text: { policy: 'required', scope: 'card', roles: ['title', 'body'] },
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: ['section', 'card'] },
  depth: {
    policy: 'conditional',
    scope: 'card',
    trigger: {
      kind: 'setting',
      when: 'The FAQ item style is Cards',
      path: 'itemStyle',
    },
  },
  icon: notApplicable('The chevron is a disclosure state, not an icon choice (137)'),
  action: notApplicable('Accordion chevrons are excluded (137 item 5)'),
  framing: backgroundFraming(),
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: { policy: 'required', scope: 'section' },
  glass: { policy: 'required', scope: 'section' },
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
