# Changelog

All notable changes to the template are recorded here, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Projects pull these releases in with
the steps in the README's [Updating from the template](README.md#updating-from-the-template).

What a version number means for a project that merges it:

- **Major**: needs a migration step (a schema change that touches existing content, a renamed file or
  env var, a changed convention). Read its _Breaking changes / migration steps_ first.
- **Minor**: new features. Existing projects keep working; the new schema types and sections are
  available but nothing is switched on in your content.
- **Patch**: fixes and dependency updates.

Every release has a _Breaking changes / migration steps_ section, even when it says "None", so you
can tell "nothing to do" from "forgot to write it". Copy the block under [Unreleased](#unreleased) when
you start a release.

## [Unreleased]

### Added

- **Link list clean-up:** service-category and divider-word letter spacing (Normal, Wide, Extra wide), accessible image headings above link groups, social navigation named by visible divider words, complete design-thumbnail coverage, and light/dark design-input browser checks. Existing defaults and baseline files are unchanged; new gallery and Studio input baselines need **Update visual baselines**.

- **Hero eyebrow labels:** optional short labels reuse `InlineList`, with separator thumbnails and collapsed agency-only colour controls. Existing eyebrow text remains the fallback; no migration or extra Sanity requests. Refresh the new `hero-eyebrow-labels` and `hero-eyebrow-labels-start` desktop/mobile baselines using **Update visual baselines**.

- **Transparent picture frames:** approved frames can use PNG or WebP artwork, with size validation, transparency warnings, Studio thumbnails and sized WebP masks from Sanity's image CDN. Existing SVG frames and their 50 KB limit remain supported. Refresh the new `media-text-image-frame-picture` desktop/mobile baselines with **Update visual baselines**.
- **Studio theme API findings and download comparison:** `docs/studio-theme-spike.md` records the supported API, approved UI 4 scope and UI 5 styling/font exception.

### Changed

- **Link list internals:** extracted profile, wordmark and per-link design modules; shared decorative shapes and nested-surface contrast; explicit social shadow/surface composition; shorter Studio help. Standalone typechecks no longer use incremental build info. Browser fixtures serve real local PNGs without changing existing visual mocks. The authenticated Design audit remains outstanding, documented in `docs/studio-audit/2026-10-23/link-list-review.md`.

- **Studio palette, theme API and fonts (UI 4 scope):** Currawong's default CMS palette now follows the 21 October proposal, with contrast-tested borders and the previous palette retained as `currawongClassicBrand` (README: one-line rollback). The stable `@sanity/themer` generator and public v2 tokens replace `buildLegacyTheme`. The workspace theme uses self-hosted Inter for interface text and Newsreader for headings in both schemes. UI 5 alpha components retain Sanity's styling and CDN-hosted Inter, as explicitly agreed. Client palettes still replace defaults as a set, public-site font tokens are untouched, and there is no content migration. Refresh the Studio brand preview baselines using **Update visual baselines**; the findings document lists them.

### Fixed

- **Announcement first paint and CI diagnostics:** reveal an announcement only after its message and dismiss control have been parsed. Lighthouse CI uses the installed Playwright Chromium and retains its hidden report directory in failure artifacts; budgets and throttling are unchanged.
- **Lighthouse budget enforcement:** audit rules now sit inside each matrix entry's `assertions` object, with median aggregation and regression tests against the installed LHCI engine. Previously the command could exit successfully without checking any budgets. About now shares the 2500 ms LCP limit; the other thresholds and applied throttling are retained.
- **Lighthouse engine and production CSS:** pin the CLI's Lighthouse engine to 13.5.0 for Chrome 156, using the project's Node 24 runtime. Style-guide container-frame CSS is included in development, previews and the end-to-end gallery, and omitted from live production builds, including self-hosted builds.
- **First-paint consent and public asset downloads:** the cookie banner reveals its complete markup before hydration while saved choices keep it hidden; keyboard focus and consent gating are retained. CMS fonts no longer leak unused Newsreader preloads into public pages. Default icons include a 1.6 KB browser-tab image alongside the existing large and Apple icons; client-uploaded artwork still replaces all defaults. The footer's opening-hours clock starts when its badge first enters view, with observer and timer cleanup.
- **Windows end-to-end startup:** isolated production builds are copied with Node's filesystem API so the test harness no longer requires Unix `rm` and `cp` commands.
- **Lighthouse startup:** start the fake Content Lake before building, build fresh with the gallery disabled, and launch children with the current Node executable. This avoids stale preview CSS and Windows shortcuts selecting a different runtime.
- **Studio badge contrast:** generated badge labels now reach at least 4.5:1 on their actual fill in both schemes and every card tone, including the classic and low-contrast client palettes. The adapter adjusts label lightness with a 4.6:1 margin; badge fills and semantic hues are retained. Unit regression coverage includes all preview brands. Refresh Studio brand baselines using **Update visual baselines**.
- **Mobile featured-link check:** waits for streamed links to become visible and polls their measured heights before comparing them, avoiding a premature zero-height result while retaining the featured-size assertion.

### Breaking changes / migration steps

## [1.7.1] - 2026-10-21

### Added

- **Site voice in AI Assist.** Configure `voice: { summary, do, dont }` in `site.profile.ts`. Summary, hero headline, rich text, post body and SEO presets include that guidance, Australian spelling and the field's length guidance. Summary targets the existing `excerpt` field; heroes support current headings and legacy titles, including shared sections. Free-plan behaviour is unchanged. Existing client profiles can omit `voice` for practical Australian English defaults; see README for saved Assist instructions after voice changes.

- **Opt-in Studio performance harness.** A guarded throwaway-project seed and separate, local-only Playwright project capture five-run interaction medians, script download sizes and long tasks in agency and client views. Includes Presentation route and edit latency checks, saved sign-in instructions and append-only daily result files. Live baseline and any measured optimisation require disposable project credentials.

- **Help when Publish is blocked.** A **Why can’t I publish?** action opens a list of errors with field-title breadcrumbs and **Go to field**, plus separate, non-blocking warnings. Hidden settings explain a choice that reveals them where possible, or ask for agency help. Sanity's own Publish action, validation tooltip and inspector stay available. Includes unit and dialog component tests; no content migration.

### Fixed

- **Presentation document routing:** the root selects the configured pre-launch homepage before launch and Home when live. Nested page paths have no depth limit; APIs, built-in routes and files skip main-document lookups. Unknown page addresses use a plain explanation through Sanity's translation hook. Redirects resolve after the preview reaches their destination, without an extra redirect lookup. The signed pre-launch preview pass is unchanged; see README for its root-page caveat and the authenticated manual checks.

- Register Sanity's built-in image types in the Link list validation test fixture so hidden dividers validate without an `Unknown type: sanity.imageHotspot` error in CI.
- Hidden Image design and Link list design settings no longer block publishing. Inactive frame references remain weak when published, with their selections retained; visible custom frames still require a published frame. Both frame pickers disable inline creation: add frames under Design → Image frames. Hidden numeric limits, inherited reference/list checks and nested custom colours are skipped. No content migration.

### Breaking changes / migration steps

None.

## [1.7.0] - 2026-10-21

### Fixed

- **Client view no longer crashes where a page's Sections should be** ("An error occurred. Minified React error #130" with Dismiss and Unset value, on Home and Links; audit UX-001). `SectionInsertFilter` wrapped `props.arrayFunctions`, which Sanity 6.19 leaves undefined, so it rendered an undefined component. It now falls back to Sanity's public `ArrayOfObjectsFunctions`. Clients still see only the approved sections in Add item, existing sections of any type still open and edit, and agency staff are unfiltered.
- **A failing Studio input shows a safe message instead of a raw React error.** The project's input overrides are wrapped in an error boundary: clients see "This part of the page couldn't be shown. Your content is safe." with Try again and the support route from `help` in the site profile, never Unset value. Agency staff keep Sanity's own error.
- **Transparent pictures and wordmarks no longer sit on a blurred smear.** `next/image` draws Sanity's blurred preview as the picture's background, so it stayed visible through every transparent pixel. `SanityImage` now shows the preview only for pictures that are certainly opaque (`hasAlpha` is false, or, when Sanity hasn't recorded it, the asset is a JPEG; see `src/lib/sanity/image-placeholder.ts`). `imageFields` now also fetches `hasAlpha`; run `npm run typegen`. Opaque photos keep the preview. New e2e page `/image-placeholders`.

### Changed

- **Colour checks use the site's Brand colours.** The element colour swatches and contrast badges (every `themeColourField`, including Design › Service categories), the Custom colour badge and the heading highlight checks now measure the colours the page draws after Design › Brand colours (Primary, Secondary, Highlight, Appearance, surfaces and inks), not `tokens.json`'s defaults. The picker says which it used. On Glass rows the arrow and icon colours are measured on the glass at its worst, reusing the Glass strength check. Still warnings, never errors. One shared fetch of Design settings (`fetchBrandColours`, `useBrandColours`); `resolveDesignTokens` moved from `src/features/site/utils` to `src/lib/color` so shared validation can use it. No content migration.

### Added

- **Link list card design and overrides** (README, _Card design and overrides_): a new agency-only _Design › Cards_ box (background colour and strength, border and border colour, and eyebrow, label and description text), icon containers under _Design › Arrows and icons_ (shape, fill, strength, border, colour), and a per-link _Appearance_ (_Use the Link list design_ or _Customise this card_) that overrides any of them, plus the link's shadow and arrow, one property at a time. Glass rows stay glass when tinted or outlined. Every option has an **Inherit** button. New shared `layerDesign` (`src/lib/sanity/design-overrides.ts`), `surface-options.ts` (`ringSurfaceLook`, `glassSurfaceLook`, `iconLook`), `text-style-options.ts`, schema builders in `src/lib/sanity/schema/surface-design.ts`, the Studio `InheritableChoiceInput`, and card-aware contrast checks (`src/lib/color/card-contrast.ts`). `themeColourField` gains a _Transparent_ choice for backgrounds. New e2e page `/link-overrides`.
- **Link eyebrows:** an optional small line above a link's label, read first.
- **Social button border and fill:** _Design › Social icons_ gains a border (None, Thin, Medium, Thick), border colour and button strength; the button colour now also tints glass buttons (the blur stays).
- **Gradient overlay** for every section's background picture: _Overlay colour › Gradient_ with three presets at the Overlay strength, optional per-stop colour and opacity under _Advanced: gradient_, a Studio preview over the section's own picture and a per-stop contrast warning. README, _Section backgrounds_.
- **Default favicon uses the dark mark:** `src/app/icon.png` and `apple-icon.png` are now Currawong's bird on dark (from `mark-no-text-on-dark.webp`) for every browser. A custom Browser icon is unchanged. The launch check's default-icon hashes are updated.
- **Lotus and Gift icons** in the shared icon set, and a **visual icon picker** (each icon drawn above its name) for Link list links, divider middles and badges. Stored values are unchanged.
- **Decorative dividers** for the Link list (_Design › Dividers_, agency only): a divider of its own between the categories and the bio, after the profile, and above or below the social icons. Each is a Line, Fading line or Three dots, with an optional middle (a diamond, an icon, a few words such as "Stay connected", or a small picture), a length, a thickness, and separate line and middle colours. Only drawn between two parts that show, and the space beside it never doubles. New shared schema type `decorativeDivider`, `decorativeDividerFields`, `resolveDivider` and `DecorativeDivider`, ready for other sections (README, _Decorative dividers_); run `npm run typegen`. Empty draws none. New e2e page `/link-dividers`.
- **Depth and glow** for the Link list (_Design › Depth and glow_, agency only, collapsed): link, social button and profile picture shadows (Flat, Soft, Raised, Floating) and an optional Soft or Strong glow in a theme colour around the chosen parts. Empty keeps every layout's own look. Shared `resolveDepth` in `src/lib/sanity/depth-options.ts`, a new `shadow.floating` token and an optional `depth` token group (picture shadows, glow size and strength); run `npm run tokens` and `npm run typegen`. `SocialLinks`, `ProfileImage`, `GlassRow` and `LinkItem` gain optional depth or style props. New e2e page `/link-depth`.
- **Service categories** for the Link list profile: _Content › Profile › Service categories_, a native Sanity list of short labels (add, edit, drag to reorder, remove; **Show the categories** hides them without deleting). The page draws them in a row under the name with drawn separators (Bullet, Middle dot, Line, Diamond or None) that never start or end a line, in a real `<ul>` with `aria-hidden` separators. Agency-only _Design › Service categories_: separator, phone layout (wrap or one per line), size, weight, capitals, spacing, and separate category and separator colours through `themeColourField` (separators default to Primary). New shared `InlineList` (`src/components/ui/inline-list.tsx`) and `src/lib/sanity/inline-list-options.ts`. New optional fields `profile.categories`, `profile.categoriesVisibility` and `categoryDesign`; run `npm run typegen`. Studio suggests moving a typed list ("Bodywork • Breathwork") out of the bio, and the page leaves out a bio's first paragraph when it exactly repeats the categories. No migration. See the README's _Link list_.
- **Paragraphs in plain text:** every multiline plain-text field on the site (section intros, hero description, card text, testimonials, short bios, event summaries, blog excerpts) now keeps paragraphs (a blank line) and line breaks (a single new line), with the new `PlainText` component and `plainTextParagraphs` (`src/lib/plain-text.ts`). Text with no new lines renders exactly as before. See the README's _Paragraphs in plain text_. New e2e page `/link-categories`.

- Pre-launch page templates beside the Link page: **Link page + coming soon**, **Coming soon** and **Under construction**, built from existing sections. The last two are agency-only and hidden from search engines. No schema changes. See the README's _Pre-launch pages_.
- **Pre-launch looks:** six one-click looks (Minimal and elegant, Dark and atmospheric, Editorial, Bold and colourful, Image-led, Soft and refined) for **Link page + coming soon** and **Coming soon**, as agency-only templates in _Pages → New_ with thumbnails. A look only sets existing values (tone, Link list preset, hero layout, fill the screen), so nothing new is stored and the base templates are unchanged.
- **Launch date** for the hero's supporting slot: "Opening Monday 3 November" in en-AU, in the Business info time zone, rendered on the server and gone after the date (a request-time `<Suspense>` boundary, like dated links). An optional **Live countdown** (Advanced, off) is a small client island loaded only on pages that turn it on: it updates by the minute (by the second in the last hour), pauses in a hidden tab, and shows nothing under reduced motion. New `launchDate` object type and `launchDate` hero slot item; run `npm run typegen`. Adds the e2e pages `/launch-date`, `/launch-date-plain`, `/launch-date-past` and the `look-*` pages (new `hero-slot-launch-*` visual baselines need the "Update visual baselines" workflow).
- **Launch state in the site profile:** an optional `launch` block in `site.profile.ts` (`status: 'prelaunch' | 'live'`, `homepage`, `publicPages`, `unknownPaths`), validated by `validateSiteProfile`. Left out, the site is live and nothing changes. `getLaunchState()` and `isPublicBeforeLaunch()` in the new `src/config/launch.ts` read it; `SITE_LAUNCH_OVERRIDE=prelaunch` can hide a live site but never reveal one. `/api/site-info` reports `launch: { status, homepage }`. The segment `prelaunch-view` is reserved for pages.

- **Pre-launch gate:** while `launch.status` is `'prelaunch'`, `src/proxy.ts` serves the `homepage` page at `/` and the listed `publicPages` through a bare view (`/prelaunch-view/<slug>`: no header, footer, menu or announcement in the HTML), and answers 404 (or, with `unknownPaths: 'homepage'`, a 307 to `/`) to everything else, with `noindex` and `Cache-Control: private, no-store`. Live sites are unchanged. `SiteShell` gains a `chrome` prop. A route inventory test (`src/app/route-inventory.test.ts`) fails when a new page or route has no pre-launch classification. The e2e fixture Link page gains a newsletter signup, and Playwright starts a third server (port 3102) for the gate.

- **Pre-launch preview pass:** a signed, expiring cookie (`site_preview`, HMAC-SHA256 keyed by `PREVIEW_ACCESS_SECRET`) that lets the gate show the whole site to the team and the client. `/api/draft-mode/enable` issues it when the site is pre-launch; the optional client link `/api/preview-access?token=…` (`PRELAUNCH_PREVIEW_TOKEN`; 404 on any failure, rate limited) issues it too, and `/api/preview-access/exit` clears it. Without `PREVIEW_ACCESS_SECRET` no pass is valid. A forged `__prerender_bypass` opens nothing. New optional env vars `PREVIEW_ACCESS_SECRET` and `PRELAUNCH_PREVIEW_TOKEN`.

- **Pre-launch machine-readable files:** before launch the proxy answers `/sitemap.xml`, `/robots.txt` and `/llms.txt` with versions that name only the public pages (one sitemap file, `/sitemap/1.xml` and up are 404), and answers 404 to `/feed.xml`, `/api/search`, `/api/events/*` and calendar files; `/api/og/<slug>` works only for public pages. Preview-pass holders get the normal files. The proxy matcher gains these paths (live, they pass straight through). The pre-launch view draws no breadcrumbs.

- **Launch check knows the launch state:** `npm run launch:check -- <url> --prelaunch` proves a pre-launch site is private (the temporary page at `/` with the right canonical, unfinished pages answering 404 with `noindex` and no navigation, a public-only sitemap, closed feed and search, the client's favicon, a working share image). `--bypass` sends `x-vercel-protection-bypass` (`VERCEL_AUTOMATION_BYPASS_SECRET`, never printed or sent to another host) so a protected preview deployment can be checked, with `--expect-origin` for its production canonicals; `--expect-private` and `--expect-public` set the paths. The default mode gains: `/api/site-info` says live, "/" is the real home page, and the temporary page still answers.

- **Launch & visibility in Studio:** a read-only screen under Website settings (nothing stored, no fields) that shows the launch state from `site.profile.ts` in words, the pages visitors can open (Open and Edit), "Open the temporary page" and "Preview the full site", a live launch checklist (home page, temporary page and share image, menus, browser icon, contact details and social links, and a coming-soon note reminder) and three "How to launch" steps. Clients see one sentence and an **Edit your links** button. Start here gains a pre-launch banner and a **Your links** card (first for clients when a page uses the Link list). The brand preview shows the screen for axe and screenshots. Start here's query now also reads each page's slug; run `npm run typegen`.

- **Setup wizard starts in pre-launch:** a new question, "Start with a pre-launch Link page" (on by default for client projects, off in the template checkout, needs starter content). Yes seeds a published Link page (the _Link page + coming soon_ template, Minimal look, site name in the profile, placeholder links hidden), saves Home and About as drafts only with weak references, leaves the menus empty, and writes `launch: { status: 'prelaunch', homepage: 'links' }` into `site.profile.ts` (one line changed, nothing reformatted; skipped with a warning if the starter content failed). No answers today's behaviour. `npm run setup -- --dry-run [--name "Acme"] [--live]` prints the documents and file edit without writing. The last screen points to the domain runbook and the launch checklist. Vitest covers the seed in both modes and the profile edit.

- **Link list Design boxes** (agency only, README "Link list" › Design): **Profile** (picture size Small, Medium or Large; Circle, Rounded square or Logo, uncropped; a solid or gradient ring with a see-through gap, or an approved decorative frame; name and bio colours), **Links** (Arrow style: Chevron, Arrow, External link or None; arrow and icon colours) and **Social icons** (Plain, Circles, Rounded squares or Squares, frosted glass with Glass rows; above or below the links; icon and button colours).
- **Theme colours for single elements:** one shared `themeColourField` (Inherit, Text, Muted text, Primary, Secondary, Highlight or Custom hex) with swatches and a contrast badge in Studio, drawn by `themeColourCss` as tokens that follow the tone.
- **Wordmarks:** the Link list's profile name and heading can show as an image (_Show as_ › Image). The text stays and becomes the image's alt text inside the same heading.
- **Cover the screen** background picture size on every section: the picture is the window's size and stays in view while the content scrolls, so a long list never stretches it. Independent of the section's height. The _Dark and atmospheric_ pre-launch look uses it for the Link list.
- Shared server components for reuse: `LinkArrow`, `SocialLinks`, `ProfileImage` and `Wordmark` in `src/components/ui/`.

### Changed

- **Glass rows and Editorial draw a chevron** at the end of each link instead of an arrow (↗ for other websites). Choose _External link_ under Design › Links › Arrow style for the previous look. Glass rows saved with "Arrow on each row" off still draw none; that switch is now hidden, replaced by Arrow style.
- **Fill the screen** is now titled _At least the screen's height_ and explains its relation to _Cover the screen_. Same field (`fillScreen`), same behaviour.
- **Picture pickers** in Studio have a bordered Close button with an X at the top of the open grid, and Escape closes it.
- `reservedSegment` moved from `src/features/pages/utils/reserved-slug.ts` to `src/config/reserved-slug.ts` (the site profile validates against it). Update the import if a project uses it.

### Fixed

- **Open redirect in `/api/draft-mode/disable`** (audit finding S-1): `?redirect=/%5Cevil.example` could send visitors to another site. The route now uses `safePath`, and also clears the preview pass.

### Breaking changes / migration steps

- None for the Link list card design, gradient overlay or icon work: every new field is optional and empty draws what the page drew before (checked against `main`'s rendering for every gallery section). Run `npm run typegen`. One visible change: _Design › Social icons › Button colour_ now applies to Glass rows' frosted buttons (as a tint) where it was ignored before, so a list that set a button colour and later switched to Glass rows shows it.

## [1.6.0] - 2026-10-18

### Added

- **Background image placement:** a section's background image gains _Picture size_ (Fill the section, Show the whole picture, Actual size), _Picture strength_ (Full, Soft 60%, Faint 30%) and _Overlay colour_ (Background colour, Light wash, Dark wash), and a collapsed _Advanced: background_ with Position (nine places), Repeat (across, down, tile; Actual size only), an exact strength and _Stays put while scrolling_ (large screens, off for reduced motion). A **Fill the screen** switch in _Advanced: layout_ makes any section at least the screen tall, so a Link page can have a full-window photo or a faint pattern at the bottom. Existing backgrounds are unchanged; the Studio contrast warning accounts for the wash and strength. Adds the e2e pages `/links-photo`, `/links-pattern` and `/links-tiled` (new visual baselines, if added, need the "Update visual baselines" workflow).
- **Link list: Glass rows preset.** A sixth preset in the Link list's preset bar (Minimal with a new `rowStyle: 'glass'`) draws each link as a frosted-glass row over a background photo: a flush thumbnail, a round icon, the title and description and an optional round arrow, as one link per row. Glass rows can show an icon and a thumbnail together. **Glass strength** (Light, Medium, Strong) and **Arrow on each row** appear for Glass rows only, and Studio warns when a strength can drop text under 4.5:1 on the lightest or darkest photo. New `glass` design tokens (`tokens.json`, optional) follow Brand colours, Appearance and the section's tone, with solid fallbacks for browsers that can't blur and visitors who ask for less transparency. No client JavaScript. Existing link lists look exactly as before.
- **Icons:** eight new line icons in the shared badge icon set (Care, Sun, Community, Person, Location, Email, Calendar, Phone), also offered to badge rows.
- **Rich titles on every section:** the highlight (colour, gradient, marker, underline) now works on the title of every section, not just the hero: CTA banner, media + text, features grid, FAQ, form, newsletter, pricing, process, stats, team, testimonials, gallery, logo strip, location, events, video, embed and link list. Each section gains a `heading` field beside its old `title`, which is read until the new migration `section-titles-to-heading-text` has run (run it on every dataset, dry run first). Item titles inside sections stay plain. The contrast check uses the CTA banner's own card colour.
- **Solid colour, bold and italic:** new highlight looks _Solid colour_ (any hex colour, contrast-checked at 3:1 as a warning) and _Bold or italic only_, plus **Bold** and **Italic** switches that go with any look. They are drawn with `data-bold` / `data-italic` on the same span, not `<strong>` or `<em>`, so the heading's accessible name is unchanged. The `emphasis` annotation gains `colour`, `bold` and `italic`.

- **Custom heading gradients:** a highlighted heading's Gradient is now one picker: the gradients from Design → Brand colours by name, _Brand to ink_ (the default), then **Custom**, which takes two or three colours of the editor's choosing (the Brand colours input: swatch and hex) and, under _Advanced_, an angle (default 90, left to right). Each colour is checked against the section's background at 3:1 with a warning (never a block) and a **Suggest an accessible shade** button. Custom colours bypass the brand palette on purpose; the README says so. The `emphasis` annotation gains `stops` and `angle`, and `gradient` can be `custom` or `brand-colours:<slug>`; `RichHeading` builds the CSS from validated hex colours, an integer angle and a checked slug only. Adds the e2e page `/custom-gradient` and the section gallery entry `hero-heading-custom-gradient` (its visual baselines need the "Update visual baselines" workflow).

- **Setup wizard:** the starter content now also creates empty Brand colours, Announcement bar, Cookie banner and Business info documents (only when missing), so those Studio screens no longer open as "New …". An empty Business info counts as none on the site.

### Changed

- **Heading gradients:** _Brand to green_ and _Brand to red_ are no longer offered for new choices (they use the success and danger colours, not brand colours). Content that stored them is drawn and checked exactly as before. The gradient picker is no longer inside _Advanced_; only Custom's angle is.
- **Studio:** the page section list names a hero's preset ("Hero · Split, image left") instead of the same "Hero · Split · Page" for both Split presets; a custom combination keeps the layout and background. Stored data is unchanged.
- **Studio:** the _Identity & search_ screen is now _Name, logo & icon_ (with a description listing what is there), Business info has its own icon, and a new editor guide covers changing the logo or browser icon. Stored data is unchanged. The Presentation tool lists no locations for a page or post until it has a slug.
- **Start here quick actions:** each action is now a bordered card with an icon, a chevron and hover and focus states, in three columns on wide screens, two at 1024 px and one on phones. _Edit your website_ comes first and is the stronger primary card.

### Fixed

- Studio → Design → Brand colours: an empty colour now shows the site's real default in the swatch and as the
  placeholder, with a "Default" label, instead of a black swatch and an example hex. Clearing a colour says it has
  returned to the default, and Primary's description explains that buttons stay near-black until a Primary is set.
  No stored data changes.
- **Section backgrounds:** a picture set to _Stays put while scrolling_ is clipped to its own section again on
  large screens; a missing space had dropped the clip, so it could show through other sections.
- **Webhook mode:** the README's webhook filter now includes `experiment`. Without it, starting or stopping an A/B
  test never reached a site in webhook mode until its next deploy. **Add `"experiment"` to the filter of each
  existing webhook** (sanity.io/manage → API → Webhooks).
- **Tests:** Vitest now runs `*.test.tsx` files (33 component tests were being skipped), and the "stays put"
  end-to-end test turns motion on, so it passes (locally its failure also stopped the 53 tests in the projects
  that run after it).
- `next.config.ts` sets `partialPrefetching: false` explicitly. That is what an unset value already did; it stops
  Next.js 16 warning on every build.
- Code audit: `docs/code-audit/2026-10-18/report.md` records the state of the template, its findings and proposed
  tasks.

### Breaking changes / migration steps

None. The template is now called **Nocturne** and the GitHub repo is `CurrawongCreativeCo/nocturne` (the old `sanity-starter` URLs redirect, but you can point a `template` remote at the new one with `git remote set-url template https://github.com/CurrawongCreativeCo/nocturne.git`). The package name is `nocturne`. Run `npm run tokens` and `npm run typegen` after merging (new `glass` tokens and the Link list's `rowStyle`, `glassStrength` and `showArrows` fields); a `tokens.json` without a `glass` group still builds.

## [1.5.0] - 2026-10-17

### Added

- **Link-in-bio extras (Studio):** two actions on pages, **Copy link** and **Download QR code**. The QR dialog previews the
  code and downloads it as SVG or PNG in the site's ink and surface colours, with a quiet zone, falling back to black on white
  if the colours would not scan, and an optional `utm_source=qr` so scans show in analytics. Both use the published address.
  The README's Link list section now says how to see `link_click` events in Plausible, PostHog and GA4. Adds the dependency
  `uqr` (MIT, no dependencies, under 8 KB gzipped), used by Studio only; the public site's JavaScript is unchanged.

- **Embed section:** an approved third-party form, map or player (Typeform, Google Maps, Spotify) behind a click-to-load card.
  Editors pick a service and paste its public address, checked against that service's pattern (no embed code, HTML or
  script ever); _Height_ is a Short, Medium or Tall picker that follows the service when unset, with an agency-only exact
  height in Advanced. Nothing loads before the click; a service that sets cookies says so first and waits for the
  **marketing** consent category (cookie settings and a link to the service stand in while it is off). The iframe gets the
  section heading as its `title`, `loading="lazy"` and the narrowest sandbox the service works with. Adds the shared provider
  registry `src/config/embed-providers.ts` that booking reuses, and moves the consent store (`consent-state`,
  `consent-store`) from `src/features/consent/utils/` to `src/lib/consent/` so other features can read the visitor's choice.
  See README, _Embed_.
- **Enquiries:** with `ENQUIRIES_STORE=1` (and `SANITY_WRITE_TOKEN`) a form submission accepted by Resend is also stored as an
  `enquiry` document: the form (weak reference and title), every answer as `{ label, value }`, the page path, `createdAt`, a
  `status` (new, read, archived) and the referrer and UTM values from hidden inputs. It only writes to a dataset it can confirm is
  private. A failed write is logged (never with submission contents or addresses) and never fails the visitor's send. Studio gets
  an **Enquiries** list (newest first, the new count in its title, read-only except status, **Download CSV** built in the browser
  with spreadsheet-formula protection), and **Start here** shows the number of new enquiries with a link. A weekly GitHub Actions
  workflow (`enquiry-retention.yml`, logic in `scripts/enquiry-retention.mjs`) deletes enquiries older than
  `ENQUIRY_RETENTION_DAYS` (default 365, minimum 30); it skips without the secret and dry-runs on pull requests. README: new
  _Enquiries_ section with Australian privacy notes. End-to-end tests run a second server with the flag off.
- **Panels and a shared overlay:** one small overlay layer on the native `<dialog>` (`src/components/ui/overlay/`:
  `useModalDialog` and `<Overlay>`) with five presentations (centred window, right and left drawers, bottom sheet, full
  screen), a scroll lock that doesn't shift the page (`scrollbar-gutter: stable`), focus returned to what opened it, an
  entrance from the motion tokens (none under reduced motion) and swipe-to-dismiss for drawers and sheets. On top of it, a
  new **`panel` document** (Studio → Reusable content → Panels; agency creates, clients edit content): a title (the
  dialog's accessible name), content of _Text_ (rich text with an optional picture) and _Form_ blocks, **How it appears**
  as four pictures (_Auto_, _Centred window_, _Side panel_, _Full screen_) and an Advanced area (width, swipe to close,
  link name) that shows only what the choice uses. _Auto_ is a centred window on a computer and a bottom sheet on a phone.
  _Open a panel_ is now switched on in the **Goes to** picker (`LINK_ACTIONS.panel`). Pages fetch the panels their buttons
  open inside `PAGE_QUERY` (no extra request) and render each once, server-side, as a closed `<dialog>`; the overlay code
  loads only on pages that have a panel, and a form inside one mounts when the panel first opens. `#panel-<name>` opens
  a panel on load and the address follows it while it is open. The panel form starts with an **Opened by** note listing the
  buttons and links that open it. New `panel` tag for the revalidation webhook. Unit tests, `tests/e2e/panels.spec.ts`
  (including axe with each panel open and a phone-width sheet) and a memory round that opens and closes panels.
- **IndexNow for blog posts:** publishing a post now pings IndexNow with `/blog/<slug>`, as pages already did. No webhook change
  needed. `buildIndexNowRequest` takes a `path` instead of a `slug`; update any project code that calls it.
- **Editor guide in Studio:** a **Help** tab in Start here (beside **Overview**) with short task guides (_Change a heading_, _Replace a
  photo_, _Publish and undo_, _Write a blog post_, _Update opening hours_, _Add a team member_) and a description of every section a client
  may add, with its fields, recommended picture sizes and length limits. It shows only what the site uses: guides follow the profile's
  features and the schema, and sections follow `clientSections`. The guides are markdown in `docs/editor-guide/`; training videos come
  from `help.videos` in `site.profile.ts`. `scripts/build-editor-guide.mjs` builds the committed
  `editor-guide.generated.json`, `npm run typegen` runs it, and CI fails when it is stale. Adds `jiti` as a dev dependency (already
  installed through ESLint and Sanity). After merging, run `npm run typegen` and commit the result.
- **Image design:** one shared treatment for a section's main picture (`FramedImage`): a still frame with the picture moving
  gently inside it (true image-only parallax), shapes (_Standard_, _Rounded_, _Circle_, _Arch_, _Framed_) and decorative frames
  that stay still while the picture drifts behind them. Agency only, in the Design tab of **Image + text**, the **Hero's Split
  layout**, **Gallery** (Grid and Slider) and **Team**: three pictures (shape, motion, frame) and a collapsed **More image
  options** (travel distance, direction, scale, frame colour token, frame inset) that shows only what the choices use. Frames are
  five built-in inline SVGs (Simple line, Double line, Offset border, Organic brush, Corner brackets; `currentColor`, non-scaling
  strokes) or an **approved custom frame**: a new agency-only `frame` document (Studio → Design → Image frames) holding an SVG
  checked on save (an SVG with a viewBox, under 50 KB, no scripts), used by its CDN URL as a CSS mask on a token-coloured `div`,
  never inlined. The picture is scaled by twice its travel plus a 1 % slack, held to 1.05–1.15 so no edge shows; phones get half the travel;
  reduced motion and no JavaScript get the still, unscaled picture with its frame. Nothing is switched on in existing content, and
  a picture with no design renders exactly as before. The hero's split shapes now use the same component (its older **Image shape**
  field is hidden and its value shows as the Image design's shape until changed). New fixtures, section-gallery entries for every
  shape and frame, `/framed-images`, `tests/e2e/framed-image.spec.ts` and unit tests. Add the new screenshot baselines with the
  **Update visual baselines** workflow.
- **Typed link actions:** a link now has a **Goes to** picker: _A page on this site_ and _Another website_ (stored exactly as
  before), plus _A section on this page_ (pick from the page's anchors or type one; renders `#id`). _Open a panel_ and
  _Book_ are built into the schema, renderer and Content health but switched off in `src/config/link-actions.ts` until
  panels (task 93) and booking (task 95) exist. Panel and booking links render a `<button aria-haspopup="dialog">` inside a
  GET form, so without JavaScript they go to a fallback URL. Section links scroll smoothly unless the visitor asks for
  reduced motion. Content health reports links to missing sections and unpublished panels. See README, _Link actions_.

- **Link list section and Link page template:** _Add item → Link list_: an optional profile (picture or logo, name, bio up
  to 160 characters), social icons (Business info's by default, or a custom set) and ordered links with a label, the shared
  **Goes to** action, a description, an icon or thumbnail, a group heading, one large (featured) link, Show or Hide, and
  Show from / Show until. Five layouts as pictures in the agency-only preset bar (Minimal, Cards, Editorial, Compact,
  Image-focused; the last is Cards with large pictures, because a section has at most four layouts). Scheduling is decided
  at request time in a small `<Suspense>` boundary, so pages stay cached and a link that isn't due isn't in the HTML. A click
  sends a `link_click` event to the analytics providers the visitor has accepted (an inline script,
  `src/lib/analytics/track-script.ts`, so no JavaScript is added to any page), and links to another website can carry UTM tags (Advanced).
- **Minimal page option and Link page template:** an agency-only page option, _Minimal page (no header or footer)_, and a
  _Link page_ new-page template (slug `links`, a profile, social icons, a Minimal list and a footer note). `PAGE_QUERY`
  gains a `minimal` flag; the shell's header, announcement and footer are wrapped in `[data-site-chrome]`. See README, _Link list_.
- `SocialIcon` (`components/ui/social-icon.tsx`) and the shared platform list (`lib/social-platforms.ts`); Business info's
  social profiles are available to page sections through `LocationBusiness.socialLinks`.

- **Events:** an `event` document (title, page address, start and end, all day, a time zone that starts as Business info's,
  summary, description, image, venue or online link, category, a registration button using the shared **Goes to** action,
  status _Scheduled_ / _Cancelled_ / _Sold out_, a places note) and an _Event category_ document, in a new `events` feature
  (switch: `features.events` in `site.profile.ts`). Simple repeats: weekly, fortnightly, or monthly on the same weekday, with
  a last date and skipped days, expanded at request time by a pure, unit-tested function (nothing stored per date; the wall
  clock holds across daylight saving). The **Events** section (_Add item → Events_) has List, Agenda and Featured layouts as
  pictures, shows what is upcoming by default, and has an agency-only category filter and count; "upcoming" is decided per
  request in a small `<Suspense>` boundary (no clock in a cached result, no client JavaScript). Event pages at
  `/events/<slug>` (`Event` JSON-LD, a branded share image at `/api/og/events/<slug>`, Presentation resolvers, sitemap),
  add-to-calendar files at `/events/<slug>.ics` and a subscribable feed at `/events/feed.ics` (RFC 5545 with a generated
  `VTIMEZONE`, escaping, folding, `RRULE` and `EXDATE`), plus Google Calendar and Outlook links. Studio: _Events_ with
  Upcoming, Past and All lists, the subtitle "Sat 14 Mar, 10:00 am · Workshop", validation, and an _Add an event_ card on
  Start here. See README, _Events_.
- `src/lib/events/` (time zones, recurrence, formatting, calendar links, `.ics`), `eventCardFields` and `eventLastRelevant`
  in `src/lib/sanity/fragments.ts`, `TIME_ZONES` in `src/lib/time-zones.ts` (moved from Business info's schema so other
  features can use it) and `hasEvents()` in `src/config/profile.ts`.

### Changed

- **Studio theme (light and dark):** primary buttons were a pale violet with low-contrast labels in light mode, the
  default button was Sanity's cool slate, selected tabs and tools were a dusty pink, and the primary badge text was
  pale. `buildLegacyTheme` takes one accent for both schemes and `theme.ts` gave it the dark one. It now builds the
  theme once per scheme and takes each half, so every scheme has its own accent, focus ring, grey and neutral button.
  Primary buttons are exactly the accent fill (`#5f2bd4` / `#9f80e5` for Currawong), neutral buttons are warm
  greys from the ink and paper range, and selection is a clear 35% tint of the accent. Fills are moved only as far as
  needed to keep Sanity's own button label at 4.6:1 (a client's yellow in light mode is darkened). The brand preview
  test now measures text contrast (4.5:1) and the focus ring (3:1) for every brand in both schemes, and its list of
  known contrast gaps is gone. `legacyThemeProperties` now takes one scheme's roles and the scheme name. The
  brand preview baselines need refreshing with the "Update visual baselines" workflow.

- Quick search and the gallery lightbox now use `useModalDialog` for showing the dialog, the scroll lock and returning
  focus; they look and behave as before (quick search now also locks the page's scroll while it is open).
- **Client view of the Studio:** _Reusable content_ now appears for clients with _Panels_ only (shared sections and forms stay
  agency-only), and panels can't be deleted or duplicated by clients. `CLIENT_STRUCTURE_IDS`, `CLIENT_REUSABLE_IDS` and
  `CLIENT_PROTECTED_TYPES` changed accordingly.
- The webhook filter gains `"panel"` (README, Webhook mode): add it to existing webhooks.
- The link fragment (`linkFields`) also returns `anchor`, `panel` (id and title), `fallbackUrl` and `bookingUrl`.
  **Open in a new tab** moved into a collapsed Advanced area and shows for _Another website_ only.
- **Studio wording and order (audit quick fixes, `docs/studio-audit/2026-10-17/report.md`).** No stored data changes.
  Call-to-action _Variant_ is now **Button style** with _Filled_ and _Outline_ (stored `primary` and `secondary`). The hero
  and Image + text show _Image left_ and _Image right_ instead of the raw values, and Image + text's list subtitle names the
  side. The blog post editor puts the body straight after the main image, then categories, author and date, as the editor
  guide describes; the post list shows the date and author instead of the URL. Navigation gets help text, and _Footer
  text_ is now **Copyright line**. Field help and warnings say **Brand colours** (the sidebar's name) instead of _Design
  settings_.
- **Section backgrounds are named by role:** _Page_, _Tinted_, _Contrast_ and _Brand_ (were _Surface_, _Soft_, _Dark_,
  _Accent_), in the picker and in list subtitles ("Hero · Split · Contrast"). Stored values are unchanged.
- **Collapsed fine-tuning areas are all called Advanced:** _Advanced: animation_, _Advanced: edge_, _Advanced: layout_
  and _Advanced: image_ (were _More … options_).
- **Publishing a live page or post no longer opens a dialog** unless it is the first publish or the address changed (where
  the dialog offers the redirect). The rule is `needsPublishConfirmation` in `src/features/studio/utils/publish-redirect.ts`.
- **Dependencies:** `sanity` and `@sanity/vision` 6.19.0, `@sanity/ui` 4.4.9, `next` and `eslint-config-next` 16.4.2,
  `react` and `react-dom` 19.3.1, `motion` 14.3.0 (minor and patch updates, no changes needed in our code).
  `npm audit --omit=dev` still reports 16 findings (12 high, 4 moderate), all from two packages with no patched
  release, `braces` (3.0.3) and `sprintf-js` (1.1.3), pulled in by the Sanity CLI (`sanity` → `@sanity/cli` →
  codegen and `@vercel/frameworks`). That is build-time tooling that runs on your own files, not code the site loads.
  The only fix npm offers is `npm audit fix --force`, which downgrades `sanity` to 5.7.0; do not run it. The
  `overrides` in `package.json` (js-yaml, smol-toml, uuid) are still needed: removing them brings back three more findings.

### Fixed

- **Studio dark mode:** the Studio was always light and the user menu had no **Appearance** choice, because `buildLegacyTheme` marks its theme as legacy and Sanity 6 pins such a theme to one scheme. `theme.ts` now removes those markers, so editors can pick System (the default), Light or Dark.
- The form island (`contact-form.tsx`, about 4.5 KB gzipped) was in every page's scripts because the shared page route imported it; forms and the newsletter signup now load it through `next/dynamic` (still server-rendered), so only pages with a form download it. This is what keeps the home and Link pages within the JavaScript budget once panels are on the route.

### Breaking changes / migration steps

None for content: existing links keep their stored values, and nothing is switched on until an editor adds a panel or an event. After merging, run `npm run typegen` and commit the result. Add `link_click` as a goal in Plausible if you use it. The new visual baselines (`link-list-*`, `events-*`) need the **Update visual baselines** workflow (panels add none).
Webhook mode: add `"panel"`, `"event"` and `"eventCategory"` to the Sanity webhook filter (README, _Live mode vs. webhook mode_). Header, footer and menu buttons can't open panels (they use their fallback link). Clients now see _Reusable content → Panels_ in the Studio. `events` is a new feature switch (on by default); a client who doesn't want events sets `events: false` in `site.profile.ts`.
For Enquiries: nothing happens until you set `ENQUIRIES_STORE=1`; then see README, _Enquiries_ (private dataset, `SANITY_WRITE_TOKEN`,
the repository secret for the retention workflow, and the collection notice in the form's _Intro_). The `enquiry` type is new in the schema.
A project that imports `consent-state` or `consent-store` from `src/features/consent/utils/` must now import them from `@/lib/consent/`.
**Link-in-bio extras:** run `npm install` (new dependency `uqr`). No schema or content change, no typegen needed, nothing for the webhook. Pages gain two Studio actions, Copy link and Download QR code.

**Dependencies:** run `npm install`. Nothing else changes and `overrides` stays as it is. This release has no migration of its
own; a site that skipped earlier ones should run `migrations/split-site-settings` (1.3.0) and
`migrations/hero-title-to-heading-text` (1.4.0) on every dataset, one release at a time. The home page JavaScript budget
(`JS_BUDGET_KB`) is 220 KB, raised from 200 KB in 1.2.0 to pay for the lazy motion provider.

## [1.4.0] - 2026-10-16

### Added

- **Process section:** _Add item → Process_, a numbered `<ol>` of steps beside a line that fills as the visitor scrolls
  (`useScroll` into a `scaleY` on an `m.div`, transform only). Two layouts: _Vertical_ (default) and _Alternating_
  (left and right of a centre line from `md`; phones are always vertical). Fields: title, intro and two to ten steps
  (title, text, optional label such as "Week 1", optional decorative icon or image). Starts with four example steps.
  Steps reveal with the Stagger animation; Animation _None_ turns that off. The line is fully drawn under reduced motion
  and without JavaScript, and its scroll code loads only on pages that use the section. See README, _Process timeline_.
- **Logo strip marquee:** the Logo strip gains a **Layout** picker (_Grid_, the default and unchanged, and _Marquee_). The
  marquee is an endless CSS-driven row of logos (the list rendered twice, the copy `aria-hidden` with `tabindex="-1"`
  links; `translateX` only) with faded edges (`mask-image`), pausing on hover and focus and a visible Pause / Play button
  (WCAG 2.2.2) that is its only JavaScript. The duration is the new optional `motion.marquee-per-logo` token (5 s) times
  the logo count. Under reduced motion, or without JavaScript, it is the static wrapped grid. An agency-only **Logo
  colour** option (Design → Advanced, Marquee only) keeps logos greyscale (default) or full colour. New fixtures
  (`logo-cloud-marquee`, `logo-cloud-marquee-colour`, `/logos`), `tests/e2e/logo-marquee.spec.ts` and a variants test.
- **Video section:** _Add item → Video_ with two layouts. _Embed_ (default) is a poster and a Play button
  ("Play video: <title>") for YouTube, Vimeo or an uploaded MP4; **no third-party script, iframe or request loads until
  the click**, then one iframe (`youtube-nocookie.com`, or `player.vimeo.com` with `dnt=1`) with autoplay and a title,
  and a "Plays from YouTube/Vimeo" note. Uploaded video is a native `<video controls preload="none">` with the poster
  and an optional WebVTT captions track. _Ambient_ (uploaded MP4 only) is a muted, looping, `playsInline` background
  video with a visible Pause button (WCAG 2.2.2), the poster instead under reduced motion, and a Studio warning for
  files over 5 MB. Fields: title, description, source, address or file, poster (required), captions, shape (16:9, 4:3,
  1:1, 21:9). Address parsing is shared by validation and the page (`video-source.ts`, unit tested). The security headers
  already allow the outbound iframes (checked by `tests/e2e/video.spec.ts`). Two small client components, no Motion, loaded
  lazily so pages without a Video section download neither; the JavaScript budget is unchanged. The hero's "background video" note now points to the Ambient layout. Add the new
  section's screenshot baselines with the **Update visual baselines** workflow.
- **Animate individual parts (hero):** an agency-only switch in the hero's Design → Advanced area. Off by default; when on,
  one compact row per part the layout and content actually have (eyebrow, heading, intro text, buttons, extra content,
  picture, background picture) with an animation (Inherit, None, Fade, Rise, Reveal, Slide, Scale, and Parallax for the
  pictures) and a delay (Auto, Short, Long). Auto follows a sequence 80 ms apart. Sections declare their parts in code
  (`HERO_PARTS`, `PartSpec`); `resolvePartMotion` (`src/components/motion/part-motion.ts`, unit-tested) resolves the component
  default, then the section's animation, then the part's own choice, and ignores combinations that make no sense. The first
  section's heading and pictures never start hidden and ignore Fade, Reveal and Scale (a clip-path Reveal on the heading
  moved the Lighthouse LCP from 1.55 s to 4 s); Reveal is a `clip-path` wipe with opacity untouched. No new client
  components; `/hero-parts` joins the Lighthouse run. Content needs no migration: a hero without `partMotion` looks as
  before, except that below the first section a hero with its own entrance no longer also staggers its text on load.
- **Section animation presets:** the Animation picker is now a small library with moving previews (still under reduced
  motion): _None_, _Fade up_, _Subtle entrance_ (12 px rise), _Fade_, _Slide in_, _Staggered_, _Float_ (a picture drifts
  slowly in a loop, paused off screen) and _Parallax_ in three strengths. Level 1: sections start on a default for their kind
  (`MOTION_DEFAULTS`: content fades up, heroes and logo strips stay still). Level 3: a collapsed **More animation
  options** shows only what the chosen preset uses: intensity (Parallax), duration, delay, direction (Slide in), when it plays,
  and _Set exact values_ (duration, distance, easing, how much must be in view; validated and clamped). All presets are typed
  data in `src/components/motion/presets.ts` behind one unit-tested `resolveMotion`. The first section stays still unless
  _On load_ is chosen, and then never starts at opacity 0. Parallax travels half as far below `md`; Float runs on phones at half
  travel. Stored `reveal` is still _Fade up_ and `parallax` still the original Parallax (now _Parallax · Subtle_), so no migration
  is needed; **content with no animation stored now fades up on content sections** (it stayed still before). `Float` is a
  CSS animation with an IntersectionObserver pause, in its own lazily loaded chunk, so the home page's JavaScript does not
  grow. `SectionFrame`'s fixed `MEDIA_PARALLAX_SPEED` is gone, code that reads `sectionTraits().motion`
  now see the new preset names, and `style` gains ten `motion*` fields (run `npm run typegen`). Hero layouts share
  `HeroBackground`. See the README's "Section animation".

- **Team (Studio and site):** new `teamMember` document (name, role, square portrait with required alt text, short bio of
  up to 300 characters, rich-text bio, qualifications, public email, phone, social links, `order` and an optional page
  address) in a new `src/features/team` feature, and a **Team** section with **Grid**, **Slider** and **List** layouts that
  shows everyone in team order or the members an editor picks, in their order. The members are resolved inside the
  section's GROQ fragment (no extra request), and cards (portrait, name, role, short bio, a transform-only hover lift) are
  drawn in the pages feature. Optional profile pages at `/team/<slug>` with `Person` JSON-LD, metadata, real 404s and
  sitemap entries; the new `teamProfiles` site-profile switch (on by default) turns them off and hides their fields. The
  desk's **Team** entry is a drag-to-reorder list (with up and down buttons for keyboard and touch) that writes the
  `order` field; Presentation resolves `/team/<slug>`. `team/<anything>` is a reserved page path, but a page called `team`
  is fine. `splitSitemapRange` is replaced by `splitSitemapRanges` (any number of lists). **To adopt:** add `teamMember` to
  the Sanity webhook filter in webhook mode; a client site with its own `site.profile.ts` may add `teamProfiles: false`.
  Visual baselines for `team-grid`, `team-slider` and `team-list` need the **Update visual baselines** workflow. See the
  README's "Team".

- **Style guide (`/section-gallery`):** the section gallery is now a living style guide for client design reviews. The
  **Sections** view gets links above each section to switch its tone and layout, and a **375 / 768 / 1280 px** width
  preview built from container widths (no iframes; a small PostCSS step, `scripts/postcss-container-frames.mjs`, gives
  the stylesheet container-query copies of its responsive rules and is left out of Vercel production builds). The choices
  live in the URL. A new **Design tokens** view (`/section-gallery/tokens`) shows the colours in use with their WCAG
  contrast ratios, the type scale, spacing, radii, shadows and motion samples (still under reduced motion). It stays a 404
  in production; on Vercel preview deployments it opens with `?preview=<STYLEGUIDE_PREVIEW_TOKEN>`. Never indexed, and
  the fixture page behind it is left out of the sitemap. With nothing chosen the gallery renders as before, so the visual
  baselines are unchanged. New feature folder `src/features/styleguide`. See the README's "Style guide".

- **Gallery section (Studio and site):** up to 60 pictures (required alt text, optional caption) in a **Grid**, **Masonry**
  or **Slider** layout, with **Columns** (2–4) on the Design tab. Grid and masonry are CSS only; the slider is the shared
  `Slider`. Each thumbnail is a button ("Open image 3 of 12: …") that opens a full-screen native `<dialog>` lightbox with the
  Slider at full size, a counter, the caption, Previous and Next, arrow keys, Escape and swipe down to close, and focus
  returning to the picture that opened it. The lightbox is downloaded on first open (`next/dynamic`), so the page's initial
  JavaScript does not grow, and only the current and neighbouring full-size pictures load. New `shouldDismiss`
  (`src/components/ui/swipe-dismiss.ts`) decides whether a drag closes a panel, ready for a drawer to reuse. `Slider` gains
  optional `initialIndex`, `onIndexChange`, `dots`, `directionLock` and `ref` props (defaults unchanged). Visual baselines
  for `gallery-grid`, `gallery-grid-four`, `gallery-masonry` and `gallery-slider` need the **Update visual baselines**
  workflow.
- **Location section (Studio and site):** shows the address, opening hours, phone and email from Business info with a
  "Get directions" link (map coordinates when set, otherwise the encoded address) and either an optional map image or
  address cards. Fields: title, intro, map image, show hours, show the "Open now" badge, show phone and email and the
  directions label; agencies can offer an interactive map (Design tab → Advanced). No Google iframe, script or request
  is on the page: the optional interactive map loads only after a click, with a note that it comes from Google. Uses the
  shared `OpeningHours` and `OpenNowBadge`. Business info is resolved by the route (`getLocationBusiness`, no new query)
  and passed down as `SectionProps.business`; **projects with their own routes that render `PageView` or
  `SectionRenderer` should pass `business` too**, or Location sections render nothing there. `ctaClassName` is now
  exported from `cta-link.tsx`. Visual baselines for `location`, `location-image`, `location-interactive` and
  `location-address-only` need the **Update visual baselines** workflow.
- **Start here Studio tool:** the first screen a client sees (`src/features/studio/start-here/`), listed first for client
  roles and also available to staff. It greets the person by first name and names the site, shows shortcut cards driven
  by the site profile (Edit your website, Write a blog post, Update the team, Business info and opening hours, Help),
  the eight newest changes with who made them and when (en-AU, "2 days ago"), and up to five things to check in plain
  words (links to unpublished pages, images without descriptions, drafts waiting over seven days) using the
  content-health detectors. Help shows `help.guideUrl` and "Ask Currawong" with `help.supportEmail` and a copy button.
  New optional `OPS_NOTICES_URL` / `OPS_NOTICES_KEY` env vars add notices from the Ops dashboard through a server route,
  `/api/ops-notices` (204 when unset; the key stays on the server). `help.supportEmail` is new in `site.profile.ts`.
  `START_HERE_QUERY` is in the generated types (run `npm run typegen`).
- **Site profile:** `site.profile.ts` (a Customize file, calling `defineSiteProfile`) declares the client, tier
  (`brochure`, `content`, `commerce`, `custom`), which features the site uses (`blog`, `forms`, `newsletter`,
  `pricing`, `members`, `experiments`, `search`, `businessInfo`, `team`), the section types clients may add and
  help links. `src/config/profile.ts` holds the types, defaults, validation and `isFeatureEnabled()`, and adds
  `templateVersion`. A disabled feature controls visibility only (the schema is unchanged): its routes answer 404
  (blog and `feed.xml`, search and `/api/search`, sign-in, sign-out and `/api/auth/*`), the checkout action refuses,
  the sitemap, `robots.txt` and `llms.txt` leave posts out, the header hides search, and the Studio desk and _New
  document_ menu hide Blog, Forms, A/B tests, Stripe prices and Team. `/api/site-info` gains `tier` and `enabled`.
  Features left out of the profile stay on, so nothing changes until a site edits it.
- **Business info (Studio and site):** a new `businessInfo` singleton (sidebar → _Business info_, visible to clients)
  for Australian businesses: trading and legal name, ABN (ATO checksum, grouped as `12 345 678 901`), phone and public
  email, address (state, 4-digit postcode), time zone, opening hours (days, opens and closes with closes-after-opens
  checking), public holidays and special days, service areas, social profiles, and (agency only, under _Advanced_)
  the schema.org business type, map coordinates and price range. It is folded into `SETTINGS_QUERY` (no extra request).
  The footer gains a band with the address, ABN, a `tel:` link that also shows the number, the email and the grouped
  hours ("Mon–Fri 8:00 am – 5:30 pm") from a shared server-rendered `OpeningHours`, with a small client-only
  `OpenNowBadge` that uses the document's time zone. `SiteJsonLd` emits the chosen LocalBusiness subtype with
  `PostalAddress` (`AU`), `telephone`, `geo`, `openingHoursSpecification`, `sameAs` and `priceRange`, built by a unit-tested
  pure function. Nothing changes until the document is created. See the README's _Business info_.
- **Slider and a Testimonials slider layout (Studio and site):** an accessible touch slider (`Slider`, with
  `LazySlider` for server components) on Motion's drag: swipe or drag with elastic ends, a spring to the nearest slide
  chosen from distance and velocity (`snapIndex`, unit tested), Previous and Next, "Go to slide n" buttons and the arrow
  keys, `inert` slides out of view, carousel/slide ARIA with a polite "Slide n of N" announcement, and
  `touch-action: pan-y` so phones still scroll the page. Without JavaScript it is a horizontal scroll-snap list; it
  shifts nothing when the script takes over; reduced motion jumps instantly. Optional autoplay (off, not in the CMS)
  pauses on hover and focus and has a Pause button. The Testimonials section gains a **Layout** picker (_Grid_, the
  default and unchanged, and _Slider_ showing one, two or three quotes at a time). Existing content is unchanged and
  needs no migration; run `npm run typegen` after merging. The slider's spring costs about 22 KB gzipped if imported
  eagerly, so server components must import `LazySlider`; the home page stays at 217.3 KB (budget 220 KB). Visual
  baselines for `testimonials-slider` and `testimonials-slider-inverse` need the **Update visual baselines** workflow.
- **Hero supporting content (Studio and site):** the hero gains one approved slot, **Extra content under the heading**,
  holding a **Statistics bar**, **Badges** (one to three short labels with an optional icon) or **Logos** (up to six,
  greyscale by default), chosen from pictures in the insert menu. Full background and Split place it under the buttons,
  Editorial beside the text (under the small picture) and Image with panel inside the panel; it takes the hero's tone and
  joins the entrance after the buttons, and sits still under reduced motion. Agency staff add or remove it; clients edit
  what is in it, and see the field only once it has content. A new slot type is one schema object, one component and one
  line in `components/sections/hero/slots.tsx` (README, _Adding a hero slot_). `StatsBar` now sizes by its own width
  (container queries) so it suits any column, and its dividers are cut by an `overflow-hidden` box instead of
  first/odd rules. New shared types `badgeRow` and `logoRow`, GROQ `heroSupportingFields`, and the `fadeUpAfter` motion
  preset. The field is optional, so existing content is unchanged and needs no migration. Run `npm run typegen` after
  merging. Visual baselines for the new gallery entries (`hero-slot-*`) need the **Update visual baselines** workflow.
- **Statistics (Studio and site):** a **Stats** section (layouts _Inline_ and _Cards_; title, intro and one to six
  figures) and a compact **statistics bar** component for the hero's upcoming statistics slot. Each figure is a number
  with a label and optional prefix, suffix and decimal places, formatted on the server with `Intl.NumberFormat('en-AU')`,
  so the real figure is in the HTML without JavaScript and under reduced motion. Unless the section's Animation is _None_,
  the figures count up from 0 once when scrolled into view (a small `CountUp` island loaded only on pages that use it, so
  the home page budget is unchanged; the counting text is `aria-hidden` with a visually hidden final value, and
  `tabular-nums` with a fixed width prevents layout shift). The bar has thin dividers, takes the surrounding tone and wraps
  two by two on phones. New shared types `statItem` and `statsBar`, GROQ fragments `statItemFields` / `statsBarFields`, and
  a gallery page at `/section-gallery/stats-bar`. Existing content is unchanged and needs no migration. Run
  `npm run typegen` after merging. Visual baselines for the new gallery entries (`stats-*`) need the **Update visual
  baselines** workflow.
- **Section dividers (Studio and site):** a section can end in a shape: **Diagonal, Wave, Curve, Arch or Layered wave**,
  chosen from pictures under _Bottom edge_ in the Design tab (agency only). The section below shows through the cut,
  whether it is a flat tone, a gradient or a picture, and moves up to meet it, with its spacing adjusted automatically.
  Options: **Edge height** (Small, Medium, Large; smaller on phones), **Flip**, an **Accent line** in a brand colour and,
  for the layered wave, its **back wave colour**; a collapsed area has **Invert** and a **custom height** per screen size.
  Options that do nothing for the chosen shape are hidden and ignored. The edge belongs to the upper section, so it moves
  with it and a shared section carries its own. The shapes live in `src/components/ui/section-edges.ts` and are cut with
  `mask-image` (with the `-webkit-` prefix); browsers without mask support show a straight edge. The footer takes the
  last section's edge. New optional fields `style.edge`, `edgeHeight`, `edgeFlip`, `edgeAccent`, `edgeLayer`, `edgeInvert`
  and `edgeHeightMobile`/`Tablet`/`Desktop`; new optional `edge` group in `tokens.json` (defaults apply when it is missing).
  Existing content is unchanged and needs no migration. Run `npm run typegen` after merging. Visual baselines for the new
  gallery entries (`edge-*`) need the **Update visual baselines** workflow.
- **Section backgrounds (Studio and site):** beyond its tone, a section can have a **brand gradient** (picked from the
  gradients in Design settings) and a **background image** with an **overlay** (None, Light, Medium, Strong), all in the
  Design tab's _Background_ area. The gradient picker appears only when Design settings has gradients; the image is not
  offered for the hero, which has its own. An image on a dark tone starts at Medium, others at Light. `SectionFrame`
  draws the layers (gradient, picture, overlay) in an absolutely positioned, `aria-hidden` wrapper, so nothing shifts;
  the picture is lazy unless the section is first. Studio warns when body or secondary text may fall below 4.5:1 on the
  chosen overlay or gradient. New fields `style.gradient`, `style.image` and `style.overlay` are optional, so existing
  content is unchanged and needs no migration. Gradient slugs now come from `src/lib/color/gradients.ts`, shared by the
  design tokens and the Studio. See the README's _Section backgrounds_. Visual baselines for the new gallery entries
  (`features-grid-gradient-*`, `media-text-background-*`) need adding with the "Update visual baselines" workflow.
- **Hero presets (Studio and site):** a hero is chosen as a design. The Content tab opens with six pictures (_Full
  background image_, _Split, image right_, _Split, image left_, _Centred text, no image_, _Editorial_, _Image with
  panel_), each setting the layout, image side and background in one click, with _Full background image_ (dark) the
  default. The four layouts and their stored values are unchanged, so no migration is needed; the old Layout picker is
  hidden and the labels are now _Full background_ and _Image with panel_. _Split_ gains two agency-only options in the
  Design tab's Advanced area: _Proportion_ (50 / 50, 60 / 40 text, 40 / 60 image) and _Image shape_ (Rounded, Square
  corners, Circle, Arch). Hero pictures keep the editor's hotspot in view through `object-position`
  (`src/lib/sanity/image-focus.ts`). Layout audit fixes: _Split_'s picture is capped at 24 rem tall on tablets, and
  _Image with panel_ without a picture no longer leaves a tall empty block. The preset bar is hidden from clients and
  reads a section's own initial values when matching, so older heroes without a style show the right preset. New
  gallery entries and end-to-end tests cover every preset and shape; background video comes with task 18. See the
  README, _Hero presets_.
- **Highlighted heading words (Studio and site):** editors select words in a hero title and pick how they stand out:
  _Brand colour_, _Gradient_, _Highlight colour_ or _Underline_. A new shared type `headingText`
  (`src/lib/sanity/schema/heading-text.ts`) is a Portable Text array of one plain block whose only formatting is an
  `emphasis` annotation; the treatment is a preset picker with thumbnails, and the gradient choice sits in a collapsed
  Advanced area shown only for Gradient. `<RichHeading>` (`src/components/ui/rich-heading.tsx`) renders the right `h1`/`h2`
  with plain `<span data-emphasis>` wrappers (no `em`, `strong` or `mark`, so the accessible name is just the words;
  Visual Editing markers survive). The gradient uses `background-clip: text` with `box-decoration-break: clone`, a solid
  accent where that isn't supported and a system colour under forced colours. Studio warns above two highlighted phrases,
  past the length guidance and when a treatment is under 3:1 against the section's tone (large text; every gradient stop is
  checked). The hero uses it in every layout; `heading` is read first and the old `title` is the fallback. GROQ returns
  `heading` and `"headingPlain": pt::text(heading)`. Gradient presets live in `src/config/heading-gradients.ts`; underline
  thickness and offset and the highlight strength are the new optional `emphasis` tokens in `tokens.json`. The same type
  will follow for media + text, CTA banner and features grid titles. See the README's "Highlighting words in a heading".

- **Brand colours and gradients (Studio):** a `designSettings` singleton under Design → Brand colours (agency only, UI
  only) lets the agency set _Primary_, _Secondary_, _Highlight_ and a Light or Dark _Appearance_, with a collapsed
  _Advanced_ area for the full palette and 2–3 stop gradients. A Studio colour input (`ColourInput`) gives a picker, a
  hex field, AA pass or fail badges and "Suggest an accessible shade" (OKLCH lightness), and a mock-up previews the
  palette. `resolveDesignTokens` (pure, unit-tested) turns the settings into `:root` CSS variable overrides for only the
  roles that are set, derives text on Primary, accent text, hover colours, tints and the dark swap, adjusts derived text
  to AA and reports warnings that Studio validation shows. It is folded into `SETTINGS_QUERY` (new `designSettings`
  tag; add it to the webhook filter), rendered by `SiteShell` as one server `<style>` (nothing when unset, so the
  default is exactly `tokens.json`), and the share image uses the resolved accent. New tokens: `accent-text`,
  `accent-2`, `accent-2-ink`, `highlight`, `highlight-ink`, `cta`, `cta-ink`. New `design` and `design-visual` e2e
  projects. See the README's "Colour systems".

- **Preset picker thumbnails (Studio):** one visual language of small theme-aware SVG wireframes (4:3, readable at
  160 px) in `src/lib/sanity/schema/thumbnails/`, with a registry keyed by the values stored in
  content: the four hero layouts, the four animations (gently looping, still under reduced motion) and live tone
  swatches read from the design tokens. The insert-menu pictures in `public/section-previews/` are redrawn in the same
  language at 4:3, with a dark-mode variant. A unit test fails when a section type, variant, animation or tone has no
  thumbnail; `/studio-brand-preview` shows them all in light and dark. They replace the earlier plain pictures for the hero layouts, tones and animations in the section forms. See the README's
  "Thumbnails".

- **Section forms in three levels (Studio):** every section's form is now layout first, a short Design tab, and advanced
  options out of the way, implemented once in `sectionFields` so every section and `npm run new:section` get it. The
  **Layout** picker (`variantField`, now a preset picker with thumbnails) is first in the Content tab, and fields hide
  when the chosen layout doesn't use them (the hero's _Image_ is hidden for Editorial). The **Design** tab shows
  _Background_ (swatches drawn from `tokens.json`) and _Animation_ (pictures) with a collapsed _More layout options_ (space,
  width, alignment, anchor), and the nested "Design" box is gone (`options.frameless` plus `FramelessAwareField`). A
  collapsed _Advanced_ fieldset (`sectionFields`' `advanced` option, `sectionFieldsets`) appears only when a section
  has advanced fields. The layout picker, Design tab and Advanced are hidden from clients (UI only). No
  nonsensical combinations: Parallax is only offered where a section has a picture and Alignment is hidden where the
  layout fixes it (`rules` option; the hero's Split and Editorial), with a warning for a value left from a previous
  layout. List previews read "Hero · Split · Dark". `presetField` gained `hidden`, `fieldset`, `validation` and
  `visibleOptions`. Stored field names are unchanged: no migration, no change to the rendered site.

- **Preset picker (Studio):** one reusable input to choose by picture instead of a radio list, and a preset mode that
  sets several fields at once. `presetField` (`src/lib/sanity/schema/preset-field.ts`) makes a string field shown as a
  grid of cards; `presetsOption` puts a preset bar above an object's form. Both are activated by the existing global
  input override (`withPresetPicker`), so schemas never import Studio code. Radiogroup keyboard pattern, a collapsed
  "picture, title, Change" row, thumbnails as inline theme-aware SVG components or static files, and "Custom" when
  fields no longer match a preset. Unit tests plus an example on `/studio-brand-preview` with axe, keyboard and
  screenshot coverage. Nothing in the current sections uses it yet. See the README's "Preset picker (Studio)".

- **Navigation feedback:** a thin accent progress bar (`RouteProgress`, under 1 KB gzipped, no new dependency) for
  client-side navigations that take longer than 150 ms; instant navigations show nothing. Started by
  `onRouterTransitionStart` in `instrumentation-client.ts`, finished by a pathname or query change, with a 10 s safety
  timeout. It never animates under reduced motion. Timing logic is a unit-tested reducer; end-to-end tests cover
  fast, slow and reduced-motion navigations. See the README's "Navigation feedback".

- **Browser icon (favicon):** every site now shows Currawong's icon by default (`src/app/icon.png` 512 × 512 and
  `src/app/apple-icon.png` 180 × 180, made from the brand mark by `scripts/make-default-icons.mjs`), replacing the
  purple placeholder `icon.svg` and the generated `apple-icon.tsx`. A new _Browser icon_ setting in Website settings → Identity & search
  lets editors keep the default, upload a square PNG or SVG, or copy the site logo and crop it, with
  padding (None, Small, Medium), a background (Transparent, Light, Dark, Brand) and a preview at 16, 32 and 180 px on
  light and dark browsers. Custom icons are Sanity CDN PNGs (32, 192, 512 and 180 px) set through `metadata.icons`
  from the existing settings query, so there are no duplicate `<link rel="icon">` tags and no uploaded SVG markup in
  the page. The launch check now warns while a site still uses Currawong's default favicon and verifies a custom
  icon loads as a PNG of the right size. New `tests/e2e/browser-icon.spec.ts`. See the README's "Browser icon (favicon)".

- **Parallax:** a lightweight `Parallax` primitive (`src/components/motion/parallax.tsx`, Motion's `useScroll` and
  `useTransform`) and `ParallaxImage` for pictures. The _Parallax_ animation preset now works: the hero overlay and
  full-bleed backgrounds move behind their text, and `SectionFrame` has a `media` slot that the image + text section
  uses. Transform only, no scroll listener of our own, no layout shift, and never moved or scaled for visitors who
  ask for less motion. New `/parallax` fixture page and `tests/e2e/parallax.spec.ts`. The scroll code is a separate 6.6 KB gzipped chunk loaded only by pages that use it (the home page grows
  by 0.4 KB). See the README's "Motion".

- **Section variants:** a section can have several layouts that share one data contract. A `variant` radio field in
  the Design group (`variantField`) picks the layout; a folder holds a dispatcher (`index.tsx`, unknown values fall
  back to the first variant) and one component per variant. The hero has four: `overlay` (the previous look, still
  the default), `split` (with an image side), `editorial` (oversized type, optional small picture) and `full-bleed`
  (edge-to-edge picture, text panel bottom left). New hero fields: `eyebrow`, `secondaryImage`, `imagePosition`. The
  Studio list subtitle shows the layout ("Hero · Split"). `npm run new:section <name> -- --variants a,b,c` scaffolds
  the folder, the field and one gallery placeholder per variant; CI smoke-tests it. At most four variants per
  section. See the README's "Section variants".

- **Section style:** every page-builder section has a **Design** field group with one shared `style` object
  (`sectionStyle`): tone (surface, soft, dark, accent), spacing, width, alignment, an anchor id (unique per page, checked
  by the page's Sections field) and an animation preset (none, fade up, staggered, parallax). A new `SectionFrame`
  (`src/components/ui/section-frame.tsx`) renders each section's `<section>` from it; the style-to-class mapping is the
  unit-tested `resolveSectionStyle`. Tones recolour children through CSS variables generated into
  `tokens.generated.css`, and the focus outline switches to the light ink on the dark tones. `npm run new:section` writes
  the Design group, the `sectionStyleFields` fragment and a `SectionFrame` into new sections. The section gallery shows
  every tone and spacing on two sections. See the README's "Section style".

### Changed

- **Image + text parallax (visual change):** the _Parallax_ animation preset on Image + text now moves **only the picture inside
  its still frame**. Before, the whole framed picture (its corners and all) drifted with the scroll. The stored values are
  unchanged, and Subtle, Medium and Strong keep their strengths (Strong is held to a 1.15 scale so the picture stays sharp). The
  picture is drawn up to 15 % larger than its frame while it moves, and still and unscaled for reduced motion and without
  JavaScript. Refresh the Image + text baselines with the **Update visual baselines** workflow.
- **CI:** the e2e shards now split `desktop` and `mobile` only; before, shard 1 ran every test and shards 2–4 none (Playwright keeps a project with its dependencies in one shard). The A/B, design and design-screenshot projects run in their own `e2e (isolated)` job, and the five generator smoke tests are parallel `generator (…)` jobs instead of steps in `check`. If branch protection lists required checks, add `e2e (isolated)` and the `generator (…)` jobs.
- **Sitemap:** the pages count and slice queries (`PAGE_COUNT_QUERY`, `PAGE_SITEMAP_QUERY`) skip the reserved
  `section-gallery` slug, so the style guide's fixture page can never be listed. Run `npm run typegen` after merging.

- **Cursors and feedback:** every interactive control now shows the right cursor from shared CSS (`globals.css`):
  pointer for enabled controls, `not-allowed` for disabled ones. The per-component `cursor-pointer` classes are gone,
  disabled controls use the muted tokens and ignore hover, and `CtaLink` has a short hover/active transition that is
  switched off under reduced motion.

- The sections' markup moved into `SectionFrame`: the `<section>` now wraps a content container `<div>`, and the
  Testimonials band, Hero and CTA banner take their colours from the tone mechanism (the banner's own tone now colours its
  card through `data-tone`). The plan badge in the pricing table uses `bg-ink text-surface`. An empty style renders as before.

- **Studio sidebar:** regrouped by what people do: Start here (when it exists), Pages, Blog, Reusable content (Shared
  sections, Forms), Website settings, Design (hidden until it has screens) and Advanced (Redirects, A/B tests, Stripe
  prices and the catch-all list). Clients see Start here, Pages, Blog and Website settings (Identity & search,
  Navigation, Announcement bar). See the README's "Editing content".
- **Site settings split into four singletons:** `siteIdentity` (Identity & search), `siteNavigation`, `announcement`
  and `cookieBanner` replace the single `settings` document. `SETTINGS_QUERY` assembles them into the same result
  shape in one request, so components are unchanged. The webhook filter, cache tags (`TAGS`), Presentation locations,
  Content health, the SEO preview and the seed content follow.

- **Tones and buttons read the new colour roles:** primary buttons (`CtaLink` and the form, search and sign-in buttons)
  use `bg-cta text-cta-ink` and accent-coloured text uses `text-accent-text`; both default to the values they had
  (`surface-inverse`/`ink-inverse` and `accent`), so the site looks the same. The accent tone now takes its text and focus
  outline from `--tone-accent-ink` (the old rule resolved `--color-ink` to the accent itself, so text matched the
  background).

### Breaking changes / migration steps

**Image design:** run `npm run typegen` after merging (`imageDesign` is new in the Image + text, hero, gallery and team
fragments, and the `frame` document type is new). Add `"frame"` to the revalidation webhook filter if you use webhook mode
(README, "Live mode vs. webhook mode"). A hero's `imageShape` field is now hidden in the Studio: its value still renders, and shows
as the Image design's shape until changed, so no content migration is needed. A client site that edited `hero-picture.tsx`,
`hero-split.ts` (the `splitImage*Class` helpers now return only layout classes) or `team-card.tsx` should take the template's
versions and re-apply its changes. Add the new gallery entries' baselines with the **Update visual baselines** workflow.

**Process section:** run `npm run typegen` after merging (`process` is a new section type and fragment). No content
migration: nothing existing changes. Add screenshot baselines for the two new gallery entries (`process-vertical`,
`process-alternating`) with the **Update visual baselines** workflow.

**Logo strip marquee:** run `npm run typegen` after merging (`variant` and `logoColour` are new in `logoCloudFragment`) and
`npm run tokens` if you edit `tokens.json` (the new `motion.marquee-per-logo` token is optional; without it the marquee
uses 5 s). `components/sections/logo-cloud.tsx` is now the folder `components/sections/logo-cloud/`; if a client site
edited the old file, move its changes into `grid.tsx`. Existing logo strips have no `variant` and render the grid as
before. Add screenshot baselines for the two new gallery entries with the **Update visual baselines** workflow.

**Site profile:** after merging, edit `site.profile.ts` (take the template's file, then set `client.name` and `client.slug`,
the tier, and `features: { … : false }` for what the site doesn't use). Until you do, every feature stays on and nothing
changes. The Studio's approved sections now come from the profile's `clientSections` (empty: the same default list)
instead of a `siteProfile` document, which was never part of the schema; `CLIENT_SECTIONS_QUERY` is gone.

**Business info:** run `npm run typegen` after merging (`business` is new in `SETTINGS_QUERY`), add `businessInfo` to the
webhook filter's `_type` list (README, "Live mode vs. webhook mode") so a change shows without a redeploy, and create
the document in Studio when you want it used. No migration. The e2e fixture gains a `businessInfo` document, so the
visual baselines need the "Update visual baselines" workflow.

**Highlighted heading words:** the hero gains a `heading` field next to its old `title` string, and the code reads
`heading` first, so deploying needs no migration and existing heroes look the same. Run
`migrations/hero-title-to-heading-text` on every dataset so editors see the title in the new field (dry run first; commands
in the README's "Highlighting words in a heading"); it is safe to repeat and keeps `title`. The old field is removed in a
later release. Run `npm run typegen` after merging. `tokens.json` gains an optional `emphasis` group (a file without it
gets the defaults), so run `npm run tokens`. Visual baselines gain the `hero-heading-*` gallery entries: refresh them
with the "Update visual baselines" workflow.

**Brand colours:** run `npm run typegen` after merging (`designSettings` is new in `SETTINGS_QUERY`), add
`designSettings` to the webhook filter's `_type` list (README, "Live mode vs. webhook mode") so a colour change
publishes without a redeploy, and refresh the visual baselines with the "Update visual baselines" workflow (the accent
tone's text is now correct, and the new `design-visual` screenshots need first baselines). A project with its own
primary buttons can switch them to `bg-cta text-cta-ink` to follow the Primary colour; a project that edited
`tokens.json` must add the seven new colour tokens (`npm run tokens` lists them).

**Browser icon:** `src/app/icon.svg` and `src/app/apple-icon.tsx` are deleted and `icon.png` and `apple-icon.png` added. A
project that replaced them with its own logo keeps its files (delete the template's PNGs, or keep the old `icon.svg`:
Next.js serves every file-based icon it finds, so remove whichever set you don't want), or sets the icon in Studio
instead. Run `npm run typegen` after merging (`browserIcon` is new in Site settings and `SETTINGS_QUERY`).

None required for content: sections without a style look as they did. Run `npm run typegen` after merging. If a project
has its own sections, wrap them in `SectionFrame`, add `style { ${sectionStyleFields} }` to their fragments and use
`sectionFields([...])` in their schemas (see the README's "Section style"); until then they keep working but have no
Design tab. Visual baselines gain the new `*-style-*` gallery entries: refresh them with the "Update visual baselines"
workflow.

**Section forms in three levels:** no content migration (field names are unchanged) and the rendered site is
identical. A project with its own sections adds `fieldsets: sectionFieldsets` next to `groups: sectionGroups` in each
section type (without it an Advanced fieldset has nowhere to render) and, optionally, `rules` for Parallax and
Alignment (see the README's "Section style"). A project that registered its own `form.components.field` composes
`FramelessAwareField` (`src/features/studio/components/frameless-field.tsx`) into it. Clients no longer see the Design
tab or the layout picker, and the hero's _Image side_ moved to the Content tab. Run `npm run typegen` (field order
changes only).

**Section variants:** `components/sections/hero.tsx` is now the folder `components/sections/hero/`. A project that
edited the old file merges its changes into `hero/overlay.tsx` (the same look) or `hero/hero-text.tsx` (the text shared
by every layout). Run `npm run typegen`. Existing heroes keep the overlay look; new heroes no longer store an
alignment, so the layout chooses it. Visual baselines gain the `hero-*` gallery entries: refresh them with the "Update
visual baselines" workflow.

- Run `migrations/split-site-settings` on every dataset (dry run first; commands in the README's "Sanity workflow").
  Until it has run, the site reads the old `settings` document, so the deploy and the migration can happen in either
  order. Add `siteIdentity`, `siteNavigation`, `announcement` and `cookieBanner` to the Sanity webhook's filter
  (replace `settings`) in webhook mode.

## [1.3.0] - 2026-10-14

### Added

- **Launch check and screenshot sweep.** `npm run launch:check -- <url>` checks a deployed site before go-live: HTTPS
  and redirects (HTTP, www and apex), the security headers, `/studio`, a real 404, canonical URLs, `robots.txt` and the
  sitemap (every URL returns 200, capped at 200), unique titles and descriptions, one `h1` per page, `noindex`
  leftovers, `og:image`, the placeholder favicon, template copy and localhost links, the Sanity dataset privacy and
  CORS (a manual reminder when the token can't read the list), the unsigned-webhook 401, and optional PageSpeed
  Insights (`PSI_API_KEY`). It prints pass, warning and fail lines with a fix for each, exits 1 on any failure and
  takes `--json`. `npm run launch:screens -- <url>` saves 375, 768, 1280 and 1920 px screenshots of every sitemap URL
  into `launch-screens/<date>/` (gitignored). Each check is a pure, unit-tested function in `scripts/launch-check/`.
  New step 8 in the README's deploy checklist and a _Launch check_ section.
- **Safer publishing.** Publish on pages and posts now confirms "Publish changes to <full URL>?" and, when a live
  page's slug changed, offers (ticked by default) to publish a permanent redirect from the old address. It follows the
  redirect document's rules (no duplicate source, no loop; chains only noted). Delete on pages lists the menus, pages and
  shared sections that link to the page, reusing the Content health link detection. The logic is pure and tested
  (`utils/publish-redirect.ts`, `utils/incoming-links.ts`); the actions are `actions/confirm-publish.tsx` and
  `actions/confirm-delete-page.tsx`, registered in `sanity.config.ts` beside `singletonDocumentActions`. Wrapping Sanity's
  own Publish keeps validation and the roles' action filtering working.
- **Role-aware Studio.** Agency staff (Administrator, Developer) keep the full Studio; Editors and Contributors get
  a simpler, safer one. Clients lose Vision, AI settings and Content health, and see Presentation first; the sidebar
  shows only Site settings, Pages, Blog (and Team and Business info when present); the members-only `access`
  fields, SEO _Hide from search engines_ and the _Search & AI_ and _Cookie banner_ settings groups are hidden; a
  page's slug locks once set; Delete and Duplicate are removed on pages, posts and singletons; Contributors lose
  Publish; _New document_ offers only the page templates, posts, authors and categories; and the page builder's
  _Add item_ menu lists only approved sections (a default list, or `siteProfile.clientSections` when it exists).
  Staff get an **Agency view** badge and a switch to preview the client view. These are Studio conveniences: the
  README's _Studio roles and permissions_ matrix says what Sanity itself enforces. Adds
  `docs/studio-roles-test-script.md`. Clients must hold Editor or Contributor, never Administrator.
- **Image and text guidance.** `imageField` takes `aspect`, `minWidth`, `orientation` and `preferSvg`: the
  description gains "Recommended: 2400 × 1600 px, landscape." and Studio warns (never errors) when the
  uploaded picture is too narrow or more than 15% off the target shape, in plain English. The comparison is
  the pure, tested `describeImageProblem`. Applied to hero backgrounds (2400 px wide), _Image + text_
  (1600 px, 4:3), testimonial and author portraits (800 px, square) and logos (SVG preferred). New
  `lengthWarning` helper warns when section titles and intro text exceed the design (limits in a `LIMITS`
  constant beside each section schema).
- **Studio brand preview and tests.** `/studio-brand-preview` (development and `E2E_GALLERY=1` only; `noindex`,
  reserved slug, not in the sitemap) renders Sanity UI under the Studio theme for four brands in light and dark.
  Playwright runs axe, keyboard focus, brand-accent and Linux screenshot checks against it
  (`studio-brand-preview.spec.ts`, `studio-brand-visual.spec.ts`). `StudioLogoView` renders a logo for any brand and
  scheme, `StudioLogo` is unchanged for Studio. Known colour-contrast gaps in the legacy theme are listed in the spec
  and the README. The **Update visual baselines** workflow now uploads every `*.spec.ts-snapshots` folder.
- **CMS brand system.** The Studio now has its own brand, separate from the public design tokens:
  Currawong defaults in `src/config/studio-brand/currawong.ts`, an optional per-site `studio-brand.json`
  (default `{}`) with logo files in `src/assets/brand/client/`, and `resolveStudioBrand` with the
  precedence rules (client wins; identity falls back field by field; colours as a whole set; client
  colours used for text, focus and selected states are lifted to WCAG contrast with a warning). New
  `npm run check:studio-brand`, run by CI. See the README's _CMS branding_.
- **Branded Studio.** The resolved CMS brand now themes Studio: a theme adapter
  (`src/features/studio/theme.ts`, the only file using the deprecated `buildLegacyTheme`; it falls back to
  Sanity's default theme if a future major removes it), a navbar logo with light and dark variants, the
  workspace icon (also on the sign-in screen) and the workspace title. Sanity's fonts and success, warning and
  danger colours are unchanged. A unit test fails on CSS aimed at Sanity UI internals. New
  `npm run brand-assets` generates `src/config/studio-brand/assets.generated.ts` (run by `predev` and
  `typegen`; commit it).
- `src/lib/color/`: hex <-> OKLCH conversion, WCAG contrast and lightness adjustment.

- **CMS branding works with no setup.** `studio-brand.json` ships with only a `$schema` line (still Currawong's
  branding), `studio-brand.schema.json` gives VS Code autocompletion and validation (the Ops dashboard will use
  it too), and `src/assets/brand/client/` has a README saying which logo files go there. The setup wizard asks
  nothing new; its final screen and terminal output say how to brand the CMS for a client. `$schema` is
  accepted by `npm run check:studio-brand`.

### Changed

- `src/lib/contrast.ts` moved to `src/lib/color/contrast.ts`.
- `scripts/build-tokens.mjs` shares its colour conversion with `src/lib/color/oklch.ts` (it now needs
  Node's TypeScript stripping, on by default from Node 22.18).
- The Studio logo mark takes its colours from the CMS brand, not the public `accent` token.

### Fixed

- Blog and members e2e tests look up headings and text inside `#main-content`, which removes an intermittent
  strict-mode failure on CI (React can leave a hidden streaming segment next to the revealed copy). Tests only.

### Breaking changes / migration steps

- **Add `studio-brand.json`** (`{ "$schema": "./studio-brand.schema.json" }`, or `{}`) at the repo root, with
  `studio-brand.schema.json` beside it, and merge the new `tsconfig.json` option
  `allowImportingTsExtensions`.
- **Removed `src/config/brand.ts`** (the deprecated `brandColor`, `brandColorHex` and
  `brandForegroundColor`) and the `studioBrand` export of `tokens.generated.ts`. Use `colorHex` and
  `colorOklch` for public colours; use `src/config/studio-brand/client.ts` for Studio colours. Run
  `npm run tokens`.
- The Studio logo mark is now Currawong violet (or the client's primary) instead of the public accent.
  For a site created before this release that wants the old look, set `colors.primary` in `studio-brand.json`
  to the `accent` hex from `src/styles/tokens.json`.
- **Studio roles (Sanity role change).** The Studio is now role-aware and merges through `sanity.config.ts` (it
  registers the publish and delete actions and the role-aware structure, tools and insert menu). Give agency staff
  Administrator or Developer, and give every client user **Editor or Contributor, never Administrator**, or they
  keep the full Studio. Optionally add `siteProfile.clientSections` to limit the page builder's _Add item_ menu. Walk
  through `docs/studio-roles-test-script.md` once per site.
- **Tooling.** Node 22.18 or newer is needed (`scripts/build-tokens.mjs` uses Node's TypeScript stripping). Merge
  the new `package.json` scripts, run `npm install` and `npm run typegen`, then commit the regenerated
  `src/config/studio-brand/assets.generated.ts` and `src/types/sanity.types.ts`. Merge the new
  `check:studio-brand` step in `.github/workflows/ci.yml`.
- **Visual baselines** change (new Studio brand preview snapshots): run the _Update visual baselines_ workflow
  and commit the images from every `*.spec.ts-snapshots` folder.
- No new required env vars. `PSI_API_KEY` is optional, for the PageSpeed step of `npm run launch:check`.

## [1.2.0] - 2026-10-14

### Added

- **Design tokens.** `src/styles/tokens.json` is the one file that re-skins a site: semantic colours
  (`surface`, `ink`, `accent`, `line`, `focus`, status colours), fonts, a fluid type scale, section
  spacing, widths, radii, shadows and motion. `npm run tokens` (also run by `typegen`, `build` and
  `dev`) writes `src/styles/tokens.generated.css` (Tailwind 4 `@theme` plus `:root` variables) and
  `src/config/tokens.generated.ts` (hex and oklch values, motion in seconds). CI fails when the
  generated files are stale.
- Tests: generated output matches `tokens.json`; every token pairing reaches WCAG 2.2 AA contrast
  (`src/lib/contrast.ts`); no component uses a raw palette class (`palette-ok: <reason>` is the escape hatch).
- README "Design tokens" section.
- **Motion.** `motion` (pinned) with `LazyMotion` + `m` and the `domMax` bundle loaded after first render
  (`src/components/motion/`: provider in `SiteShell`, `MotionDiv` and friends for server components, shared presets built
  on the motion tokens). ESLint bans `framer-motion` and the `motion` component from `motion/react`. `[data-reveal]`
  elements show without JavaScript and under reduced motion. The first hero fades up its description and buttons.
  The home page JavaScript budget (`JS_BUDGET_KB`) rises from 200 to 220 KB to pay for it. README "Motion" section, `motion.spec.ts`, and the e2e suite now runs with reduced motion by default.
- `npm run check:dataset` (`scripts/check-dataset.mjs`) fails when the dataset is public.
- A test that fails if a client module imports `lib/sanity/token.ts`.
- README "Dataset privacy" section and a deploy checklist step.
- **Version endpoint.** `GET /api/site-info` returns `{ templateVersion, features, commit, builtAt }` for the Ops
  dashboard: which optional features are configured (`forms`, `newsletter`, `pricing`, `members`, `analytics`,
  `sentry`, from the same env checks the features use), `VERCEL_GIT_COMMIT_SHA` and the build time. Booleans and
  public identifiers only, never an env value. It is prerendered, so it reports the environment of the last build.
- `template-version.json` (a core file) stamps the template release a site was last updated to;
  `src/config/template-version.ts` reads it. `next.config.ts` adds a `BUILT_AT` build-time value.
- Release tooling: `npm run release -- x.y.z` moves the _Unreleased_ entries into a dated section, updates the compare
  links and `template-version.json`, and prints the git commands to commit, tag and push (it never runs git).
  `npm run check:version` fails when `template-version.json` and the latest changelog heading disagree; CI runs it.

### Changed

- Every section, shared component, the header, footer, mobile menu, announcement bar, blog, forms, search, auth and
  consent views use semantic token utilities (`bg-surface`, `text-ink-muted`, `py-section`, `text-h2`, `rounded-card`)
  instead of Tailwind greys, widths and `py-24`. The defaults reproduce the previous look; see the README for the
  few places a grey step collapsed into a token.
- The Studio's name is now the CMS brand's: `studio-brand.json`, else `NEXT_PUBLIC_STUDIO_TITLE`, else
  "Currawong Creative" (it was "Content" when the variable was unset). The Studio logo no longer reads the
  public accent.
- The OG image and the Studio logo read `src/config/tokens.generated.ts`. `src/config/brand.ts` stays as a
  deprecated alias, `brand.test.ts` is replaced by the token tests, and `--color-brand`, `bg-brand` and
  `text-brand-foreground` are aliases of `accent` and `accent-ink`.
- The setup wizard creates datasets as **private**, and server-side published reads send the Viewer token
  (still through the API CDN). The fake Content Lake used by the e2e tests now refuses reads without a token.
- **Lighthouse: `/about` may take up to 3000 ms to paint its largest element (was 2500 ms); `/` stays at 2500 ms.**
  Performance, accessibility and CLS limits are the same for both pages (`lighthouserc.json` now asserts per URL).
  Reason: on a first visit, which is all Lighthouse sees, the largest element on `/about` is the cookie banner's text,
  and the banner only renders after hydration (about 2.8 s under Lighthouse's throttling). The README's _Why `/about`
  has a looser LCP limit_ explains how to tighten it again.

### Breaking changes / migration steps

- **Design tokens:** merge `src/styles/globals.css` (it now imports `tokens.generated.css`; your `--color-brand` moves
  to `accent` in `src/styles/tokens.json`), run `npm run tokens`, commit the generated files, then replace raw palette
  classes in your own sections with token utilities (`npm test` lists them). Visual baselines need refreshing.
- **Existing sites:** after deploying this change, switch the dataset to private (sanity.io/manage → API → Datasets, or
  `npx sanity dataset visibility set <dataset> private`), then run `npm run check:dataset`. Make sure
  `SANITY_API_READ_TOKEN` is set in every environment first. Sanity's Free plan only offers public datasets; check sanity.io/pricing.
- After merging, run `npm install` (adds `motion`) and `npm run typegen`, and commit the regenerated `src/types/sanity.types.ts`.
  `template-version.json` is a core file: take the template's version.

## [1.1.0] - 2026-10-14

### Added

- Content migrations and schema deploy from CI. `migrations/` holds an example `defineMigration` (a field rename,
  with a unit test) and a README on when a schema change needs a migration, how to dry-run and how to run one.
  `.github/workflows/sanity.yml` dry-runs every migration against the production dataset on pull requests that touch
  schemas or migrations (secret `SANITY_MIGRATION_READ_TOKEN`) and runs `sanity schema deploy` on push to `main`
  (secret `SANITY_DEPLOY_TOKEN`); both skip with a notice when the secret is absent. CI never runs a real migration.
  New: `migrations/**/*.test.ts` joins the unit tests.
- Generators for features, documents and singletons: `npm run new:feature`, `new:document` and `new:singleton`,
  built like `new:section` (marker comments, everything checked before writing, then ESLint, Prettier and typegen).
  They add marker comments to `eslint.config.mjs`, `sanity.config.ts`, each feature's `schemas/index.ts`,
  `src/lib/sanity/live.ts` and the studio feature's `structure.ts` and `singletons.ts`; keep them when merging.
- Section gallery and visual regression tests: `/section-gallery` (development and `E2E_GALLERY=1` only; 404
  otherwise) renders every section type and variant from the end-to-end fixtures, and
  `tests/e2e/visual.spec.ts` screenshots each on desktop and mobile against Linux baselines kept in the repo.
  `npm run test:e2e:update` refreshes them. `npm run new:section` now adds a placeholder gallery fixture
  and reminds you to add the baseline. `section-gallery` is a new reserved first slug segment.
- Optional Sentry error tracking (`@sentry/nextjs`, `src/lib/sentry`). With `SENTRY_DSN` set, server errors
  from `onRequestError` (the JSON log line stays) and browser errors from `error.tsx` and `global-error.tsx`
  are sent to Sentry with the error digest as a `digest` tag; `global-error.tsx` now also shows the
  "Reference" code. The SDK is loaded lazily and removed from the build when the DSN is unset.
  `SENTRY_AUTH_TOKEN` (with `SENTRY_ORG`, `SENTRY_PROJECT`) uploads source maps at build time. New
  variables: `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
  See the README's _Error tracking_.

- Newsletter signup section (`newsletterSignup`, with `src/features/forms`). Heading, text, button label and
  success message; the form reuses the contact form UI, Turnstile, validation and rate limiting with its own
  server action (`subscribeNewsletter`). The provider is chosen by `NEWSLETTER_PROVIDER` (`resend`, `loops`
  or `mailchimp`), one module each behind a shared `NewsletterProvider` interface; Mailchimp uses double
  opt-in. The answer never depends on whether the address was already subscribed. `PageView`,
  `SectionRenderer` and `SectionProps` take an optional `renderNewsletter`; `ContactForm` gains optional
  `action`, `successMessage` and `failureTitle`. New variables: `NEWSLETTER_PROVIDER`, `LOOPS_API_KEY`,
  `LOOPS_MAILING_LIST_ID`, `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `NEWSLETTER_RESEND_SEGMENT_ID`. See the
  README's _Newsletter signup_.

- Pricing table backed by Stripe prices (`src/features/pricing`, section `pricingTable`). A signed Stripe
  webhook (`/api/stripe/webhook`) mirrors prices into read-only `stripePrice` documents using a
  server-side `SANITY_WRITE_TOKEN`; editors pick prices by reference, add features per plan and
  highlight one. Amounts are formatted with `Intl.NumberFormat` (`lib/format-price.ts`). A server action
  creates a Stripe Checkout Session for the chosen, active price and redirects; success and cancel URLs
  come from `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`. New `stripePrice` tag and webhook-filter entry;
  `PageView`, `SectionRenderer` and `SectionProps` take an optional `renderCheckout`. New variables:
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SANITY_WRITE_TOKEN`. In webhook mode, add `stripePrice`
  to the Sanity webhook's filter. See the README's _Pricing table_.

- Members-only pages and sections (`src/features/auth`, Auth.js / next-auth v5 with JWT sessions). A new
  `access` field (`public` | `members`) on pages and on every section, including the `new:section`
  template. Members-only content is withheld from the cached public `PAGE_QUERY` (new `$members`
  parameter) and fetched only after a gate (`MembersOnly`, inside `<Suspense>`) has seen a session;
  anonymous visitors get a sign-in prompt and none of the content. Members-only pages are `noindex` and
  left out of the sitemap, `/llms.txt` and search (so is the text of members-only sections). New
  `/sign-in`, `/sign-out` and `/api/auth` routes; `sign-in` and `sign-out` are reserved first slug
  segments. Providers (GitHub, Google) and the member allow-list (`AUTH_ALLOWED_EMAILS`) come from
  environment variables. `PageView` now needs a `renderMembersGate` prop and `getPage` a `members`
  argument. See the README's _Members-only content_. The A/B test spec now runs as its own Playwright
  project after the others, since a running experiment rewrites requests that other specs make.

- Site search (`src/features/search`): a `/search?q=` page (a plain GET form that works without
  JavaScript, results announced in a live region) and a quick search dialog opened from a new header
  link or Ctrl/Cmd+K, backed by `/api/search`. One `SEARCH_QUERY` over page titles, meta descriptions
  and rich-text / image + text bodies, cached per query text for a few minutes through the new
  `shortLivedSanityFetch` in `lib/sanity/live.ts`. `SiteHeader` and `DraftSiteHeader` take a `search`
  slot; `search` is now a reserved first slug segment. See the README's _Site search_.
- Analytics with a consent banner (`src/features/consent`). Plausible, PostHog and Google Analytics 4
  (Consent Mode v2) load via `next/script` only after the visitor accepts analytics, chosen by
  `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_POSTHOG_KEY` (`NEXT_PUBLIC_POSTHOG_HOST`) and
  `NEXT_PUBLIC_GA_ID`; with none set there is no banner. Accept all / Reject all / Choose, a _Cookie
  settings_ link in the footer, and banner text in a new Site settings → _Cookie banner_ group
  (`SETTINGS_QUERY` gained `consent`). `@vercel/analytics` (cookieless) is added to the public site.
  `SiteFooter` takes an optional `extra` slot. End-to-end tests now start as a visitor who rejected
  cookies. See the README's _Analytics and cookie consent_.

- A/B tests with Sanity content variants and the Vercel Flags SDK (`flags`). A new _A/B tests_ document
  type (name, running, control traffic, variants with traffic). While one runs, `proxy.ts` assigns each
  visitor a sticky option (cookie `ab`) and rewrites to `/ab/<code>/<path>`, a prerendered copy of the
  page per option, so published pages stay static. `<main>` carries `data-experiment` and
  `data-variant` for analytics. `ab` is now a reserved page slug. See the README's _A/B tests_.

- `/llms.txt` and an _Allow AI crawlers_ switch (Site settings → _Search & AI_, on by default). When it is
  off, `robots.txt` disallows GPTBot, ClaudeBot, Google-Extended, PerplexityBot and CCBot, and `/llms.txt`
  answers 404. `/llms.txt` lists indexable posts too. `PAGE_INDEX_QUERY` and `BLOG_INDEX_QUERY` now also return titles and descriptions. Run `npm run typegen`
  after merging.

### Changed

- The site layout's markup moved to `src/app/(site)/site-shell.tsx` (the layout now wraps it), so the A/B
  variant layout can reuse it. `src/proxy.ts` now also assigns A/B options; `cachedSanityFetch` sends
  fetches that name a variant through a client on Sanity's experimental API version.

### Breaking changes / migration steps

None required for the site to keep working; steps for what you use:

- Run `npm install` (adds `flags`, `@vercel/analytics`, `next-auth` and `@sentry/nextjs`), then `npm run typegen`.
- Add `'auth'` and `'consent'` to the `features` list in `eslint.config.mjs`.
- Rename any page whose slug is now reserved: `sign-in`, `sign-out`, `ab`, `search` or `section-gallery`.
- If you call `PageView` or `getPage` from your own routes, pass `renderMembersGate` and `members: false`.
- In webhook mode, add `"experiment"` and `"stripePrice"` to the webhook's filter.
- If you customized `src/proxy.ts` or `src/app/(site)/layout.tsx`, expect conflicts there.
- Visual tests need Linux baselines: run `npm run test:e2e:update` (Linux or Docker) and commit
  `tests/e2e/visual.spec.ts-snapshots/`. Keep your own `gallerySections` entries in the fixtures.
- Nothing new is switched on until configured: members-only content needs `AUTH_SECRET` and a provider,
  analytics needs a provider variable, A/B tests need `FLAGS_SECRET` and a running test, Sentry needs
  `SENTRY_DSN`, and migrations/schema deploy in CI need their secrets.

## [1.0.0] - 2026-10-13

First tagged release: the state of `main` when versioning began.

### Added

- Page builder on Next.js 16 (Cache Components) and Sanity Studio 6 embedded at `/studio`, with
  hero, features grid, media + text, logo cloud, testimonials, FAQ, CTA banner, rich text and form
  sections, plus `npm run new:section` to scaffold more.
- Site settings (header menu, footer, default metadata), nested pages with a page tree in Studio,
  shared sections, new-page templates and content Releases.
- One-time setup wizard (`npm run dev` in a fresh copy) that creates the Sanity project, token, CORS
  origins and starter content.
- Live and webhook modes for content updates, request-budget tooling and an Edge Config redirects
  layer synced on publish.
- SEO: sitemap (split into files of 45,000 URLs), robots, generated 1200×630 share images, Search and
  social preview in Studio, structured data (FAQPage, BreadcrumbList, Article) and IndexNow pings on
  publish.
- Blog module: post, author and category types, paginated index, categories, related posts and an
  RSS feed.
- Forms: an editor-built form section delivered by Resend, protected by Cloudflare Turnstile and a
  rate limiter, working with JavaScript off.
- Announcement bar, a personalized-content pattern, per-project Studio branding and AI-assisted
  fields (alt text, meta descriptions).
- Content health tool in Studio that lists problems across the site.
- Quality gates: strict TypeScript, ESLint with jsx-a11y strict and import-boundary rules, Prettier,
  Vitest, Playwright + axe end-to-end tests against a fake Content Lake, Lighthouse budgets, and CI
  (`check` and `e2e`) with SHA-pinned actions and grouped Dependabot updates.

### Breaking changes / migration steps

None. This is the baseline. A project created from the template before this tag has no shared
history marker to merge from; follow _Updating from the template_ in the README, which covers the
first merge (`--allow-unrelated-histories` is needed only when the project was created with GitHub's
**Use this template** button rather than a clone).

After merging, run `npm install` (dependencies changed) and `npm run typegen`, then commit the
regenerated `src/types/sanity.types.ts`.

[Unreleased]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.7.1...HEAD
[1.7.1]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/CurrawongCreativeCo/nocturne/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/CurrawongCreativeCo/nocturne/releases/tag/v1.0.0
