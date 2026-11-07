# Task 156: the three views, proposed declarations (revision 2, for the owner's review)

Status: **approved by the owner on 7 November 2026 (D5 to D7) and applied in code.** The three views are
declared, their gaps are admitted in `BASELINE_CHANGES`, and the contract holds with 30 components declared,
84 required and 40 conditional pairs (65 required before). This file is the record of the reasoning. The
two differences from revision 2 are below. The plan amendments are drafted in `t156-plan-amendments.md`
and not applied. Tasks 280 and 281 are proposed and not yet in the canonical plan, so their numbers are
provisional.

The full state below was dry-run against the real contract on 7 November 2026 at commit c40df08, then
removed. The contract holds with 30 components declared, 84 required and 40 conditional pairs in the baseline
(65 required today). The only tests that change are the contract snapshot and capability-docs.test.ts's "keeps
the three views that are not covered yet visible", which is removed.

Task numbers were checked against the live build plan: it has 279 tasks, 277 to 279 are the newest, and
nothing reserves 280 or 281. Tasks 136, 139, 140 and 152 (the Link list's earlier design tasks) are done, so
none of them can own the exception removal.

## Still to decide

| #   | Question                                                                                                                                                                                                                                | Proposed                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| D5  | The event card is a card, and every other card family has a card mark. Once task 280 gives it a Cards box (`cardDesignField`), the mark comes with that box.                                                                            | Required, closing 280. The alternative is Not applicable, with a reason you give.                                  |
| D6  | The service page's groups are separated by `mt-12 border-t border-line pt-8`, the same rule as the Team member page, and the approved record gives Team member pages' dividers to task 151. The service page's record says `needs: []`. | Required, closing 151 (its owner). The alternative is Not applicable: "A structural rule, not a divider position". |
| D7  | Role names where the vocabulary has no exact match: the service page's FAQ question and answer (the FAQ section calls them title and body, but the page's `title` is its group headings), and the search status line.                   | FAQ question `label`, FAQ answer `description`, search status line `body`.                                         |

## Capability matrix

R is Required, NA is Not applicable. Every view is `kind: 'view'` with `layouts: []`. A closing task is left
out of the declaration when it is the capability's registry owner, as the contract requires.

### Event details card (`eventDetailsCard`, events/components/event-view.tsx)

| Capability   | Policy | Scope | Roles                    | Closing | Reason or anatomy                                                                                                                                                                  |
| ------------ | ------ | ----- | ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| surface      | R      | card  |                          | 280     | `<aside>`: `rounded-card bg-surface ring-1 ring-line`                                                                                                                              |
| text         | R      | card  | title, label, body, meta | 280     | title: h2 "Event details". label: each `dt`, the series' "Next dates" and the "Add to calendar" h3. body: each `dd`. meta: the muted secondary lines (time zone and span, address) |
| header       | NA     |       |                          |         | Not a section: the card's heading is its title role, with no eyebrow or intro                                                                                                      |
| mark         | R      | card  |                          | 280     | D5                                                                                                                                                                                 |
| depth        | R      | card  |                          | 146     | `shadow-card` (D3)                                                                                                                                                                 |
| icon         | NA     |       |                          |         | Draws no icon from the set                                                                                                                                                         |
| action       | NA     |       |                          |         | No link covers a whole card                                                                                                                                                        |
| framing      | NA     |       |                          |         | The card holds no picture. The event's picture is the page's (Event pages, task 177)                                                                                               |
| pictureDepth | NA     |       |                          |         | The card holds no picture                                                                                                                                                          |
| overlay      | NA     |       |                          |         | No picture with a wash over it                                                                                                                                                     |
| glass        | NA     |       |                          |         | Sits on the page's plain background, so a glass panel has nothing to show through                                                                                                  |
| divider      | NA     |       |                          |         | The rule above Add to calendar is the group's border, not a divider position                                                                                                       |
| edge         | NA     |       |                          |         | Not a section, so it has no edge                                                                                                                                                   |
| motion       | NA     |       |                          |         | Has no section frame to animate                                                                                                                                                    |
| slots        | NA     |       |                          |         | Not a slot family (DE-2)                                                                                                                                                           |

Not a text role: the Sold out and Cancelled notices. Their colours are the status's meaning, held to fixed,
checked pairs (`bg-highlight`/`text-highlight-ink`, `bg-danger-surface`/`text-danger-ink`). Inline links keep
the body's link style. The registration button is Buttons (CtaLink), tasks 148 and 137.

### Service page (`servicePage`, services/components/service-view.tsx)

