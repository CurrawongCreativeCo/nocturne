import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { NOT_APPLICABLE } from '@/lib/design/common-policies'

/**
 * The card beside an event page's content (`events/components/event-view.tsx`): the dates, place,
 * tickets and calendar links (task 156 declares it). Its fill, border, text roles and mark are Required;
 * task 280 gives the view a design to store them in, so each is admitted with that closing task
 * (capability-baseline-changes.ts). Depth is the same: task 146 adds the shared depth layer and the card
 * follows the site-wide Card depth, but its own shadow level and glow have no document to live in until
 * task 280, which closes the pair (owner decision, 9 November 2026).
 */
export const eventDetailsCardCapabilities = declareCapabilities({
  surface: { policy: 'required', scope: 'card', closingTask: 280 },
  text: {
    policy: 'required',
    scope: 'card',
    // title: the card's h2. label: each term and the calendar's h3. body: each detail. meta: the muted
    // lines under them (the time zone, the address). The notices keep their status colours.
    roles: ['title', 'label', 'body', 'meta'],
    closingTask: 280,
  },
  header: notApplicable(
    'Not a section: the card’s heading is its title role, with no eyebrow or intro',
  ),
  mark: { policy: 'required', scope: 'card', closingTask: 280 },
  depth: { policy: 'required', scope: 'card', closingTask: 280 },
  icon: NOT_APPLICABLE.noIcon,
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: notApplicable(
    'The card holds no picture. The event’s picture is the page’s (Event pages, task 177)',
  ),
  pictureDepth: notApplicable('The card holds no picture'),
  overlay: NOT_APPLICABLE.noWashedPicture,
  glass: notApplicable(
    'Sits on the page’s plain background, so a glass panel has nothing to show through',
  ),
  divider: notApplicable(
    'The rule above Add to calendar is the group’s border, not a divider position',
  ),
  edge: NOT_APPLICABLE.noEdge,
  motion: NOT_APPLICABLE.noFrameToAnimate,
  slots: NOT_APPLICABLE.notASlotFamily,
})
