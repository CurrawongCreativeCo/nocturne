import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The picture slot block's design capabilities (task 275). */
export const slotImageCapabilities = declareCapabilities({
  surface: NOT_APPLICABLE.hosted,
  text: NOT_APPLICABLE.noText,
  header: NOT_APPLICABLE.hosted,
  mark: NOT_APPLICABLE.hosted,
  depth: NOT_APPLICABLE.hosted,
  icon: NOT_APPLICABLE.noIcon,
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: { policy: 'required', scope: 'item' },
  pictureDepth: notApplicable('Framed by its host’s Image design (147 adopts it on Image + text)'),
  overlay: NOT_APPLICABLE.hosted,
  glass: NOT_APPLICABLE.hosted,
  divider: NOT_APPLICABLE.hosted,
  edge: NOT_APPLICABLE.hosted,
  motion: NOT_APPLICABLE.hosted,
  slots: notApplicable('A block fills a slot: no free nesting'),
})
