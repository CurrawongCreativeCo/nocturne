import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { NOT_APPLICABLE } from '@/lib/design/common-policies'

/**
 * A service's own page (`services/components/service-view.tsx`; task 156 declares it). It draws no card
 * and is not a section, but it styles real text, crops one picture and rules off its groups, so those are
 * Required. Text closes in 280 (a design for the view), the picture in 177 and the rules in 151, their
 * registry owners.
 */
export const servicePageCapabilities = declareCapabilities({
  surface: notApplicable('Draws no card: its groups are separated by a rule'),
  text: {
    policy: 'required',
    scope: 'section',
    // heading: the name. intro: the summary. price. title: each group's h2. body: the rich text, who it is
    // for and the linked lists. label and description: a FAQ's question and its answer.
    roles: ['heading', 'intro', 'price', 'title', 'body', 'label', 'description'],
    closingTask: 280,
  },
  header: notApplicable(
    'A page, not a section: its h1 and summary are the heading and intro text roles',
  ),
  mark: notApplicable('A page, not a section, and it draws no card'),
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: NOT_APPLICABLE.noIcon,
  action: notApplicable(
    'No link covers a whole card. Its enquiry button is Buttons (CtaLink), tasks 148 and 137',
  ),
  framing: { policy: 'required', scope: 'section' },
  pictureDepth: notApplicable('Draws no shadow or glow on its picture'),
  overlay: NOT_APPLICABLE.noWashedPicture,
  glass: NOT_APPLICABLE.noCardSurface,
  divider: { policy: 'required', scope: 'section' },
  edge: NOT_APPLICABLE.noEdge,
  motion: NOT_APPLICABLE.noFrameToAnimate,
  slots: NOT_APPLICABLE.notASlotFamily,
})
