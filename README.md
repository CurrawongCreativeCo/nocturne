# Sanity × Next.js Starter

Next.js 16 (App Router, Cache Components) · next-sanity 13 · Sanity Studio 6 · Tailwind 4 · TypeScript strict.

<!-- setup-wizard:start -->

### Starting a new project

This repo is the clean template. Don't run the setup wizard in it; start each new site from a fresh copy
(or use GitHub's **Use this template** button):

```bash
git clone https://github.com/CurrawongCreativeCo/sanity-starter.git my-new-site
cd my-new-site
npm install
npx sanity login   # lets the wizard create the project, token, CORS origins and starter content
npm run dev
```

The first `npm run dev` opens a setup form at http://localhost:3333. It can create a new Sanity project
(or connect an existing one), create a Viewer token, allow the site in CORS, and import starter content
(Home and About pages, Site settings with a menu and footer). It writes `.env.local`, deletes itself
(`scripts/setup/`, the `predev`/`setup` scripts, and this section), then starts the site and links you
to Studio's Presentation view. Commit the deletions in the new project only; never in this template,
or future projects lose the wizard.

Working on the template itself? Keep an untracked `.template-dev` file in its checkout (any content;
it's gitignored). The wizard sees it and never removes itself there, even when `.env.local` works.

To make the new project its own repo, point it at a new remote before pushing:

```bash
git remote set-url origin https://github.com/<you>/my-new-site.git
```

<!-- setup-wizard:end -->

### Manual setup

```bash
cp .env.example .env.local   # fill in project ID + Viewer token
npm run dev                  # site on :3000, Studio on :3000/studio
```

In sanity.io/manage → API → CORS, add `http://localhost:3000` (with credentials) and your production URL.
Create a page with slug `home` to populate `/`. After changing schemas or queries, run `npm run typegen`.

## Editing content

Open http://localhost:3000/studio:

- **Presentation** shows the site and the editor side by side. Click any text to edit it; drag sections to reorder.
- **Site settings** (top of the sidebar) holds the site name, logo, announcement bar, header menu and button, footer, and default SEO.
- **Announcement bar:** in Site settings → _Announcement_, a one-line message (up to 120 characters) shows above the header on every page. Add a link and the whole message becomes the link; tick _Visitors can dismiss it_ for a close button (it stays closed in that browser until the message text changes). _Show from_ / _Show until_ are optional; with neither it shows all the time, and a bar with no message shows nothing. The dates are checked in the visitor's browser, because pages are cached: the bar is always in the HTML but hidden, so it appears a moment after load (the page below shifts down once) and visitors outside the window never see a gap. In Presentation it follows the same dates, so an expired or future bar won't show there either.
- **Share image:** every page gets a social card. Priority: the page's own _Share image_ (SEO group), then the site's default (Site settings), then a generated one: brand-colored, with the meta title (or page title) clamped to three lines and the site name, served as a PNG at `/api/og/<slug>`. Only one `og:image` is ever emitted. To restyle it, edit `src/app/api/og/[[...slug]]/route.tsx`; the font file is `src/assets/fonts/` and the color is `brandColorHex` in `src/config/brand.ts` (the renderer can't read `oklch()`, so keep it in step with `--color-brand`).
- **SEO preview:** the SEO group of a page shows how it will look in Google and as a social card, using the site's fallbacks (meta title → page title plus "| site name", the site description and share image). Text Google would cut off (over 60 characters for titles, 160 for descriptions) is marked "Cut off".
- **Content health** (toolbar) lists pages with no meta description, images with no alt text, links to unpublished pages, redirect chains and loops, and pages nothing links to; click a row to fix it. It also checks shared sections (alt text always; links only while a published page uses them).
- **AI Assist** (`@sanity/assist`) writes alt text and meta descriptions. It needs a Sanity **Growth** plan
  or higher (AI Assist is not on Free). On Free the plugin still loads and Studio works normally; the
  assist actions just aren't usable, and everything is written by hand. To use it:
  - _Alt text:_ nothing runs on upload, so no AI credits are spent unless someone asks. With an image
    set, open the sparkle (AI Assist) menu on "Alternative text" and run **Generate image description**.
    It always writes in English. Always review it.
    To have it run on every upload instead, open **AI settings** in the Studio toolbar and switch on
    _Write alt text automatically_. It's off by default, each run spends credits, and the choice is
    saved per browser, so each editor decides for themselves (reload open Studio tabs to apply it).
  - _Meta description:_ in a page's SEO group, open the sparkle (AI Assist) menu on "Meta description" and
    run **Write meta description**. It summarizes the page title and sections in one sentence under 155
    characters. Review before publishing.
- **Redirects** send old URLs (e.g. from a previous site) to new ones: "From" `/about-us.html`, "To"
  `/about`. Studio blocks duplicates and loops, and warns about chains and sources a page already uses.
  Normally they only apply to paths with no page, so they can't hide a live page. With Edge Config
  redirects on (see below) they run first, so a redirect from a path that has a page hides that page.
- **Pages** is a tree: top-level pages first, then a folder per first slug segment that has
  children (`services/web-design` is listed under `services`). _All pages_ at the bottom is the flat
  list for search and bulk work.
- **Pages → New** offers templates: _Landing page_ (hero, features, testimonials, call to action) and
  _Content page_ (hero + rich text), or a blank page.
- Under **Sections**, _Add item_ shows every section with a thumbnail:

| Section               | Use it for                                                |
| --------------------- | --------------------------------------------------------- |
| Hero                  | Page headline, intro, up to two buttons, background image |
| Rich text             | Long-form copy: headings, lists, links, inline images     |
| Image + text          | A picture beside a short story, image on either side      |
| Features grid         | 2–4 columns of benefits with icons                        |
| Logo strip            | Client or partner logos                                   |
| Testimonials          | Customer quotes with name, role and photo                 |
| FAQ                   | Questions that expand to answers                          |
| Call to action banner | A closing prompt in brand, dark or light tone             |

**Shared sections:** use _Shared sections_ in the sidebar for a section that appears unchanged on
several pages, like a promo banner or a newsletter sign-up. Create one (a title for your own reference,
plus the section), then on a page choose _Add item → Shared section_ and pick it. Edit it once and every
page that uses it updates; clicking it in Presentation opens the shared document. If the wording needs to
differ per page, add a normal section instead. Deleting a shared section leaves the pages that still
reference it without it (they skip the gap rather than error).

**Content releases:** group changes to several documents and publish them together, at once or at a set time.

1. _Create:_ open **Releases** in the Studio toolbar and choose _New release_ (name it, pick _ASAP_, _At time_ or _Undecided_). Then edit any page, shared section or setting and use the document's version menu to add it to the release; the release holds its own copy, so the published page doesn't change.
2. _Preview:_ in **Presentation**, open the perspective menu and pick the release (or several; the first listed wins). The site then renders the release's content, including documents it doesn't change. This works in draft mode only: Presentation stores the choice in the `sanity-preview-perspective` cookie, which `getDraftFetchMode` reads. The public site always shows published content.
3. _Schedule:_ in the release, set _At time_ and choose _Schedule_ (or _Publish all_ to go live now). Scheduled releases publish on their own and trigger the usual live update or webhook revalidation.

Releases and scheduled publishing need a paid Sanity plan (Growth or higher); on Free they aren't available, so editors publish documents individually. Check your project's plan for its release limits.

**Branding:** the brand color is `--color-brand` in `src/styles/globals.css`, repeated as `brandColor`
in `src/config/brand.ts` for the Studio (a unit test fails if the two drift apart). The Studio's name comes from
`NEXT_PUBLIC_STUDIO_TITLE` (the setup wizard fills it in from the site name) and appears in its header beside a
small mark in the brand color. The font is set
with `next/font` in `src/app/layout.tsx` (Inter by default); the favicon is `src/app/icon.svg` and
the iOS icon `src/app/apple-icon.tsx`. All three are placeholders to replace per project. The generated share image has its own copy of the font (Inter Bold, `src/assets/fonts/`), because `next/og` can't use `next/font`.

## Deploying (Vercel)

1. **Import the repo** at vercel.com/new. Next.js is detected automatically. Node comes from
   `engines` in `package.json` (`.nvmrc` pins the same for local work and CI).
2. **Environment variables** (Production and Preview):

   | Variable                         | Value                                                           |
   | -------------------------------- | --------------------------------------------------------------- |
   | `NEXT_PUBLIC_SANITY_PROJECT_ID`  | from `.env.local`                                               |
   | `NEXT_PUBLIC_SANITY_DATASET`     | from `.env.local`                                               |
   | `NEXT_PUBLIC_SANITY_API_VERSION` | from `.env.local`                                               |
   | `NEXT_PUBLIC_SITE_URL`           | your production URL, e.g. `https://example.com` (no slash)      |
   | `NEXT_PUBLIC_SITE_LANGUAGE`      | optional: content language for `<html lang>` (default `en`)     |
   | `NEXT_PUBLIC_STUDIO_TITLE`       | optional: name in the Studio header and tab (default `Content`) |
   | `SANITY_API_READ_TOKEN`          | from `.env.local` (Viewer token)                                |
   | `SANITY_REVALIDATE_SECRET`       | only for webhook mode (see below)                               |
   | `EDGE_CONFIG`                    | optional: Edge Config redirects (see below); Vercel adds it     |
   | `EDGE_CONFIG_ID`                 | optional: Edge Config redirects; the store's `ecfg_…` id        |
   | `VERCEL_API_TOKEN`               | optional: Edge Config redirects; token that can edit the store  |
   | `VERCEL_TEAM_ID`                 | optional: Edge Config redirects; only for team-owned stores     |

3. **Allow the production origin in Sanity**, or Studio and live updates won't connect:
   `npx sanity cors add https://example.com --credentials` (or sanity.io/manage → API → CORS
   origins, "Allow credentials" checked). Preview deployments on other domains need their own entry.
4. **Deploy**, then open `https://example.com/studio` and sign in. Studio is part of the site, so
   there is nothing separate to deploy.
5. **Check:** `/sitemap.xml` and `/robots.txt` list production URLs, and editing a page in
   Presentation updates the live site.

Without `NEXT_PUBLIC_SITE_URL`, Vercel deployments fall back to the project's production domain; any
other production server refuses to start rather than publish canonical URLs pointing at localhost.
Server errors are logged as one JSON line each (`src/instrumentation.ts`): search Vercel's Logs for
`request-error`, or the "Reference" code shown on the error page. Forward them to Sentry from there
if you use it.

Every deploy runs `npm run build`, which regenerates Sanity types from the schema first.

## Architecture

**Single repo, Studio embedded at `/studio`.** One deploy, one set of env vars, and schema, queries
and components share types without a workspace package. Presentation previews the same origin, so
there are no cross-site cookie problems. Move to a monorepo (`apps/web`, `apps/studio`,
`packages/sanity`) only when several frontends share a dataset or the Studio needs its own release cycle.

Folders follow [Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md):
shared code at the bottom, self-contained features in the middle, and routes on top that compose them.

```
sanity.config.ts / sanity.cli.ts   Studio + CLI/TypeGen config (Studio composition root)
eslint.config.mjs                  enforces the import rules below
src/
  app/                             routes only: thin files that compose features
    layout.tsx                     bare <html> shell (shared with Studio)
    (site)/layout.tsx              header, footer, site metadata, <SanityLive/>, draft-mode tools
    (site)/[[...slug]]/page.tsx    every CMS page, including "/"
    api/draft-mode/{enable,disable}
    studio/[[...tool]]/page.tsx
    api/og/[[...slug]]/route.tsx     generated share image (PNG) for pages without one
    sitemap.ts                       split into files of 45,000 URLs (generateSitemaps)
  proxy.ts                         Edge Config redirects (inactive without EDGE_CONFIG)
  features/
    pages/                         CMS pages + page builder
      api/                         queries.ts, sections.ts (GROQ), get-page.ts (page, metadata, sitemap)
      utils/                       sitemap-chunks.ts (split math)
      components/                  page-view, section-renderer, sections/<name>.tsx
      schemas/                     page.ts, shared-section.ts, sections/<name>.ts, templates.ts (new-page templates)
      types/                       PageSection, SectionOf<'hero'>, SectionProps
    site/                          Site settings singleton: header, footer, default metadata
    draft-mode/components/         draft-mode-tools (lazy Visual Editing + exit button)
    personalization/               request-time (cookie) greeting, rendered in <Suspense> inside cached pages
    studio/                        desk structure, singletons, Presentation resolvers, content-health tool,
                                   AI settings tool, AI Assist presets
  components/ui/                   shared UI: sanity-image, sanity-link, cta-link, rich-text
  config/                          env.ts (validated), paths.ts (slug <-> URL)
  lib/sanity/                      client (singleton), live, live-action, image, token, data-attribute,
                                   fragments.ts (shared GROQ), schema/ (link, cta, seo, blockContent, imageField)
  styles/globals.css               Tailwind theme, including the brand color
  types/
    sanity.types.ts                GENERATED — commit it
    sanity.ts                      shared types: SanityImageData, CtaData, LinkData
public/section-previews/           insert-menu thumbnails, one <typeName>.svg per section
scripts/new-section.mjs            `npm run new:section` scaffolder
```

**Import rules** (`npm run lint` fails on violations):

```
components, config, lib, styles, types   ->   features   ->   app
```

- Shared folders never import from `features/` or `app/`.
- A feature never imports another feature or `app/`. When two features meet, compose them in a route.
- Import files directly (`@/features/pages/api/get-page`); there are no barrel files.
- When you add a feature folder, add its name to the `features` list in `eslint.config.mjs`.

### Data fetching and caching

| Mode       | Perspective                 | Stega | Caching                                                             |
| ---------- | --------------------------- | ----- | ------------------------------------------------------------------- |
| Published  | `published`                 | off   | `'use cache'` + sync-tag `cacheTag`s; prerendered at build          |
| Draft mode | cookie (`drafts` / release) | on    | same cache fn, options are cache-key args; rendered in `<Suspense>` |

- `defineLive({strict: true})` makes every fetch pass `perspective` and `stega` explicitly. That's the
  Cache Components contract: `draftMode()` and `cookies()` are read outside the cache boundary and passed in.
- `cachedSanityFetch` is the **only** `'use cache'` boundary for Sanity data.
- `<SanityLive />` listens to the Live Content API and expires exactly the tags the changed documents
  touched. No `revalidate` timers. `cacheLife.default` is set to "forever" for that reason.
- Its action, `lib/sanity/live-action.ts`, makes the refresh seamless. Open tabs re-render with the new
  content in place, within about a second, with no reload or flash. The first tab to report a change
  expires it immediately. Other tabs within 2 seconds just refresh, so any number of open tabs costs
  each changed query two refetches at most. (next-sanity's default only marks tags stale, so the tab's
  refresh would render the old content and the edit wouldn't appear until a later visit.)
- Fetch `tags` are document-type tags for webhook mode (see below); live mode uses Sanity's sync tags.

### Personalization inside cached pages

Pages are prerendered, so anything that depends on the visitor (a cookie, a header) must stay out of the
cache. The rule: **request-time reads go outside `'use cache'`, inside `<Suspense>`.** Cached data still
comes from `cachedSanityFetch`; only the small dynamic piece renders per request, and the rest of the page
stays partially prerendered (the build marks the route `◐ Partial Prerender`).

The reference example is a "Welcome back" greeting on the hero:

- `features/personalization/components/returning-visitor.tsx` is an async server component that reads the
  `visited` cookie with `cookies()`. Returning visitors get the greeting; on a first visit it renders
  `mark-visited.tsx`, a tiny client component that sets the cookie for next time.
- Features can't import each other, so the route (`app/(site)/[[...slug]]/page.tsx`) passes
  `<ReturningVisitor />` down as a `greeting` prop through `PageView` and `SectionRenderer` to the sections.
  The hero wraps it in `<Suspense fallback={null}>` and renders it only when the editor ticks _Greet returning
  visitors_ on the hero.
- To personalize another section, take the same `greeting` prop (or add a similar slot), wrap it in
  `<Suspense>`, and never call `cookies()`, `headers()` or `draftMode()` inside a cached function.

### Request budget

Published reads go to Sanity's API CDN without a token, one request per cache miss. There are only three
queries (shared sections are resolved inside `PAGE_QUERY`, not fetched separately): `PAGE_QUERY` (a page and its metadata), `PAGE_INDEX_QUERY` (static params, sitemap, and the
unknown-URL check) and `SETTINGS_QUERY` (announcement bar, header, footer, site metadata). So:

- **Build:** one request per page, plus two.
- **Visitors:** zero. Pages are prerendered and every query result is cached until its content changes.
- **Publishing:** only the cached results containing the changed documents are refetched, once each.
- **Large sites:** a sitemap file holds at most 45,000 URLs (Google allows 50,000). Past that, `generateSitemaps`
  splits the sitemap into `/sitemap/0.xml`, `/sitemap/1.xml`, … and `robots.txt` lists every file. Sizing it costs
  one cheap `count()` query (`PAGE_COUNT_QUERY`), and each file one sliced query (`PAGE_SITEMAP_QUERY`, ordered
  by `_id`); both carry the `page` tag. Up to 45,000 pages nothing changes: one file, built from
  `PAGE_INDEX_QUERY`, with `/sitemap.xml` rewritten to `/sitemap/0.xml` and listed in `robots.txt`. On a split
  site `/sitemap.xml` still serves the first file only, so submit the files listed in `robots.txt`.
- **Share images** add none: `/api/og/<slug>` reads the cached `PAGE_QUERY` and `SETTINGS_QUERY` entries that the page and layout already use.
- **Unknown URLs** (typos, bots probing `/wp-admin`) are answered from the cached page index at no cost.
- **Draft mode** bypasses the shared cache by design (editors need fresh drafts) and uses the token.

Keep it that way: fetch through `cachedSanityFetch`, call each query with the same argument shape so
callers share one entry, and fold new data into an existing query rather than adding a parallel one.

### Live mode vs. webhook mode

By default (**live mode**), each open browser tab listens to Sanity and expires exactly the cached
results that a change touched. It needs no setup and works in local dev. Two costs grow with traffic:
Sanity allows 1,000 live connections per dataset (above that, visitors fall back to re-rendering from
cache every 30 seconds), and every open tab calls a small server action on each publish.

**Webhook mode** suits sites that regularly have hundreds to a thousand-plus visitors at once. Sanity
calls one route per publish, and visitors open no connections. Previews stay live either way.

|                               | Live mode (default)                                  | Webhook mode                                             |
| ----------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Setup                         | none                                                 | webhook + secret per environment                         |
| Visitor connections           | one per open tab, 1,000 cap                          | none                                                     |
| Server calls per publish      | one per open tab (refetches deduped to ≤2 per query) | one                                                      |
| Open tabs see the change      | in place, within ~1 s                                | on their next navigation                                 |
| First visitor after a publish | gets the new content                                 | gets the previous version once while the new one renders |
| What a publish refetches      | only results containing the changed documents        | every result tagged with the changed type                |
| Works on localhost            | yes                                                  | no (Sanity can't reach it)                               |

To switch a deployment to webhook mode:

1. Generate a secret: `openssl rand -hex 32`
2. Set `SANITY_REVALIDATE_SECRET` to it in the deployment's environment variables (not needed locally).
3. In sanity.io/manage → your project → **API → Webhooks → Create webhook**:
   - **URL:** `https://your-site.com/api/revalidate`
   - **Dataset:** your dataset · **Trigger on:** Create, Update, Delete
   - **Filter:** `_type in ["page", "settings", "redirect", "sharedSection"]` · **Projection:** `{_type}`
   - **HTTP method:** POST · **Secret:** the same value as step 1
   - Leave **Drafts** and **Versions** unchecked, so only publishes fire it
4. Redeploy. To go back to live mode, remove the env var and delete the webhook.

### Edge Config redirects

By default a redirect is answered by the page route: the request renders, finds no page and redirects.
With Vercel Edge Config, `src/proxy.ts` answers it before anything renders, from a map of every Studio
redirect, with a clean single `Location` header. Without `EDGE_CONFIG` the proxy does nothing and the
page route handles redirects as before, so projects off Vercel or without a store need no setup.

1. In Vercel → Storage, create an **Edge Config** store and connect it to the project. Vercel adds
   `EDGE_CONFIG` (a read connection string) to the project's environment variables.
2. Set `EDGE_CONFIG_ID` to the store's id (`ecfg_…`, in its settings), and `VERCEL_API_TOKEN` to a token
   from vercel.com/account/tokens that can edit it. Add `VERCEL_TEAM_ID` if a team owns the store.
3. Set up webhook mode (above). The filter already includes `"redirect"`; the sync is part of
   `/api/revalidate`. Without a webhook nothing writes the map and the page route handles every redirect.
4. Publish a redirect (or any one, to seed the map for the first time). The webhook rebuilds the whole map
   from Studio's redirects and writes it as the `redirects` item, keyed by lowercase path without a
   trailing slash. Publishing or deleting a redirect updates it; changes usually reach the edge within seconds.

If the write fails the route answers 502 and Sanity retries the webhook; the old map keeps serving
meanwhile. The proxy skips `/studio`, `/api`, `/_next` and static files (`.html`, `.php` and other page-like
extensions still match). If Edge Config can't be read, it passes the request through to the page route.
Keep the map within your plan's Edge Config size limit; with thousands of redirects, check it.

Results are tagged by document type (`TAGS` in `lib/sanity/live.ts`). When you add a document type
that pages query, add it to `TAGS`, to the `tags` of every fetch that reads it, and to the webhook filter.

### Type flow

```
features/*/schemas + lib/sanity/schema ──schema extract──▶ schema.json ──┐
features/*/api/*.ts (defineQuery + ${fragments}) ─────────────────────────┴─▶ typegen ─▶ types/sanity.types.ts
                                                                                    │
sanityFetch({query: PAGE_QUERY}) ◀── result inferred via global SanityQueries ──────┘
types.ts: PageSection = union on _type; SectionOf<'hero'> = one member
```

`--enforce-required-fields` turns `validation: rule.required()` into non-nullable types, so the
compiler knows `hero.title` is a `string` and `hero.description` is `string | null`.

Data is typed `StegaBranded`: draft-mode strings carry invisible edit markers. They render normally,
but compare them to literals only after `stegaClean()` (see `cta-link.tsx`).

## Code quality

**CI** (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request. It checks
that the committed Sanity types match the schema, runs `npm run check`, proves the section generator's
output passes too, and runs the end-to-end suite and Lighthouse in a real browser. **Dependabot** opens
weekly grouped update PRs (Sanity, Next/React, dev tooling, GitHub Actions), waiting a week after
each release before proposing it.

| Command                   | Does                                                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| `npm run check`           | Typecheck, lint, format and unit tests, read-only. Run it before pushing.  |
| `npm run typecheck`       | TypeScript, strict mode                                                    |
| `npm run lint`            | ESLint, zero warnings allowed (`lint:fix` to autofix)                      |
| `npm run format:check`    | Prettier (`format` to apply)                                               |
| `npm test`                | Unit tests (Vitest; `test:watch` while working)                            |
| `npm run test:e2e`        | End-to-end tests (Playwright; first run `npx playwright install chromium`) |
| `npm run test:lighthouse` | Lighthouse budgets on `/` and `/about` (needs Chrome installed)            |

### Tests

- **Unit** (`*.test.ts` next to the code): slug/URL mapping, redirect matching and the Edge Config map and proxy, the live-update
  dedupe logic, the section generator's naming, and the setup wizard's validation.
- **End to end** (`tests/e2e`): a production build pointed at a fake Content Lake that serves
  `tests/e2e/fixtures/dataset.mjs`, so it runs offline with no Sanity project. On desktop and mobile
  Chrome it checks pages and metadata, redirects, security headers, robots and sitemap, the webhook
  route, keyboard focus and the skip link, the mobile menu, the announcement bar (inside, before and after its window; dismissal), the returning-visitor greeting (absent on a first visit, shown on the second), and runs axe for WCAG 2.2 AA on every page.

Running the end-to-end tests locally:

```bash
npx playwright install chromium   # once per machine: downloads the test browser (~100 MB)
npm run test:e2e                   # builds the site, then tests it (a few minutes)
```

They use ports 3100 and 9999 and don't need `.env.local`. Stop anything else on those ports first.
CI installs the browser itself.

When you add a section, add an example of it to the fixture dataset so the axe scan covers it.

### Performance budgets

CI fails when a page gets heavier or slower than these. They run against the same production build and fake
Content Lake as the end-to-end tests.

| Budget                                 | Limit   | Where it lives                                    |
| -------------------------------------- | ------- | ------------------------------------------------- |
| JavaScript loaded by `/` (gzipped)     | 200 KB  | `JS_BUDGET_KB` in `tests/e2e/performance.spec.ts` |
| Lighthouse performance (`/`, `/about`) | ≥ 0.9   | `lighthouserc.json`                               |
| Lighthouse accessibility               | 1       | `lighthouserc.json`                               |
| Cumulative Layout Shift                | ≤ 0.05  | `lighthouserc.json`                               |
| Largest Contentful Paint               | ≤ 2.5 s | `lighthouserc.json`                               |

- **JavaScript:** the test fetches `/`, takes every `<script src>` in the HTML, gzips each file from
  `.next/static` (level 9) and adds them up (1 KB = 1000 bytes). Over budget, it lists every chunk, largest
  first. The total is about 190 KB today, so a new client-side dependency of even 10 KB trips it. Look first
  for a client component that can be a server component, or an import that can be lazy-loaded (as
  `draft-mode-tools.tsx` does).
- **Lighthouse:** `npm run test:lighthouse` (CI runs `npx lhci autorun`) starts the fake Content Lake and
  `next start` through `scripts/e2e-server.mjs`, which shares its env with `playwright.config.ts` via
  `tests/e2e/constants.ts`, then runs three Lighthouse passes per page and judges the median. It builds the
  site only if `.next` is missing, so delete `.next` after changing code. It uses applied (`devtools`)
  throttling: Lighthouse's default simulated model reports `/about` about 20 ms over the LCP limit while
  Chrome actually paints it in about 130 ms. It needs Chrome installed (CI's runner has it). Reports go to
  `.lighthouseci/`.
- **Raising a budget** is a decision, not a fix for a red build. First find what grew (the chunk list, or the
  failing audit in the Lighthouse report) and try to shrink it. If the cost is worth it, change the limit in
  the file above in the same pull request as the change that needs it, and say why in the description. Don't
  loosen a budget to land an unrelated change.

**ESLint** layers the strictest presets available:

- Next.js core-web-vitals (React, hooks, Next rules)
- typescript-eslint `strict-type-checked` + `stylistic-type-checked`: type-aware rules that catch
  unsafe `any`, unnecessary conditions, floating promises and more
- **Accessibility:** jsx-a11y `strict`, so all 33 rules are errors, not warnings (Next.js enables only 6, as
  warnings). It catches missing alt text, unlabeled controls, invalid ARIA, click handlers without
  keyboard support, positive `tabIndex` and more at build time.
- Import order, no import cycles, and the architecture boundaries above
- `eslint-config-prettier` last, so formatting is left entirely to Prettier

Built in at runtime: a "Skip to content" link (the first Tab stop on every page), a focus ring that
stays visible on any background (a 2px outline with a gap, dark on light sections and white
on dark ones; tested in the end-to-end suite), and reduced motion for
visitors who ask for it. Lint can't see rendered output, so the end-to-end suite runs axe on the
built pages (contrast, names, landmarks, headings). Things no tool judges well, like whether the
focus order makes sense, still need a quick keyboard pass in the browser.

**Prettier** formats everything and sorts Tailwind classes into the official order. The VS Code
settings in `.vscode/` format on save and apply ESLint fixes. Install the recommended extensions
when VS Code prompts.

### Pre-commit hook (off by default)

```bash
npm run hooks:on    # enable for this clone
npm run hooks:off   # disable again
```

When enabled, each commit runs ESLint (with autofix) and Prettier on the staged files, then a full
typecheck. A commit with lint or type errors is blocked; formatting is fixed automatically. Skip once
with `git commit --no-verify`. The hook is opt-in per clone because hooks are personal
tooling: `npm run check` (or CI) is the shared gate.

## Adding a section

```bash
npm run new:section pricing-table
```

This creates the schema, GROQ fragment, component and thumbnail, registers each one, and runs typegen.
The section is immediately in Studio's _Add item_ menu with a title and text field. Then:

1. Add fields in `src/features/pages/schemas/sections/pricing-table.ts`
2. Query them in `pricingTableFragment` (`src/features/pages/api/sections.ts`) and run `npm run typegen`
3. Build the UI in `src/features/pages/components/sections/pricing-table.tsx`, typed from the query
4. Optionally replace `public/section-previews/pricingTable.svg`

The generator inserts code at the `// new-section:*` marker comments; keep them in place. To add a section
by hand, follow the same steps and register it in `schemas/sections/index.ts`, `pageBuilderFragment` and
`components/section-renderer.tsx`. Until a section is registered in the renderer, `tsc` fails with
"Property '<name>' is missing".

## Notes

- Images go through `next-sanity/image`, which uses Sanity's CDN for resizing and format negotiation
  instead of the Next.js optimizer (no optimizer billing). `SanityImage` applies crop/hotspot and LQIP blur.
- `@sanity/icons` v5: import per icon (`@sanity/icons/Rocket`). The barrel's named exports are typed
  `never` and `tsc` won't flag them, but the bundler will.
- A generated share image can't be an `opengraph-image` file: Next.js rejects those under an optional catch-all (`[[...slug]]`), so it is a route handler and `getPageMetadata` points `og:image` at it. A CMS page with slug `api/...` would clash with it, as with the other `/api` routes.
- Page metadata always uses published content, so `<head>` stays prerenderable and drafts don't leak into it.
- `browserToken` reaches the browser only in draft mode. Use a Viewer-role token.
- Visual Editing and the "Exit preview" button are lazy-loaded in `draft-mode-tools.tsx`. Importing them
  directly in a layout ships about 200 KB of gzipped Studio code to every visitor.
- Visual Editing `data-sanity` attributes are only rendered in draft mode, keeping public HTML lean.
- The footer's copyright year is cached for a day, so pages re-render daily. Those re-renders read the
  cached Sanity data and make no requests.
- Security headers (HSTS, nosniff, referrer and permissions policies, clickjacking protection) are
  set in `next.config.ts`. There's no full Content-Security-Policy because the embedded Studio
  needs inline scripts and styles. `/studio` is excluded from the framing restriction.
- `error.tsx` handles a page that fails to render, keeping the header and footer. `global-error.tsx`
  handles failures in the layouts themselves.
- Structured data (schema.org Organization and WebSite) is generated from Site settings on every
  page, reusing the cached settings query.
- `npm audit` reports issues in `braces` and `sprintf-js`, which have no fixed release yet. Both run only
  inside the Sanity CLI and ESLint, at build time, on this project's own files. Patched versions of
  the other affected packages are pinned with `overrides` in `package.json`; remove an override once
  the package that pulls it in ships the fix itself.
- Without Edge Config redirects, redirects from Studio send the `Location` header twice, with identical
  values (a known Next.js bug with redirects from cached pages,
  [vercel/next.js#82117](https://github.com/vercel/next.js/issues/82117)). Browsers handle it fine, and the
  end-to-end tests check that Chrome lands on the destination and that the two values never differ.
  Edge Config redirects don't have the problem.
- 404s for unknown URLs are rendered on demand, so Next.js streams their metadata to browsers (the tab
  title is set by script) and sends crawlers a minimal shell. Both get a 404 status and `noindex`,
  which is what search engines act on; the end-to-end tests check exactly that.
