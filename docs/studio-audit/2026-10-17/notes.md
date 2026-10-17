# Capture notes, 17 October 2026

How the screenshots in this folder were taken, and what felt confusing along the way.

## Setup

- Local Studio (`next dev` on port 3000, branch `studio-audit-quick-fixes`) against the project in
  `.env.backup.local`, whose `production` dataset was empty.
- Signed in once as an agency user in a visible browser; Playwright then captured headless from that session.
- 1440 × 900 for every screen, 1024 × 768 for the starred ones, light scheme. Client view (03) uses the Studio's
  _Preview client view_ switch, not a second account.
- Nothing was typed, saved or published. New pages and posts (05, 06, 17) are unsaved documents, which Sanity only
  stores after the first edit. Opening Presentation created a few `sanity.previewUrlSecret` drafts; Presentation does
  this on every open and Sanity expires them after about an hour.
- The Next.js dev badges are dev-only and hidden or ignored. Sanity's "What's new" card was left in place.

## Confusing while capturing

- **The dataset was empty**, so every list says "No documents of this type" and the preview says "Page not found".
  Screens that need a hero, an Image + text section, a change to publish or an image (07–09, 15, 16, 18) could not be
  taken.
- **Dark mode doesn't exist.** The user menu has only _Sign out_, and the Studio stays light with the browser in dark
  mode and the Studio's own colour scheme setting set to dark.
- **Brand colours looked set when it wasn't:** a black Primary swatch next to `#3266e4`.
- **"New Identity & search", "New Navigation", "New Brand colours"**: the settings screens looked as if they were
  creating a second copy.
- **"Used on one page"** on a page that doesn't exist yet, and **"Used on 2 pages"** on a new post.
- **Which mode am I in?** In agency view, the strip's current mode is the muted label and the other mode is the
  coloured link.
- **The section insert menu** opened as a small popover with two rows visible, though there was room below.
