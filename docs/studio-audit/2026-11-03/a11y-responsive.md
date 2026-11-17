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

## Manual matrix: run on 4 November 2026 (two passes)

How it was run: a production build of this branch (the Studio is part of the Next app), baked for the
scratch project `r4kwvgkz` and its `scratch-proposals` dataset only, served on localhost:3200 with the
public pages on the fake Content Lake. A headless Chromium (Playwright script, scratch only, not
committed) used the saved scratch sign-in at 390 x 844, 768, 1024 and 1440 x 900 px, in agency view.
Requests to any other project or dataset were aborted, as were all non-GET requests except the ones
listed under "Writes". Production content was not used.

**Pass 1** only navigated. **Pass 2** (owner instructions of 4 November) allowed exactly two kinds of
write, after inspecting what each sends:

- Presentation's preview-secret calls: `createOrReplace` of a `sanity.previewUrlSecret` draft with a
  patch to its own `secret`, `source`, `studioUrl` and `userId` fields, and a delete whose query is
  filtered on `_type == "sanity.previewUrlSecret"` and age alone. Anything else was aborted.
- Edits to one synthetic draft, `drafts.a11y-task173-test` ("A11Y TEST - synthetic Task 173 page
  (delete me)"), created in `scratch-proposals`. It is **unpublished and kept for review**: it has one
  Link List section with two links (#1 "Untitled Link", made by a first run; #2 "Synthetic Test Link
  (Delete Me)"). Its icon is whatever the last keyboard run chose. Home, About and every other
  document were untouched. Nothing was published.

Colour fields were exercised with writes blocked (the Brand colours document is not mine to change),
so the Studio's attempted edits to `drafts.designSettings` and an attempted release creation were
aborted and never saved.

"Tab walk" is a run of Tab presses. "Ring" is a heuristic (box-shadow or outline on the focused element
or two parents), checked by eye where noted.

| Screen                                  | 390                                                           | 768                                                           | 1024                                                          | 1440                                                          |
| --------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Start here                              | Pass                                                          | Pass                                                          | Pass                                                          | Pass                                                          |
| Launch & visibility                     | Pass                                                          | Pass                                                          | Pass                                                          | Pass                                                          |
| Brand colours, colour fields            | Pass                                                          | Pass                                                          | Pass                                                          | Pass                                                          |
| Preset picker (Hero; and Link list)     | Pass                                                          | Pass                                                          | Pass                                                          | Pass                                                          |
| Page with a Link list and a nested link | Pass                                                          | Pass                                                          | Pass                                                          | Pass                                                          |
| Icon picker (in the nested link)        | Pass                                                          | Pass                                                          | Pass                                                          | Pass                                                          |
| Presentation                            | Chrome and viewport toggle pass; preview content not verified | Chrome and viewport toggle pass; preview content not verified | Chrome and viewport toggle pass; preview content not verified | Chrome and viewport toggle pass; preview content not verified |

"Pass" means, at that width: no horizontal page scroll, no interactive element in the section dialogs
outside the viewport, and the behaviours below.

**Start here and Launch & visibility.** Every one of the first 12 Tab stops showed a ring and stayed on
screen, apart from the first Start here stop at 390 px, which scrolled the page. One column of full-width
cards at 390 px.

**Preset picker** (Hero in Home, and the Link list's own preset, "Change Link list presets"): opens
with focus on a card; ArrowRight moves to the next; Escape folds the grid, keeps the dialog open and
returns focus to "Change ... presets"; Close does the same. 1 column at 390 px, 3 above.

**Link list with a nested link.** The page, the Link list dialog and the nested link dialog (breadcrumb
Sections / Link List / Links / link) fit at every width with nothing clipped. At 390 px the nested
content is narrow because of Sanity's nesting indent, but nothing overflows.

**Icon picker** (task 155's open check), in the nested link dialog, in a real browser:

- 32 cards ("No icon" and 31 icons); 2 columns at 390 px, 5 at 768, 1024 and 1440 px.
- Opening puts focus on a card; ArrowRight moves one card each time.
- **Enter** on a card chose it (summary changed, grid folded away) and focus returned to "Change Icon".
- **Space** did the same on another card.
- All four widths gave the same results.

**Colour fields (Brand colours).** The colour pickers are native `<input type="color">` named
"Primary: colour picker" and so on; each is focusable and shows a 2 px outline (focus-visible). Tabbing
moves from the picker to the hex field to Clear. Typing "#336699" is accepted and "zzz" shows "Use a
six-digit hex colour such as #3266e4", at all four widths. I did not open the browser's own colour
dialog.

**The two Tab stops with no detected ring** were the Sanity UI inputs: the hex text field and the
Appearance radio. The hex field is drawn with a visible purple ring (viewed at 1440 px), so the
heuristic missed it; neither is project code. The Appearance radio's ring was not looked at by eye.
Other ring-less stops were Sanity's own scrolling pane, "Where did the version buttons go?" and the
collapsed "Colours and gradients" disclosure.

**Presentation.** With the secret writes allowed, the tool loads at every width: Edit toggle, address
bar, Refresh preview, "Toggle viewport size" (the mobile toggle, UX-017, present at 390 px too), Open
preview and Share this preview, all named, with no overflow. The tab order from the top bar into the
toolbar is sensible.

The **viewport toggle** was exercised at all four widths with the mouse, Enter and Space. Each press
switched the preview frame between full width and a phone-sized frame (about 375 px wide; at 390 px the
frame is already phone-width, so it only shrinks a little) and back, focus stayed on the button, and a
"Switch to full viewport" tooltip appeared. This works whether or not the preview connects, so it was
checked in the scratch setup below.

The **preview content** did not load: that scratch site reads the fake lake, not `r4kwvgkz`, so the
preview secret cannot validate ("Invalid secret", "Unable to connect", "Continue anyway"). Loading it
needs a token that can read drafts (the secret is a draft document), and none was available to this
session. Clicking in the preview, the Edit overlay's effect and the documents panel with data are
**Not verified**. Follow-up, read-only, no new token: run `live-check.mjs` (kept with the session's
scratch files, not committed) in a shell that already has the existing `STUDIO_PERF_PROJECT_ID` and
`STUDIO_PERF_READ_TOKEN`; it points a local site at `r4kwvgkz` / `scratch-proposals` with that token
and no write tokens, then repeats the Presentation walk and records whether the preview loaded.

## Visual review of the 768 and 1024 px screenshots

Looked at by eye on 4 November 2026: Start here, Launch & visibility, Brand colours, the Hero preset
picker, the Link list's nested link, the icon picker and the test page's editor, at 768 and 1024 px
(and the Presentation toolbar at 1440 px). No recapture was needed.

- Nothing is clipped, overlapped by our own controls or pushed off screen. 768 px collapses Sanity's
  side panes into vertical rails ("Content", "Pages") and the navbar into a menu: Sanity's own layout.
- Start here: two columns of cards from 768 px, one at 390 px; the text wraps cleanly.
- Launch & visibility: status, buttons and address text fit with room to spare.
- Brand colours: the preview block, the Appearance radio and the colour and hex fields fit.
- Preset picker: 3 columns at both widths. The descriptions are cut with an ellipsis ("Heading and
  buttons on a plain b..."); the full text is still available to screen readers. Seen, not a failure.
  (The second purple card in the 768 px screenshot is the pointer hovering after the click, not a
  second selection: the checkmark marks the chosen card.)
- Icon picker: 5 columns, long names such as "Lightning bolt" wrap inside the card, the selected card
  is marked by a checkmark as well as colour, and the focus ring on the keyboard-focused card is clear.
- The "What's new" announcement overlaps the lower left of the page at every width, not only 390 px.

### Not verified

- Presentation's preview content and everything inside it, as above (the viewport toggle is verified).
- The browser's own colour dialog (opened by the colour picker) and the Appearance radio's focus ring by eye.
- Tab order beyond the first 10 to 40 stops per screen.
- Anything on the public site: out of scope.

No project-owned failure was found in either pass, so no fix and no plan task came out of this matrix.

## Sanity native controls

Confirmed in the real Studio (for Sanity's tracker; not changed here).

- **Icon-only buttons with no accessible name** (no `aria-label`, text, title or label), from listing
  every visible button, link and input without one: the tool-collapse menu and the Tasks button in the
  navbar; the document pane's share menu, pane menu and Close link; the field-level reset button beside
  Sanity's radio and choice inputs ("Show as", "Social icons"); a field action menu at 390 px.
- **Focus is not restored after closing a nested array-item dialog.** Escape closed the nested link
  dialog but focus went to the top of the page, and the next Tab began at the document footer, not the
  dialog that was still open. Same at all four widths.
- The dialog that stays open does not keep Tab inside it: Tab walks out to the navbar.
- The "What's new" announcement sits over the lower left of the page at every width, and at 390 px it
  partly covers Publish; "Where did the version buttons go?" is cut off at 390 px.
- Presentation's "Toggle viewport size" button keeps the same accessible name and has no pressed state
  in either mode; only its tooltip changes ("Switch to full viewport").
- The scrolling pane (`pane-content`) takes a Tab stop without a visible ring.

From the `@sanity/assist` plugin (third party): the bolt button in the navbar and the sparkles field
action on every field are unnamed. Its own tracker is the place for these.

Writes observed: Presentation's secret calls (allowed, above), an attempted release creation and edits
to `drafts.designSettings` when typing in the colour field (aborted), a descriptors call and a Sanity
feedback call (aborted).
