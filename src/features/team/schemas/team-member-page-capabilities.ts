import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { NOT_APPLICABLE } from '@/lib/design/common-policies'

const NOT_PLANNED =
  'Not in the page’s planned design, which is icons, framing and dividers (build plan)'

/**
 * A team member's page (task 158 declares it): a view, not a section. Its social icons take the shared
 * container from Team page settings (`teamPageSettings.iconDesign`), one place for every member, so a
 * member never sets their own. The portrait's framing closes in task 177 and the dividers in task 151;
 * both gaps are admitted with their owners (capability-baseline-changes.ts).
 */
export const teamMemberPageCapabilities = declareCapabilities({
  surface: notApplicable('The page draws no card'),
  text: notApplicable(NOT_PLANNED),
  header: notApplicable('The page’s own h1 heads it'),
  mark: notApplicable(NOT_PLANNED),
  depth: notApplicable(NOT_PLANNED),
  icon: { policy: 'required', scope: 'section', note: 'Its social icons' },
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: { policy: 'required', scope: 'section' },
  pictureDepth: notApplicable(NOT_PLANNED),
  overlay: NOT_APPLICABLE.noWashedPicture,
  glass: notApplicable(NOT_PLANNED),
  divider: { policy: 'required', scope: 'section' },
  edge: NOT_APPLICABLE.noEdge,
  motion: NOT_APPLICABLE.noFrameToAnimate,
  slots: NOT_APPLICABLE.notASlotFamily,
})
