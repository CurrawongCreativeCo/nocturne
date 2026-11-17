import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The launch date slot block's design capabilities (task 275). */
export const launchDateCapabilities = declareCapabilities({
  surface: NOT_APPLICABLE.hosted,
  text: notApplicable('Drawn small in its host’s type; a block has no text controls of its own'),
  header: NOT_APPLICABLE.hosted,
  mark: NOT_APPLICABLE.hosted,
  depth: NOT_APPLICABLE.hosted,
  icon: NOT_APPLICABLE.noIcon,
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: NOT_APPLICABLE.noCroppedPicture,
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: NOT_APPLICABLE.hosted,
  glass: NOT_APPLICABLE.hosted,
  divider: NOT_APPLICABLE.hosted,
  edge: NOT_APPLICABLE.hosted,
  motion: NOT_APPLICABLE.hosted,
  slots: notApplicable('A block fills a slot: no free nesting'),
})
