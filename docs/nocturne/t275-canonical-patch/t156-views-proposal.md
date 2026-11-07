# Task 156: the three views, proposed declarations (for the owner's review)

Status: **proposed, not applied.** Nothing here is in the code. The declarations and rows were dry-run
against the real contract on 7 November 2026 at commit 68451ce and then removed. With the three rows below
the contract holds at 30 components, 68 required and 40 conditional pairs. Without them, exactly those
three pairs fail as "pending and isn't in the baseline".

The closing tasks shown are each capability's registry owner (`CAPABILITIES[].owner`), which is the
contract's default. They are **not approved**: task 146's and task 177's plan text doesn't name these
views, and task 156's doesn't say where an event card's design would be stored. Decisions D1 to D4 settle
them.

## Decisions needed

| #   | Question                                                                                                                                                                                                               | Options                                                                                                                                                | Recommendation                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Who closes the event card's **surface**, and where is it stored? The approved coverage record says `needs: ['surface']`, but events have no settings document, and a per-event box would let each event's card differ. | (a) Task 156 builds it now: a Cards box in a new agency-only settings document, like Blog settings. (b) Admit it as a gap, closing in a task you name. | (a) only if you accept a new document type in task 156. Otherwise (b): the row then stays in the baseline and needs its closing task from you. |
| D2  | The views draw real **text** (the card's heading and details, the service page's headings and price, each result's title, path and snippet), and the coverage record lists no text need.                               | (a) Not applicable, as drafted. (b) Required by role, each role with its own admit row and closing task.                                               | (a): it matches the approved record and adds no gap.                                                                                           |
| D3  | The event card draws `shadow-card`, so **depth** can't honestly be "no surface". The record doesn't list it.                                                                                                           | (a) Required, closing in 146, with the row below and an amendment to 146. (b) Not applicable, reason "a fixed shadow, with no design control".         | (a): every other card with a shadow is Required at card scope.                                                                                 |
| D4  | The service page draws a cropped picture (`aspect-video`), like Event pages and the Blog post page, which both name task 177. The record says `needs: []`.                                                             | (a) Required, closing in 177, with the row below and an amendment to 177. (b) Not applicable, reason "fixed crop, with no design control".             | (a): same anatomy, same owner.                                                                                                                 |

If you choose (b) for D3 and D4 and (a) for D1, no admit row is needed once task 156's surface is verified.

## Declarations

Each is `kind: 'view'`, `layouts: []`, in the feature that draws it: `src/features/events/schemas/`,
`src/features/services/schemas/` and `src/features/search/` (the search feature has no schemas folder yet),
registered in `DESIGN_COMPONENTS` (`src/app/design-components.ts`).

```ts
const NOT_A_SECTION = notApplicable('Not a section, so it has no edge')
const NO_FRAME_TO_ANIMATE = notApplicable('Has no section frame to animate')
const PAGE_H1 = notApplicable('The page’s own h1 heads it')
const NO_PICTURE_OVERLAY = notApplicable('No picture with a wash over it')

// id: 'eventDetailsCard', title: 'Event details card'
export const eventDetailsCardCapabilities = declareCapabilities({
  surface: { policy: 'required', scope: 'card' }, // D1
  text: notApplicable(
    'Page typography: the card’s text takes no design setting (future coverage: surface only)',
  ), // D2
  header: notApplicable('The page’s own h1 heads the page; “Details” is the card’s fixed label'),
  mark: notApplicable(
    'A card of dates and places, with no decoration (future coverage: surface only)',
  ),
  depth: { policy: 'required', scope: 'card' }, // D3
  icon: NOT_APPLICABLE.noIcon,
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: notApplicable(
    'The card holds no picture. The event’s picture is the page’s (Event pages, task 177)',
  ),
  pictureDepth: notApplicable('The card holds no picture'),
  overlay: NO_PICTURE_OVERLAY,
  glass: notApplicable(
    'Sits on the page’s plain background, so a glass panel has nothing to show through',
  ),
  divider: notApplicable(
    'The card has no divider position. Dividers on the page are Event pages, task 151',
  ),
  edge: NOT_A_SECTION,
  motion: NO_FRAME_TO_ANIMATE,
  slots: NOT_APPLICABLE.notASlotFamily,
})

// id: 'servicePage', title: 'Service page'
export const servicePageCapabilities = declareCapabilities({
  surface: notApplicable('Draws no card: its groups are separated by a rule'),
  text: notApplicable('Page typography: its text takes no design setting (future coverage: none)'), // D2
  header: PAGE_H1,
  mark: notApplicable('Draws no card or section to carry one'),
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: NOT_APPLICABLE.noIcon,
  action: notApplicable(
    'No link covers a whole card. Its enquiry button is Buttons (CtaLink), tasks 148 and 137',
  ),
  framing: { policy: 'required', scope: 'section' }, // D4
  pictureDepth: notApplicable('Draws no shadow or glow on its picture'),
  overlay: NO_PICTURE_OVERLAY,
  glass: NOT_APPLICABLE.noCardSurface,
  divider: notApplicable(
    'Its rules separate groups of content and are not decorative: no divider position',
  ),
  edge: NOT_A_SECTION,
  motion: NO_FRAME_TO_ANIMATE,
  slots: NOT_APPLICABLE.notASlotFamily,
})

// id: 'searchResults', title: 'Search results'
export const searchResultsCapabilities = declareCapabilities({
  surface: notApplicable('Results are rows, with no card'),
  text: notApplicable('Page typography: its text takes no design setting (future coverage: none)'), // D2
  header: PAGE_H1,
  mark: notApplicable('Results are rows, with no card to carry one'),
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: NOT_APPLICABLE.noIcon,
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: NOT_APPLICABLE.noFramedPicture,
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: notApplicable('Draws no picture'),
  glass: NOT_APPLICABLE.noCardSurface,
  divider: notApplicable('Results are rows, with no divider position'),
  edge: NOT_A_SECTION,
  motion: NO_FRAME_TO_ANIMATE,
  slots: NOT_APPLICABLE.notASlotFamily,
})
```

## Baseline admission rows

Added to `BASELINE_CHANGES` only for the decisions that need them. `reviewer` and `reviewed` are yours to
give.

```ts
{
  kind: 'admit',
  component: 'eventDetailsCard',
  capability: 'surface',
  scope: 'card',
  layouts: [null],
  reason: 'The card’s fill, border and corners are fixed today, and no document holds a design for it yet.',
  reviewer: '<owner>',
  reviewed: '<date>',
  closingTask: 156, // D1(b): replace with the task you name. D1(a): no row.
},
{
  kind: 'admit',
  component: 'eventDetailsCard',
  capability: 'depth',
  scope: 'card',
  layouts: [null],
  reason: 'The card draws a fixed shadow, with no depth control yet.',
  reviewer: '<owner>',
  reviewed: '<date>',
  closingTask: 146, // D3(a), with an amendment to task 146.
},
{
  kind: 'admit',
  component: 'servicePage',
  capability: 'framing',
  scope: 'section',
  layouts: [null],
  reason: 'The page’s picture has a fixed crop, with no Adjust picture yet.',
  reviewer: '<owner>',
  reviewed: '<date>',
  closingTask: 177, // D4(a), with an amendment to task 177.
},
```

## What applying it also changes

- Remove the three `declaredBy: 156` rows from `FUTURE_COVERAGE`. The other rows stay, including Event
  pages (177, 151) and Buttons (148, 137).
- `capability-docs.ts:224`: `withoutTasks` no longer type-checks once no row is without tasks (the constant
  list narrows to a literal), and the docs sentence it drives needs rewording.
- `capability-docs.test.ts`, "keeps the three views that are not covered yet visible", goes, replaced by
  each view's row in the generated table.
- A view gets a `VIEW_SCHEMAS` entry and a `VIEW_DRAWERS` drawer only when it has evidence, so only
  D1(a) needs them now.
