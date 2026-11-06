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

export const BASELINE_CHANGES: readonly BaselineChange[] = [
  {
    kind: 'admit',
    component: 'badgeRow',
    capability: 'icon',
    scope: 'section',
    layouts: [null],
    reason:
      'Choosing a badge’s icon is verified at item scope. The container around the icon (shape, colour) has no controls on a block yet, so it is Required here and closes when task 158 adds them. Owner decision D3, 7 November 2026: the policy is split, subject to passing evidence.',
    reviewer: 'owner',
    reviewed: '2026-11-07',
    closingTask: 158,
  },
]