| Capability   | Policy | Scope   | Roles                                                  | Closing | Reason or anatomy                                                                                                                                                                 |
| ------------ | ------ | ------- | ------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| surface      | NA     |         |                                                        |         | Draws no card: its groups are separated by a rule                                                                                                                                 |
| text         | R      | section | heading, intro, price, title, body, label, description | 280     | heading: h1 name. intro: summary. price. title: each group's h2. body: the rich-text body, Who it's for and the linked lists. label and description: FAQ question and answer (D7) |
| header       | NA     |         |                                                        |         | A page, not a section: its h1 and summary are the heading and intro text roles                                                                                                    |
| mark         | NA     |         |                                                        |         | A page, not a section, and it draws no card                                                                                                                                       |
| depth        | NA     |         |                                                        |         | No surface for a shadow to sit on (146)                                                                                                                                           |
| icon         | NA     |         |                                                        |         | Draws no icon from the set                                                                                                                                                        |
| action       | NA     |         |                                                        |         | No link covers a whole card. Its enquiry button is Buttons (CtaLink), tasks 148 and 137                                                                                           |
| framing      | R      | section |                                                        | 177     | `SanityImage`, `aspect-video rounded-card` (D4)                                                                                                                                   |
| pictureDepth | NA     |         |                                                        |         | Draws no shadow or glow on its picture                                                                                                                                            |
| overlay      | NA     |         |                                                        |         | No picture with a wash over it                                                                                                                                                    |
| glass        | NA     |         |                                                        |         | No card surface (156 item 10)                                                                                                                                                     |
| divider      | R      | section |                                                        | 151     | D6                                                                                                                                                                                |
| edge         | NA     |         |                                                        |         | Not a section, so it has no edge                                                                                                                                                  |
| motion       | NA     |         |                                                        |         | Has no section frame to animate                                                                                                                                                   |
| slots        | NA     |         |                                                        |         | Not a slot family (DE-2)                                                                                                                                                          |

### Search results (`searchResults`, search/components/search-view.tsx)

| Capability   | Policy | Scope   | Roles             | Closing | Reason or anatomy                                                                                                                            |
| ------------ | ------ | ------- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| surface      | NA     |         |                   |         | Results are rows, with no card                                                                                                               |
| text         | R      | section | title, meta, body | 280     | title: each result's h2 link. meta: its path and the count or status line. body: its snippet (D7: status is meta, explanatory prose is body) |
| header       | NA     |         |                   |         | The page's h1 is drawn by the route (app/(site)/search/page.tsx), outside this view                                                          |
| mark         | NA     |         |                   |         | Results are rows, with no card to carry one                                                                                                  |
| depth        | NA     |         |                   |         | No surface for a shadow to sit on (146)                                                                                                      |
| icon         | NA     |         |                   |         | Draws no icon from the set                                                                                                                   |
| action       | NA     |         |                   |         | No link covers a whole card                                                                                                                  |
| framing      | NA     |         |                   |         | Has no framed picture                                                                                                                        |
| pictureDepth | NA     |         |                   |         | Has no framed picture                                                                                                                        |
| overlay      | NA     |         |                   |         | Draws no picture                                                                                                                             |
| glass        | NA     |         |                   |         | No card surface (156 item 10)                                                                                                                |
| divider      | NA     |         |                   |         | Results are spaced rows, with no rule or divider position                                                                                    |
| edge         | NA     |         |                   |         | Not a section, so it has no edge                                                                                                             |
| motion       | NA     |         |                   |         | Has no section frame to animate                                                                                                              |
| slots        | NA     |         |                   |         | Not a slot family (DE-2)                                                                                                                     |

Not a text role: the search form. Its input and its hand-styled `bg-cta` button are form controls; see plan
amendment A8.

## Baseline admission rows (19, as applied)

D7 maps the search status line to `meta` and its snippet to `body`, so search results need three text rows, not four: 19 rows in all, and 16 close in task 280. The exact rows are in `src/lib/design/capability-baseline-changes.ts`.

One row per pair. `reviewer` and `reviewed` are yours to fill in. With D5 or D6 declined, drop that row and
use the Not applicable reason instead.

