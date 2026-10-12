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
- **Site settings** (top of the sidebar) holds the site name, logo, header menu and button, footer, and default SEO.
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

The brand color used by buttons, links and the "brand" banner is `--color-brand` in `src/styles/globals.css`.

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
    sitemap.ts
  features/
    pages/                         CMS pages + page builder
      api/                         queries.ts, sections.ts (GROQ), get-page.ts (page, metadata, sitemap)
      components/                  page-view, section-renderer, sections/<name>.tsx
      schemas/                     page.ts, sections/<name>.ts, templates.ts (new-page templates)
      types/                       PageSection, SectionOf<'hero'>, SectionProps
    site/                          Site settings singleton: header, footer, default metadata
    draft-mode/components/         draft-mode-tools (lazy Visual Editing + exit button)
    studio/                        desk structure, singletons, Presentation resolvers
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

### Request budget

Published reads go to Sanity's API CDN without a token, one request per cache miss. There are only three
queries: `PAGE_QUERY` (a page and its metadata), `PAGE_INDEX_QUERY` (static params, sitemap, and the
unknown-URL check) and `SETTINGS_QUERY` (header, footer, site metadata). So:

- **Build:** one request per page, plus two.
- **Visitors:** zero. Pages are prerendered and every query result is cached until its content changes.
- **Publishing:** only the cached results containing the changed documents are refetched, once each.
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
   - **Filter:** `_type in ["page", "settings"]` · **Projection:** `{_type}`
   - **HTTP method:** POST · **Secret:** the same value as step 1
   - Leave **Drafts** and **Versions** unchecked, so only publishes fire it
4. Redeploy. To go back to live mode, remove the env var and delete the webhook.

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

| Command                | Does                                                  |
| ---------------------- | ----------------------------------------------------- |
| `npm run check`        | Everything below, read-only. Run it before pushing.   |
| `npm run typecheck`    | TypeScript, strict mode                               |
| `npm run lint`         | ESLint, zero warnings allowed (`lint:fix` to autofix) |
| `npm run format:check` | Prettier (`format` to apply)                          |

**ESLint** layers the strictest presets available:

- Next.js core-web-vitals (React, hooks, Next rules)
- typescript-eslint `strict-type-checked` + `stylistic-type-checked`: type-aware rules that catch
  unsafe `any`, unnecessary conditions, floating promises and more
- **Accessibility:** jsx-a11y `strict`, so all 33 rules are errors, not warnings (Next.js enables only 6, as
  warnings). It catches missing alt text, unlabeled controls, invalid ARIA, click handlers without
  keyboard support, positive `tabIndex` and more at build time.
- Import order, no import cycles, and the architecture boundaries above
- `eslint-config-prettier` last, so formatting is left entirely to Prettier

Lint can't see rendered output (color contrast, focus order, final heading structure). Check those
in the browser with Lighthouse or the axe DevTools extension.

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
- Page metadata always uses published content, so `<head>` stays prerenderable and drafts don't leak into it.
- `browserToken` reaches the browser only in draft mode. Use a Viewer-role token.
- Visual Editing and the "Exit preview" button are lazy-loaded in `draft-mode-tools.tsx`. Importing them
  directly in a layout ships about 200 KB of gzipped Studio code to every visitor.
- Visual Editing `data-sanity` attributes are only rendered in draft mode, keeping public HTML lean.
- The footer's copyright year is cached for a day, so pages re-render daily. Those re-renders read the
  cached Sanity data and make no requests.
