# Plan amendments from task 275 (proposed, not applied)

**Status:** recorded on 6 November 2026 (and 7 November 2026 for task 156's second block and the slot placement) under the owner's decision B ("keep the additional anatomy-based
Required pairs"). **Nothing here has been applied.** The published build plan and every task status stay
as they are until the owner separately approves applying these blocks.

**Where they come from:** task 275's design capability declarations (`src/lib/design/`, README "Design
capability contract"). Reading each component's real anatomy found Required pairs that some owning
tasks' written lists don't name, and a few policies that the tasks word differently. The plan's rule
since 5 November is that an owning task is done only when every Required component in the contract has
adopted its capability, so these change what "done" means for those tasks.

**How to apply (once approved):** append each block below, verbatim, to the end of the named task's
prompt in the live plan (https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL), as earlier `*-canonical-patch`
folders did. No task's title, dependencies, size, priority or status changes.

## Task 156

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
- Required beyond item 6's list, found from each component's anatomy:
  - Process: text roles on every step (label, title, body), at card scope.
  - Team: the List layout's rows draw the same card surface as the grid and slider cards, so
    surfaces apply on all three layouts. List portraits' picture depth and framing stay with tasks
    147 and 177.
- Covered by item 6's own rule (task 275's policy marks them Required): the section header on Image +
  text, the CTA banner and the Link list, and the section-level decorative mark on every section
  except Embed and Video.
- Item 10 is replaced: the form section's, newsletter's and embed facade's surfaces are Required with
  closing task 148 (148 item 6). The CTA banner's inner card surface is Required with closing task 159
  (159 item 3 chooses Panel or card glass). Features grid surfaces are Conditional on a layout or look
  that draws items on a card (task 276).
```

```text
ADDITION (7 November 2026, from task 275's final review; owner's decision on future coverage)
Task 156 is the initial declaration owner for three views the contract doesn't cover yet: the event
details card (`events/components/event-view.tsx`), the service page (`services/components/service-view.tsx`)
and search results (`search/components/search-view.tsx`). This is ownership of bringing each view into
the capability contract (declaring it: its anatomy, which capabilities apply, and each capability's
closing task), not ownership of all its eventual design capabilities. Each capability's closing task is
set when the view is declared, and stays with the task that implements it. DONE WHEN also includes: the
three views are declared, so the contract no longer lists them as not covered.
```

## Task 146

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
- Required beyond item 3's list, from anatomy: the CTA banner (it always draws a card) and the Team
  List layout's rows.
- The form section's, newsletter's and embed facade's depth is Required with closing task 148
  (148 item 6), not this task.
- Conditional, as task 275 records it: Stats on its Cards layout, and FAQ when its item style is Cards
  (the setting task 156 adds).
- Hover lift on blog post cards is recorded under depth, not motion.
```

## Task 137

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
- "Team cards with profile pages" includes the List layout's rows: each row's name link stretches over
  the row, so the row is one link.
- The Events agenda layout is Not applicable: item 4 names the list and the featured card.
- Item 5's trailing indicator on CTA buttons is Conditional on the section having a call to action, on
  the hero, Image + text and the CTA banner.
```

## Task 148

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
Task 275 records the form section's, newsletter's and embed facade's surface (owned by task 156) and
depth (owned by task 146) with this task as their closing task. Closing them is part of this task's
DONE WHEN.
```

## Task 159

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
- Task 275 records the CTA banner's inner card surface (owned by task 156) and its glass with this
  task as the closing task: item 3's decision closes both.
- The Link list's Glass rows draw today but stay pending: `rowStyle` is set inline, with no shared
  glass builder to mark it. The single glass system (item 1) closes it.
```

## Task 213

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
Task 275 records the hero's text roles and section header (eyebrow, heading, intro) as Required with
this task as the closing task, and two reviewed exceptions this task removes: `eyebrowDesign` (onto
the text roles) and `imageShape` (hidden and superseded by Image design; removing it needs a dry-run
migration, approved first). It also records the hero's slot placement (each layout makes room for the
supporting block and places it, such as Editorial widening its grid) as Required, pending, with this
task as the closing task: task 275's evidence proves only that the block is drawn.
```

## Task 276

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
Until the cards family exists, task 275 records the Features grid's text roles as Required with this
task as the closing task, and its surface, depth and action as Conditional on objective triggers: a
layout or look that draws items on a card, and an item link.
```

## Task 177

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
Task 275 records Focus mode on section backgrounds as Conditional on a background picture being set
(`style.image`; the hero's own picture for the hero). Item 2's wording and this task's DONE WHEN are
unchanged. The logo strip's section background is included: item 4 excludes the logos, not the
section's background.
```

## Task 147

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
Task 275 records blog post card and featured event pictures as Conditional on a picture being present,
and the Location map image as Conditional on `mapImage` being set. None of them is Required.
```

## Task 158

```text
ADDITION (6 November 2026, from task 275's design capability contract; owner's decision B)
Task 275 records Pricing's icons as Conditional on a plan listing features (each feature draws a
checkmark). Item 3's audit step still decides whether they become icons from the set.
```

## Task 275

```text
ADDITION (6 November 2026, the owner's decisions on Stage 1)
A declaration entry may also name its layouts (every layout accounted for, by name), list several
scopes, name a part when two policies share a scope, and give a closingTask when another task
implements a pair (the capability keeps its one owner). Conditional triggers are typed and describe
the component's anatomy, layouts or settings, never a task's progress; conditional pairs that aren't
verified are tracked in the baseline like Required ones. Contradictory policies for the same
component, scope, part and layout are rejected.
```

## Slot placement in Image + text (resolved, no amendment)

Task 275 first recorded Image + text's slot placement (each layout places the media and the extra block)
as Required and pending, with closing task 219 (done) and no open owner. On 7 November 2026 it was
measured instead: `tests/e2e/media-text-placement.spec.ts` checks every layout (Media left and right,
Stacked, Text over media, and no picture) at 375, 768 and 1280 px on a fixture page, and the existing
layout puts the supporting block where each layout says (under the picture in the media column, or under
the buttons over the picture). So the placement is Verified, the pending baseline entry is removed, and no
task needs to own it. The layout itself was not changed. If the placement is ever found wrong, the
corrective work belongs to the split-family owner, task 193. The hero's placement stays pending, with
task 213 as its closing task (see task 213 above).

## Still to decide (final acceptance of task 275)

- Nothing is unassigned: the three views have task 156 as their declaration owner (task 156 above).
  Whether task 156's size or priority changes because of them is for the plan's owner to say when the
  amendments are applied.
