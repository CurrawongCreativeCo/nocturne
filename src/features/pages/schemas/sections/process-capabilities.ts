import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The process section's design capabilities (task 275). Its steps animate themselves. */
export const processCapabilities = declareCapabilities<'vertical' | 'alternating'>({
  surface: notApplicable('No card surface; its markers are icons (156 item 10)'),
  text: {
    policy: 'required',
    scope: 'card',
    roles: ['label', 'title', 'body'],
    note: 'Every step has this text',
  },
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: 'section' },
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: { policy: 'required', scope: 'card' },
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: backgroundFraming(),
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: { policy: 'required', scope: 'section' },
  glass: { policy: 'required', scope: 'section' },
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
