# Sanity × Next.js Starter

Next.js 16 (App Router, Cache Components) · next-sanity 13 · Sanity Studio 6 · Tailwind 4 · TypeScript strict.

```bash
cp .env.example .env.local   # fill in project ID + Viewer token
npm run typegen              # schema -> src/types/sanity.types.ts
npm run dev                  # site on :3000, Studio on :3000/studio
```

In sanity.io/manage → API → CORS, add `http://localhost:3000` (with credentials) and your production URL.
Create a page with slug `home` to populate `/`.

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
    (site)/layout.tsx              <SanityLive/>, <VisualEditing/> in draft mode
    (site)/[[...slug]]/page.tsx    every CMS page, including "/"
    api/draft-mode/{enable,disable}
    studio/[[...tool]]/page.tsx
    sitemap.ts
  features/
    pages/                         CMS pages + page builder
      api/                         queries.ts, sections.ts (GROQ), get-page*.ts, get-sitemap.ts
      components/                  page-view, section-renderer, sections/<name>.tsx
      schemas/                     page.ts, sections/<name>.ts
      types/                       PageSection, SectionOf<'hero'>, SectionProps
    draft-mode/components/         disable-draft-mode
    studio/                        desk structure, Presentation resolvers
  components/ui/                   shared UI: sanity-image, cta-link
  config/                          env.ts (validated), paths.ts (slug <-> URL)
  lib/sanity/                      client (singleton), live, image, token, data-attribute,
                                   fragments.ts (shared GROQ), schema/ (link, cta, seo, imageField)
  styles/globals.css
  types/
    sanity.types.ts                GENERATED — commit it
    sanity.ts                      shared types: SanityImageData, CtaData, LinkData
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

| Mode | Perspective | Stega | Caching |
| --- | --- | --- | --- |
| Published | `published` | off | `'use cache'` + sync-tag `cacheTag`s; prerendered at build |
| Draft mode | cookie (`drafts` / release) | on | same cache fn, options are cache-key args; rendered in `<Suspense>` |

- `defineLive({strict: true})` makes every fetch pass `perspective` and `stega` explicitly. That's the
  Cache Components contract: `draftMode()` and `cookies()` are read outside the cache boundary and passed in.
- `cachedSanityFetch` is the **only** `'use cache'` boundary for Sanity data.
- `<SanityLive />` listens to the Live Content API and expires exactly the tags the changed documents
  touched. No webhooks or `revalidate` timers. `cacheLife.default` is set to "forever" for that reason.
- Use `tags` on a fetch only for read-your-own-writes after a server-action mutation (`updateTag`).

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

## Adding a section

All inside `src/features/pages/`:

1. `schemas/sections/testimonial.ts`, then add it to `schemas/sections/index.ts`
2. `testimonialFragment` in `api/sections.ts`, then add it to `pageBuilderFragment`
3. `npm run typegen`
4. `components/sections/testimonial.tsx` taking `SectionProps<'testimonial'>`
5. Register it in `components/section-renderer.tsx`. Until you do, `tsc` fails with "Property 'testimonial' is missing".

## Notes

- Images go through `next-sanity/image`, which uses Sanity's CDN for resizing and format negotiation
  instead of the Next.js optimizer (no optimizer billing). `SanityImage` applies crop/hotspot and LQIP blur.
- `@sanity/icons` v5: import per icon (`@sanity/icons/Rocket`). The barrel's named exports are typed
  `never` and `tsc` won't flag them, but the bundler will.
- Page metadata always uses published content, so `<head>` stays prerenderable and drafts don't leak into it.
- `browserToken` reaches the browser only in draft mode. Use a Viewer-role token.
