# Plan tasks from the 21 October 2026 UI/UX audit (plan version 15)

Ready to paste into Claude Code, with the build plan's template context on top. Numbers follow the plan's last task
(159). Evidence is in [`plan-review.md`](plan-review.md); decisions answered on 21 October 2026 are in its section 8.
**Status:** approved, but not yet copied into the plan page (see `plan-review.md`, section 10).

| #   | Stage   | Size   | Title                                                                | Source                    | Deps     |
| --- | ------- | ------ | -------------------------------------------------------------------- | ------------------------- | -------- |
| 160 | q0 (P0) | Small  | Client view: page Sections open without crashing                     | UX-001, VD-013            | —        |
| 161 | q0      | Medium | Presentation finds the page at `/` and explains unmapped routes      | UX-002, VD-013            | 160      |
| 162 | q0 (P0) | Small  | Hidden settings never block publishing; frames only from the library | Owner report 21 Oct       | —        |
| 163 | q0      | Medium | When publishing is blocked, say why and go to the problem            | Owner request 21 Oct      | 162      |
| 164 | q1      | Small  | Start here: real names in Recent changes and a support route         | UX-007, UX-008            | 160      |
| 165 | q1      | Small  | Empty lists that say what they are for                               | UX-005, VD-008            | 160      |
| 166 | q1      | Small  | Releases only where the project's plan includes it                   | UX-006, decision 2        | —        |
| 167 | q1      | Large  | Link list: see and reset overrides                                   | UX-003, UX-011, VD-007    | 153, 160 |
| 168 | q1      | Medium | Contrast warnings that say what to fix                               | UX-004                    | 140, 167 |
| 169 | q1      | Medium | Picture frames as transparent PNG or WebP                            | Owner request 21 Oct      | 162      |
| 170 | q1      | Manual | Supply trimmed, transparent Nocturne wordmark files                  | VD-001, decision 1        | —        |
| 171 | q1      | Small  | Nocturne wordmark in the Studio navbar                               | VD-001, decision 1        | 170, 172 |
| 172 | q1      | Medium | New Studio palette and fonts on a supported theme API                | VD-002/012, decisions 3–4 | 160      |
| 173 | q1      | Medium | Keyboard, name and narrow-screen check of the custom Studio inputs   | UX-014, UX-017, VD-011    | 160      |

Additions to existing tasks: **77** scenario I, **91** audit context, **32** help settings at handover (end of file).

---

## 160. Client view: page Sections open without crashing

```text
TASK
Fix the crash that shows "An error occurred. Minified React error #130" with Dismiss and Unset value in place of a
page's Sections in client view, and make sure no project Studio input can show a raw React error to a client again.

EVIDENCE
- docs/Nocturne_Studio_UI_UX_Product_Quality_Audit.md, UX-001 (P0, observed on Home and Links in client view; agency
  view works; still there after navigating away and back).
- Probable cause (docs/studio-audit/2026-10-21/plan-review.md, section 4): SectionInsertFilter in
  src/features/studio/components/section-insert-filter.tsx wraps props.arrayFunctions in client view, but Sanity 6.19
  leaves that prop undefined (ListArrayInput and GridArrayInput fall back to ArrayOfObjectsFunctions only when it is
  undefined). The wrapper then renders an undefined component: React error #130. Confirm with a failing test before
  fixing; if the test does not fail, stop and report what you find.

REQUIREMENTS
1. A unit test next to the component (style of src/features/studio/components/studio-inputs.test.tsx) that renders
   SectionInsertFilter for a client user with arrayFunctions undefined and asserts the insert menu renders. It must
   fail on main first.
2. Fix: when props.arrayFunctions is undefined, wrap Sanity's default functions component, through a public export
   (check node_modules/sanity/lib/index.d.ts for ArrayOfObjectsFunctions) or another supported route. Never import
   sanity's internal chunks.
3. Keep task 26's behaviour: clients see only the allowed section types in Add item (resolveClientSections); existing
   sections of any type still open and edit; agency staff are unfiltered. Tests for all three, empty and non-empty.
4. Safe fallback: an error boundary around the project's own input overrides (StudioInput in sanity.config.ts) only.
   A client sees "This part of the page couldn't be shown. Your content is safe." with Try again and the support
   route from siteProfile.help. Never Unset value as the way out. Test it with an input that throws.
5. Manual check in a local Studio on a scratch or e2e dataset (never production): Home and a Link page in Preview
   client view, open a section and a nested link, go back and forward. Record it in docs/studio-roles-test-script.md.
6. CHANGELOG Fixed entry; release v1.7.0 (task 29's steps) so client sites get it with task 30.

ACCEPTANCE
- The new tests fail on main and pass after the fix; npm run check and npm run test:e2e pass. No live content changed.
```