```ts
const VIEW_ADMITTED = { reviewer: '<owner>', reviewed: '<date>', layouts: [null] } as const

// Event details card
{ kind: 'admit', component: 'eventDetailsCard', capability: 'surface', scope: 'card', closingTask: 280, ...VIEW_ADMITTED,
  reason: 'The card’s fill, border and corners are fixed. Task 280 gives the view a design to store them in.' },
...(['title', 'label', 'body', 'meta'] as const).map((role) => (
{ kind: 'admit', component: 'eventDetailsCard', capability: 'text', scope: 'card', role, closingTask: 280, ...VIEW_ADMITTED,
  reason: 'The card’s text is styled in the component. Task 280 gives the view text roles.' })),
{ kind: 'admit', component: 'eventDetailsCard', capability: 'mark', scope: 'card', closingTask: 280, ...VIEW_ADMITTED,
  reason: 'A card with no mark yet. It comes with the Cards box task 280 adds (D5).' },
{ kind: 'admit', component: 'eventDetailsCard', capability: 'depth', scope: 'card', closingTask: 146, ...VIEW_ADMITTED,
  reason: 'The card draws a fixed shadow, with no depth control yet.' },

// Service page
...(['heading', 'intro', 'price', 'title', 'body', 'label', 'description'] as const).map((role) => (
{ kind: 'admit', component: 'servicePage', capability: 'text', scope: 'section', role, closingTask: 280, ...VIEW_ADMITTED,
  reason: 'The page’s text is styled in the component. Task 280 gives the view text roles.' })),
{ kind: 'admit', component: 'servicePage', capability: 'framing', scope: 'section', closingTask: 177, ...VIEW_ADMITTED,
  reason: 'The page’s picture has a fixed 16:9 crop, with no Adjust picture yet.' },
{ kind: 'admit', component: 'servicePage', capability: 'divider', scope: 'section', closingTask: 151, ...VIEW_ADMITTED,
  reason: 'The rules between the page’s groups are plain borders, with no decorative divider yet (D6).' },

// Search results
...(['title', 'meta', 'body'] as const).map((role) => (
{ kind: 'admit', component: 'searchResults', capability: 'text', scope: 'section', role, closingTask: 280, ...VIEW_ADMITTED,
  reason: 'The results’ text is styled in the component. Task 280 gives the view text roles.' })),
```

## Other code in the same change

- **Features grid surface:** `closingTask: 276` on its conditional card surface, with the baseline updated
  in the same commit (`--update-baseline`). That is the reviewed path for reassigning a gap, and it needs no
  admit row.
- **The two exception rows:** `profileDesign` and `categoryDesign` keep `status: 'temporary'`, with
  `removalTask: 281`. No stored data changes.
- **Coverage record:** remove the three `declaredBy: 156` rows from `FUTURE_COVERAGE`. Event pages (177, 151),
  Team member pages and Buttons stay.
- **`capability-docs.ts:224`:** no longer type-checks once no row is without tasks, and its sentence needs
  rewording. The capability-docs test for the three views goes.
- **No drawers yet:** a view needs a `VIEW_SCHEMAS` entry and a `VIEW_DRAWERS` drawer only once it has
  evidence, which comes with tasks 280, 146, 177 and 151.

## Canonical-plan amendments needed

| #   | Task          | Amendment                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 156           | Apply the 7 November ADDITION (README.md in this folder): 156 declares the three views. It is not in the live plan yet.                                                                                                                                                                                                                                                                                                                                                            |
| A2  | **280 (new)** | "Design settings for page views: the event details card, the service page and search results." Decide where a view's design is stored: per document type or one settings document, agency only, as Blog settings does for post cards. Build the event card's Cards box (surface, text roles, mark) with `cardDesignField`, and text roles for the service page and search results, using the shared builders only. Closes the 17 admitted pairs above. Template, Later, after 156. |
| A3  | **281 (new)** | "Link list profile and service categories onto the shared builders." Removes the `profileDesign` and `categoryDesign` exceptions. Their stored paths are flat, so this needs a stored-data migration and the owner's separate approval before it starts. Template, Later.                                                                                                                                                                                                          |
| A4  | 146           | Add the event details card (`shadow-card`) to the cards that adopt Depth and glow. Its list names event cards (list and featured) only.                                                                                                                                                                                                                                                                                                                                            |
| A5  | 177           | Add the service page's picture (16:9) to the candidates. Its list names "Events: the event image (cards and the event page)" but no service page.                                                                                                                                                                                                                                                                                                                                  |
| A6  | 276           | Record that the Features grid's conditional card surface closes in 276. The task 275 patch says so, but 276's live text doesn't.                                                                                                                                                                                                                                                                                                                                                   |
| A7  | 151           | Only if D6 is Required: add the service page's group rules, as for team and event pages.                                                                                                                                                                                                                                                                                                                                                                                           |
| A8  | 148           | Finding, no gap admitted: the search form's button is hand-styled (`bg-cta`) rather than `CtaLink`, so the Buttons (CtaLink) record doesn't reach it. Decide whether 148 adopts it.                                                                                                                                                                                                                                                                                                |
