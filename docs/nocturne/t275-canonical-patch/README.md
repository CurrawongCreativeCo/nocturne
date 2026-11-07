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

---

# Corrective PR: plan amendments (7 November 2026, proposed, NOT applied)

**Status:** from the independent post-merge audit of task 275 and the owner's decisions D1 to D5 and the review of
PR #157. Nothing here is applied: the published plan and every task status stay as they are until the owner separately
approves. The correction is recorded under task 275 with no new task number (D5). Task 156 waits until the corrective PR
has merged and these blocks are published.

**Owner decisions reflected here:** D1 `BASELINE_CHANGES` register (approved). D2 private-field rows are not pre-approved: the
one row recorded is A1, and the audit inventory stays documentation (`i6-private-control-audit.md`). D3 badge row icon
split (approved; the single admit row, closing task 158). D4 footer and team views belong to task 158, and nothing in
this PR implements them. D5 recorded as an addition to task 275.

Each block is appended to the end of the named task's prompt.

## Task 275

```text
ADDITION (7 November 2026, architecture correction after the post-merge audit)
A corrective PR completes this task's contract, and task 156 doesn't start until it has merged:
- Evidence covers sections, slot blocks, listings and declared views. A slot block is proven in every
  host it is allowed in. A listing or view owns a schema made from its real document types and a
  drawer that draws the real component.
- Text roles and the section header are verified role by role and layout by layout. One passing role
  never verifies another. Independently editable controls (icon container and identity, each divider
  position, each slot) are separate policy parts, and evidence for different fields can't share a cell.
- Baseline growth, or a removal that isn't now verified, needs a reviewed row in BASELINE_CHANGES and is
  compared in CI with the base commit. A missing base baseline fails in the template.
- The private-control check reads design contexts: the Design group at any depth, design-summary
  objects and registered contexts. It judges by where a field is, never by its name or type. An ordinary
  choice, switch or number elsewhere isn't called a design control, and free text outside a design
  context isn't detected: review covers them. The exception register holds only what an enforced rule
  would otherwise reject.
- A change proposal is judged against what will actually be written, re-checked until nothing new is
  rejected.
Task statuses are unchanged.
```

## Task 156

```text
ADDITION (7 November 2026, from task 275's architecture correction)
- Starts only after task 275's corrective PR has merged.
- textRoleField passes its role to the builder stamp. Each role on each layout needs its own evidence
  entry (`role`), and that includes the section header's eyebrow, heading and intro. A role a layout
  doesn't draw is recorded with a layout rule ({ roles, reason }), never left as a passing sibling.
- Blog post cards: Blog settings is a new singleton, `blogSettings`. Add it to the blogPostCards schema
  in src/app/design-components.ts as `settings`, in the design group, register it as a design context
  (src/lib/design/capability-design-contexts.ts), and add its drawer inputs in
  src/app/design-capability-views.tsx.
- Item design objects, such as `plans[].design`, set options.designSummary, so the scan treats them as
  design.
- links[].design.appearance (the inheritance switch in a link's own Appearance) is a temporary design
  exception removed by this task: replace the private implementation with a shared mechanism that keeps
  the saved values and behaviour. headingDisplay, profile.nameDisplay, links[].groupDisplay and their image
  size controls move to the shared implementation too, provided it covers their actual behaviour.
- The three views are declared with kind `view`, each with a schema made from its document type and a
  drawer. Pairs they can't close in this task need a reviewed `admit` row in BASELINE_CHANGES.
```

## Task 158

```text
ADDITION (7 November 2026, from task 275's architecture correction)
- Badge rows: choosing an icon is verified at item scope. The container is Required at section scope,
  closing with this task, and is listed in BASELINE_CHANGES until adopted. Evidence runs in every host
  the block is allowed in.
- Divider centre icons are a Conditional policy part per divider position in the Link list and are
  verified. Other sections adopt them with task 151.
- Social icons in the footer and on team pages count toward DONE WHEN once this task declares each as a
  `view` with a drawer (owner decision D4).
```

## Task 137

```text
ADDITION (7 November 2026, from task 275's architecture correction)
Blog post cards close through the listing adapter: the action field lives in Blog settings
(`settings.*` in the blogPostCards schema) and its evidence draws the real PostCard. Task 156 adds that
schema first. linkList showArrows (hidden, kept for stored values) is a known legacy control that this
task replaces.
```

## Task 146

```text
ADDITION (7 November 2026, from task 275's architecture correction)
Blog post cards close through the listing adapter (`settings.*`), after task 156 adds the schema. The
site-wide Card depth is proven by this task's unit and e2e tests. It is not a contract pair unless a
component declares `site` scope, which has no evidence path yet: propose one before declaring it.
```

## Task 159

```text
ADDITION (7 November 2026, from task 275's architecture correction)
ctaBanner tone, and the Link list's rowStyle and glassStrength, are known legacy design controls that
this task replaces with the single glass system.
```

## Task 213

```text
ADDITION (7 November 2026, from task 275's architecture correction)
The hero's text roles and section header close role by role, with one evidence entry per role and
layout.
```

## Task 276

```text
ADDITION (7 November 2026, from task 275's architecture correction)
- Each look needs independent evidence, whether it is implemented through a `variant`, a preset or
  another reviewed dimension. The contract reads layouts from `variant`, so a look that isn't one is
  proven through its own reviewed dimension and evidence entry; it doesn't have to become a `variant`.
- Before merging, solve content-source marking: a field feeding several sources needs a marker per value,
  and a pending source's field must be rejected by proposals (audit finding L1).
```

## Proposed shared-surface enhancement (owner decision, 7 November 2026)

Task 156 item 9 lists "a brand-gradient border choice for a highlighted card". The owner deferred it: a
Pricing-only gradient would be a private control. It belongs in the shared surface looks, where every card
family could offer it. Proposed owner: task 159, whose one CSS contract already covers each surface's fill,
opacity, border, blur and shadow. Not applied, and not implemented.

Append to task 159's prompt:

```text
ADDITION (7 November 2026, deferred from task 156 item 9)
- A gradient border as a shared surface look, from the brand gradients, available to every card family through
  surfaceFields and CardSurface, not to one section. A ring can't draw a gradient, so choose the technique
  (border-image loses the card's radius; a masked layer or background-clip keeps it) and check contrast and
  forced-colours. Pricing's highlighted plan is the first use. Task 156's DONE WHEN doesn't wait for this.
```

## Page text

```text
OLD: 275, then 216 where 146 and 148 need it, then 156, 158, 137 and 146, one after another
NEW: 275, its corrective PR (7 November 2026), then 216 where 146 and 148 need it, then 156, 158, 137 and 146, one after another

OLD (template context): every new section, slot block or listing declares
NEW (template context): every new section, slot block, listing or view declares

FOOTER, new first paragraph: Amended on 7 November 2026, owner-approved, after the independent post-merge audit of task 275. Task 275 gains a corrective PR (evidence for slot blocks, listings and views; verification per text role; baseline integrity against the base commit; design-context private-control checks), and task 156 waits for it. Tasks 137, 146, 156, 158, 159, 213 and 276 gained additions, and task 275's proposed amendments of 6 and 7 November were applied. Task numbers, statuses, notes and progress are unchanged.
```