## 161. Presentation finds the page at `/` and explains unmapped routes

```text
TASK
Make Presentation open the right document for the page it shows at "/" (before launch too), stop the warning on the
draft-mode enable route, and give unmapped routes a plain explanation.

EVIDENCE
- Audit UX-002 (P1, partially verified): "Missing a main document for /api/draft-mode/enable", then "… for /" while the
  page rendered; selecting a region found the Links document; a "/" -> "/links" Studio redirect existed.
- Cause (plan-review.md, section 5): mainDocuments in src/features/studio/presentation.ts maps "/" only to HOME_SLUG
  ("home"), while src/proxy.ts serves launch.homepage at "/" before launch (src/config/launch.ts); the catch-all page
  route also matches /api/draft-mode/enable.

REQUIREMENTS
1. "/" resolves to getLaunchState().homepage while status is "prelaunch", else HOME_SLUG, through a pure tested function.
2. /api/* and other non-page paths (reuse the proxy's page-path test) resolve to no document without a warning if
   Presentation allows it; otherwise explain in the PR why the brief warning remains.
3. Research whether mainDocuments can follow a published Studio redirect (src/lib/redirects.ts) without a network call
   per navigation; do it if so, otherwise document the behaviour.
4. Calm wording for a route with no page if Presentation offers a hook ("This address has no page in the Studio. It
   may be a redirect or a built-in page.").
5. Unit tests: live "/", pre-launch "/", "/links", nested paths, the enable route, blog, team and event routes.
   Manual check as agency and client: direct load, from a page editor, refresh, select a region, desktop and mobile.

ACCEPTANCE
- npm run check and npm run test:e2e pass; task 118's preview pass is unchanged.
```

## 162. Hidden settings never block publishing; frames only from the library

```text
TASK
A hero (or any section with Image design) can always be published once its visible settings are valid: a value left
behind in a setting that is now hidden must never block publishing, and an approved frame can no longer be created
from inside a page.

EVIDENCE (owner report, 21 October 2026)
- In Pages > Hero > Design, uploading a frame of about 700 KB raised an error. Removing the picture and switching to a
  round border did not clear it; the only way out was deleting the hero.
- Likely mechanism (not yet reproduced): the Approved frame reference (customFrame in
  src/lib/sanity/schema/image-design.ts) has Sanity's default "Create new", so a frame document was made from the
  hero; its SVG fails the frame's size check (src/features/frames/schemas/frame.ts, CUSTOM_FRAME_MAX_BYTES 50 KB), so
  it can never be published, and the hero keeps a reference to it. Switching Appearance hides customFrame but keeps
  its value, so the error sits on a field nobody can see.

REQUIREMENTS
1. Reproduce first, on the fake Content Lake or a scratch dataset (never production): write down the exact error,
   where Sanity shows it and which path it is on. If the cause differs, fix the real one and say so.
2. customFrame: options.disableNew (frames are added under Design > Image frames, as its description says).
3. When Appearance or Frame changes so that a dependent setting is hidden, the hidden values (customFrame, frameColour,
   frameInset and the like) stop counting: their validation passes while hidden, and the site ignores them (check the
   fragment and FramedImage). Prefer this to unsetting on change; if unsetting is needed, it must be one undoable patch.
4. Check the other "hidden unless" fields in image-design.ts and the Link list design for the same trap; list them in
   the PR and fix the ones that can block publishing.
5. Tests: a hero with a stale customFrame and a round Appearance validates; a framed hero without a frame still asks
   for one.

ACCEPTANCE
- npm run check and npm run test:e2e pass; no stored content migrates.
```

