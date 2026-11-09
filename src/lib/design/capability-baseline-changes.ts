import type { CapabilityId, Scope, TaskNumber, TextRole } from './capabilities'

/**
 * Reviewed changes to the capability baseline (task 275 correction; README, "Design capability
 * contract"). capability-baseline.json lists the gaps a component has not closed yet, and it may only
 * shrink. Two things can legitimately make it differ from the commit a change is made on, and each needs
 * a reviewed row here, so a hand edit of the JSON is never enough:
 *
 * - `admit`: a pair (or layout) is added to the baseline. A new component adopts every capability that
 *   applies; a gap it can't close in its own task is admitted with the task that will close it.
 * - `downgrade`: a pair leaves the baseline without being verified, because the policy now says Not
 *   applicable. The reason says why the component never needed it.
 *
 * A pair that leaves because it became Verified needs no row: evidence is what verifies it. CI compares
 * the baseline with the one on the base commit (`npm run design-capabilities -- --against-file`), and
 * fails any difference no row explains. A row that no longer matches anything is stale and fails too, so
 * a row is deleted when its gap closes.
 */
export interface BaselineChange {
  kind: 'admit' | 'downgrade'
  component: string
  capability: CapabilityId
  scope: Scope
  part?: string
  /** A text role, for a pair that is listed role by role (text, header). */
  role?: TextRole
  /** The layouts affected (`null` for a component with one layout). Naming them keeps a row exact. */
  layouts: readonly (string | null)[]
  /** Why: what the gap is, or why the pair does not apply. */
  reason: string
  reviewer: string
  /** When the reviewer approved it (YYYY-MM-DD). */
  reviewed: string
  /** `admit` only: the task that closes the gap. It must match the baseline's. */
  closingTask?: TaskNumber
}

/**
 * The three views task 156 declares (the event details card, the service page and search results). Their
 * design is not stored anywhere yet, so each pair is admitted with its closing task. Task 280 ("Standalone
 * view design settings and adoption") is proposed and not yet in the canonical plan: its number is
 * provisional until the plan publishes it. Approved in principle by the owner on 7 November 2026.
 */
const VIEW_ROW = {
  kind: 'admit',
  layouts: [null],
  reviewer: 'owner',
  reviewed: '2026-11-07',
} as const
const viewText = (
  component: string,
  scope: 'card' | 'section',
  roles: readonly TextRole[],
  reason: string,
): BaselineChange[] =>
  roles.map((role) => ({
    ...VIEW_ROW,
    component,
    capability: 'text',
    scope,
    role,
    reason,
    closingTask: 280,
  }))

export const BASELINE_CHANGES: readonly BaselineChange[] = [
  // Task 158 declares the site footer and the team member page as views. Each gap below is a capability
  // another task owns, admitted when the view enters the contract. Owner decision, 8 November 2026.
  {
    kind: 'admit',
    component: 'siteFooter',
    capability: 'divider',
    scope: 'section',
    layouts: [null],
    reason:
      'The footer’s parts are separated by fixed borders. Dividers between its parts are task 151’s, which gives the footer a design to store them in.',
    reviewer: 'owner',
    reviewed: '2026-11-08',
    closingTask: 151,
  },
  {
    kind: 'admit',
    component: 'teamMemberPage',
    capability: 'divider',
    scope: 'section',
    layouts: [null],
    reason:
      'The page’s contact section is set off by a fixed border. Dividers are task 151’s, which gives the page a design to store them in.',
    reviewer: 'owner',
    reviewed: '2026-11-08',
    closingTask: 151,
  },
  {
    kind: 'admit',
    component: 'teamMemberPage',
    capability: 'framing',
    scope: 'section',
    layouts: [null],
    reason:
      'The portrait is cropped to a fixed square. Framing it is task 177’s, which gives the page a design to store the frame in.',
    reviewer: 'owner',
    reviewed: '2026-11-08',
    closingTask: 177,
  },
  {
    ...VIEW_ROW,
    component: 'eventDetailsCard',
    capability: 'surface',
    scope: 'card',
    reason:
      'The card’s fill, border and corners are fixed in the component. Task 280 gives the view a design to store them in.',
    closingTask: 280,
  },
  ...viewText(
    'eventDetailsCard',
    'card',
    ['title', 'label', 'body', 'meta'],
    'The card’s text is styled in the component. Task 280 gives the view text roles.',
  ),
  {
    ...VIEW_ROW,
    component: 'eventDetailsCard',
    capability: 'mark',
    scope: 'card',
    reason:
      'A card with no decorative mark yet. It comes with the Cards box task 280 adds, as on every other card.',
    closingTask: 280,
  },
  {
    ...VIEW_ROW,
    component: 'eventDetailsCard',
    capability: 'depth',
    scope: 'card',
    reason:
      'The card follows the site-wide Card depth (task 146), but has no depth control of its own: it has no document to store a shadow level and glow in. Task 280 gives the view one. Owner decision, 9 November 2026: closing task moved from 146 to 280.',
    reviewed: '2026-11-09',
    closingTask: 280,
  },
  ...viewText(
    'servicePage',
    'section',
    ['heading', 'intro', 'price', 'title', 'body', 'label', 'description'],
    'The page’s text is styled in the component. Task 280 gives the view text roles.',
  ),
  {
    ...VIEW_ROW,
    component: 'servicePage',
    capability: 'framing',
    scope: 'section',
    reason: 'The page’s picture has a fixed 16:9 crop, with no Adjust picture yet.',
    closingTask: 177,
  },
  {
    ...VIEW_ROW,
    component: 'servicePage',
    capability: 'divider',
    scope: 'section',
    reason:
      'The rules between the page’s groups are plain borders, with no decorative divider yet, as on the Team member page.',
    closingTask: 151,
  },
  ...viewText(
    'searchResults',
    'section',
    ['title', 'meta', 'body'],
    'The results’ text is styled in the component. Task 280 gives the view text roles.',
  ),
]
