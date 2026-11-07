import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { NOT_APPLICABLE } from '@/lib/design/common-policies'

const NOT_PLANNED = 'Not in the footer’s planned design, which is icons and dividers (build plan)'

/**
 * The site footer (task 158 declares it): a view, not a section. Its social icons take the shared
 * container from the Icons controls in Navigation (`footerIconDesign`). Dividers between its parts close
 * in task 151, so that gap is admitted with its owner (capability-baseline-changes.ts).
 */
export const siteFooterCapabilities = declareCapabilities({
  surface: notApplicable(
    'The footer’s fill and border are the site’s tone (Brand colours), not a card',
  ),
  text: notApplicable(NOT_PLANNED),
  header: notApplicable('The footer has no section header'),
  mark: notApplicable(NOT_PLANNED),
  depth: notApplicable(NOT_PLANNED),
  icon: { policy: 'required', scope: 'section', note: 'Its social icons' },
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: notApplicable('The footer holds no picture'),
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: NOT_APPLICABLE.noWashedPicture,
  glass: notApplicable(NOT_PLANNED),
  divider: { policy: 'required', scope: 'section' },
  edge: NOT_APPLICABLE.noEdge,
  motion: NOT_APPLICABLE.noFrameToAnimate,
  slots: NOT_APPLICABLE.notASlotFamily,
})
