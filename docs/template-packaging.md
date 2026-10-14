# Template packaging: when to move core code into a versioned package

**Status:** decision note. Today the template ships as source that projects fork and merge
(README → _Updating from the template_). This note says when that stops being good enough.

## Where we are

Projects copy the whole repo and pull releases in with `git merge <tag>`. That is cheap and keeps
everything editable, but every project carries a full copy of the core code, so each update is a merge
with conflict risk proportional to how far the project has drifted.

## Stay with merging while

- You maintain fewer than about five live projects, or one team maintains them all.
- Projects rarely touch core files (`src/lib/sanity`, `src/config`, `scripts`, CI). The README's
  _Customize vs core_ table is then accurate and conflicts stay in the files meant to change.
- Template releases land less than about monthly.

## Move core code into a package when any of these is true

1. **Conflicts are routine.** Updating a typical project takes more than an hour, or merges keep
   conflicting in core files because projects patched them.
2. **Fixes need to reach projects you don't touch.** Security fixes or breaking Sanity/Next upgrades
   must land everywhere quickly, and "someone merges the tag" is not reliable.
3. **Projects diverge on core files.** Several projects have private edits to `live.ts` or the
   fragments. That is a missing extension point; a package forces you to design one.
4. **Many projects, different owners.** Other teams or clients own the repos and can't be expected
   to resolve merges.

One project with unusual needs is not a reason; fork it. The cost of a package is real: releases,
a registry, compatibility with several Next and Sanity versions, and slower iteration on the core.

## What the package would contain

Package name `@<org>/sanity-next-core`, versioned with the same semver and changelog rules as the
template, published to a private registry. It holds code that has **no project-specific content** and
a stable surface:

| Goes in the package                                                                                   | Why                                                    |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `lib/sanity`: client, `cachedSanityFetch` / `live.ts`, `TAGS`, token, image, data-attribute           | The caching contract; most important to fix centrally  |
| Shared GROQ fragments and `lib/sanity/schema` (link, cta, seo, blockContent, imageField)              | Schema and queries must change together                |
| `config`: env validation, `paths`, site URL                                                           | Pure logic with unit tests                             |
| `lib`: redirects, edge-config sync, IndexNow, sitemap chunks                                          | Self-contained, no UI                                  |
| `components/ui`: `SanityImage`, `SanityLink`, `CtaLink`, `RichText`, `JsonLd`                         | Accessibility fixes should reach every site            |
| Feature logic without design: blog queries and utils, forms validation / Turnstile / Resend / limiter | Behavior and security, not appearance                  |
| Studio: structure helpers, content-health, Presentation resolvers, AI settings                        | Plugins are already registered from `sanity.config.ts` |
| Config presets: ESLint (including the import boundaries), Prettier, tsconfig, Vitest, Playwright base | One place to tighten rules                             |
| `bin/new-section` scaffolder and a `check` script                                                     | Replaces `scripts/`                                    |
| A reusable CI workflow (`workflow_call`)                                                              | Projects keep a 10-line `ci.yml`                       |

## What stays in each project

Everything editors or designers shape: `styles/tokens.json` (the design tokens) and `styles/globals.css`, section schemas and
components, page and blog **layouts**, the e2e fixtures, `app/` routes (thin compositions), the
`sanity.config.ts` composition root, `next.config.ts`, `.env`, and the content.

## Prerequisites before extracting

- **Extension points first.** Fetch options, TAGS and section registration must be injectable (for
  example `createSanityFetch({ tags })`) so projects never edit package files.
- **Bundler setup.** The package ships TypeScript source (`transpilePackages` in Next, ESM) or built
  output with types. Source is simpler while all consumers are Next apps.
- **`'use cache'` and `'server-only'` boundaries survive packaging.** Check them in a production build,
  not only in dev.
- **Typegen still runs in the project.** The generated types depend on the project's schema and
  queries, so queries that feed generated types must stay discoverable by `sanity typegen` (add the
  package to its `path` globs).
- **Tests move with the code.** Unit tests live in the package; each project keeps the e2e suite and
  fixtures because they cover the project's own sections.

## Migration path

1. Introduce the extension points inside the template and release them as a minor version.
2. Extract `lib/sanity` and `config` first (highest value, least UI), and publish `1.0.0` of the
   package; the template becomes its first consumer.
3. Move shared UI, then feature logic, one minor release each. Each release's changelog entry lists
   the import paths projects must change.
4. Once most projects consume the package, shrink the template to the project-owned list above.

The merge workflow keeps working throughout: projects update the template for project-owned files and
bump the package version for the rest.