## 163. When publishing is blocked, say why and go to the problem

```text
TASK
When Publish is blocked by validation errors, the editor sees a short list of what is wrong, in plain words, with a
button that takes them to each problem, instead of hunting for it.

EVIDENCE
- Owner request, 21 October 2026, after task 162's stuck hero.
- The project already wraps Sanity's Publish action (src/features/studio/actions/confirm-publish.tsx), keeping
  Sanity's validation. useValidationStatus (sanity) and useDocumentPane (sanity/structure) are public APIs.

REQUIREMENTS
1. Check what Sanity 6.19 shows today when Publish is disabled (tooltip, validation inspector) and build on it rather
   than replacing it.
2. When the document has errors, Publish (or a "Why can't I publish?" action beside it) opens a dialog: one line per
   error with the field's title path ("Sections › Hero › Design › Approved frame"), the message, and "Go to field"
   (focus the path through the document pane, or open Sanity's validation inspector if focusing is not supported).
3. An error on a hidden field says so: "This setting is hidden by another choice (Appearance: Circle)", with the way
   out. After task 162 this should not happen; keep the wording for anything that slips through.
4. Warnings are listed separately and never block.
5. Client view: same dialog, wording for non-technical editors, never raw paths or ids. Australian English.
6. Pure functions for title paths and wording, unit-tested; component test for the dialog.

ACCEPTANCE
- npm run check passes; manual check in a local Studio as agency and client, recorded in the PR.
```

## 164. Start here: real names in Recent changes and a support route

```text
TASK
Recent changes shows "Business info", "Navigation" and "Announcement bar" instead of "Untitled business info", and
Help always offers a way to get help.

EVIDENCE
- Audit UX-007: displayTitle in src/features/studio/start-here/utils/wording.ts falls back to "Untitled <type>" for
  every untitled document, singletons included.
- Audit UX-008: without siteProfile.help.supportEmail or guideUrl, help-panel.tsx says "Ask your Currawong contact
  where to find help." Both settings exist (site.profile.ts help).

REQUIREMENTS
1. Singletons (SINGLETON_TYPES) use their Structure title, from one map structure.ts also uses. Pages and posts keep
   their own title; "Untitled page" stays for one that has none. Unit tests over every singleton type.
2. Help fallback names the studio from the CMS brand and says what to include (page name, screenshot). No staff names
   or private addresses in code.
3. Task 160's error message and task 163's dialog link the same support route.

ACCEPTANCE
- npm run check passes; no "Untitled" for a known singleton in the recent and wording test fixtures.
```

## 165. Empty lists that say what they are for

```text
TASK
Empty Forms, Panels, Shared sections, Enquiries and AI context lists explain their purpose and offer only an action the
person may take, instead of "No documents of this type."

EVIDENCE
- Audit UX-005 (observed); proposal VD-008 and VD-013.

REQUIREMENTS
1. Feasibility first: what Sanity 6.19's Structure Builder supports for empty lists. If nothing supported, stop and
   report options and costs. No DOM patching.
2. Per list: one purpose line, one example, who uses it. Create buttons only where the role may create.
3. Wording in a tested module, like the existing */wording.ts files.

ACCEPTANCE
- npm run check passes; agency and client screenshots of each empty list in the PR.
```

## 166. Releases only where the project's plan includes it

