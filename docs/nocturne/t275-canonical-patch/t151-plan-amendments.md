# Task 151: draft plan amendments for the Service page and Event page dividers (proposed, not applied)

**Status:** drafted on 11 November 2026, after the owner decided (11 November) that the Service page and Event
page dividers are deferred to the standalone-view design work, "only through a formal Build Plan amendment".
**Nothing here has been applied.** The published plan, every task status, the capability baseline and the code
are unchanged by this document.

## Owner decisions (11 November 2026)

| Decision               | Approved direction                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Task 151               | Formally defer the Service page and Event page dividers                                    |
| Task 280               | Create it as "Standalone view design settings and adoption"                                |
| Service page           | Transfer its existing divider obligation to task 280                                       |
| Event page             | Declare it as a standalone view in task 280, separate from the Event details card          |
| Event divider position | Full width, between the page header and the main content grid                              |
| New settings documents | Decide during task 280, not task 151                                                       |
| Capability baseline    | Change only after the live plan amendment is published                                     |
| Task 151 status        | **Not Done.** Part B (Contour, Tide, Ribbon and the optional measured Drift) still remains |

## What was checked (11 November 2026)

- **The live plan is version 22 with 279 tasks.** Read from the published page: the last prompt cards are
  `p-275` to `p-279` ("277 to 279, added on 6 November 2026, are the newest"), and the text "Standalone view" is
  nowhere in it. **There is no task 280.** Task 280 exists only as the provisional draft in
  `t156-plan-amendments.md` (7 November), which says the same: "neither task exists".
- **Nothing may be transferred to it yet.** Moving the Service page divider's closing task to 280 in the code
  would name a task the plan doesn't have, and the owner's rule is to publish the amendment first. So no code,
  declaration or baseline entry changes with this document.
- **The 7 November draft of task 280 does not yet cover this work.** It names three views: the _event details
  card_, the service page and search results. It says nothing about:
  1. the **Event page** as a standalone view of its own (the card is one part of the page: `event-view.tsx`
     draws a header with the summary, then a grid holding the details card beside the picture and the body);
  2. a **divider** between either page's summary and body.
     Its requirement 1 (decide where each view's design is stored, with the owner's approval before any new
     document type) is the decision this work needs, so the fit is good; the wording needs the two additions below.
- **Task numbers are still provisional.** Re-check the next free number immediately before publishing; if it is
  not 280, change it in the blocks below and in the code that names it
  (`src/lib/design/capability-baseline-changes.ts`).

## Why storage and view adoption belong in the standalone-view task

1. **Both pages' design has nowhere to live yet.** A divider is a stored choice. The Team member page and the
   footer each store theirs in an existing agency-only settings document (`teamPageSettings.dividerDesign`,
   `siteNavigation.footerDividerDesign`). The Service page and the Event page have none, and Task 280 is the
   task chartered to decide where each standalone view's design is stored.
2. **A new document type needs the owner's approval first, and a wrong guess means a migration.** If Task 151
   created `servicePageSettings` and `eventPageSettings` and Task 280 then chose one shared document, the stored
   dividers would have to be migrated. Task 280's own scope says it adds nothing that migrates stored data.
3. **Real evidence needs the views split first.** `ServiceView` and `EventView` fetch their own data, and
   neither has a view schema or a drawer (`VIEW_SCHEMAS`, `VIEW_DRAWERS`), so the contract's evidence can't
   draw them. Splitting each into a pure page and a drawer is the same adoption work Task 280 does for the same
   views; doing it twice is churn.
4. **The Event page is a new standalone view, not just a divider.** Declaring it under the contract adopts every
   capability that applies, and each gap it can't close in its own task needs a reviewed `admit` row. That is
   Task 280's work (it already declares and admits the event details card).

## Task 151 (revision)

```text
REVISION (11 November 2026, owner's decision on the Service page and Event page dividers)
- The Service page and Event page dividers (between each page's summary and body) are deferred to the
  standalone-view design task (task 280 once the plan publishes it), because both pages' design storage and
  view adoption are decided there, and creating a settings document here would pre-empt that decision.
- Done for Part A therefore means: Part A is merged with task 275 evidence for every other consumer (the
  section header's divider on every section with a SectionHeader, the Hero, Image + text, Rich text, the
  footer, and the Team member page), and the Service page's divider pair stays in the capability baseline
  with the standalone-view task as its closing task. The Event page divider is that task's new requirement.
- This replaces item 2's mention of event pages and the 7 November addition's closing task for the Service
  page's divider. Nothing else in this task changes.
```

## Task 280 (new, proposed): revised draft

Replaces the 7 November block in `t156-plan-amendments.md`. The additions are marked **(new)**.

