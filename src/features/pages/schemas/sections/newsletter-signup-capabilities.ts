import { declareCapabilities } from '@/lib/design/capabilities'
import { backgroundFraming, NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The newsletter signup's design capabilities (task 275). Its surface and depth close in task 148 (148 item 6). */
export const newsletterSignupCapabilities = declareCapabilities({
  surface: { policy: 'required', scope: 'card', closingTask: 148 },
  text: NOT_APPLICABLE.headerTextOnly,
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: 'section' },
  depth: { policy: 'required', scope: 'card', closingTask: 148 },
  icon: NOT_APPLICABLE.noIcon,
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
