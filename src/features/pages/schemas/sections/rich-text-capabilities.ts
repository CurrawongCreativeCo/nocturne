import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, NOT_APPLICABLE } from '@/lib/design/common-policies'

/** Rich text's design capabilities (task 275; README, "Design capability contract"). */
export const richTextCapabilities = declareCapabilities({
  surface: NOT_APPLICABLE.noCardSurface,
  text: notApplicable('Its body is rich text, styled by its blocks'),
  header: notApplicable('Has no heading field'),
  mark: { policy: 'required', scope: 'section' },
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: NOT_APPLICABLE.noIcon,
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: backgroundFraming(),
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: { policy: 'required', scope: 'section' },
  glass: { policy: 'required', scope: 'section' },
  divider: { policy: 'required', scope: 'section', note: 'A divider block in the body' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