```text
TASK
Show Sanity's Releases (navigation and scheduling) only on sites whose Sanity plan includes it, so clients on other
plans never meet an upgrade screen.

EVIDENCE
- Audit UX-006: the live site's Releases opens an upgrade screen. Decision 21 October 2026: per site, only when the
  plan includes it (this narrows the 17 October decision that clients keep Releases).
- Sanity 6.19's config types have a releases option with an enabled switch.

REQUIREMENTS
1. A site profile flag (features.releases, default off for new sites; keep it on in this template's own profile so
   nothing changes here), validated like the other features, read in sanity.config.ts.
2. Find out exactly what turning Releases off removes (navigation item, scheduled drafts, the version menu, anything
   the A/B variants rely on) and write it in the PR. Variants must keep working.
3. README: Blog scheduling needs Releases; how to check the plan (sanity.io/manage) and switch the flag. Add it to
   task 32's handover checklist.
4. Unit test for the flag resolution.

ACCEPTANCE
- npm run check and npm run test:e2e pass.
```

## 167. Link list: see and reset overrides

```text
TASK
In the Link list, a designer sees at a glance which preset is active, what each link changes and at which level, and
can reset a link or one group back to the Link list design. Full agency control stays.

EVIDENCE
- Audit UX-003 (P1), UX-011 (scope), proposal VD-007; concept boards 02 ("1 custom override" on the section row) and
  04 (scope badge, override counts, group reset). Concepts only, not captures.
- Exists: per-link Appearance with Inherit on every option (task 153, layerDesign, inheritable-choice-input.tsx),
  presets (74), Hero's "Custom" preset state (80).

REQUIREMENTS
1. Inventory where Link list design values live (section, card, per-link), their precedence and defaults; a table in
   the PR. If a schema change is needed, stop with a migration plan for approval.
2. Summary: link preview subtitle and the top of its Appearance show "Uses the Link list design" or "Customised · 2
   changes (label colour, icon strength)"; the section preview names the preset and how many links are customised.
   Pure, tested functions.
3. Reset this link, and reset per group: unset only that link's fields (normal undoable patch), never siblings.
4. Scope labels in group headings: "This link only", "All links in this list".
5. Sliders (slider-input.tsx) show the inherited value and its source when unset.
6. Agency-only as today. Then try the summary on the hero's preset state; report, no rollout.

ACCEPTANCE
- Unit tests; npm run check and npm run test:e2e pass; visual baselines identical.
```

## 168. Contrast warnings that say what to fix

```text
TASK
Each Link list contrast warning names the property and what it was measured against, and offers a reversible fix: a
suggested colour that passes, or back to the inherited value.

EVIDENCE
- Audit UX-004 (P1): AA fail 1.0:1 on #015f64, 2.7:1 border, 1.9:1 icon, gradient over photo down to 1.1:1 (the
  editor's own diagnostics, not a WCAG audit). Concept board 04 "See safer colour".
- Done already: checks against Brand colours and worst-case glass (140); Brand colours suggests accessible values
  (src/features/site/components/colour-input.tsx).

REQUIREMENTS
1. Reuse Brand colours' suggestion logic (move to shared code if needed) in the theme colour picker and custom colours.
2. Say what is affected, against what, the ratio and the target (4.5:1 text, 3:1 large text and non-text).
3. "Use suggested colour" and "Use the Link list design", both undoable. Nothing changes without a click.
4. Gradient over photo: measured at the worst point; suggest a stronger overlay instead of a new colour.
5. Never claim WCAG conformance in the wording.

ACCEPTANCE
- Unit tests for suggestion and wording; npm run check passes.
```

## 169. Picture frames as transparent PNG or WebP

