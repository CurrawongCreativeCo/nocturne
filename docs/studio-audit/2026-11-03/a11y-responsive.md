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

## Manual matrix: run on 4 November 2026

How it was run: a production build of this branch (the Studio is part of the Next app), baked for the
scratch project `r4kwvgkz` and its `scratch-proposals` dataset only, served on localhost:3200 with the
public pages on the fake Content Lake. A headless Chromium (Playwright script, scratch only, not
committed) used the saved scratch sign-in at 390 x 844, 768, 1024 and 1440 x 900 px, in agency view.
Requests to any other project or dataset, and every mutate request, were aborted. It only navigated: no
field was edited and nothing was published. `scratch-proposals` has no `studio-perf` content: it holds
a Home and an About page only. Production content was not used.

"Tab walk" is the first 12 Tab stops. "Ring" is a heuristic (a box-shadow or outline on the focused
element or one of its two parents), not a visual inspection of each stop.

| Screen                                       | 390             | 768             | 1024            | 1440            |
| -------------------------------------------- | --------------- | --------------- | --------------- | --------------- |
| Start here                                   | Pass            | Pass            | Pass            | Pass            |
| Launch & visibility                          | Pass            | Pass            | Pass            | Pass            |
| Brand colours (page, preview, colour fields) | Pass, see notes | Pass, see notes | Pass, see notes | Pass, see notes |
| Preset picker (Hero in Home)                 | Pass            | Pass            | Pass            | Pass            |
| Page with a Link list and a nested link      | Not verified    | Not verified    | Not verified    | Not verified    |
| Presentation                                 | Not verified    | Not verified    | Not verified    | Not verified    |

What "Pass" means here, at every width: no horizontal page scroll; no visible interactive element
outside the viewport on its screen; Tab starts from the top bar and moves in a sensible order; every
one of the 12 Tab stops on Start here and Launch & visibility showed a ring and stayed on screen,
except at 390 px where the first Start here stop scrolled the heading "What would you like to do?" into
view (the screenshot shows the page laid out in one column with the cards full width). Screenshots were
viewed for Start here, Brand colours and the preset picker at 390 px.

Preset picker (the Hero's "Change Hero presets" button, inside the section dialog):

- Opening moved focus onto a card (role `radio`); there are 10 cards.
- The grid is 1 column at 390 px and 3 at 768, 1024 and 1440 px, with no clipping.
- ArrowRight moved focus to the next card (`split-right`) and ArrowDown to the one after (`split-left`).
- Escape folded the grid, kept the section dialog open, and put focus back on "Change Hero presets".
- Close ("Close Hero presets options") did the same.

Brand colours: the document opened at all four widths with no overflow and no clipped control. Its 12
Tab stops showed a ring on 10; I did not identify the other two, so this is a heuristic gap rather than
a confirmed failure. The "Secondary: colour picker" button has its name. I did not open or operate a
colour picker, so keyboard use of the colour inputs themselves is **Not verified** in a browser.

### Not verified

- **Page with a Link list and a nested link** (all widths). `scratch-proposals` has no Link list on
  any page, and adding one is an edit, which this run did not make. Follow-up: seed a page with a Link
  list and a nested link in a scratch dataset made for the purpose (the `studio-perf` seed does not
  include one; `r4kwvgkz` holds two datasets already, so one must be freed first), then repeat the walk.
- **Presentation** (all widths, UX-017). The tool showed "The presentation tool crashed" at every width.
  The cause is my own run: Presentation deletes expired preview secrets with a mutate request
  ("Failed to delete expired secrets: Failed to fetch" in the console), which the script aborts. It is
  not evidence of a project bug, and it means the mobile toggle was not seen. Follow-up: rerun this
  screen with that one write allowed (it writes only the plugin's own secret documents, to a scratch
  dataset), or have someone do it by hand.
- **Enter and Space on pickers in a real browser.** Not tried here: choosing a card changes a value.
  The jsdom tests show the keys are not intercepted, and `tests/e2e/studio-brand-preview.spec.ts`
  covers arrows, Enter, Space and focus return in a real browser; its result is CI's, on this PR.
- Colour picker operation by keyboard, as above; and anything beyond the first 12 Tab stops per screen.
- The Studio's own mutate requests: two were aborted per width, consistent with the Presentation
  secret cleanup. Nothing was written.

No project-owned failure was found, so no fix and no plan task came out of this matrix.

## Sanity native controls

Confirmed in the real Studio (for Sanity's tracker; not changed here). Icon-only buttons with no
accessible name (no `aria-label`, text, title or label), found by listing every visible button, link
and input without a name on Start here, Launch & visibility and Brand colours at 1440 px:

- the tool collapse menu (ellipsis icon) in the navbar and the Tasks button (`tasks-toolbar`);
- the document pane's Copy/share menu, pane context menu (ellipsis) and Close link;
- on narrow screens the navbar menu and search icons were present; I did not check their names.

Also: at 390 px Sanity's "What's new" announcement sits over the bottom of the page and partly covers
the Publish button, and the "Where did the version buttons go?" link is cut off in the document header.

From the `@sanity/assist` plugin (third party): the bolt button in the navbar and the sparkles field
action on each Brand colours field are unnamed too. The plugin's own tracker is the place for these.
