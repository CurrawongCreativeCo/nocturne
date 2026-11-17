# Task 156: draft plan amendments (proposed, not applied)

**Status:** drafted on 7 November 2026 after the owner approved decisions D5 to D7 and the three-view policies.
**Nothing here has been applied.** The published plan and every task status are unchanged.

**Task numbers 280 and 281 are provisional.** The live plan (checked 7 November 2026) has 279 tasks, so
neither task exists. Check the next free numbers again immediately before publishing, and if either differs,
change the number in the blocks below and in the code, which names them in
`src/lib/design/capability-baseline-changes.ts` (task 280) and `src/lib/design/capability-exceptions.ts`
(task 281).

**How to apply (once approved):** append each block verbatim to the named task's prompt in the live plan, as
the earlier `*-canonical-patch` folders did, and add the two new tasks as new cards. No existing task's title,
dependencies, size, priority or status changes.

## Task 156

```text
ADDITION (7 November 2026, after the Link list migration and the three views)
- Done on the Link list: its Cards box, its link's Appearance switch (links[].design.appearance) and its
  contrast warning now come from the shared builders, with the same stored paths, values and wording, and
  card and item decorative marks are offered on every layout. The links[].design.appearance exception is
  removed. headingDisplay, profile.nameDisplay and links[].groupDisplay already share one helper
  (textOrImageFields) and stay as they are: the item Appearance builder doesn't cover a text or picture choice.
- profileDesign and categoryDesign stay as temporary compatibility exceptions: their stored paths are flat,
  so the shared builders can't produce them without a stored-data migration, which this task doesn't do.
  Their removal moves to task 281.
- The three views (the event details card, the service page and search results) are declared with kind
  `view`. They have no schema or drawer yet: those arrive with each pair's evidence, in the tasks that
  close it. Every pair they can't close here is a reviewed `admit` row in BASELINE_CHANGES (16 close in task
  280, one each in 146, 177 and 151). Declaring them did not add a settings document and migrated no data.
- Features grid's conditional card surface closes in task 276, not here.
- DONE WHEN: no baseline pair closes with this task, and no exception names it as its removal task.
```

## Task 146

```text
ADDITION (7 November 2026, from task 156's three views)
The event details card (events/components/event-view.tsx) draws a fixed shadow-card. Task 156 declares
its depth as Required at card scope with this task as the closing task, so the card joins the cards this
task adopts: the card's shadow level and glow come from the shared depth builder, and an empty choice keeps
today's look. Where the choice is stored is task 280's decision.
```

## Task 148

```text
ADDITION (7 November 2026, from task 156's three views)
The search form's button (search/components/search-form.tsx) is hand-styled (bg-cta, rounded-button)
instead of CtaLink, so the Buttons record doesn't reach it. This task adopts it with the other buttons
(the coverage record, FUTURE_COVERAGE, notes it). No design capability is declared or admitted for it
before then.
```

## Task 151

```text
ADDITION (7 November 2026, from task 156's three views)
The service page (services/components/service-view.tsx) separates its groups (who it is for, locations,
people, evidence, articles, FAQ) with plain border-t rules, as the Team member page does. Task 156 declares
the service page's divider as Required at section scope with this task as the closing task, so these rules
join the places this task adopts.
```

## Task 177

```text
ADDITION (7 November 2026, from task 156's three views)
The service page's picture (services/components/service-view.tsx) is cropped to a fixed 16:9 (aspect-video).
Task 156 declares its framing as Required at section scope with this task as the closing task, so it joins
the pictures this task adds Adjust picture to, with Events' picture on the event page.
```

## Task 276

```text
ADDITION (7 November 2026, from task 156's three views)
Task 275's patch records the Features grid's card surface as Conditional on a layout or look that draws
items on a card, closing in this task. The capability declaration now says so (closingTask: 276). Closing
it is part of this task's DONE WHEN: when the cards family draws items on a card, its surface comes from
the shared card builders.
```

## Task 280 (new, proposed)

```text
TITLE
Standalone view design settings and adoption

WHERE / CONTEXT / SIZE / PRIORITY
Template, template context, Medium, Later. After task 156 and task 275.

TASK
Give the event details card, the service page and search results the design controls task 156 declared
them as needing, using the shared builders only. Decide where each view's design is stored (a settings
document for each, or one, agency only, as Blog settings does for the post cards), get the owner's approval
for any new document type before building it, and add nothing that migrates stored data.

TODAY (verify in the code)
- The event details card, the service page and search results style their own text and, for the card, a
  fixed fill, ring, shadow and corners, in event-view.tsx, service-view.tsx and search-view.tsx.
- Task 156 declared all three as views and admitted 16 pairs with this task as the closing task:
  eventDetailsCard surface, mark and text (title, label, body, meta), servicePage text (heading, intro,
  price, title, body, label, description) and searchResults text (title, meta, body).

REQUIREMENTS
1. Settle where each view's design lives, with the owner's approval, before any new document type.
2. The event details card: a Cards box from cardDesignField (surface, text roles, decorative mark).
3. The service page and search results: text roles from textRoleField, with the role mapping in
   BASELINE_CHANGES (for example a FAQ's question is label and its answer is description; the search status
   and each path are meta; a snippet is body).
4. Add each view's VIEW_SCHEMAS entry and VIEW_DRAWERS drawer, and evidence for every pair this task closes,
   so each pair verifies and leaves the baseline.
5. Unset output matches today's byte for byte, and the status notices (Sold out, Cancelled) keep their
   fixed, checked colours.
6. Public JavaScript and Sanity requests are unchanged.

DONE WHEN
Every pair that closes with this task is verified, the baseline no longer lists it, and unset output is
unchanged. npm run check passes.
```

## Task 281 (new, proposed)

```text
TITLE
Legacy Link list design migration, preserving stored data

WHERE / CONTEXT / SIZE / PRIORITY
Template, template context, Medium, Later. After task 156.

TASK
Move the Link list's profileDesign and categoryDesign onto the shared builders, and remove their two
temporary exceptions, without losing any stored value.

TODAY (verify in the code)
- profileDesign holds the picture size, shape, ring and frame and the name and bio colours; categoryDesign
  the inline list's type and separator. Their stored paths are flat (for example profileDesign.imageSize,
  categoryDesign.size), written before the shared parts existed.
- The shared builders store a role as an object named for it, so the same controls would sit at different
  paths: moving them is a stored-data change.
- Task 156 left both as temporary exceptions and migrated nothing.

REQUIREMENTS
1. Propose the migration as a dry run first (what it would change in a dataset, with a rollback), and get
   the owner's approval before running any of it.
2. Keep reading the old paths until a document is migrated, so no page changes in between.
3. Remove both exceptions from capability-exceptions.ts and keep the separator and phone layout controls as
   reviewed permanent exceptions if no shared builder covers them.
4. Unset output and every saved value render the same as before.

DONE WHEN
Both exceptions are gone (or the two controls above are permanent with a reason), the migration has run
where approved, and npm run check passes.
```