```text
TASK
Let an approved frame be a transparent PNG or WebP as well as an SVG, served at the right size from Sanity's image
CDN, so detailed hand-drawn frames work without an 800 KB SVG.

EVIDENCE
- Owner report, 21 October 2026: detailed frame artwork cannot get under about 800 KB as SVG; the limit is 50 KB
  (CUSTOM_FRAME_MAX_BYTES, src/lib/sanity/image-design-options.ts).
- Frames are drawn as a CSS mask loaded as an image (src/features/frames/utils/frame-svg.ts), and CSS masks use the
  image's alpha, so a transparent raster works the same way.

WHY NOT JUST RAISE THE SVG LIMIT
- Every visitor downloads the whole SVG at full detail on every page that uses the frame, often in the hero (LCP,
  Lighthouse 0.9 budget). A raster sized by the CDN is usually a fraction of that. Keep the SVG limit; measure in the
  PR how a real 800 KB frame compares as WebP at the widths the site uses.

REQUIREMENTS
1. Frame document: a choice of SVG file (today) or Picture (PNG or WebP with transparency, Sanity image asset). Check
   for an alpha channel where possible and warn if the picture has none (the middle would hide the photo). Minimum
   size: 1600 px on the long side; maximum file size a sensible value you justify with the measurement.
2. Site: build the mask URL with the image URL builder at the rendered width (srcset-like choice by breakpoint, or one
   size at 2x the largest frame), fm=webp or auto format, from cdn.sanity.io only (isCdnUrl stays the guard).
3. Frame colour still applies (mask filled with the theme colour), exactly as for SVG.
4. Thumbnails in the frame picker and the Image frames list show the picture.
5. Gallery fixture with a raster frame; e2e that it renders and axe passes; performance spec unchanged on pages without
   frames.
6. README "Image design": SVG or picture, export tips (transparent background, single colour, 1600–2400 px), and why
   a complex SVG is better exported as a picture.

ACCEPTANCE
- npm run check, npm run test:e2e and npm run test:lighthouse pass; byte comparison in the PR.
```

## 170. Supply trimmed, transparent Nocturne wordmark files (manual)

```text
For you, not Claude Code. The Nocturne wordmark files in src/assets/brand/currawong/ (wordmark-on-light.webp and
wordmark-on-dark.webp, 2500 × 833) have no transparency and wide empty margins. In a 24–30 px high navbar the word
"NOCTURNE" would be about 8–10 px tall inside a visible box. Export from the master artwork:
- wordmark-on-light: dark lettering for light backgrounds; wordmark-on-dark: light lettering for dark backgrounds.
- Transparent background, trimmed to the artwork with a small even margin, SVG if available (otherwise PNG or WebP at
  least 900 px wide).
- Optionally a version without the bird for very narrow spaces.
Replace the files with the same names, or add new ones and tell task 171 their names.
```

## 171. Nocturne wordmark in the Studio navbar

```text
TASK
With no client logo set, the Studio navbar shows the Nocturne wordmark (wordmark-on-light in light mode,
wordmark-on-dark in dark mode), not the small mark and "Currawong Creative". A client's own logo and colours still win.

EVIDENCE
- Decision 21 October 2026: Nocturne is Currawong's product brand.
- Today StudioLogoView (src/features/studio/components/studio-logo.tsx) draws a logo file only when logoSource is
  "client"; for Currawong's defaults it draws mark + name, so currawongBrand.logo is never shown in the navbar.
- The Studio uses the deprecated studio.components.logo hook.

REQUIREMENTS
1. Use the files from task 170. Check each against the navbar's real background in both schemes (and the client view
   strip) in the brand preview page; never pick by file name alone.
2. Currawong default: the wordmark alone, about 154–178 px wide and 24–30 px high on desktop, fitted without
   stretching, no layout shift; the bird mark alone below about 768 px. Accessible name "Nocturne".
3. Move to a supported navbar composition (RoleNavbar already wraps renderDefault) if Sanity 6.19 documents one that
   keeps the workspace menu, tools and search; otherwise keep the logo hook and say why in the PR.
4. Client logos (studio-brand.json) behave exactly as today, including the backing for a single-scheme logo.
5. Ask me before changing the tab title or sign-in heading from "Currawong Creative" to "Nocturne".
6. Brand preview and studio-brand-visual specs updated; list baseline changes.

ACCEPTANCE
- npm run check and npm run test:e2e pass.
```

## 172. New Studio palette and fonts on a supported theme API

