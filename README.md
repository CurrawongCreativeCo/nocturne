# Sanity × Next.js Starter

Next.js 16 (App Router, Cache Components) · next-sanity 13 · Sanity Studio 6 · Tailwind 4 · TypeScript strict.

<!-- setup-wizard:start -->

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCurrawongCreativeCo%2Fsanity-starter&env=NEXT_PUBLIC_SANITY_PROJECT_ID%2CNEXT_PUBLIC_SANITY_DATASET%2CSANITY_API_READ_TOKEN%2CNEXT_PUBLIC_SITE_URL&envDescription=Sanity%20project%20ID%2C%20dataset%2C%20a%20Viewer%20token%2C%20and%20the%20site%27s%20public%20URL&envLink=https%3A%2F%2Fgithub.com%2FCurrawongCreativeCo%2Fsanity-starter%23deploying-vercel&project-name=sanity-next-site&repository-name=sanity-next-site)

**Which path?** Use the button to put a site online fast: it copies this repo to your GitHub account and deploys it
on Vercel. Follow the [deploy checklist](#deploying-vercel) afterwards (the CORS step is not optional). To work on
the code, or to have a setup wizard create the Sanity project for you, start locally as below. The button deploys
the template as-is and does not run the wizard, so create the Sanity project, dataset and token first.

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
with a **private** dataset (or connect an existing one; make that private too, see [Dataset privacy](#dataset-privacy)), create a Viewer token, allow the site in CORS, and import starter content
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
Make the dataset private (see [Dataset privacy](#dataset-privacy)) and run `npm run check:dataset`.
Create a page with slug `home` to populate `/`. After changing schemas or queries, run `npm run typegen`.

## Editing content

Open http://localhost:3000/studio:

- **Presentation** shows the site and the editor side by side. Click any text to edit it; drag sections to reorder.
- **Site settings** (top of the sidebar) holds the site name, logo, announcement bar, header menu and button, footer, and default SEO.
- **Announcement bar:** in Site settings → _Announcement_, a one-line message (up to 120 characters) shows above the header on every page. Add a link and the whole message becomes the link; tick _Visitors can dismiss it_ for a close button (it stays closed in that browser until the message text changes). _Show from_ / _Show until_ are optional; with neither it shows all the time, and a bar with no message shows nothing. The dates are checked in the visitor's browser, because pages are cached: the bar is always in the HTML but hidden, so it appears a moment after load (the page below shifts down once) and visitors outside the window never see a gap. In Presentation it follows the same dates, so an expired or future bar won't show there either.
- **Share image:** every page gets a social card. Priority: the page's own _Share image_ (SEO group), then the site's default (Site settings), then a generated one: brand-colored, with the meta title (or page title) clamped to three lines and the site name, served as a PNG at `/api/og/<slug>`. Only one `og:image` is ever emitted. To restyle it, edit `src/app/api/og/[[...slug]]/route.tsx`; the font file is `src/assets/fonts/` and the color is `brandColorHex` in `src/config/brand.ts` (the renderer can't read `oklch()`, so keep it in step with `--color-brand`).
- **Structured data:** every FAQ section also emits schema.org `FAQPage` JSON-LD (questions, and answers as plain text), so keep answers self-contained. Nested pages (a slug such as `services/web-design`) show a breadcrumb trail above the content and emit a matching `BreadcrumbList`: Home, then each parent slug that has a published page (using its title), then the page. Create a page at each parent slug to have it appear; slug segments without a page are skipped. Top-level pages and Home show no breadcrumbs. The site-wide Organization and WebSite data comes from Site settings. All of it goes through `src/components/ui/json-ld.tsx`.
- **SEO preview:** the SEO group of a page shows how it will look in Google and as a social card, using the site's fallbacks (meta title → page title plus "| site name", the site description and share image). Text Google would cut off (over 60 characters for titles, 160 for descriptions) is marked "Cut off".
- **AI crawlers and `/llms.txt`:** in Site settings → _Search & AI_, _Allow AI crawlers_ (on by default) decides how the site treats AI tools.
  - _On:_ `/llms.txt` lists the site name, its default description and every page that isn't hidden from search engines, as Markdown links followed by each page's meta description (a page without one is listed by title only), so AI tools can find your content. Posts follow under a _Blog_ heading, newest first, with the post's meta description or else its summary; posts hidden from search engines are left out.
  - _Off:_ `robots.txt` disallows the whole site for GPTBot, ClaudeBot, Google-Extended, PerplexityBot and CCBot, and `/llms.txt` answers 404. Google, Bing and other search engines are untouched. The list lives in `src/lib/ai-crawlers.ts`.
  - It is a request, not a lock: well-behaved crawlers obey `robots.txt`, others don't. A crawler that has already stored your pages keeps them. Changes appear as soon as the settings are published (webhook mode: after the webhook).
- **Cookie banner:** in Site settings → _Cookie banner_, edit the banner's title, message, privacy policy link and link text, and the one-line descriptions beside _Analytics_ and _Marketing_. Empty fields use sensible defaults. The banner offers **Accept all**, **Reject all** (equal prominence) and **Choose** (analytics and marketing separately; necessary cookies are always on), and a **Cookie settings** link in the footer reopens it so visitors can change their mind. It only exists when the developer has set up an analytics provider (see _Analytics and cookie consent_); with none, there is nothing to ask and no banner or footer link. Banner text changes appear like any other settings change. In Presentation the banner shows too, but no analytics ever load for editors.
- **Search:** visitors search from the magnifier in the header (or Ctrl/Cmd+K) for a quick list, or at `/search?q=…` for the full results page. It looks through page titles, meta descriptions and the text of _Rich text_ and _Image + text_ sections, matching the start of each word ("web des" finds "Web design"), with title matches first and up to 20 results, each with a short excerpt. Pages with _Hide from search engines_ ticked and members-only pages are left out, as is text inside members-only sections and other sections (hero, FAQ, features…) and shared sections. A query is 2–80 characters (longer is cut). New or edited pages appear within a few minutes (webhook mode: right after the webhook, which expires every cached search). `search` is reserved, so a page can't use it as its first slug segment.
- **Members-only content:** a page has a _Who can see this page_ field and every section a _Who can see this_ field (_Everyone_ or _Members only (signed in)_; empty means everyone). A members-only page asks visitors to sign in and shows nothing else, is left out of the sitemap, `/llms.txt` and search, and tells search engines not to index it. A members-only section on a public page is replaced by a "Members only" sign-in prompt for visitors who aren't signed in; the rest of the page is unchanged. A shared section is members-only when the section inside it is. The page's title is replaced by "Members only" until the visitor signs in; its URL, and any menu entry an editor adds for it, are not hidden. In Presentation and draft previews editors see everything. Who counts as a member is set by the developer (see _Members-only content_ below). `sign-in` and `sign-out` are reserved first slug segments; link to `/sign-out` (a button link or a footer menu item with a custom URL) wherever members should find it.
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
- **Blog:** _Blog_ in the sidebar holds _Posts_, _Authors_ and _Categories_. A post needs a title, slug, summary, main image (with alt text), published date, author and body; give it at least one category, because related posts are chosen by shared categories. The slug becomes `/blog/<slug>`, so `blog` is reserved and a page can't use it. Details:
  - _Index:_ `/blog` shows 12 posts per page, newest first by _Published at_, with Previous / Next links (`?page=2`) and a filter of the categories that have a post. `/blog/category/<slug>` lists one category the same way. Page 1 has no `?page`, and every page is its own canonical URL.
  - _Summary_ is the card text, the RSS description and the search description unless the post's SEO group sets one. The main image is the share image unless the SEO group has its own; there is no generated image for blog URLs, so set a default in Site settings if you want one on `/blog`.
  - _Related posts:_ up to three other posts that share a category, the most shared categories first (counting the post's first five), then newest. A post whose categories nobody else uses shows none.
  - _Going live:_ a post is public once published; _Published at_ only sets the order and the date shown, so a future date doesn't hide it. Use a content release to schedule one. Studio only warns before deleting an author that posts still use; those posts keep working and just lose the byline.
  - _RSS:_ `/feed.xml` is an RSS 2.0 feed of the newest 12 posts, with absolute URLs, and blog pages advertise it in their `<head>`. It takes the title and description from Site settings.
  - _Search engines:_ posts get `Article` JSON-LD (author, dates, image, categories; the publisher is the site's Organization). Posts and `/blog` are in the sitemap unless the post's _Hide from search engines_ is ticked; category pages are not.
  - _Bad URLs:_ an unknown post or category gets a real 404. A `?page` past the last page (or not a number) shows the 404 page with `noindex` but answers 200, because the page number can only be read after the response has started streaming.
- **Forms:** _Forms_ in the sidebar holds forms you build yourself; show one on a page with the _Form_ section (_Add item → Form_, then pick it). One form can sit on many pages. A form has:
  - _Fields_ (up to 20): a _label_, an internal _name_ (e.g. `email`; a lowercase letter, then letters, numbers and `_`; unique in the form, and best left alone once live), a _type_ (short text, email, phone, long text, drop-down, checkbox), _required_, and for a drop-down its _choices_.
  - _Button text_, a _success message_ (shown in place of the form after sending) and _Send submissions to_, the address that receives each one. Replying to the email reaches the visitor if the form has an email field they filled in.
  - _How it behaves:_ every field is checked on the server against the published form, so a visitor can't send a field or a choice the form doesn't have. Problems appear in a summary above the form that takes focus (each item links to its field) and beside each field, and what was typed is kept. Long text allows line breaks and 5,000 characters; other fields are one line of up to 200 (email 254, phone 30). Email addresses are checked for shape only, and phone numbers for 5–15 digits.
  - _Spam:_ a Cloudflare Turnstile check on every send, plus a limit of 5 messages per IP address per 10 minutes on each server instance (serverless instances count separately, so it slows a spammer down rather than stopping one). The check needs JavaScript. Without it the form still posts and shows errors, but nothing is sent: the visitor is told to turn JavaScript on.
  - _Privacy:_ the recipient address is never sent to the browser and no page query selects it. It is still a field in your dataset, so anyone who can read your dataset can read it. Datasets are private by default (see [Dataset privacy](#dataset-privacy)), so only the site's Viewer token and project members can read it; a shared inbox is still the safer choice. Submissions are emailed, not stored: if delivery fails the visitor is told and nothing is kept. Editing a form updates every page that uses it (live mode: right away; webhook mode: after the webhook).
  - _Setup:_ it needs four environment variables (see _Forms setup_ below). Until they are set, a form section shows a setup message in development and "isn't available right now" to visitors. Pages read them at build time, so redeploy after changing them.
- **Newsletter signup:** the _Newsletter signup_ section (_Add item → Newsletter signup_) is a heading, a line of text and an email box with a button. Set the _Heading_, _Text_, _Button label_ and _Success message_. The visitor sees the success message whether or not the address was already subscribed, so don't word it as "you are now subscribed"; if your provider emails a confirmation link (Mailchimp always does, Loops can), say "check your inbox to confirm". It sits in the page like any section and can be used on many pages (or as a shared section). The developer chooses the email service (see _Newsletter signup_ below); until then the section shows a setup message in development and "isn't available right now" to visitors. It has the same spam check and rate limit as forms (5 attempts per IP address per 10 minutes). Signups are not stored on the site: they go straight to the email service.
- **Pricing table:** the _Pricing table_ section shows plans taken from Stripe prices, with a checkout button on each. Prices are not typed in: they are created in the Stripe dashboard and copied into _Stripe price_ documents (sidebar) automatically, so an amount can never differ between the site and what Stripe charges. In the section, add up to four _plans_; each one:
  - picks a _price_ (the list shows the product, amount and interval, and only offers active prices), so the same product can appear as monthly and yearly plans;
  - may set a _plan name_ (empty uses the product name from Stripe), a list of _features_ (one line each) and _button text_ (default "Get started");
  - can be _highlighted_: it gets a stronger outline and a "Most popular" label. Only one plan per table can be.
  - Amounts are formatted for the site's language ($19, €290, ¥50,000) with "per month", "per year", "every 3 months" or "one-time". If a price is archived at Stripe, its plan disappears from the page until it is active again. _Stripe price_ documents are read-only; change the price in Stripe. A change shows on the site within a minute or so (the webhook, then the usual publish delay). Not shown: prices with no fixed amount (tiered, usage-based, pay-what-you-want).
  - The button sends the visitor to Stripe's hosted Checkout, then back to the site. Where is set by the developer (see _Pricing table_ below). Checkout needs the developer to have set up Stripe; until then the button shows a message instead.
- **A/B tests:** _A/B tests_ in the sidebar split visitors between a page as published ("control") and one or more Sanity content variants of it. Content Variants is a Sanity beta feature, switched on in this Studio (`beta.variants` in `sanity.config.ts`).
  1. _Create the variant._ In Studio, create a _variant definition_ (a name for the audience or idea, e.g. "Bold headline"), then open the page you want to test and create a variant of it for that definition. Edit the variant's content as you would any page, then **publish the variant**: visitors only ever see published variants. Pages you don't vary look the same in every option. Note the definition's ID (the short id such as `Ab12cd34`, not `_.variants.Ab12cd34`).
  2. _Set up the test._ _A/B tests → New_: a _name_ (also sent to analytics), the variants (each one's _Variant ID_ and _Traffic_), and _Control traffic_. Traffic numbers are relative: control 50 + one variant 50 is an even split; 50, 25, 25 is half, a quarter, a quarter. Up to four variants. Leave _Running_ off and publish.
  3. _Start._ Tick _Running_ and publish. Each new visitor is placed in an option at random and stays in it for 90 days (a cookie named `ab`). Only one test can run at a time; Studio won't let you start a second.
  4. _Stop._ Untick _Running_ and publish. Everyone sees the published content again straight away (the old cookie is ignored). Nothing else changes: the variants and the test document stay for reference.
  5. _End with a winner._ Stop the test, then make the winning content the real thing: copy it into the base page and publish, and delete the variant if you no longer need it.
  - _Timing:_ starting or stopping reaches visitors within about a minute (the site remembers the answer for 60 seconds), plus the usual publish delay (webhook mode: after the webhook).
  - _What visitors see:_ the address never changes. Search engines and link checkers always get control and no cookie. The blog isn't part of tests (only pages are). A test needs `FLAGS_SECRET` (see _Deploying_); without it nothing runs and everyone sees the published content.
  - _Measuring:_ the `<main>` element carries `data-experiment="<test name>"` and `data-variant="control"` (or the variant ID) on pages in a test, for analytics to read; pages outside a running test have neither attribute. Because the `ab` cookie is functional rather than tracking, check whether your privacy policy and cookie banner text need to mention it.
  - _Previewing a variant:_ draft mode (Presentation) uses Studio's own variant selection, not the `ab` cookie, and is never rewritten.
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
| Form                  | A contact or enquiry form built under _Forms_ (see below) |
| Pricing table         | Plans from Stripe prices, each with a checkout button     |
| Newsletter signup     | An email box that adds visitors to your mailing list      |

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

This checklist is the single source of truth, for the Deploy button and for importing by hand.
The button asks for four values up front: the Sanity project ID, dataset and Viewer token (sanity.io/manage → your
project → API → Tokens), and the site URL (the one Vercel will give you, e.g. `https://my-site.vercel.app`; change it
when you add a domain). Everything else is optional and can be added later in step 2.

The [Sanity Vercel integration](https://www.sanity.io/docs/developer-guides/vercel-integration) is not used by the
button. It does provision `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` and `SANITY_API_READ_TOKEN`
under the same names (with its default `NEXT_PUBLIC_` prefix), so you can install it on the project instead of typing
them, but it doesn't set `NEXT_PUBLIC_SITE_URL`, and the button can't require it without a published integration ID.
It still needs the CORS step below.

1. **Import the repo** at vercel.com/new (or use the Deploy button). Next.js is detected automatically. Node comes from
   `engines` in `package.json` (`.nvmrc` pins the same for local work and CI).
2. **Environment variables** (Production and Preview):

   | Variable                         | Value                                                                               |
   | -------------------------------- | ----------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SANITY_PROJECT_ID`  | from `.env.local`                                                                   |
   | `NEXT_PUBLIC_SANITY_DATASET`     | from `.env.local`                                                                   |
   | `NEXT_PUBLIC_SANITY_API_VERSION` | from `.env.local`                                                                   |
   | `NEXT_PUBLIC_SITE_URL`           | your production URL, e.g. `https://example.com` (no slash)                          |
   | `NEXT_PUBLIC_SITE_LANGUAGE`      | optional: content language for `<html lang>` (default `en`)                         |
   | `NEXT_PUBLIC_STUDIO_TITLE`       | optional: name in the Studio header and tab (default `Content`)                     |
   | `SANITY_API_READ_TOKEN`          | from `.env.local` (Viewer token)                                                    |
   | `SANITY_REVALIDATE_SECRET`       | only for webhook mode (see below)                                                   |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | only for forms: Turnstile site key (public)                                         |
   | `TURNSTILE_SECRET_KEY`           | only for forms: Turnstile secret                                                    |
   | `RESEND_API_KEY`                 | only for forms: Resend API key                                                      |
   | `FORMS_FROM_EMAIL`               | only for forms: verified sender, e.g. `Site <forms@site.com>`                       |
   | `NEWSLETTER_PROVIDER`            | only for newsletter signup: `resend`, `loops` or `mailchimp` (see below)            |
   | `STRIPE_SECRET_KEY`              | only for pricing: Stripe secret or restricted key (see below)                       |
   | `STRIPE_WEBHOOK_SECRET`          | only for pricing: the webhook endpoint's `whsec_…` signing secret                   |
   | `SANITY_WRITE_TOKEN`             | only for pricing: Editor token the Stripe webhook writes with                       |
   | `STRIPE_SUCCESS_URL`             | optional: where buyers land after paying (default `/?checkout=success`)             |
   | `STRIPE_CANCEL_URL`              | optional: where "back" from Stripe leads (default: the pricing page they came from) |
   | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`   | optional: Plausible site domain (see Analytics, below)                              |
   | `NEXT_PUBLIC_POSTHOG_KEY`        | optional: PostHog project token                                                     |
   | `NEXT_PUBLIC_POSTHOG_HOST`       | optional: PostHog host (default US cloud)                                           |
   | `NEXT_PUBLIC_GA_ID`              | optional: Google Analytics 4 measurement ID, `G-…`                                  |
   | `SENTRY_DSN`                     | optional: turns on Sentry error tracking (see Error tracking, below)                |
   | `INDEXNOW_KEY`                   | optional: IndexNow key (see below)                                                  |
   | `FLAGS_SECRET`                   | optional: signs A/B variant URLs; needed to run an A/B test                         |
   | `EXPERIMENT_CACHE_SECONDS`       | optional: how long the proxy remembers the running test (60)                        |
   | `EDGE_CONFIG`                    | optional: Edge Config redirects (see below); Vercel adds it                         |
   | `EDGE_CONFIG_ID`                 | optional: Edge Config redirects; the store's `ecfg_…` id                            |
   | `VERCEL_API_TOKEN`               | optional: Edge Config redirects; token that can edit the store                      |
   | `VERCEL_TEAM_ID`                 | optional: Edge Config redirects; only for team-owned stores                         |

3. **Allow the production origin in Sanity**, or Studio and live updates won't connect:
   `npx sanity cors add https://example.com --credentials` (or sanity.io/manage → API → CORS
   origins, "Allow credentials" checked). Preview deployments on other domains need their own entry.
4. **Deploy**, then open `https://example.com/studio` and sign in. Studio is part of the site, so
   there is nothing separate to deploy.
5. **Check the dataset is private:** `npm run check:dataset` (see [Dataset privacy](#dataset-privacy)). A public dataset
   exposes members-only content and form recipient addresses to anyone who knows the project ID.
6. **Check:** `/sitemap.xml` and `/robots.txt` list production URLs, and editing a page in
   Presentation updates the live site.

Without `NEXT_PUBLIC_SITE_URL`, Vercel deployments fall back to the project's production domain; any
other production server refuses to start rather than publish canonical URLs pointing at localhost.
Server errors are logged as one JSON line each (`src/instrumentation.ts`): search Vercel's Logs for
`request-error`, or the "Reference" code shown on the error page. To also send them to Sentry, see
[Error tracking](#error-tracking).

Every deploy runs `npm run build`, which regenerates Sanity types from the schema first.

### Cloudflare (not supported yet)

There is no Deploy to Cloudflare button. The OpenNext Cloudflare adapter builds this site (Cache Components
included) but fails to bundle `src/proxy.ts`: Next 16 runs the proxy on Node only, and OpenNext's Node.js
middleware support on Cloudflare is experimental ("not officially maintained"). The build stops with
`Could not resolve "@opentelemetry/api"`. Redirects from Edge Config and A/B tests both run in the proxy, and
cache revalidation on Workers needs extra R2 and D1 or Durable Object bindings that were never tried here.
Tested with `@opennextjs/cloudflare` 1.20.10 and Next 16.4. Next's docs say Cloudflare is working on a
verified adapter on the Adapter API; revisit then. Until it works, deploy on Vercel or any Node.js host
(`npm run build && npm start`).

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
    (site)/blog/                     blog index, [slug] (post), category/[slug]
    (site)/site-shell.tsx            header, <main>, footer: shared by (site)/layout and ab/[code]/layout
    (site)/site-consent.tsx          cookie banner with its text from Site settings
    ab/[code]/[[...slug]]/           pages prerendered per A/B option (proxy rewrites visitors here)
    api/experiments/route.ts         the running experiment as JSON, for proxy.ts
    feed.xml/route.ts                RSS 2.0 feed
    api/og/[[...slug]]/route.tsx     generated share image (PNG) for pages without one
    llms.txt/route.ts                /llms.txt for AI tools (404 when AI crawlers are off)
    (site)/search/page.tsx           /search?q= results (dynamic, no static shell)
    api/search/route.ts              JSON for the quick search dialog
    api/stripe/webhook/route.ts      Stripe webhook: keeps stripePrice documents in step with Stripe
    api/auth/[...nextauth]/route.ts  Auth.js handlers (OAuth callbacks, session)
    (site)/sign-in, (site)/sign-out  sign-in and sign-out pages
    sitemap.ts                       pages then posts, split into files of 45,000 URLs (generateSitemaps)
  proxy.ts                         Edge Config redirects (inactive without EDGE_CONFIG); A/B assignment + rewrite
  features/
    pages/                         CMS pages + page builder
      api/                         queries.ts, sections.ts (GROQ), get-page.ts (page, metadata, sitemap)
      components/                  page-view, section-renderer, sections/<name>.tsx
      schemas/                     page.ts, shared-section.ts, sections/<name>.ts, templates.ts (new-page templates)
      types/                       PageSection, SectionOf<'hero'>, SectionProps
    blog/                          posts, authors, categories: index, post page, related posts, RSS builder
      api/                         queries.ts (GROQ), get-posts.ts (lists, post, metadata, sitemap, feed items)
      utils/                       pagination, feed (RSS XML), date formatting
    forms/                         editor-built forms: schema, the form UI, the submit action
      api/                         queries.ts (FORM_QUERY), submit-form.ts, subscribe-newsletter.ts (server actions), rate-limiter.ts
      components/                  form-view, newsletter-view (server; env check), contact-form (client), turnstile-widget
      utils/                       validate, build-email, resend, turnstile, rate-limit, client-ip, config,
                                   newsletter/ (provider modules: resend, loops, mailchimp)
    experiments/                   A/B tests: experiment schema, assignment logic, signed variant codes (flags)
      api/                         queries.ts, get-experiment.ts (running test, code -> option)
      utils/                       assign (weights, cookie), experiment-flag (flags SDK), experiment-source (proxy lookup)
    site/                          Site settings singleton: header, footer, default metadata
    search/                        site search: GROQ query, results page view, quick search dialog
      api/                         queries.ts (SEARCH_QUERY), search-pages.ts (cached read + snippets)
      components/                  search-view (server), search-form, quick-search (trigger), quick-search-dialog (lazy)
      utils/                       query (validate, cap, match pattern), snippet
    auth/                          members-only content: Auth.js sessions, the gate, sign-in and sign-out pages
      api/                         auth.ts (Auth.js config), get-session.ts, actions.ts (server actions)
      components/                  members-only (the gate), sign-in-prompt, sign-in-view, sign-out-view
      utils/                       allowed-members (AUTH_ALLOWED_EMAILS), providers (env), safe-path, messages
    consent/                       cookie banner, consent store (localStorage), analytics loader
      components/                  consent-banner, cookie-settings-button, analytics-scripts
      utils/                       consent-state (parse/serialize), consent-store (client), analytics-snippets
    pricing/                       Stripe prices: webhook sync, Checkout action, stripePrice schema
      api/                         handle-webhook.ts, write-prices.ts, checkout.ts (server action), queries.ts
      components/                  checkout-button (client form)
      utils/                       stripe-signature, map-stripe (event + price -> document), stripe-api (REST), config
    draft-mode/components/         draft-mode-tools (lazy Visual Editing + exit button)
    personalization/               request-time (cookie) greeting, rendered in <Suspense> inside cached pages
    studio/                        desk structure, singletons, Presentation resolvers, content-health tool,
                                   AI settings tool, AI Assist presets
  components/ui/                   shared UI: sanity-image, sanity-link, cta-link, rich-text, json-ld
  config/                          env.ts (validated), paths.ts (slug <-> URL)
  lib/sitemap-chunks.ts            sitemap split math (shared by pages and posts)
  lib/sanity/                      client (singleton), live, live-action, image, token, data-attribute,
                                   fragments.ts (shared GROQ), schema/ (link, cta, seo, blockContent, imageField)
  styles/globals.css               Tailwind theme, including the brand color
  types/
    sanity.types.ts                GENERATED — commit it
    sanity.ts                      shared types: SanityImageData, CtaData, LinkData
public/section-previews/           insert-menu thumbnails, one <typeName>.svg per section
    section-gallery/page.tsx       (in src/app) every section type and variant on one page; dev and tests only
scripts/new-section.mjs            `npm run new:section` scaffolder
scripts/new-{feature,document,singleton}.mjs   `npm run new:feature|document|singleton` scaffolders (shared code: generator-utils.mjs)
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

### Dataset privacy

Datasets are **private**. The site hides members-only sections in its own GROQ, but the project ID is public, so on a
public dataset anyone could query the Content Lake directly (`*[access == "members"]`, or a form's `recipientEmail`).
On a private dataset those requests need a token, and only the Viewer token the site holds (and your Sanity project members) has one.

- **How the site reads.** `lib/sanity/client.ts` sets `token` on the one client, so every server read, published or
  draft, sends `SANITY_API_READ_TOKEN`. `defineLive` only adds its `serverToken` for drafts and stega, so published reads
  need it on the client. Reads still use the API CDN (`useCdn: true`), which serves private datasets when a token is
  sent, so the [request budget](#request-budget) is unchanged and visitors still cause zero Sanity requests. Pages, blog,
  settings, the share image, sitemap, `robots.txt`, `/llms.txt`, search, forms (`FORM_QUERY`) and pricing
  (`CHECKOUT_PRICE_QUERY`) all go through `cachedSanityFetch` or `shortLivedSanityFetch`, so they all use it.
- **The token stays on the server.** `lib/sanity/token.ts` imports `server-only`. The browser gets a token only as
  `browserToken`, when `<SanityLive includeDrafts />` renders in draft mode. `src/lib/sanity/token-import-guard.test.ts`
  fails `npm test` if any `'use client'` module imports `token.ts`, directly or through other modules.
- **Plan.** Sanity's Free plan offers only public datasets, so members-only content and forms with recipient addresses
  need a paid plan (check sanity.io/pricing). On the Free plan, keep only content that is fine to publish in the dataset.
- **Switch an existing project to private:** sanity.io/manage → your project → API → Datasets → set the dataset to
  _Private_, or run `npx sanity dataset visibility set <dataset> private`. Deploy this version first, because a private
  dataset refuses reads without a token. Previews and Studio are unaffected (editors are signed in).
- **Check it:** `npm run check:dataset` reads `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` and
  `SANITY_API_READ_TOKEN` from `.env.local`, asks the Sanity API for the dataset's visibility and exits non-zero if it is public.

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

### A/B tests (how it works)

Editors' side is under _Editing content_. For developers:

```
visitor ─▶ proxy.ts ─ reads the running experiment (cached /api/experiments, remembered 60 s)
            │         picks an option by weight, or reads the `ab` cookie
            │         encodes it with the Flags SDK `serialize` into a signed code
            └─ rewrites /about ─▶ /ab/<code>/about      (the address bar keeps /about)
                                    └ app/ab/[code]: decodes the code, fetches with `variant`
```

- **Precompute pattern.** `generateStaticParams` in `app/ab/[code]/[[...slug]]/page.tsx` renders every page for every option (`generatePermutations`), so each variant is prerendered once and cached like any published page. Published pages stay static; only the proxy runs per request. With no running test the route prerenders one placeholder (Cache Components rejects an empty list) and the proxy never rewrites.
- **One flag, built per test.** `utils/experiment-flag.ts` declares a single flag (`experiment`) whose options are `control` plus the variant ids of the running test, so the codes always match what editors configured. Codes are signed with `FLAGS_SECRET` (32 random bytes, base64url: `node -e "console.log(crypto.randomBytes(32).toString('base64url'))"`). A forged or stale code renders the published content; if `FLAGS_SECRET` is missing the proxy logs an error and serves the published page.
- **Variants in the cache.** `cachedSanityFetch` already takes `variant`, which is part of the `'use cache'` key, so each variant is its own entry (tagged `page`, like control). Fetches with a variant use a client pinned to Sanity's experimental API version (`variantsApiVersion`), which Content Variants requires; all other fetches keep `apiVersion`. Unvaried pages, SEO metadata, the header and footer reuse control's cache entries.
- **One test at a time.** Sanity serves one variant per query, so a page can only be in one test. Studio blocks a second running test; if two somehow run, the oldest wins.
- **Proxy cost.** The proxy can't query Sanity on every request, so it asks `/api/experiments` (a cached route tagged `experiment`) and remembers the answer for `EXPERIMENT_CACHE_SECONDS` (60) per server instance. A failure means "no test". The rewrite response sends `Vary: Cookie`; if you put another CDN in front that caches HTML, make it vary on the `ab` cookie (Vercel needs nothing).
- **What is skipped.** Draft mode, crawlers (`isCrawler` in `utils/assign.ts`), the blog, Studio, API routes and static files.
- **Analytics hook.** `SiteShell` (`app/(site)/site-shell.tsx`) puts `data-experiment` and `data-variant` on `<main>` for pages rendered under `/ab/<code>`. Read them from your analytics script (for example after consent: `document.querySelector('main').dataset.variant`).
- **Reserved slug.** `ab` joins `blog` and `studio` as a first path segment a page can't use.

### Request budget

Published reads go to Sanity's API CDN with the Viewer token (see [Dataset privacy](#dataset-privacy); the CDN still serves them, so the budget is the same), one request per cache miss. There are only a handful of
queries (shared sections are resolved inside `PAGE_QUERY`, not fetched separately): `PAGE_QUERY` (a page and its metadata), `PAGE_INDEX_QUERY` (static params, sitemap, breadcrumbs, and the
unknown-URL check) and `SETTINGS_QUERY` (announcement bar, header, footer, site metadata). The blog adds three:
`POSTS_QUERY` (one page of posts, for the index, a category, the RSS feed and the post count), `POST_QUERY` (a post, its metadata and its
three related posts) and `BLOG_INDEX_QUERY` (post and category slugs, for static params, the unknown-URL check and a small blog's sitemap). So:

- **Build:** one request per page and per post, plus one per category, plus a few shared ones.
- **Visitors:** zero. Pages are prerendered and every query result is cached until its content changes.
- **Publishing:** only the cached results containing the changed documents are refetched, once each.
- **Large sites:** a sitemap file holds at most 45,000 URLs (Google allows 50,000). The files cover all pages, then
  all posts, in that order. Past one file, `generateSitemaps` splits the sitemap into `/sitemap/0.xml`,
  `/sitemap/1.xml`, … and `robots.txt` lists every file. Sizing it costs one cheap `count()` query for pages
  (`PAGE_COUNT_QUERY`) and none for posts (the total comes with `POSTS_QUERY`), and each file one sliced query per type
  (`PAGE_SITEMAP_QUERY`, `POST_SITEMAP_QUERY`, ordered by `_id`). Whenever a file holds all the pages (or all the posts) the file is
  built from the cached `PAGE_INDEX_QUERY` / `BLOG_INDEX_QUERY` instead, so up to 45,000 URLs nothing extra is fetched:
  one file, with `/sitemap.xml` rewritten to `/sitemap/0.xml` and listed in `robots.txt`. On a split
  site `/sitemap.xml` still serves the first file only, so submit the files listed in `robots.txt`.
- **The RSS feed** adds none: `/feed.xml` is page 1 of the blog (the same cache entry as `/blog`) plus the cached settings.
- **`/llms.txt` and `robots.txt`** add none: the page list is the cached `PAGE_INDEX_QUERY` and `BLOG_INDEX_QUERY` (which also carry titles and descriptions) and the switch comes with the cached `SETTINGS_QUERY`. `/llms.txt` renders per request (`connection()`), because a prerendered route that starts answering 404 would keep serving its old copy; each hit only reads those cache entries.
- **Search** adds one query, `SEARCH_QUERY`, per distinct query text, and nothing to a page view: the header trigger is a small client component and the dialog's code downloads on first use. Results are cached for a short time (`shortLivedSanityFetch`: 60 s, then stale for up to 5 min), because a page that starts matching (new or reworded) is not in a cached result and so never expires it; the `page` tag still expires entries sooner. The `/search` page and `/api/search` share one entry per text, and `/api/search` also sends `s-maxage=60` for a CDN. Typing in the dialog waits 250 ms between requests and cancels stale ones.
- **Breadcrumbs** add none: they are built from the cached `PAGE_INDEX_QUERY` (slug and title).
- **Share images** add none: `/api/og/<slug>` reads the cached `PAGE_QUERY` and `SETTINGS_QUERY` entries that the page and layout already use.
- **Unknown URLs** (typos, bots probing `/wp-admin` or `/blog/anything`) are answered from the cached page and blog indexes at no cost.
- **Forms** add none to a page view: the `form` a section references is resolved inside `PAGE_QUERY` (without the
  recipient). A send costs one more, `FORM_QUERY` by the form's id, cached until the form changes.
- **Pricing** adds none to a page view: the plans and their prices are resolved inside `PAGE_QUERY` (a `stripePrice` change expires the pages that show it, tagged `stripePrice`). A checkout adds one, `CHECKOUT_PRICE_QUERY` by price id, cached until that price changes, plus one call to Stripe. The webhook calls Stripe once per price event and writes to the Content Lake; it reads nothing through the cache.
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
   - **Filter:** `_type in ["page", "settings", "redirect", "sharedSection", "post", "author", "category", "form", "stripePrice"]` · **Projection:** `{_type, "slug": slug.current}`
   - **HTTP method:** POST · **Secret:** the same value as step 1
   - Leave **Drafts** and **Versions** unchecked, so only publishes fire it
4. Redeploy. To go back to live mode, remove the env var and delete the webhook.

### Forms setup

1. **Turnstile:** in the Cloudflare dashboard → Turnstile, add a widget for your domain (and `localhost` for development). Put the site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the secret key in `TURNSTILE_SECRET_KEY`. Cloudflare's [always-passing test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) work locally.
2. **Resend:** at resend.com, verify your sending domain, create an API key (`RESEND_API_KEY`) and choose the sender (`FORMS_FROM_EMAIL`, e.g. `Test Co <forms@example.com>`; its domain must be verified).
3. Add all four to `.env.local` and to the deployment's environment variables, then redeploy (pages bake the check in at build time). `.env.example` lists them.

How a send works (`src/features/forms/api/submit-form.ts`, a server action that also handles a plain HTML POST): read the form's id from the request, **fetch the published form again** (`FORM_QUERY`, the only query that reads `recipientEmail`, tagged `form`), validate each of its fields (`utils/validate.ts`), rate-limit the IP (`x-real-ip`, else the first `x-forwarded-for` entry, so it only means something behind a proxy that sets them itself, as Vercel does), verify the Turnstile token with Cloudflare, then send through Resend's REST API (`utils/resend.ts`, no SDK). Cheap checks come first, so a mistake in a field never spends a token, a rate-limit slot or an email. Failures are logged on the server and shown to the visitor as a general message.

`FORMS_TEST_MODE=1` replaces Turnstile and Resend with mocks that accept everything and send nothing; the end-to-end tests use it (the form then carries a fixed token instead of the widget, and the server accepts only that token). It is ignored when `VERCEL_ENV` is `production`, so it can't switch the spam check off there. To change the email, edit `utils/build-email.ts`: values are HTML-escaped and a subject can't contain line breaks.

### Newsletter signup

`newsletterSignup` section plus a small part of `src/features/forms` (it builds on the forms: no feature imports another, so it lives there). It reuses the contact form's UI (`ContactForm` with its own `action`: the error summary that takes focus, linked field errors, kept answers, success message, Turnstile and the no-JavaScript POST), `validateSubmission` for the address, `verifyTurnstile`, `getClientIp` and the rate limiter (its own allowance, `newsletterLimiter`). The section only draws a heading; the route passes the form down as `renderNewsletter`, like `renderForm`.

**Environment:** the Turnstile keys from _Forms setup_, `NEWSLETTER_PROVIDER` and that provider's variables (`.env.example` lists them). `getNewsletterConfig` (`utils/newsletter/config.ts`) names exactly what is missing. Redeploy after changing them.

| Provider    | Variables                                                                     | Double opt-in                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mailchimp` | `MAILCHIMP_API_KEY` (ends `-us21` or similar), `MAILCHIMP_LIST_ID`            | Yes: new addresses are added as `pending` and Mailchimp emails the confirmation link                                                                                                             |
| `loops`     | `LOOPS_API_KEY`, optional `LOOPS_MAILING_LIST_ID`                             | Not from the API: the contact is created at once. In Loops, build a Loop triggered by _Contact added_ that sends a confirmation email, and have it unsubscribe or hold contacts until they click |
| `resend`    | `RESEND_API_KEY` (shared with forms), optional `NEWSLETTER_RESEND_SEGMENT_ID` | Not supported by Resend: the contact is subscribed at once                                                                                                                                       |

**Adding a provider:** create `utils/newsletter/<name>.ts` returning a `NewsletterProvider` (`utils/newsletter/types.ts`: `subscribe(email)` resolves `true` when accepted, including when the address was already there, and `false` only for a failure that says nothing about the address; it never throws), add its variables to `config.ts` and a case to `create-provider.ts`, and test it with a mocked `fetch` like the others. There are no SDKs; each provider is one REST call.

**Not revealing who is subscribed.** The action's answer is the same for a new and an existing address: Mailchimp's upsert leaves an existing member untouched, Loops' `409` and Resend's `409` count as success, and Mailchimp's "Member In Compliance State" and "Forgotten Email Not Subscribable" (someone who unsubscribed or was deleted) do too. The success message is the section's own text, rendered by the form, so the server's reply carries nothing about the address. Failures that are shown (bad key, outage) don't depend on the address either. Keep it that way in a new provider, and don't log email addresses.

`FORMS_TEST_MODE=1` also replaces the signup's spam check and provider with mocks that accept everything and contact no one (`tests/e2e/newsletter.spec.ts` uses it).

### Pricing table

`src/features/pricing` plus the `pricingTable` section. Stripe is the source of truth for prices; Sanity holds a read-only copy (`stripePrice` documents) so editors can pick prices by reference and pages stay cached. There is no Stripe SDK: the few REST calls use `fetch`, as the forms do for Resend.

**Environment** (all server-side; `.env.example` lists them; none has a `NEXT_PUBLIC_` prefix, and a secret must never get one):

| Variable                | Purpose                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STRIPE_SECRET_KEY`     | Reads prices and creates Checkout Sessions. A restricted key works: _Prices: read_, _Products: read_, _Checkout Sessions: write_                                               |
| `STRIPE_WEBHOOK_SECRET` | Signing secret (`whsec_…`) of the webhook endpoint below. Without it the endpoint answers 503 and nothing is written                                                           |
| `SANITY_WRITE_TOKEN`    | sanity.io/manage → API → Tokens, **Editor** role. Used only by the webhook, to write `stripePrice` documents. It is separate from the read token, which stays a Viewer         |
| `STRIPE_SUCCESS_URL`    | Optional. Where Stripe sends the buyer after paying: a path (`/thanks`) or a full `https://` URL. `{CHECKOUT_SESSION_ID}` is filled in by Stripe. Default `/?checkout=success` |
| `STRIPE_CANCEL_URL`     | Optional. Where "back" leads: a path or full URL. Default: the page the buyer started from (when the browser sends it and it is on this site), else the home page              |

**Setup:**

1. In the Stripe dashboard create products and prices (use test mode first). Prices that are tiered, usage-based or pay-what-you-want are ignored.
2. Add the three variables above to `.env.local` and the deployment's environment variables, then redeploy.
3. Dashboard → Developers → Webhooks → _Add endpoint_: URL `https://your-site.com/api/stripe/webhook`, events `price.created`, `price.updated`, `price.deleted`, `product.updated`, `product.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`. For local work, `stripe listen --forward-to localhost:3000/api/stripe/webhook` prints a secret to use.
4. Create the first prices _after_ the endpoint exists, or backfill: in the dashboard, edit and save each existing price's nickname (or resend its `price.created` event from the webhook's event log). Stripe only sends events for changes made after the endpoint was added.
5. In Studio, add a _Pricing table_ section and pick the prices. Stripe prices appear under _Stripe price_ in the sidebar.
6. Webhook mode only: add `stripePrice` to the Sanity webhook's filter (above) so a synced price expires the pages that show it. Live mode needs nothing.

**How the sync works** (`api/handle-webhook.ts`): the route reads the raw body and checks `Stripe-Signature` (HMAC-SHA256 of `timestamp.body` with `STRIPE_WEBHOOK_SECRET`, compared in constant time, rejected when more than 5 minutes old; `utils/stripe-signature.ts`). A bad signature answers 400 and nothing else runs. The event only names a price or product (`utils/map-stripe.ts`, `planEvent`); the handler then asks Stripe for its **current** state (`GET /v1/prices/<id>?expand[]=product`, or a product's prices) and writes it, so a late or out-of-order event can't overwrite newer data. Each price is one document with the id `stripePrice-<price id>`, replaced in full, so a retried event is harmless: product name, price id, amount, currency, interval (empty for one-time), interval count and `active` (false when the price or its product is archived). A deleted price or product is marked inactive, not deleted, because pages may reference it. Events the feature doesn't use answer 200; a failure to reach Stripe or Sanity answers 500 so Stripe retries. `product.updated` re-syncs up to 100 prices of the product.

**Checkout** (`api/checkout.ts`, a server action behind the plan's button; it also works as a plain form post without JavaScript). The browser sends only a price id. The action looks that price up in the published dataset (`CHECKOUT_PRICE_QUERY`), refuses anything that isn't an active `stripePrice` (so editing the form's hidden field can't buy a price the site doesn't sell), picks `subscription` or `payment` from the stored interval, creates the Checkout Session and redirects to Stripe's hosted page. A failure shows a message in place; details are logged on the server. Features can't import each other, so the route (`app/(site)/[[...slug]]/page.tsx`, and the A/B route) passes the button down as `renderCheckout`, like `renderForm`.

**Notes:**

- Amounts are stored as Stripe reports them (smallest currency unit) and formatted in `lib/format-price.ts` with `Intl.NumberFormat` and the site language (`NEXT_PUBLIC_SITE_LANGUAGE`). Zero-decimal currencies (JPY) and the three-decimal ones are divided correctly; ISK and UGX are the two Stripe counts in hundredths. The period wording ("per month") is English.
- The write token lives in `lib/sanity/write-client.ts` (`server-only`). Don't use it anywhere else; anything that can write should be a webhook or action like this one.
- `STRIPE_API_HOST` points the REST calls at a fake Stripe in the end-to-end tests. It is ignored when `VERCEL_ENV` is `production`.
- Taxes, coupons, trials, customer portal and fulfilment after payment (reacting to `checkout.session.completed`) are not included; add them in `api/checkout.ts` and a new case in `handle-webhook.ts`.

### Error tracking

Optional [Sentry](https://sentry.io) integration (`@sentry/nextjs`). It does nothing, and adds nothing to
the browser's JavaScript, until `SENTRY_DSN` is set.

| Variable                       | Purpose                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `SENTRY_DSN`                   | the project's DSN; turns on tracking for the server and the browser           |
| `SENTRY_TRACES_SAMPLE_RATE`    | optional: share of requests traced, 0 to 1 (default `0.1`)                    |
| `SENTRY_AUTH_TOKEN`            | optional: uploads source maps during `next build`; set it as a CI/host secret |
| `SENTRY_ORG`, `SENTRY_PROJECT` | needed with the auth token: your organization and project slugs               |

1. Create a Sentry project (platform: Next.js) and copy its DSN into `SENTRY_DSN` where the site builds
   and runs (Vercel: Project Settings → Environment Variables). The DSN is public by design, since it
   can only send events; `next.config.ts` copies it to `NEXT_PUBLIC_SENTRY_DSN` for the browser, so you
   set one variable. It is read at **build** time, so redeploy after changing it.
2. For readable stack traces, create an auth token (Sentry → Settings → Auth Tokens, scope
   `project:releases` and `org:read`) and set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` in the
   build environment. With the token set, the build wraps the config in `withSentryConfig`, uploads the
   source maps and deletes them from the output. Without it the build is unchanged.

What is reported:

- **Server:** every error `onRequestError` receives (`src/instrumentation.ts`), in addition to the JSON log line.
- **Browser:** errors caught by `src/app/(site)/error.tsx` and `src/app/global-error.tsx`, plus uncaught
  errors and traces (`src/instrumentation-client.ts`).
- **Digest:** each event has a `digest` tag, the same code shown as "Reference" on the error page. Search
  `digest:<code>` in Sentry to find the failure a visitor reports.

The SDK is loaded with a dynamic `import()` behind the build-time `SENTRY_DSN` check. Unset, the code is
removed from the build; set, it arrives as a separate chunk after the page loads, so it does not count toward the
home page's JavaScript budget measured by the end-to-end suite. No session replay or user data is collected,
and Sentry's cookies are not used, so tracking doesn't go through the consent banner. Add `Sentry.replayIntegration()`
or `Sentry.setUser()` only after checking that against your privacy policy.

### Analytics and cookie consent

Analytics are chosen per project by environment variable, and nothing that sets cookies loads before the visitor says yes.

| Variable                       | Provider                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible: the domain registered in Plausible                                   |
| `NEXT_PUBLIC_POSTHOG_KEY`      | PostHog: project token (`NEXT_PUBLIC_POSTHOG_HOST` for the EU cloud or a proxy) |
| `NEXT_PUBLIC_GA_ID`            | Google Analytics 4: measurement ID, loaded with Consent Mode v2                 |

These are public values, baked in at build time: redeploy after changing them. Set any combination.

- **Vercel Analytics** (`@vercel/analytics`) is always on in the public site. It sets no cookies and stores nothing on the visitor's device, so it needs no consent. It does nothing off Vercel.
- **Before consent:** no request to any provider and no provider `<script>` in the page. **Accept all** (or **Choose** with analytics ticked) mounts the `next/script` tags for each configured provider from `features/consent/components/analytics-scripts.tsx`; the choice is kept in `localStorage` (`consent`: analytics, marketing, version, time) and applies on later visits and in other tabs. **Reject all** keeps everything off and is remembered too. If storage is blocked the choice lasts until the page reloads.
- **Google Analytics:** the inline script first sets Consent Mode v2 `ad_storage`, `ad_user_data`, `ad_personalization` and `analytics_storage` to `denied`, then updates them to the visitor's choice (the three advertising signals follow _Marketing_), all before `gtag.js` is requested.
- **Withdrawing:** Cookie settings → change → save. Analytics cookies (`_ga*`, `ph_*`) and PostHog's local storage are removed, and the page reloads, because a loaded script can't be unloaded. Removal also runs on every visit by someone who has refused.
- **Marketing** is a category in the store and the banner, ready for an ad or pixel provider: read `useConsentState().consent?.marketing` in a client component and gate its `<Script>` the same way. Today it only drives the Google ad signals.
- **No provider, no banner.** `hasConsentProviders` in `src/config/analytics.ts` is false when none of the three variables is set; the banner, the footer link and the loader are then not rendered at all.
- **The banner** is a labelled region (`<section aria-labelledby>`), not a dialog: nothing is trapped and the page stays usable. It is fixed to the bottom of the viewport, so showing it never shifts content (no CLS). It sits first in the DOM and takes focus when it opens; Tab continues from there, and after a choice Tab reaches the skip link. A reopened banner returns focus to the footer link, and Escape closes it without changing the choice. The server can't know the choice, so the banner appears after hydration.
- **Bundle:** the banner and the loader are a few KB; the provider code is third-party and arrives only after consent. PostHog is loaded from its CDN (`array.js`), not bundled.
- **Your privacy policy** should name the providers you switch on, the `ab` cookie if you run A/B tests, and what a choice stores. This starter can't write that for you, and a banner is not legal advice.

### Site search

`src/features/search`. `SEARCH_QUERY` matches `title`, `seo.metaDescription` and `pt::text(pageBuilder[].body)` (the sections that have a `body`), scored on the title. `toMatchPattern` turns "web des" into the GROQ pattern `web* des*` and drops wildcards the visitor typed; `parseQuery` trims, collapses whitespace, cuts at 80 characters and refuses under 2. To search another section's text, add the field to the `match` and the projection in `api/queries.ts`, then `npm run typegen`.

- **`/search`** reads `searchParams` at the top of the page, with no `<Suspense>`, and sets `export const instant = false`, so only this route is dynamic and the results are in the HTML itself. This is deliberate: results streamed behind `<Suspense>` sit in a hidden element that a script reveals, so a plain form submit would show nothing without JavaScript. The layout still comes from the cache. With JavaScript, the form navigates client-side (focus stays in the box) and the page's `role="status"` / `aria-live="polite"` line announces the count.
- **Quick search** is a native modal `<dialog>` (focus trapped, page inert, Escape closes and returns focus). The header's search link is a real link to `/search`; with JavaScript, a click or Ctrl/Cmd+K opens the dialog, whose code is loaded then. Arrow Down / Up move between the box and the results; Enter in the box goes to the full page.
- **Cache:** `shortLivedSanityFetch` in `lib/sanity/live.ts` is the second `'use cache'` boundary, next to `cachedSanityFetch`, because search needs a short `cacheLife` (see the request budget). Use it only for results keyed by visitor-supplied text. Published content only in `/api/search`; draft mode reads drafts on `/search`.
- The browser never gets whole page bodies: the server cuts a plain-text snippet (`utils/snippet.ts`). The query text only appears in the page as escaped text.

#### Swapping in Algolia or Typesense

The built-in search is fine for a few hundred pages. For typo tolerance, facets or large sites, index pages in an external engine and keep the same two entry points.

1. **Index from the webhook.** Webhook mode already calls `/api/revalidate` on every published `page` with `{_type, "slug": slug.current}`. Add the work next to the IndexNow ping, after the response (`after(() => syncSearchIndex(...))`), and widen the projection to what you index (for example `title`, `"text": pt::text(pageBuilder[].body)`, `"description": seo.metaDescription`). On `delete` remove the record by `_id` instead. Put the client in `src/lib/` (it's shared server code) and keep keys server-only: `ALGOLIA_ADMIN_API_KEY` / `TYPESENSE_API_KEY` never get `NEXT_PUBLIC_`. Do a one-time full import from a script that runs `SEARCH_QUERY`'s filter without the `$q` match.
2. **Replace the read.** Only `searchPages` in `features/search/api/search-pages.ts` talks to Sanity. Return the same `SearchResult[]` (`title`, `path`, `snippet`) from the engine's search API (Algolia `search-only` key, or a Typesense search-only key scoped to the collection) and both `/search` and `/api/search` switch over. Keep `parseQuery` in front of it. Cache the call with `shortLivedSanityFetch`'s pattern (a `'use cache'` function with a short `cacheLife`) or drop the cache if the engine is fast enough.
3. **Without webhook mode** nothing triggers indexing: set it up first (_Live mode vs. webhook mode_), or run the sync from a Sanity Function / scheduled job instead.
4. Delete `SEARCH_QUERY` and run `npm run typegen` once nothing uses it. Browser-side InstantSearch is not needed: the dialog and page already render from `SearchResult`.

### Members-only content

`src/features/auth` (Auth.js, next-auth v5, stateless JWT sessions: no database) plus an `access` field on pages and sections (`public` or `members`; missing means public).

**Environment** (all server-side; `.env.example` lists them):

| Variable                                | Purpose                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                           | Signs the session cookie. Required. `npx auth secret`, or `openssl rand -base64 32`                                                       |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Turns on "Continue with GitHub". OAuth callback URL: `<site>/api/auth/callback/github`                                                    |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Turns on "Continue with Google" (callback `<site>/api/auth/callback/google`); an unverified Google address is refused                     |
| `AUTH_ALLOWED_EMAILS`                   | Who is a member: addresses and whole domains, e.g. `ann@example.com, @example.org`. Empty means anyone who can sign in                    |
| `AUTH_TRUST_HOST`                       | `true` when not on Vercel (Vercel is detected). `AUTH_URL` is only needed behind a proxy that rewrites the host                           |
| `AUTH_TEST_MODE`, `AUTH_TEST_PASSWORD`  | End-to-end tests only: adds an email + password form that accepts the password for any address. Ignored when `VERCEL_ENV` is `production` |

Set `AUTH_ALLOWED_EMAILS` unless your provider already limits who can sign in: "any GitHub user" is otherwise a member. It is checked at sign-in and again on every session read, so removing an address ends that session at once. To use another provider (Microsoft, Okta, email links), add it to `providers` in `features/auth/api/auth.ts` and to `utils/providers.ts` (which decides what the sign-in page offers); email links also need an Auth.js adapter. To use Clerk instead, replace `getSession` in `api/get-session.ts` with Clerk's `auth()`, and the sign-in and sign-out pages and `api/auth` route with Clerk's; nothing else in the app knows which library is behind `getSession`.

**How it keeps public pages cached.** Every public read is the same cached `PAGE_QUERY` as before, called with `$members: false`. With that parameter a members-only page returns no sections, and a members-only section returns only its `_key`, `_type` and `access` (see `api/sections.ts`), so the cached entry, the static shell and every anonymous response hold none of it. The route passes `PageView` a `renderMembersGate` (the auth feature's `MembersOnly`, since features can't import each other). The gate renders inside `<Suspense>`, reads the session cookie, and shows either a sign-in prompt or whatever its `content` callback returns. Only that callback calls `getPage({ members: true })`, so members-only content is fetched after the session check and never before. Shared sections and the variants of an A/B test go through the same path. The only other place `members: true` is passed is draft mode, which only a signed-in editor can switch on.

- **Never pass `members: true` from a code path that hasn't checked the session**, and don't put members-only content in a query that anonymous visitors can reach. If you add a query that reads page or section bodies (a feed, a related-pages list), filter `access != "members"` as `SEARCH_QUERY` does.
- A `members: true` entry is cached on the server under its own key like any other page. It is only reachable through the gate. Under Cache Components the session read is request-time, so the member's copy streams in after the cached shell.
- **Not hidden:** the page's slug (it is the URL) and any menu or link an editor points at it, with the label they typed. The title is hidden: the page query, the page index (breadcrumbs, the generated share image) and the metadata return "Members only" instead, and the real title comes back only with `members: true`. Members-only pages are `noindex`, with no description or share image.
- **Page heading:** a members-only section in first place never claims the `<h1>` (it renders as a section, so the sr-only page title stays the `<h1>`). A members-only page's prompt is its `<h1>`; once signed in, the page follows the usual rule.
- The sign-in page validates `callbackUrl` as a path on this site (`utils/safe-path.ts`), so it can't redirect elsewhere. `/sign-in` and `/sign-out` are `noindex` and are skipped by A/B tests.
- **Adding a section with `npm run new:section`** includes the `access` field and the gated fragment (`_type == "x" && (access != "members" || $members) => {...}`). If you write a fragment by hand, keep that condition.
- **Testing:** the end-to-end tests sign in through the test form (`AUTH_TEST_MODE`); see `tests/e2e/members.spec.ts`. The fixtures include a members-only page, a public page with members-only sections (plain and shared) and one whose first section is members-only.

### IndexNow

Search engines that support [IndexNow](https://www.indexnow.org) (Bing, Yandex and others) hear about a published page right away instead of waiting to crawl it. It runs from the webhook, so it needs webhook mode (above) with the projection `{_type, "slug": slug.current}`.

1. Generate a key: `openssl rand -hex 16` (8–128 letters, digits and dashes).
2. Set `INDEXNOW_KEY` to it in the deployment's environment variables and redeploy. The site then serves the key at `/<key>.txt`, which is how search engines check the site is yours. Without the variable that URL is a 404 and nothing is sent.

After each valid `page` webhook the route POSTs the page's URL to `api.indexnow.org` once the response has been sent, so a slow or failing IndexNow never delays or fails the webhook (failures are logged with `console.error`). Only pages are sent, not blog posts or other types. Nothing is sent when the site URL is localhost. The URL is the site URL plus the page's slug.

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
| `npm run test:e2e:update` | Refresh the visual regression baselines (Linux or Docker; see below)       |
| `npm run test:lighthouse` | Lighthouse budgets on `/` and `/about` (needs Chrome installed)            |

### Sanity workflow (migrations and schema deploy)

`.github/workflows/sanity.yml` keeps the dataset and its deployed schema in step with the code. Set these in the
repository's Settings → Secrets and variables → Actions. Each job skips with a notice (and passes) when its
secret or the project ID is missing, and fork pull requests never receive secrets.

| Name                            | Kind     | Used for                                                                                                                |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | variable | Both jobs. `NEXT_PUBLIC_SANITY_DATASET` (variable) is optional and defaults to `production`                             |
| `SANITY_MIGRATION_READ_TOKEN`   | secret   | **Viewer** token. Pull requests that touch a schema or `migrations/` dry-run every migration                            |
| `SANITY_DEPLOY_TOKEN`           | secret   | **Editor** token. Every push to `main` runs `sanity schema deploy`, so tools that read the deployed schema stay current |

The dry run only reads and prints what each migration would change; read the log before merging.
**CI never runs a real migration.** Do that by hand with `npx sanity migration run <id> --no-dry-run`; when a
schema change needs a migration and how to write one are in [migrations/README.md](migrations/README.md).

### Backups

`.github/workflows/backup.yml` exports the dataset (documents and assets) every Sunday at 03:00 UTC, and on demand
from the Actions tab (Backup → Run workflow). Files are named `sanity-<dataset>-<YYYY-MM-DD>.tar.gz`. It skips with
a notice (and passes) when the token or project ID is missing. GitHub pauses scheduled workflows after 60 days
without repository activity; a manual run re-enables them.

| Name                                                                         | Kind     | Used for                                                                                                    |
| ---------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`                                              | variable | Same variable as the Sanity workflow. `NEXT_PUBLIC_SANITY_DATASET` (variable) defaults to `production`      |
| `SANITY_AUTH_TOKEN`                                                          | secret   | **Viewer** token. Export only reads                                                                         |
| `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | secret   | Optional. All three together switch storage from an Actions artifact to an S3-compatible bucket             |
| `BACKUP_S3_ENDPOINT`                                                         | secret   | Optional. Needed for Cloudflare R2: `https://<account-id>.r2.cloudflarestorage.com`. Leave empty for AWS S3 |
| `BACKUP_S3_REGION`, `BACKUP_S3_PREFIX`                                       | variable | Optional. Region defaults to `auto` with an endpoint and `us-east-1` without; prefix to `sanity-backups`    |

Without the bucket secrets the backup is an Actions artifact kept for 30 days: enough for a few weekly restores
points, not a long-term archive. For longer retention use a bucket and set a lifecycle rule on it (the workflow never
deletes anything). Give the bucket credentials write access to that bucket only; the backup contains your drafts.

**Restore.** Download the file (artifact: Actions → the run → Artifacts, which downloads as a zip around the
`.tar.gz`; bucket: your provider's console or `aws s3 cp`). Then, logged in with `npx sanity login` as someone who can write
to the project:

```bash
npx sanity dataset import sanity-production-2026-10-11.tar.gz production --replace
```

`--replace` overwrites documents with the same `_id`; use `--missing` to only add what is gone. Documents created
after the backup stay, so to return to the exact backup state import into a new dataset instead and point
`NEXT_PUBLIC_SANITY_DATASET` at it.

**Test a restore** (do this once, and after big schema changes) into a scratch dataset that touches nothing live:

```bash
npx sanity dataset create restore-test --visibility private
npx sanity dataset import sanity-production-2026-10-11.tar.gz restore-test
# Compare document counts (the numbers should match the backup date's content)
npx sanity documents query 'count(*)' --dataset restore-test
npx sanity documents query 'count(*)' --dataset production
# Optional: run the site against it
NEXT_PUBLIC_SANITY_DATASET=restore-test npm run dev
npx sanity dataset delete restore-test
```

Deleting the scratch dataset is permanent, so check the name first.

### Tests

- **Unit** (`*.test.ts` next to the code): slug/URL mapping, redirect matching and the Edge Config map and proxy, the live-update
  dedupe logic, the section generator's naming, sitemap splitting, blog pagination, the RSS XML builder and date formatting, form validation, the members allow-list and callback-path checks, A/B option choice and cookie handling and the proxy's experiment lookup, the `/llms.txt` builder, consent parsing and the Google Analytics snippet, the rate limiter, the notification email, the Stripe webhook signature check, event and price mapping, config and REST calls, price formatting, the Turnstile and Resend calls and the forms environment check, the newsletter provider modules (Resend, Loops, Mailchimp, with `fetch` mocked) and their environment check, and the setup wizard's validation.
- **End to end** (`tests/e2e`): a production build pointed at a fake Content Lake that serves
  `tests/e2e/fixtures/dataset.mjs`, so it runs offline with no Sanity project. On desktop and mobile
  Chrome it checks pages and metadata, redirects, security headers, robots and sitemap, the webhook
  route, keyboard focus and the skip link, the mobile menu, the announcement bar (inside, before and after its window; dismissal), the returning-visitor greeting (absent on a first visit, shown on the second), the blog (index, pagination, categories, a post with its Article JSON-LD and related posts, 404s, the RSS feed parsed as XML, the sitemap), forms (required-field errors announced and focused, kept answers, server-side re-validation, the success message, a failed spam check, the rate limit, and the same flow with JavaScript off), the newsletter signup (validation, the success message, an identical answer for a repeated address, a failed spam check, the rate limit, JavaScript off), the AI crawler policy in both states (`robots.txt` and `/llms.txt` with crawlers allowed and switched off; the fake Content Lake serves a settings variant and the test expires the cache with a signed webhook), A/B tests (no running test leaves pages, cookies and attributes untouched; with one running, an `ab` cookie for control and for the variant each get their content and `data-variant`, new visitors are assigned and kept in an option, crawlers and the blog are skipped; the fake Content Lake serves variant documents and the test starts and stops the experiment with a signed webhook), search (the page with and without JavaScript, title and body matches, hidden and members-only pages left out, validation and the length cap, the JSON route, the dialog by pointer and keyboard, debounce, failure states, axe with the dialog open), the cookie banner (first visit with focus in the banner and no shift, Accept all and Reject all identical, no provider request before consent, Accept loading Plausible, PostHog and Google with Consent Mode defaults denied first, Reject staying off and persisting, Choose, reopening from the footer and withdrawing, keyboard use, axe with the banner open and expanded; every other test starts as a visitor who already rejected, so the banner doesn't take focus), members-only content (an anonymous visitor gets the sign-in prompt and none of the content, not even in the HTML; signing in through the test form returns to the page and shows it; refused passwords and addresses; sign-out; members pages left out of the sitemap, `/llms.txt` and search), the pricing table (active plans with Intl-formatted amounts in three currencies, one highlighted plan, distinct button names, archived prices left out), Checkout (a subscription and a one-time price create the right Stripe session and redirect; a tampered price id is refused) and the Stripe webhook (bad, tampered and replayed signatures rejected; unused events acknowledged; a price event upserts a document with the write token; a deleted price is marked inactive; the fake Content Lake also plays Stripe and records writes), and runs axe for WCAG 2.2 AA on every page, including the blog index, a category and a post.

Running the end-to-end tests locally:

```bash
npx playwright install chromium   # once per machine: downloads the test browser (~100 MB)
npm run test:e2e                   # builds the site, then tests it (a few minutes)
```

They use ports 3100 and 9999 and don't need `.env.local`. Stop anything else on those ports first.
CI installs the browser itself.

When you add a section or a content type, add an example of it to the fixture dataset so the axe scan covers it.

#### Section gallery and visual regression

`/section-gallery` renders every section type on one page, each under a label (`ctaBanner (dark tone)`,
`mediaText (image left)`, `featuresGrid (4 columns)`…), so a styling change can be checked in one place.
It is not part of the public site: it answers 404 unless `NODE_ENV` is `development` or `E2E_GALLERY=1`
(`playwright.config.ts` sets it for the test build), and `section-gallery` is a reserved first slug
segment, so no CMS page can use it.

The route draws the page with the slug `section-gallery`, which only the fixture dataset has
(`tests/e2e/fixtures/dataset.mjs`, `gallerySections`). To look at it in development, run the fake Content
Lake and point the site at it:

```bash
node tests/e2e/fake-sanity.mjs &              # serves the fixtures on :9999
SANITY_API_HOST=http://localhost:9999 NEXT_PUBLIC_SANITY_PROJECT_ID=e2etest1 NEXT_PUBLIC_SANITY_DATASET=production \
  SANITY_API_READ_TOKEN=x npx next dev        # then open http://localhost:3000/section-gallery
```

`tests/e2e/visual.spec.ts` takes one `toHaveScreenshot` per gallery section on desktop and on mobile, with
animations frozen, reduced motion on, every image decoded and web fonts loaded first. Sanity CDN images are
replaced by a fixed gradient, so no screenshot depends on the network. Baselines are committed in
`tests/e2e/visual.spec.ts-snapshots/`, named `<section id>-<desktop|mobile>-linux.png`. A section's id is the
`_key` of its entry in `gallerySections`.

- **Baselines are Linux-only**: text renders slightly differently on every operating system. The visual tests
  skip themselves on macOS and Windows (`E2E_VISUAL_ANY_OS=1` compares anyway, against baselines you must
  not commit). CI runs on Linux, so it checks them.
- **Refreshing** after an intended design change: `npm run test:e2e:update` on Linux, or from any system in
  Docker (use the image tag that matches `@playwright/test` in `package.json`). CI's runner is the reference:
  if a Docker-made baseline differs from CI by a few pixels (system fonts), use the workflow below instead.

  ```bash
  docker run --rm --ipc=host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.64.0-noble \
    sh -c "npm ci && npm run test:e2e:update"
  ```

  Without Docker, run the **Update visual baselines** workflow (Actions tab) and download its
  `visual-baselines` artifact into `tests/e2e/visual.spec.ts-snapshots/`. Review the images before committing:
  a baseline is a promise that this is how the section should look.

- **A failed run** leaves the expected, actual and diff images in `test-results/` (CI uploads them).
- **Adding a section or a variant:** `npm run new:section` adds a placeholder gallery entry; give it real
  content, add one entry per look (as for the banner tones), refresh the baselines and commit them. The
  spec fails when a section type with a thumbnail in `public/section-previews/` has no gallery entry.

The A/B test spec starts a site-wide experiment, which rewrites every page request while it runs. It is its own Playwright project (`experiments`) that waits for `desktop` and `mobile` to finish, so no other test ever sees an experiment running. Any new spec that changes site-wide state (settings variants, experiments) should do the same, or restore the state before other specs can run.

### Performance budgets

CI fails when a page gets heavier or slower than these. They run against the same production build and fake
Content Lake as the end-to-end tests.

| Budget                                 | Limit     | Where it lives                                    |
| -------------------------------------- | --------- | ------------------------------------------------- |
| JavaScript loaded by `/` (gzipped)     | 200 KB    | `JS_BUDGET_KB` in `tests/e2e/performance.spec.ts` |
| Lighthouse performance (`/`, `/about`) | ≥ 0.9     | `lighthouserc.json`                               |
| Lighthouse accessibility               | 1         | `lighthouserc.json`                               |
| Cumulative Layout Shift                | ≤ 0.05    | `lighthouserc.json`                               |
| Largest Contentful Paint               | ≤ 2.5 s   | `lighthouserc.json`                               |
| Client memory (30 rounds of browsing)  | see below | `tests/e2e/memory.spec.ts`                        |

- **JavaScript:** the test fetches `/`, takes every `<script src>` in the HTML, gzips each file from
  `.next/static` (level 9) and adds them up (1 KB = 1000 bytes). Over budget, it lists every chunk, largest
  first. The total is about 190 KB today, so a new client-side dependency of even 10 KB trips it. Look first
  for a client component that can be a server component, or an import that can be lazy-loaded (as
  `draft-mode-tools.tsx` does).
- **Client memory:** in one page session, the test repeats what a visitor does (client navigations, quick
  search, the mobile menu on mobile, reopening the cookie banner) 10 times to warm up, then 20 more, and
  compares Chrome's counts after forced garbage collection. Event listeners may grow by at most 10 and DOM nodes
  by 150, just above the jitter of React briefly keeping the last subtree it removed; a leak grows them every
  round (one listener per round fails it). The JS heap may grow by 3 MB, a
  loose limit because Next.js's router cache drifts upward a little (about 0.5 MB today). A failure usually
  means a client component adds a listener, timer, observer or subscription without removing it in its
  `useEffect` cleanup; `quick-search-dialog.tsx` shows the pattern. To find it, see which counter grew and take
  heap snapshots in Chrome DevTools (Memory → compare two snapshots, filter by `Detached`).
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

This creates the schema, GROQ fragment, component and thumbnail, registers each one, adds a placeholder
to the section gallery's fixtures, and runs typegen.
The section is immediately in Studio's _Add item_ menu with a title and text field. Then:

1. Add fields in `src/features/pages/schemas/sections/pricing-table.ts`
2. Query them in `pricingTableFragment` (`src/features/pages/api/sections.ts`) and run `npm run typegen`
3. Build the UI in `src/features/pages/components/sections/pricing-table.tsx`, typed from the query
4. Optionally replace `public/section-previews/pricingTable.svg`
5. Give the placeholder entry the generator added to the section gallery (`gallerySections` in
   `tests/e2e/fixtures/dataset.mjs`) real content, one entry per variant, then add the screenshot baselines
   with `npm run test:e2e:update` (see _Section gallery and visual regression_).

The generator inserts code at the `// new-section:*` marker comments; keep them in place. To add a section
by hand, follow the same steps and register it in `schemas/sections/index.ts`, `pageBuilderFragment` and
`components/section-renderer.tsx`. Until a section is registered in the renderer, `tsc` fails with
"Property '<name>' is missing".

## Adding a feature, document type or singleton

Three more generators work like `new:section` (same naming rules: `case-study`, `Case study` and `caseStudy` are one name).
Each checks that every marker comment it needs exists before it writes anything, then runs ESLint
(`--fix`) and Prettier on the files it touched.

```bash
npm run new:feature events                      # a feature folder
npm run new:document events talk                # a document type with title and slug
npm run new:singleton events events-landing     # a document that exists exactly once
```

- **`new:feature <name>`** creates `src/features/<name>/{api,components,schemas,types}` (each holds a
  `.gitkeep` until a real file arrives; there are no barrel files) and adds the name to the `features` list in
  `eslint.config.mjs`, so the import rules apply to it.
- **`new:document <feature> <name>`** creates `schemas/<name>.ts` (title and slug) and `api/<name>.ts` (a
  `defineQuery` query plus a `get<Name>(slug, mode)` fetcher through `cachedSanityFetch`, tagged
  `TAGS.<typeName>`). It registers the type in the feature's `schemas/index.ts` (creating that list, and adding it to
  `sanity.config.ts`, when the feature has none), adds the cache tag to `TAGS` in `src/lib/sanity/live.ts`, adds a
  list entry to the desk structure, and runs `npm run typegen`.
- **`new:singleton <feature> <name>`** creates the schema, registers it like a document, adds it to
  `SINGLETON_TYPES` (`src/features/studio/singletons.ts`) and pins it in the desk structure at the fixed document id
  `<typeName>`. Read it with `*[_id == "<typeName>"][0]`. It generates no query; when you add one, add the tag as above.

Then, for a new document type or singleton:

1. Add fields in the schema and shape the query, then run `npm run typegen` and use the generated types.
2. Webhook mode: add the type to the Sanity webhook's filter (_Live mode vs. webhook mode_). The generators don't
   edit the README or your webhook.
3. A new type has no route. When you add one in `src/app`, add fixture documents in `tests/e2e/fixtures/dataset.mjs`
   so the axe scan covers it.

The generators insert code at `// new-feature:*`, `// new-schema:*`, `// new-registry:*`, `// new-document:*` and
`// new-singleton:*` marker comments (in `eslint.config.mjs`, `sanity.config.ts`, each feature's `schemas/index.ts`,
`src/lib/sanity/live.ts`, and the studio feature's `structure.ts` and `singletons.ts`); keep them in place. A
generator that can't find one stops without writing and says which. CI runs each generator on a throwaway checkout and
then `npm run check`.

## Updating from the template

Releases are git tags (`v1.0.0`, `v1.1.0`, ...) with notes in [CHANGELOG.md](CHANGELOG.md). A project pulls
one in by merging the tag. Read the release's _Breaking changes / migration steps_ first, and step through
tags one release at a time if you are several behind.

```bash
git remote add template https://github.com/CurrawongCreativeCo/sanity-starter.git   # once
git fetch template --tags
git switch -c update-template-v1.2.0          # do the update on a branch
git merge v1.2.0                              # first time only, see below: add --allow-unrelated-histories
# resolve conflicts (next section), then:
npm install                                   # dependencies usually change
npm run typegen                               # regenerates src/types/sanity.types.ts (needs .env.local and Node from .nvmrc)
npx next typegen                              # route types (PageProps); `npm run dev` or `build` also make them
npm run check
npm run test:e2e
```

Commit the merge, open a PR (or push, if you may) and let CI confirm. If it goes badly,
`git merge --abort` before committing, or delete the branch after.

**First merge.** A project made by cloning this repo shares its history, so a plain `git merge <tag>`
works. A project made with GitHub's **Use this template** button has unrelated history; add
`--allow-unrelated-histories` to the first merge only. Every file that differs then conflicts as
add/add, so start from the tag closest to the day the project was created (`git tag --sort=-creatordate`,
or `git log template/main --before=<date>`), and merge forward from there. Expect dozens of conflicts the first time. For files you never changed, take the template's version
(`git checkout --theirs <file>`); handle the rest as below.

### Resolving conflicts

- **Customize files** (below): keep your side for your content and take the template's side for
  anything structural it changed. Look at the diff of that file between the two tags
  (`git diff v1.1.0 v1.2.0 -- src/styles/globals.css`) rather than at conflict markers alone.
- **Core files** (below): take the template's version (`git checkout --theirs <file>`). If you edited
  one, re-apply your edit on top, then ask whether it should be an option in the template instead.
- **Setup wizard remnants.** The wizard deletes `scripts/setup/`, its `predev`/`setup` scripts and the
  README section between the `setup-wizard` markers. Git reports modify/delete conflicts for these;
  keep them deleted (`git rm -r scripts/setup`) and keep your `package.json` without those scripts.
- **`package-lock.json`**: take the template's, then run `npm install` to fold in your own packages.
- **`src/types/sanity.types.ts`** and **`schema.json`** are generated: take either side, then run
  `npm run typegen`.
- **`eslint.config.mjs`**: keep your additions to the `features` list.
- **`tests/e2e/fixtures/dataset.mjs`**: keep your documents and add the template's new ones. Specs
  assume fixture documents the template added.

### Customize vs core files

The split predicts where merges conflict. Customize files are yours; core files should be identical to
the template, so they merge cleanly unless you changed them.

| Kind      | Paths                                                                                                                                                                                                                                                                                                                               | Expect                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Customize | `src/styles/globals.css`, `src/config/brand.ts` (brand colors)                                                                                                                                                                                                                                                                      | Conflicts if the theme changed      |
| Customize | `src/features/pages/schemas/sections/*`, `src/features/pages/components/sections/*`, `src/features/pages/api/sections.ts`, `section-renderer.tsx`, `schemas/sections/index.ts`, `public/section-previews/*`                                                                                                                         | Conflicts at each section you added |
| Customize | `tests/e2e/fixtures/dataset.mjs`, page templates (`schemas/templates.ts`), `public/`                                                                                                                                                                                                                                                | Conflicts where you added content   |
| Customize | `package.json` (name, scripts, your dependencies), `.env.example`, `sanity.config.ts` (project-specific plugins), `next.config.ts`, `README.md`                                                                                                                                                                                     | Small conflicts                     |
| Core      | `src/lib/**`, `src/config/{env,paths,site-url}.ts`, `src/components/ui/**`, `src/features/{studio,draft-mode,personalization,experiments,auth,pricing}/**`, forms and blog logic (`api`, `utils`), `scripts/{new-section,new-feature,new-document,new-singleton,generator-utils,section-names,e2e-server}.mjs`, `eslint.config.mjs` | Clean                               |
| Core      | `.github/**` (CI, Dependabot), `tests/e2e/*.spec.ts` and `tests/e2e/{fake-sanity.mjs,constants.ts}`, `playwright.config.ts`, `vitest.config.mts`, `tsconfig.json`, `prettier.config.mjs`, `lighthouserc.json`, `.nvmrc`                                                                                                             | Clean                               |
| Generated | `src/types/sanity.types.ts`, `schema.json`, `package-lock.json`                                                                                                                                                                                                                                                                     | Take either side, regenerate        |

Keep customizations out of core files where you can: add a section, a page template or a fixture
document in a new file or at the marker comments rather than editing shared code. Layout and design
tweaks to feature components (`src/features/*/components`) conflict like customize files. Where several
projects keep editing the same core file, see [docs/template-packaging.md](docs/template-packaging.md)
for when to extract it into a versioned package.

### Cutting a release (template maintainers)

1. Move the _Unreleased_ entries in `CHANGELOG.md` under a new `## [x.y.z] - date` heading, fill in
   _Breaking changes / migration steps_ (write "None." if there are none), and update the compare links.
2. Run `npm run check` and `npm run test:e2e`, commit, then `git tag -a vx.y.z -m "vx.y.z"` and
   `git push origin main vx.y.z`.

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
