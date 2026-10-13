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

### Fixed

### Breaking changes / migration steps

None required. Run `npm install` (adds `flags`, `@vercel/analytics` and `next-auth`) and `npm run typegen`. Add `'auth'` to the `features` list in `eslint.config.mjs`. If you had a page with the slug `sign-in` or `sign-out`, rename it. Members-only content stays off until you set `AUTH_SECRET` and a provider and mark something as members-only; if you call `PageView` or `getPage` from your own routes, pass `renderMembersGate` and `members: false`. Add `'consent'` to the `features` list in `eslint.config.mjs`. Analytics stay off until you set a provider variable. A/B tests stay off until you set
`FLAGS_SECRET` and start a test. In webhook mode, add `"experiment"` to the webhook's filter. If you
had a page with the slug `ab`, rename it: that path now belongs to the variant routes. If you
customized `src/proxy.ts` or `src/app/(site)/layout.tsx`, expect conflicts there. If you had a page with the
slug `section-gallery`, rename it. Visual tests need Linux baselines: run `npm run test:e2e:update` (Linux or
Docker) and commit `tests/e2e/visual.spec.ts-snapshots/`; keep your own `gallerySections` entries in the fixtures.

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

[Unreleased]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/CurrawongCreativeCo/sanity-starter/releases/tag/v1.0.0