```text
TITLE
Standalone view design settings and adoption

WHERE / CONTEXT / SIZE / PRIORITY
Template, template context, Medium, Later. After task 156 and task 275.

TASK
Give the event details card, **(new) the event page**, the service page and search results the design
controls they need, using the shared builders only. Decide where each view's design is stored (a settings
document for each, or one, agency only, as Blog settings and Team page settings do), get the owner's approval
for any new document type before building it, and add nothing that migrates stored data.

TODAY (verify in the code)
- The event details card, the service page and search results style their own text and, for the card, a
  fixed fill, ring, shadow and corners, in event-view.tsx, service-view.tsx and search-view.tsx.
- Task 156 declared the card, the service page and search results as views and admitted 16 pairs with this
  task as the closing task: eventDetailsCard surface, mark and text (title, label, body, meta), servicePage
  text (heading, intro, price, title, body, label, description) and searchResults text (title, meta, body).
- **(new)** The event page itself is not declared: only its details card is. event-view.tsx draws a header
  (the summary), then a grid with the details card beside the picture and the body.
- **(new)** The service page's divider is a Required pair (servicePage, divider, section) in the baseline.
  Task 151 moved it here (11 November 2026): the page separates its groups with plain border-t rules and has
  nowhere to store a divider.

REQUIREMENTS
1. Settle where each view's design lives, with the owner's approval, before any new document type. The
   precedents are Blog settings and Team page settings (a flat, agency-only singleton per feature, with no
   initial values).
2. The event details card: a Cards box from cardDesignField (surface, text roles, decorative mark).
3. The service page and search results: text roles from textRoleField, with the role mapping in
   BASELINE_CHANGES (for example a FAQ's question is label and its answer is description; the search status
   and each path are meta; a snippet is body).
4. Add each view's VIEW_SCHEMAS entry and VIEW_DRAWERS drawer, and evidence for every pair this task closes,
   so each pair verifies and leaves the baseline.
5. Unset output matches today's byte for byte, and the status notices (Sold out, Cancelled) keep their
   fixed, checked colours.
6. Public JavaScript and Sanity requests are unchanged.
7. **(new) The event page as a standalone view, distinct from the event details card.** Split EventView into
   a pure page and its data fetch (as TeamMemberPage was), declare it as a view with every capability that
   applies, add its VIEW_SCHEMAS entry and drawer, and record each gap it can't close here as a reviewed
   `admit` row with its closing task. The details card stays its own declared view.
8. **(new) A divider between the summary and the body on the service page and the event page**, using the
   shared decorativeDivider, its resolver and DecorativeDivider only:
   - stored where requirement 1 decides, agency only, with no initial value;
   - drawn only when the page has a body that says something (words or a picture);
   - explicit spacing (the divider owns 24px each side and the adjacent content gives up its margin; no
     reliance on margins collapsing); the existing border-t rules between the service page's groups stay;
   - the event page's divider sits between the page header/summary and the main content grid, spanning the
     page content width. It is not inserted inside the event details card or the body column;
   - unset output is byte-identical; real evidence for each page, including resolver disconnection, closes
     the servicePage divider pair and the event page's.

DONE WHEN
Every pair that closes with this task is verified, the baseline no longer lists it (including the
servicePage divider pair), the event page is declared with its evidence and reviewed admissions, both pages
draw their divider only where one is chosen, and unset output is unchanged. npm run check passes.
```

## The code-side change this will need (prepared, not applied)

Apply only after the plan publishes the task and the owner reviews the row.

1. `src/features/services/schemas/service-page-capabilities.ts`: `divider: { policy: 'required', scope:
'section', closingTask: 280 }` (the number the plan publishes).
2. `src/lib/design/capability-baseline-changes.ts`: one reviewed row for the moved pair. `reviewer` and
   `reviewed` must record an actual owner review of this row and its date: they are never invented or
   defaulted, and the row is not committed until the owner gives them:

   ```ts
   {
     kind: 'admit',
     component: 'servicePage',
     capability: 'divider',
     scope: 'section',
     layouts: [null],
     reason: 'The page separates its groups with plain border-t rules and has no document to store a divider in. The standalone-view design task decides where it lives (task 151 moved it there, 11 November 2026).',
     reviewer: '<owner>',
     reviewed: '<date of the owner’s review>',
     closingTask: 280,
   }
   ```

3. `capability-baseline.json`: the servicePage divider entry's `closingTask` changes from 151 to 280. Run
   `npm run design-capabilities` and `npm run design-capabilities -- --against-file <base baseline>`; the only
   difference from the base commit must be that one row.
4. Nothing else changes: no `servicePageSettings` or `eventPageSettings`, no `eventPage` declaration (that is
   requirement 7 of task 280), and no other baseline entry.

## How to apply to the live plan (the owner publishes; not done)

The live plan is a public artifact the assistant has no edit access to, and it stores task progress with the
page, so **it must be updated in place**: publishing a copy as a new artifact would lose every task's saved
status. The method is the earlier `*-canonical-patch` folders': read the page, strip the platform skeleton
(line 1 and the final line), apply each change asserting it matches exactly once, check the data script
parses, and republish to the same artifact.

1. Recheck that 280 is still the next free number (the plan was last read on 11 November: 279 tasks, version 22,
   no task 280). If it differs, change the number in the blocks above and in the code named below.
2. Append the **Task 151 (revision)** block verbatim to task 151's prompt (`p-151`), after its 6 November
   addition. Task 151's status stays as it is: it is **not** Done.
3. Add the revised **Task 280** block as a new card (Template, template context, Medium, Later; after tasks 156
   and 275), and add task 280 to the task list.
4. Verify both changes are visible in the published version: `p-151` ends with the 11 November revision, and
   `p-280` exists with requirements 7 and 8.
5. Only then apply the code-side change below, after the owner reviews the baseline row, and commit it on its
   own.
