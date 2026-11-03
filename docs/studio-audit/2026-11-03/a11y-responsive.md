# Studio keyboard, names and narrow screens (task 173)

Date: 3 November 2026. Evidence: UX-014, UX-017, VD-008, VD-011; task 155's icon picker keyboard check.
Scope: `src/features/studio/components/*`, Start here, Brand colours, Launch & visibility. Sanity's
native controls are out of scope.

## What was verified, and how

| Check                                                                                                                    | Method                                                  | Result                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every icon-only `Button` in `src/features/studio` has an accessible name                                                 | Automated: `icon-button-names.test.ts` scans the source | Pass. The Presentation toggles, team-order arrows and picture zoom and move buttons all carry an `aria-label`.                                                                                                               |
| Preset and icon pickers: one tab stop, arrows, Home and End move focus                                                   | Automated, in jsdom: `picker-keyboard.test.tsx`         | Pass                                                                                                                                                                                                                         |
| Enter and Space                                                                                                          | Automated, in jsdom                                     | Pass for "not intercepted": the cards are native buttons and keydown is not prevented. jsdom does not turn the keys into a click, so activation itself is the browser's behaviour and is **Not verified** in a real browser. |
| Escape and Close fold the grid away, keep the value, return focus to "Change"; Escape does not reach an enclosing dialog | Automated, in jsdom                                     | Pass                                                                                                                                                                                                                         |
| Choosing a card returns focus to "Change"                                                                                | Automated, in jsdom                                     | Pass                                                                                                                                                                                                                         |
| Read-only picker cannot be opened                                                                                        | Automated, in jsdom                                     | Pass                                                                                                                                                                                                                         |

No failures were found in the automated checks, so no component code was changed.

## Manual matrix: Not verified

The 390, 768, 1024 and 1440 px matrix was **not run**. Nothing below is a result.

Blocker: it needs a signed-in Studio in a real browser against scratch or e2e data. The Studio cannot
sign in against the fake Content Lake, and no scratch project was set up in this session. Production
content was not used.

| Screen                                  | 390          | 768          | 1024         | 1440         |
| --------------------------------------- | ------------ | ------------ | ------------ | ------------ |
| Start here                              | Not verified | Not verified | Not verified | Not verified |
| Page with a Link list and a nested link | Not verified | Not verified | Not verified | Not verified |
| Preset picker                           | Not verified | Not verified | Not verified | Not verified |
| Colour inputs (Brand colours)           | Not verified | Not verified | Not verified | Not verified |
| Presentation (mobile toggle, UX-017)    | Not verified | Not verified | Not verified | Not verified |

For each cell, still to check: no horizontal overflow, no clipped actions, visible keyboard focus,
logical tab order, Enter and Space on pickers in a real browser, and Escape/Close focus restoration.

Follow-up (needs a person): run the Studio locally against a scratch project (see the studio-perf
harness notes), tick each cell at the four widths, and record real results here. Each failure becomes
a fix or a plan task. A candidate worth looking at first, from reading the code only: the picker grid
uses `minmax(160px, 1fr)` columns (88 px compact), which should give one column at 390 px.

## Sanity native controls

No native-control issues were confirmed, so there is nothing for Sanity's tracker yet.