```text
TASK
Move the Studio theme off the deprecated buildLegacyTheme if Sanity's current theming API can express it, adopt the
proposal's palette as Currawong's default CMS brand (keeping today's palette as a named alternative), and use
Newsreader for display headings and Inter for interface text.

EVIDENCE AND DECISIONS
- theme.ts wraps buildLegacyTheme (deprecated). Installed: sanity 6.19.0, react 19.3.1, @sanity/ui 4.4.9;
  @sanity/themer not installed.
- Decision 21 October 2026: adopt the proposal palette (docs/Nocturne_Studio_Premium_Visual_Redesign_Proposal.md,
  section 5) but keep the current one to go back to. Decision 21 October 2026: Google Fonts Newsreader (serif) and
  Inter (sans), replacing the 14 October "Studio keeps Sanity's default font" rule.

REQUIREMENTS
1. Spike (no merge): read Sanity's current theming docs, the themer package README and types. Can it take per-scheme
   colours from runtime brand roles (studio-brand.json over Currawong), focus, radius and font families? Do not adopt
   the experimental themer preview tool. Stop with findings if it cannot express today's theme.
2. Palette: rename today's roles to currawongClassicBrand and add the proposal values as currawongBrand, mapped to the
   existing roles (background, text, surface, surfaceBorder, accent, focus...). Roles the proposal lacks (highlight)
   keep today's values. Going back is a one-line change, documented in README. Every pair must pass
   currawong.test.ts; the proposal's own ratios are not proof (its #9B83B7 fails as text).
3. Fonts: Inter for all interface text and inputs, Newsreader only for display headings (Start here greeting,
   document titles where the theme allows). Self-host through next/font/google on the Studio route (no request to
   Google from visitors' or editors' browsers), Latin subset, font-display swap. Measure Studio download size before
   and after. Fonts apply only through the theme, never CSS overrides (no-ui-overrides.test.ts). The public site's
   fonts (tokens.json) are untouched.
4. Client brands keep winning: a client's colours replace the palette as a set; decide with me whether a client can
   also set Studio fonts (not in this task).
5. Both schemes; task 88's contrast assertions and 106's Appearance choice still pass.
6. Update the template context block's CMS BRANDING rule ("Studio keeps Sanity's default font") in the plan when this
   merges.

ACCEPTANCE
- npm run check and npm run test:e2e pass; brand preview baselines listed; size difference in the PR.
```

## 173. Keyboard, name and narrow-screen check of the custom Studio inputs

```text
TASK
Verify, not assume, that the project's own Studio inputs work by keyboard, expose accessible names and fit narrow
screens, then fix only what fails.

EVIDENCE
- Audit UX-014 (hypothesis), UX-017 (only Presentation's mobile toggle seen), proposal VD-008 and VD-011; task 155's
  icon picker keyboard check was never recorded.

REQUIREMENTS
1. Scope: src/features/studio/components/*, Start here, Brand colours, Launch & visibility. Sanity's native controls
   are out of scope (note issues for Sanity's tracker).
2. Testing Library tests: every icon-only button has a name; preset and icon pickers work with arrow keys, Enter and
   Space; focus returns after closing.
3. Manual matrix at 390, 768, 1024 and 1440 px on scratch or e2e data: Start here, a page with a Link list and a
   nested link, preset picker, colour inputs, Presentation. Results in docs/studio-audit/<date>/a11y-responsive.md;
   each failure becomes a fix or a plan task.

ACCEPTANCE
- npm run check passes; the matrix holds real results.
```

---

## Additions to existing tasks

**77. Studio usability test**: add scenario I. "In a scratch dataset: change a heading, see it as a draft in
Presentation, publish, check the live page, restore the previous version. At each step the participant says whether the
change is live." (Audit UX-015.) Run after 160–163.

**91. Studio performance check**: add "The 21 October audit (UX-018) saw loading transitions but measured nothing.
Include opening a page in client view after task 160, switching Presentation between routes, and the Studio download
before and after task 172's fonts."

**32. Go live and hand over**: add "Set help.supportEmail (and guideUrl) in site.profile.ts (audit UX-008), and set
features.releases to match the Sanity plan (task 166). Follow the
[domain connection runbook](../../runbooks/connect-a-domain.md): save before/after DNS snapshots and a full zone export,
confirm the certificate and email, and retain the rollback values before signing off."
