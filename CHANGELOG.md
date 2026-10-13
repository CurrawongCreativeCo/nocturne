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

### Changed

### Fixed

### Breaking changes / migration steps

None.

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
