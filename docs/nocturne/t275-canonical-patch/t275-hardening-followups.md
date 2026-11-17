# Task 275 hardening: proposed follow-ups from the Task 156 architecture review (proposed, not applied)

**Status:** recorded 7 November 2026 from the final review of PR #158. **Nothing here is applied.** No task exists
for these yet, the published plan is unchanged, and no task status changes. None blocks Task 156: no defect was
reproduced, each is a gap where a future bug could pass the checks. Owner of the decision: the project owner.

## H1 (review L1). Item-scope evidence can't tell one item changing from every item changing

- **Where:** `src/lib/design/capability-evidence.ts` (the `linkList.text.item.*` and `cardFamilyEvidence` item entries) and
  `leakedTextRoles` in `src/lib/design/capability-harness.ts`.
- **Evidence:** an item probe such as `links.0.design.label.size` targets every element carrying the role; the
  `linkList.text.item.eyebrow@cards` snapshot lists both links' eyebrows. `leakedTextRoles` only compares other role
  names. A renderer that applied item 0's design to every item would still pass the evidence.
- **Interim cover (Task 156):** item-isolation regression tests for the Link list
  (`link-list-marks.test.tsx`, "one customised link leaves the others alone") and Pricing
  (`pricing-table.test.tsx`, "customising one plan leaves the other plans"). Both fail when item 0's design is
  applied to every item. They cover those two families only.
- **Recommended fix:** for an item-scope entry, also require that the same target on the other items is unchanged
  by the probe, and fail otherwise. Don't redesign the harness.

## H2 (review L2). The role-target check accepts a selector that is too broad

- **Where:** `evidenceProblems`, `src/lib/design/capability-availability.ts` (`entry.target.includes(textRoleTarget(entry.role))`).
- **Evidence:** a target like `[data-text-role="title"], article` passes. Every current entry uses the exact selector.
- **Recommended fix:** require `entry.target === textRoleTarget(entry.role)`, with a negative test.

## H3 (review L3). Reassigning a gap's closing task has no reviewed record

- **Where:** `baselineIntegrityProblems`, `src/lib/design/capability-availability.ts`.
- **Evidence:** the base-commit comparison ignores `closingTask`, so a changed owner needs only a regenerated baseline
  and a PR note. On this PR the one reassignment is Features grid's conditional surface, 156 to 276 (owner-approved).
- **Recommended fix:** require a reviewed row (a new `reassign` kind in `BASELINE_CHANGES`, with the old and new
  task, reason, reviewer and date) when a pair's closing task differs from the base commit's; stale rows fail as
  the others do.

## H4 (review L4). The registry still names 156 as owner once 156 is done

- **Where:** `src/lib/design/capabilities.ts` (`owner: 156` on surface, text, header and mark; the
  `testimonials.manual` content source).
- **Evidence:** a future Required gap with no `closingTask` falls back to the owner, a finished task, and could be
  admitted naming it.
- **Recommended fix:** decide what "owner" means for a completed task (a standing maintainer task, or none), then
  make the contract reject a closing task that is Done. Owner decision first.

## L6. Link list resolver (not a hardening item; no change now)

`src/features/pages/utils/link-card-design.ts` keeps its own layering resolver. It behaves the same as
`resolveItemCardDesign` today. It stays assigned to the next Link list design task (137, 146, 158 or the proposed
281): switch it to the shared resolver then. Its resolver is deliberately untouched in Task 156.
