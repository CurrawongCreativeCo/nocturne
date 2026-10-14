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

- **Section style:** every page-builder section has a **Design** field group with one shared `style` object
  (`sectionStyle`): tone (surface, soft, dark, accent), spacing, width, alignment, an anchor id (unique per page, checked
  by the page's Sections field) and an animation preset (none, fade up, staggered, parallax). A new `SectionFrame`
  (`src/components/ui/section-frame.tsx`) renders each section's `<section>` from it; the style-to-class mapping is the
  unit-tested `resolveSectionStyle`. Tones recolour children through CSS variables generated into
  `tokens.generated.css`, and the focus outline switches to the light ink on the dark tones. `npm run new:section` writes
  the Design group, the `sectionStyleFields` fragment and a `SectionFrame` into new sections. The section gallery shows
  every tone and spacing on two sections. See the README's "Section style".

### Changed

- The sections' markup moved into `SectionFrame`: the `<section>` now wraps a content container `<div>`, and the
  Testimonials band, Hero and CTA banner take their colours from the tone mechanism (the banner's own tone now colours its
  card through `data-tone`). The plan badge in the pricing table uses `bg-ink text-surface`. An empty style renders as before.

### Fixed

### Breaking changes / migration steps

None required for content: sections without a style look as they did. Run `npm run typegen` after merging. If a project
has its own sections, wrap them in `SectionFrame`, add `style { ${sectionStyleFields} }` to their fragments and use
`sectionFields([...])` in their schemas (see the README's "Section style"); until then they keep working but have no
Design tab. Visual baselines gain the new `*-style-*` gallery entries: refresh them with the "Update visual baselines"
workflow.

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

[Unreleased]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/CurrawongCreativeCo/sanity-starter/releases/tag/v1.0.0
