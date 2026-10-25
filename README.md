# Nocturne

Next.js 16 (App Router, Cache Components) · next-sanity 13 · Sanity Studio 6 · Tailwind 4 · TypeScript strict.

<!-- setup-wizard:start -->

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCurrawongCreativeCo%2Fnocturne&env=NEXT_PUBLIC_SANITY_PROJECT_ID%2CNEXT_PUBLIC_SANITY_DATASET%2CSANITY_API_READ_TOKEN%2CNEXT_PUBLIC_SITE_URL&envDescription=Sanity%20project%20ID%2C%20dataset%2C%20a%20Viewer%20token%2C%20and%20the%20site%27s%20public%20URL&envLink=https%3A%2F%2Fgithub.com%2FCurrawongCreativeCo%2Fnocturne%23deploying-vercel&project-name=sanity-next-site&repository-name=sanity-next-site)

**Which path?** Use the button to put a site online fast: it copies this repo to your GitHub account and deploys it
on Vercel. Follow the [deploy checklist](#deploying-vercel) afterwards (the CORS step is not optional). To work on
the code, or to have a setup wizard create the Sanity project for you, start locally as below. The button deploys
the template as-is and does not run the wizard, so create the Sanity project, dataset and token first.

### Starting a new project

This repo is the clean template. Don't run the setup wizard in it; start each new site from a fresh copy
(or use GitHub's **Use this template** button):

```bash
git clone https://github.com/CurrawongCreativeCo/nocturne.git my-new-site
cd my-new-site
npm install
npx sanity login   # lets the wizard create the project, token, CORS origins and starter content
npm run dev
```

The first `npm run dev` opens a setup form at http://localhost:3333. It can create a new Sanity project
with a **private** dataset (or connect an existing one; make that private too, see [Dataset privacy](#dataset-privacy)), create a Viewer token, allow the site in CORS, and import starter content
(Home and About pages, Site settings with a menu and footer, and empty Brand colours, Announcement bar, Cookie banner and Business info documents so those Studio screens don't open as "New …"; existing documents are never overwritten). It writes `.env.local`, deletes itself
(`scripts/setup/`, the `predev`/`setup` scripts, and this section), then starts the site and links you
to Studio's Presentation view. Commit the deletions in the new project only; never in this template,
or future projects lose the wizard.

**Link page today, full site later.** The form asks "Start with a pre-launch Link page?" (on by default in a new client project; it needs starter content). Yes imports a published **Link page** (the _Link page + coming soon_ template with its Minimal look and the site name in the profile; the placeholder links are hidden until the client gives them addresses), saves **Home and About as drafts only** (never published; they link to each other with weak references), leaves the menus empty, and sets `launch: { status: 'prelaunch', homepage: 'links' }` in `site.profile.ts` (one line; the rest of the file is untouched). The site then shows the Link page at `/` and answers 404 to everything else (see [Pre-launch and launch](#pre-launch-and-launch)). No gives the live site above. The import uses `--missing`, so existing documents are never overwritten. To see what it would do without writing anything: `npm run setup -- --dry-run --name "Acme"` (add `--live` for the other mode). The final screen points to attaching the domain ([Deploying (Vercel)](#deploying-vercel)), `launch:check --prelaunch` and the launch checklist (Studio → Website settings → _Launch & visibility_).

A project set up without the wizard has no documents for those four screens, so each opens as _New Brand colours_ (and so on) until someone publishes it. Open each once in Studio and press **Publish** (nothing changes on the site). An empty Business info shows nothing on the site.

The CMS (Studio) uses Currawong Creative's branding with no setup: `studio-brand.json` ships as an empty
brand. The wizard only sets the Studio title from the site name. To brand the CMS for the client, see
[CMS branding](#cms-branding); otherwise leave it as Currawong's, on purpose.

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

- **Preview in Structure:** pages and posts open in Structure (Pages, Blog) on the form, with **Editor** and
  **Preview** tabs in the document header (other document types show the form alone). To see both at once, use
  **Split pane right** in the document's toolbar and pick Preview in the new pane. Each document pane needs 600px, so on a narrow window Sanity collapses one to a thin strip (click it to bring it back). Edits show in Preview
  before you save, through draft mode and `SanityLive`, as in Presentation. The toolbar has **Refresh**, a
  desktop/phone width toggle (390px) and **Open in Presentation**, which opens the same page there. Preview shows
  content only: there are no click-to-edit overlays or drag-to-reorder, which is what Presentation is for. It always
  shows the drafts perspective, so a release chosen in Presentation isn't followed. A page or post with no address
  shows "Add an address to preview this page". Nothing of the preview loads until its tab is opened, so opening a
  document isn't slower. Clients get it too. **Why no automatic split:** Sanity's `defaultPanes` opens both panes
  but, when the window is too narrow, keeps the _last_ one (Preview) and collapses the form, which at 1280px hid the
  Title field; listing Preview first keeps the form but puts Preview on the left. Developers: the view is
  `src/features/studio/components/preview-view.tsx`, wired in `defaultDocumentNode` (`utils/document-views.ts`). It
  goes through `/api/draft-mode/enable` with a secret made by `createPreviewSecret` from
  `@sanity/preview-url-secret`, the same `sanity.previewUrlSecret` documents Presentation writes (valid for an hour,
  and reused until it is nearly out of date). That function is marked `@internal` in the package, so the dependency
  is pinned to an exact version (the one next-sanity and sanity install, so there is one copy); keep it matching
  `npm ls @sanity/preview-url-secret`, and `utils/preview-secret.test.ts` fails if a new version changes the document
  it writes. `tests/studio-perf/preview.spec.ts` checks the real Studio at 1280×720 and 1920×1080 (the form opens
  first; Preview loads, switches width and links to Presentation).
- **Presentation** shows the site and the editor side by side. Click any text to edit it; drag sections to reorder.
  Presentation maps `/` to `launch.homepage` before launch and to `home` when live; `/links` and nested
  page addresses open their own documents. Blog, category, team profile and event addresses open their respective
  documents. Built-in routes, APIs (including the draft-mode enable handshake) and files have no main document
  lookup, so they do not trigger a missing-document warning. An unknown CMS address says: “This address has no
  page in the Studio. It may be a redirect or a built-in page.” Sanity still gives that notice its caution icon
  and colour; it offers a translation hook, but no supported empty-state component or tone hook.

  **Redirects in Presentation:** the synchronous [main-document resolver](https://www.sanity.io/docs/visual-editing/presentation-resolver-api) receives only the URL, not published
  redirects or a client. It cannot consult the server's cached redirect list or Edge Config synchronously.
  We do not add a redirect request on each Studio navigation: the preview follows the actual redirect and
  Presentation resolves the destination when the iframe reports it. A source address may briefly show the
  explanation above. Before launch, the proxy gate still precedes redirects, and a valid signed preview pass
  still bypasses the gate unchanged (task 118). In particular, a passed preview at `/` can render the full
  site's Home while the launch-state resolver initially selects the temporary page; selecting a region opens
  the document that owns that region. This resolver does not inspect cookies or change preview access.

  **Manual verification after changing the resolver:** as both agency and client, check direct Presentation
  loads, opening from a page editor, refresh and region selection, on desktop and mobile. Repeat live and
  pre-launch with `/`, `/links`, a nested page, blog, team and event pages, an unknown address and a published
  redirect; the enable handshake should show no missing-document notice. Check the signed preview pass still
  opens private pages and exit preview still closes access. These checks require authenticated Studio access.

- **Roles:** clients see a simpler Studio than Currawong staff; see [Studio roles and permissions](#studio-roles-and-permissions).
- **The sidebar** is grouped by what you are doing, not by how the data is stored. Agency staff see every item; clients see the ones marked (client).
  - **Start here** (client) is also a tool in the top bar, not only a sidebar item: the Studio opens on it. See [Start here](#start-here-studio-home-screen).
  - **Pages** (client): every page on the site, as a tree of folders, with an _All pages_ list underneath.
  - **Blog** (client): _Posts_ are the articles, _Authors_ are the people credited on them, and _Categories_ group posts so visitors can filter.
  - **Business info** (client): your trading name, ABN, phone, email, address and opening hours, written once and used in the footer and in search engines' business listings. See [Business info](#business-info).
  - **Reusable content:** _Shared sections_ are sections you write once and place on many pages, and _Forms_ are the contact and newsletter forms (including where their messages go).
    Empty lists say "Nothing here yet." and Shared sections, Forms and Panels show a count beside their name.
  - **Website settings** (client, except _Cookie banner_) holds the things that appear on every page:
    - _Name, logo & icon_ (client) is the site name, description, logo, default share image and browser icon, plus (agency only, under _Advanced_) whether AI crawlers may read the site.
    - _Navigation_ (client) is the header menu and button, and the footer links and text.
    - _Announcement bar_ (client) is the one-line banner above the header.
    - _Cookie banner_ is the wording of the consent banner (agency only).
  - **Design:** colour and motion choices for the site. It stays hidden until those screens (_Brand colours_, _Motion presets_) exist.
  - **Advanced:** _Redirects_ send old addresses to new ones, _A/B tests_ run headline experiments, _Stripe prices_ are the synced pricing plans, and anything the site adds later lands here too.
- **Announcement bar:** in Website settings → _Announcement bar_, a one-line message (up to 120 characters) shows above the header on every page. Add a link and the whole message becomes the link; tick _Visitors can dismiss it_ for a close button (it stays closed in that browser until the message text changes). _Show from_ / _Show until_ are optional; with neither it shows all the time, and a bar with no message shows nothing. The dates are checked in the visitor's browser, because pages are cached: the bar is always in the HTML but hidden, so it appears a moment after load (the page below shifts down once) and visitors outside the window never see a gap. In Presentation it follows the same dates, so an expired or future bar won't show there either.
- **Share image:** every page gets a social card. Priority: the page's own _Share image_ (SEO group), then the site's default (Website settings → _Name, logo & icon_), then a generated one: in the `accent` colour, with the meta title (or page title) clamped to three lines and the site name, served as a PNG at `/api/og/<slug>`. Only one `og:image` is ever emitted. To restyle it, edit `src/app/api/og/[[...slug]]/route.tsx`; the font file is `src/assets/fonts/` and the colours are the `accent` and `accent-ink` design tokens, read as hex from `src/config/tokens.generated.ts` (the renderer can't read `oklch()`; see [Design tokens](#design-tokens)).
- **Structured data:** every FAQ section also emits schema.org `FAQPage` JSON-LD (questions, and answers as plain text), so keep answers self-contained. Nested pages (a slug such as `services/web-design`) show a breadcrumb trail above the content and emit a matching `BreadcrumbList`: Home, then each parent slug that has a published page (using its title), then the page. Create a page at each parent slug to have it appear; slug segments without a page are skipped. Top-level pages and Home show no breadcrumbs. The site-wide Organization and WebSite data comes from _Name, logo & icon_; once [Business info](#business-info) exists, the Organization becomes the matching LocalBusiness type with the address, phone and hours. All of it goes through `src/components/ui/json-ld.tsx`.
- **SEO preview:** the SEO group of a page shows how it will look in Google and as a social card, using the site's fallbacks (meta title → page title plus "| site name", the site description and share image). Text Google would cut off (over 60 characters for titles, 160 for descriptions) is marked "Cut off".
- **AI crawlers and `/llms.txt`:** in Website settings → _Name, logo & icon_ → _Advanced_ (agency only), _Allow AI crawlers_ (on by default) decides how the site treats AI tools.
  - _On:_ `/llms.txt` lists the site name, its default description and every page that isn't hidden from search engines, as Markdown links followed by each page's meta description (a page without one is listed by title only), so AI tools can find your content. Posts follow under a _Blog_ heading, newest first, with the post's meta description or else its summary; posts hidden from search engines are left out.
  - _Off:_ `robots.txt` disallows the whole site for GPTBot, ClaudeBot, Google-Extended, PerplexityBot and CCBot, and `/llms.txt` answers 404. Google, Bing and other search engines are untouched. The list lives in `src/lib/ai-crawlers.ts`.
  - It is a request, not a lock: well-behaved crawlers obey `robots.txt`, others don't. A crawler that has already stored your pages keeps them. Changes appear as soon as the settings are published (webhook mode: after the webhook).
- **Cookie banner:** in Website settings → _Cookie banner_ (agency only), edit the banner's title, message, privacy policy link and link text, and the one-line descriptions beside _Analytics_ and _Marketing_. Empty fields use sensible defaults. The banner offers **Accept all**, **Reject all** (equal prominence) and **Choose** (analytics and marketing separately; necessary cookies are always on), and a **Cookie settings** link in the footer reopens it so visitors can change their mind. It only exists when the developer has set up an analytics provider (see _Analytics and cookie consent_); with none, there is nothing to ask and no banner or footer link. Banner text changes appear like any other settings change. In Presentation the banner shows too, but no analytics ever load for editors.
- **Search:** visitors search from the magnifier in the header (or Ctrl/Cmd+K) for a quick list, or at `/search?q=…` for the full results page. It looks through page titles, meta descriptions and the text of _Rich text_ and _Image + text_ sections, matching the start of each word ("web des" finds "Web design"), with title matches first and up to 20 results, each with a short excerpt. Pages with _Hide from search engines_ ticked and members-only pages are left out, as is text inside members-only sections and other sections (hero, FAQ, features…) and shared sections. A query is 2–80 characters (longer is cut). New or edited pages appear within a few minutes (webhook mode: right after the webhook, which expires every cached search). `search` is reserved, so a page can't use it as its first slug segment.
- **Members-only content:** a page has a _Who can see this page_ field and every section a _Who can see this_ field (_Everyone_ or _Members only (signed in)_; empty means everyone). A members-only page asks visitors to sign in and shows nothing else, is left out of the sitemap, `/llms.txt` and search, and tells search engines not to index it. A members-only section on a public page is replaced by a "Members only" sign-in prompt for visitors who aren't signed in; the rest of the page is unchanged. A shared section is members-only when the section inside it is. The page's title is replaced by "Members only" until the visitor signs in; its URL, and any menu entry an editor adds for it, are not hidden. In Presentation and draft previews editors see everything. Who counts as a member is set by the developer (see _Members-only content_ below). `sign-in` and `sign-out` are reserved first slug segments; link to `/sign-out` (a button link or a footer menu item with a custom URL) wherever members should find it.
- **Section forms:** a section's form has three levels, so the common choices are pictures and the rare ones stay out of the way. Every collapsed area of fine-tuning is called **Advanced**, followed by what it tunes when a tab has more than one (_Advanced: animation_, _Advanced: edge_, _Advanced: layout_, _Advanced: image_). Agency staff only: clients see just the **Content** tab (see _Studio roles and permissions_; this is the Studio view, not a lock).
  - **Content tab.** The **Layout** picker comes first for sections with more than one layout, because the layout decides which fields matter. The hero is the exception: its picker is a row of six named presets (_Full background image_, _Split, image right_, _Split, image left_, _Centred text, no image_, _Editorial_, _Image with panel_; see _Hero presets_), which set the layout, the image side and the background together. Then the content, showing only what the chosen layout uses: the hero's _Image side_ appears for _Split_ only, its _Small picture_ for _Editorial_ only, and _Image_ for every layout but _Editorial_. A field that is hidden keeps whatever was typed in it, so switching layout back brings it back.
  - **Design tab.** _Background_ (_Page_, _Tinted_, _Contrast_, _Brand_) is a row of swatches drawn with the site's real colours. They are named by role, not colour, because Brand colours can make any of them light or dark (_Contrast_ is light text on dark, or dark on light on a dark site). _Animation_ is a picture picker with gently moving previews (still for anyone who asks for less motion): _None_, _Fade up_, _Subtle entrance_, _Fade_, _Slide in_, _Staggered_, _Float_ and _Parallax_ in three strengths (_Subtle_, _Medium_, _Strong_). Sections start on the right one for what they are (content fades up; the hero's text enters by itself; logo strips stay still), so most never need touching. _Float_ and _Parallax_ move a picture, so they are only offered where a section has one. A collapsed **Advanced: animation** appears under the picker and shows only what the chosen animation uses (intensity, duration, delay, direction, when it plays, or exact values). The first section on a page stays still so its heading and main image appear immediately, unless you choose _On load_, which slides or rises it without ever fading it in; a first hero set to _Parallax_ keeps its picture in the page from the start and only moves it once the page scrolls. Visitors who ask for less motion or have JavaScript off see everything still. See [Section animation](#section-animation).
    - _Float_ and _Parallax_ are only offered where a section has a picture to move: the hero's _Full background_ and _Image with panel_ layouts, and _Image + text_ (where _Parallax_ moves the picture inside its still frame: see _Image design_). If a section's layout changes and leaves _Parallax_ behind, it stays selected and shows a yellow warning.
    - **Advanced: layout** (collapsed): _Space above and below_ (_Compact_, _Default_ or _Spacious_; _Default_ is the section's usual spacing), _Content width_ (_Narrow_, _Default_, _Wide_, or _Full width_ edge to edge), _Alignment_ (_Start_ or _Centre_ for headings, intro text and buttons) and _Anchor_ (a short name such as `pricing`, so a link to `/#pricing` jumps to the section; lowercase letters, numbers and hyphens, each once per page). _Alignment_ is left out on layouts that set their own (the hero's _Split_ and _Editorial_); a value left over from another layout stays visible with a warning, and **Reset value** in the field's menu clears it.
  - **Advanced** (collapsed, in the Design tab): extra controls for the few sections that have them. It does not appear when the chosen layout has none. Today that is the hero's _Proportion_ and _Image shape_, for _Split_ only.

  Nothing in stored content changed, and a section with nothing set looks exactly as it did. New sections start with that kind of section's usual look (a hero starts _Contrast_, testimonials _Tinted_) and _Fade up_. The _Call to action banner_'s own _Tone_ (Brand, Dark, Light) still colours its card; the Design background colours the band around it. In Studio lists a section reads like a sentence: "Hero · Split · Contrast". A hero that matches one of its presets shows the preset's name instead ("Hero · Split, image left"); a custom combination falls back to the layout and background.

- **Start here** (toolbar, first for clients) is the first screen: a greeting, shortcut cards (_Edit your website_, _Write a blog post_, _Update the team_, _Business info and opening hours_, _Help_), your eight most recent changes with who made them and when, and up to five things to check in plain words. See [Start here](#start-here-studio-home-screen).
- **Content health** (toolbar) lists pages with no meta description, images with no alt text, links to unpublished pages, links to missing sections or unpublished panels, redirect chains and loops, and pages nothing links to; click a row to fix it. It also checks shared sections (alt text always; links only while a published page uses them).
- **Image and text guidance:** image fields say what suits their spot ("Recommended: 2400 × 1600 px, landscape.") and show a yellow warning, never an error, when an uploaded picture is narrower than that or a different shape by more than 15%, for example "This image is 1200 × 1800 (portrait). This spot looks best with a landscape image at least 2400 px wide." You can still publish; the warning is a nudge to swap the picture. SVGs are never checked. Section titles and intro text warn the same way when they run past what the design handles (a hero title over 80 characters, other headings over 60–70, intro text over 200). Current targets: hero background 2400 px wide, landscape; _Image + text_ 1600 px at 4:3; testimonial and author portraits 800 px square; logos 400–600 px wide if not SVG (SVG preferred).
- **AI Assist** (`@sanity/assist`) helps with alt text, summaries, headlines, body copy and meta descriptions. It needs a Sanity **Growth** plan
  or higher (AI Assist is not on Free). On Free the plugin still loads and Studio works normally; the
  assist actions just aren't usable, and everything is written by hand. To use it:
  - _Alt text:_ nothing runs on upload, so no AI credits are spent unless someone asks. With an image
    set, open the sparkle (AI Assist) menu on "Alternative text" and run **Generate image description**.
    It always writes in English. Always review it.
    To have it run on every upload instead, open **AI settings** in the Studio toolbar and switch on
    _Write alt text automatically_. It's off by default, each run spends credits, and the choice is
    saved per browser, so each editor decides for themselves (reload open Studio tabs to apply it).
  - _Meta description:_ in a page's SEO group, open the sparkle (AI Assist) menu on "Meta description" and
    run **Write meta description**. It summarises the page title and sections in one sentence under 155
    characters (the field warns above 160), in the site's voice and Australian English. Also available
    on posts, using the post title and body. Review before publishing.
  - _Post summary:_ **Write a summary** uses the title and body, up to 300 characters. The summary's
    stored field name is `excerpt`.
  - _Hero title:_ **Suggest three headlines** offers three alternatives, each up to 80 characters.
    Keep one headline in the Title field before publishing. Available on the current heading and the
    legacy title, in pages and shared sections.
  - _Rich text and post body:_ **Improve this in our voice** preserves meaning, facts, links, images
    and formatting at a similar length; these fields have no character cap. Rich text presets are
    available in pages and shared sections.

  **Writing your site's voice:** edit `voice: { summary, do: [], dont: [] }` in `site.profile.ts`,
  then rebuild and deploy Studio. Write all entries in Australian English. The summary should be two
  or three sentences naming your audience, how you want to sound and how you help. Prefer concrete
  direction such as “A calm, practical plumbing team helping Brisbane homeowners understand the next
  step” over vague adjectives such as “professional and engaging”. Put a few actionable rules in each
  list: `do: ['Use short sentences and explain trade terms.', 'Address the reader as you.']` and
  `dont: ['Use scare tactics or forced slang.', 'Promise results we cannot substantiate.']`. Include
  preferred terms and a short example where helpful; avoid contradictory rules. Australian spelling
  is required by every writing preset regardless of the voice wording. Older client profiles without
  `voice` use clear, warm, practical Australian English. Prompts guide the AI; always check the result
  and its length before publishing. These presets do not run automatically or add AI requests on Free.
  Assist saves instructions by key: the voice-aware meta description uses a new key so it also appears
  in Studios with the earlier preset saved. Existing saved instructions are retained; later voice edits
  may require an agency editor to update or remove the saved instruction in Assist so it can be reseeded.

- **Blog:** _Blog_ in the sidebar holds _Posts_, _Authors_ and _Categories_. A post needs a title, slug, summary, main image (with alt text), published date, author and body; give it at least one category, because related posts are chosen by shared categories. The slug becomes `/blog/<slug>`, so `blog` is reserved and a page can't use it. Details:
  - _Index:_ `/blog` shows 12 posts per page, newest first by _Published at_, with Previous / Next links (`?page=2`) and a filter of the categories that have a post. `/blog/category/<slug>` lists one category the same way. Page 1 has no `?page`, and every page is its own canonical URL.
  - _Summary_ is the card text, the RSS description and the search description unless the post's SEO group sets one. The main image is the share image unless the SEO group has its own; there is no generated image for blog URLs, so set a default in _Name, logo & icon_ if you want one on `/blog`.
  - _Related posts:_ up to three other posts that share a category, the most shared categories first (counting the post's first five), then newest. A post whose categories nobody else uses shows none.
  - _Going live:_ a post is public once published; _Published at_ only sets the order and the date shown, so a future date doesn't hide it. To schedule one, use a content release (needs `features.releases`, see _Content releases_). Studio only warns before deleting an author that posts still use; those posts keep working and just lose the byline.
  - _RSS:_ `/feed.xml` is an RSS 2.0 feed of the newest 12 posts, with absolute URLs, and blog pages advertise it in their `<head>`. It takes the title and description from _Name, logo & icon_.
  - _Search engines:_ posts get `Article` JSON-LD (author, dates, image, categories; the publisher is the site's Organization). Posts and `/blog` are in the sitemap unless the post's _Hide from search engines_ is ticked; category pages are not.
  - _Bad URLs:_ an unknown post or category gets a real 404. A `?page` past the last page (or not a number) shows the 404 page with `noindex` but answers 200, because the page number can only be read after the response has started streaming.
- **Team:** _Team_ in the sidebar lists your people in the order the website shows them. **Drag a row** to move someone (or use the up and down arrows on each row, which also work from the keyboard); the new order saves straight away. _New team member_ adds one. A member needs a name and a square portrait with alt text; their role and a short bio (300 characters at most) appear on the cards. Show the team on any page with _Add item → Team_: choose **Everyone** (in team order) or **Choose members** and pick them in the order you want. Agencies choose the layout (grid, slider or list). If the site has profile pages, each member also has a collapsed **Profile page** group (page address, full bio, qualifications) and **Contact details** group (public email, phone, social links); a member with an address gets a page at `/team/<address>` and their card links to it, and a member without one just has a card. Details in [Team](#team).
- **Forms:** _Forms_ in the sidebar holds forms you build yourself; show one on a page with the _Form_ section (_Add item → Form_, then pick it). One form can sit on many pages. A form has:
  - _Fields_ (up to 20): a _label_, an internal _name_ (e.g. `email`; a lowercase letter, then letters, numbers and `_`; unique in the form, and best left alone once live), a _type_ (short text, email, phone, long text, drop-down, checkbox), _required_, and for a drop-down its _choices_.
  - _Button text_, a _success message_ (shown in place of the form after sending) and _Send submissions to_, the address that receives each one. Replying to the email reaches the visitor if the form has an email field they filled in.
  - _How it behaves:_ every field is checked on the server against the published form, so a visitor can't send a field or a choice the form doesn't have. Problems appear in a summary above the form that takes focus (each item links to its field) and beside each field, and what was typed is kept. Long text allows line breaks and 5,000 characters; other fields are one line of up to 200 (email 254, phone 30). Email addresses are checked for shape only, and phone numbers for 5–15 digits.
  - _Spam:_ a Cloudflare Turnstile check on every send, plus a limit of 5 messages per IP address per 10 minutes on each server instance (serverless instances count separately, so it slows a spammer down rather than stopping one). The check needs JavaScript. Without it the form still posts and shows errors, but nothing is sent: the visitor is told to turn JavaScript on.
  - _Privacy:_ the recipient address is never sent to the browser and no page query selects it. It is still a field in your dataset, so anyone who can read your dataset can read it. Datasets are private by default (see [Dataset privacy](#dataset-privacy)), so only the site's Viewer token and project members can read it; a shared inbox is still the safer choice. Submissions are emailed, and kept as enquiries only if the developer has switched that on (see [Enquiries](#enquiries)); if delivery fails the visitor is told and nothing is kept. Editing a form updates every page that uses it (live mode: right away; webhook mode: after the webhook).
  - _Enquiries:_ when the developer has switched on enquiry storage, every send is also kept under **Enquiries** in the sidebar, newest first, with the number of new ones in its title and on Start here. Open one to read the answers and set its status (_New_, _Read_, _Archived_); everything else is read-only. **Download CSV** (top of the list) saves them all as a spreadsheet. Delete an enquiry if someone asks you to remove their details. Enquiries older than the retention period are deleted automatically. Add a short privacy notice to the form section's _Intro_ (see [Enquiries](#enquiries)).
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
- **When Publish is blocked:** open **Why can’t I publish?** beside Publish (in its actions menu). Each error shows
  the field's title path, a plain instruction and **Go to field**, which opens the section, tab and field. Warnings
  appear separately and never block publishing. If a setting is hidden by another choice, the dialog names the
  current choice and a choice that reveals it when one can be found; **Go to field** takes you to that choice.
  Settings hidden in your view ask for agency help. Document-level errors, removed fields and unavailable paths
  open Sanity's existing validation inspector. Close the dialog, fix the errors and publish as usual. Agency and
  client views use the same wording; no stored field paths or array keys appear in the list.
  Developers: `publishValidationActions` adds help after the existing Publish action for every type that has one;
  it keeps Sanity 6.19's disabled-Publish tooltip, inspector, permission checks and validation. It reads the same
  live validation target as Publish (including release versions), adds no content queries and never edits values.
  Title paths and hidden-choice guidance come from the compiled schema, including field groups and fieldsets.
  Before merging changes to this flow, check a local Studio as agency and client: missing required field, a nested
  section error, warning-only document, hidden setting, keyboard navigation and focus after **Go to field**.
  Record the results in the PR; automated component tests do not replace that signed-in check.
- **Publishing safely:** the first time a page or post is published, and whenever its address changes, Publish asks
  "Publish changes to `https://example.com/about`?" (the site's public address plus the page's path), with **Publish**
  and **Cancel**. Other edits to a live page publish straight away, with no dialog. If the page is already live and you changed its
  slug, the dialog also says "The address will change from /about to /about-us" and offers a ticked-by-default
  **Redirect /about to /about-us (permanent)**. Publishing then creates the redirect already published, so the old link keeps
  working. It is skipped (with the reason in the dialog) when a redirect from the old address already exists or would loop;
  it only warns when other redirects already point at the old address, since they now take an extra step. If the redirect
  can't be saved after publishing, a message says so and you add it under **Redirects**. Posts work the same way with
  `/blog/<slug>`. Clients can't change a slug once set, so this mostly serves agency staff. **Delete** on a page (agency
  staff only) lists the menus (header, header button, footer) and the pages and shared sections that link to it, so you
  can fix them before they show a broken link, then asks you to confirm. Other document types keep Sanity's own actions.
- **Pages** is a tree: top-level pages first, then a folder per first slug segment that has
  children (`services/web-design` is listed under `services`). _All pages_ at the bottom is the flat
  list for search and bulk work.
- **Pages → New** offers templates: _Landing page_ (hero, features, testimonials, call to action) and
  _Content page_ (hero + rich text), or a blank page.
- Under **Sections**, _Add item_ shows every section with a thumbnail:

| Section               | Use it for                                                               |
| --------------------- | ------------------------------------------------------------------------ |
| Hero                  | Page headline, intro, up to two buttons, background image                |
| Rich text             | Long-form copy: headings, lists, links, inline images                    |
| Image + text          | A picture beside a short story, image on either side                     |
| Features grid         | 2–4 columns of benefits with icons                                       |
| Logo strip            | Client or partner logos, in a still row or a scrolling marquee           |
| Testimonials          | Customer quotes with name, role and photo                                |
| FAQ                   | Questions that expand to answers                                         |
| Call to action banner | A closing prompt in brand, dark or light tone                            |
| Form                  | A contact or enquiry form built under _Forms_ (see below)                |
| Pricing table         | Plans from Stripe prices, each with a checkout button                    |
| Newsletter signup     | An email box that adds visitors to your mailing list                     |
| Gallery               | Up to 60 pictures in a grid, masonry or slider, each opening full screen |
| Location              | Address, map, opening hours and contact actions from Business info       |

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

**Switching Releases on or off (`features.releases`).** The Studio only shows Releases when `site.profile.ts` says the plan includes them, so clients on other plans never reach an upgrade screen. New sites start with it **off**; this template's own profile has it on.

1. _Check the plan:_ sign in at [sanity.io/manage](https://www.sanity.io/manage), open the project's organisation and look under _Billing_ for the plan and whether Releases is included.
2. _Switch the flag:_ in `site.profile.ts` set `features: { releases: true }` (or `false`), commit and deploy. Studio reads it when it builds; nothing in the dataset changes.
3. _What turning it off removes:_ the Releases item in the Studio navigation, scheduled drafts (the single-document schedule action and its "Scheduled Drafts" list, which is the same tool under another name), and the release options in the version menu and _Copy to release_. Documents already in a release stay in the dataset untouched. A/B variants don't depend on releases (they use the Studio's separate `variants` setting), so they keep working.
4. _Blog scheduling needs it:_ a post goes public when it is published, and _Published at_ only sets the order and date shown. With Releases off, schedule by publishing on the day.

**Branding:** colours, type, spacing and radii are the design tokens in `src/styles/tokens.json` (see
[Design tokens](#design-tokens)); the brand colour is the `accent` token. The Studio's name comes from
`studio-brand.json`, else `NEXT_PUBLIC_STUDIO_TITLE` (the setup wizard fills it in from the site name), and
appears in its header beside the CMS brand's logo or mark (see [CMS branding](#cms-branding)). The font is set
with `next/font` in `src/app/layout.tsx` (Inter by default). The browser icon is Currawong's until a site sets its
own (see [Browser icon](#browser-icon-favicon)). The generated share image has its own copy of the font (Inter Bold, `src/assets/fonts/`), because `next/og` can't use `next/font`.

The public font is preloaded with `display: 'optional'`: if it misses the browser's brief initial
font-loading window, that navigation keeps the fallback rather than changing line wraps after paint.
The downloaded font remains cached for later navigations. Keep this setting when changing the font;
metric-adjusted local fallbacks alone cannot prevent shifts on systems where that local font is absent.

### Browser icon (favicon)

The small picture in browser tabs, bookmarks, search results and on phone home screens.

**Editors.** In _Website settings → Name, logo & icon → Browser icon_ choose:

- _Currawong's default_ (nothing to do). Every site starts here; it is the Currawong bird on paper.
- _Upload an icon_: a square PNG or SVG, at least 512 px wide. Use the crop tool to frame it.
- _Use the site logo_: press **Use site logo** to copy the logo into the icon field, then crop it square. The copy
  is not linked, so changing the logo later does not change the icon.

Once the site has its own icon, _Padding_ (None, Small, Medium) and _Background_ (Transparent, Light, Dark, Brand;
Light, Dark and Brand come from the `surface`, `surface-inverse` and `accent` design tokens) appear. The preview
below the fields shows the result at 16 px (tab), 32 px (bookmarks) and 180 px (phone, drawn at half size) on a
light and a dark browser. Keep it simple: at 16 px a logo with small text turns to mush, so crop to the mark.
Changes go live with the usual live update or webhook revalidation.

**Developers.**

- **Default files.** `src/app/icon.png` (512 × 512) and `src/app/apple-icon.png` (180 × 180, on paper `#F4EFE6`)
  and `public/icons/icon-32.png` / `icon-192.png` are made from Currawong's mark
  (`src/assets/brand/currawong/bird-on-light.webp`) by `node scripts/make-default-icons.mjs`.
  Next.js icon files can't be WebP, so the PNGs are committed. The script uses `sharp`, which Next.js already
  installs; it is not a dependency and nothing runs at build or request time. It crops, scales and places the artwork
  on paper; it never redraws it. Re-run it only if the artwork changes, then paste the hashes it prints into
  `DEFAULT_ICON_SHA256` in `scripts/launch-check/leftovers.mjs`.
- **A client's own default.** Replace the two large PNGs, then run
  `node scripts/make-default-icons.mjs --sizes-only` to refresh the 32/192 px variants. Alternatively,
  set the icon in Studio (no code change).
- **`favicon.ico` is not needed.** Default metadata offers 32, 192 and 512 px PNGs, so browser tabs
  download the small variant (1.6 KB), and every
  current browser accepts PNG. An `.ico` only helps very old browsers and tools that request `/favicon.ico`
  without reading the page; if one matters, add `src/app/favicon.ico` (Next.js serves it first).
- **How the custom icon is rendered.** `getSiteMetadata` (`src/features/site/api/get-settings.ts`) reads `browserIcon`
  from `SETTINGS_QUERY` (no extra request) and sets `metadata.icons` to Sanity CDN URLs built by
  `browserIconLinks` (`src/features/site/utils/browser-icon.ts`): PNGs at 32, 192 and 512 px plus a 180 px Apple icon,
  using `fm=png`, `fit=fill`, `pad` and `bg`. The editor's crop and hotspot are applied. In this Next.js version,
  file-based icons are only added when `metadata.icons` is not set, so a custom icon replaces `icon.png` and
  `apple-icon.png` instead of adding to them: there is never a second `<link rel="icon">` set.
- **Security.** Icons are always CDN images (PNG). Uploaded SVG markup is never put in the page. Sanity must
  rasterise SVG uploads for this to work: see the launch check below.
- **Unverified against a live dataset.** The Sanity docs confirm `pad` and `bg`, but not that `fm=png` rasterises an
  SVG asset, nor exactly how `pad` changes the output size (the code asks for `w + 2 × pad`). The Studio preview
  shows the CDN's real output, and the launch check fetches each icon and fails if it isn't a PNG of the size its
  URL asks for. Check both on the first site that uses an SVG icon.

### Business info

The business's details, entered once: the footer, the contact details and the LocalBusiness structured data
(what search engines show in business results) all read the same singleton, `businessInfo`. It is set up for
Australian businesses: ABN, state, 4-digit postcode, Australian phone numbers, Australian time zones, en-AU times
("8:00 am") and dates ("Fri 25 Dec").

**For editors.** Open _Business info_ in the sidebar. Only the trading name is required; anything left empty is simply
not shown or published.

- **Trading name, legal name, ABN.** The ABN is checked with the ATO's checksum (a typo is caught before publishing)
  and grouped as you type: `12 345 678 901`. The footer shows it as "ABN 12 345 678 901".
- **Phone and public email.** The phone accepts `(02) 9876 5432`, `0412 345 678`, `+61 2 9876 5432`, `1300 123 456` and
  `13 12 34`. In the footer the number is both shown as text and a tap-to-call link. Use an email you are happy to
  publish: it is on the site for everyone, including spam robots.
- **Address.** Street (optional: leave it empty for a mobile or home-based business), suburb, state and a 4-digit
  postcode. The country is always Australia. Pick the **Time zone** where you trade (Sydney by default; Queensland is
  Brisbane because it has no daylight saving, Perth for WA). It decides when the "Open now" badge says you are open.
- **Opening hours.** One row per set of days with the same hours: tick the days, then type the times in 24-hour form
  (`08:00`, `17:30`). _Closes_ must be after _Opens_ (a business open past midnight can't be entered as one row; close
  at `23:59`, or leave the late hours out). Days with no row show as closed, and a row can be ticked _Closed on these
  days_. Two rows for the same day make a split shift (a lunch break). The footer groups identical days, for example
  "Mon–Fri 8:00 am – 5:30 pm", "Sat 9:00 am – 1:00 pm", "Sun Closed".
- **Public holidays and special days.** A date that is either closed all day or has its own hours, with an optional
  note ("Christmas Day"). The next three show in the footer and in the "Open now" badge; days that have passed drop out
  on their own (within about an hour), so there is nothing to tidy up.
- **Service areas, social profiles.** Suburbs or regions you serve, and links to your profiles (https only). Search
  engines use both; the footer does not show them.
- **Advanced** (agency only): the **business type** (the schema.org type search engines see: Local business, Professional
  service, Medical business, Dentist, Legal service, Restaurant, Store, Home and construction, Health and beauty, or
  _Other_ with a schema.org type typed in, such as `Optician`), **map coordinates** and **price range** (`$` to `$$$$`).
  The defaults (Local business, no coordinates, no price range) are fine for most sites.

**What appears where.** The footer shows a Business info band above the footer links, with the name, address and
ABN, the phone and email, and the hours with an "Open now · closes 5:30 pm" or "Closed now" badge. It only shows what
is filled in, and nothing at all until the document exists. The badge is worked out in the visitor's browser (see below),
so it appears a moment after the page loads and the hours list is the complete information without JavaScript. In
Presentation the document's locations are _Home_ and the footer.

**For developers.**

- **Schema and registration.** `src/features/site/schemas/business-info.ts`, made by `npm run new:singleton site business-info`
  and listed in `SINGLETON_TYPES`, so it can't be created, duplicated or deleted. The desk item sits at the top level
  (clients see it: `businessInfo` is in `CLIENT_STRUCTURE_IDS`). The ABN field uses `AbnInput` (groups digits as you
  type) and `isValidAbn` (`utils/abn.ts`, unit tested). Phones go through `parseAuPhone` (`utils/phone.ts`), which gives
  the `tel:` link and the international form for structured data.
- **Data.** It is a `business` sub-projection of `SETTINGS_QUERY` (`*[_id == "businessInfo"][0] { … }`), so it costs no
  extra request. `getSettings` includes the `businessInfo` tag, the tag is in `TAGS` (`src/lib/sanity/live.ts`) and in the
  webhook filter above. Run `npm run typegen` after changing the schema or projection.
- **Shared hours logic.** `src/lib/opening-hours.ts` is pure and unit tested: `groupOpeningHours` (grouping, closed days,
  en-AU times, split shifts), `upcomingSpecialHours`, `weeklyRanges` (for structured data) and `openStatusAt` (open
  or not at an instant, in an IANA time zone, with special days replacing the regular hours). It never reads the clock;
  callers pass `now`. `OpeningHours` (`src/components/ui/opening-hours.tsx`) is a server-rendered description list for
  any section or page, not just the footer.
- **Open now, and why it is a client component.** `OpenNowBadge` (`src/components/ui/open-now-badge.tsx`) reads the
  clock, which Cache Components forbids in cached or prerendered output, and the server's "now" would not be the
  visitor's anyway. It subscribes to the current minute with `useSyncExternalStore` (server snapshot `null`, so it renders
  an empty placeholder of the same height). Its clock starts when the badge first enters view, avoiding
  date-formatting work for an off-screen footer. It then re-checks every 30 seconds; its observer and
  timer are cleaned up on unmount. Without IntersectionObserver it starts after hydration instead.
  It uses the document's `timeZone`, so a Perth business shows "open" in Perth time for a visitor in Sydney. It costs
  well under 1 KB gzipped. Only render it when there are hours (the footer does).
- **Dates on the server.** Hiding passed special days needs today's date, so `getToday(timeZone)`
  (`src/features/site/api/get-today.ts`) is a small `'use cache'` function with `cacheLife('hours')`, like the footer's
  year. A passed day can therefore linger for up to about an hour.
- **Structured data.** `SiteJsonLd` swaps the plain Organization for `buildLocalBusinessJsonLd`
  (`utils/business-json-ld.ts`, unit tested), keeping the same `@id` (`<site>/#organization`) so the WebSite's
  `publisher` still points at it. It emits the chosen type, `name`, `legalName`, `telephone` (`+61…`), `email`,
  `PostalAddress` (`addressCountry: "AU"`), `GeoCoordinates`, `openingHoursSpecification` (regular days, then dated
  entries for upcoming special days, closed days as `00:00`–`00:00`), `areaServed`, `sameAs` and `priceRange`. Empty
  values are never emitted. _Other_ falls back to `LocalBusiness` unless the typed name is a single capitalised word.
  Check the result with Google's Rich Results Test after launch.
- **Draft mode.** The footer cleans the data with `stegaClean` before reading times, days and phone numbers, because the
  invisible click-to-edit characters would break them; the footer's business text is therefore not click-to-edit in
  Presentation. Edit it from the _Business info_ document.
- **Tests.** Unit: `abn`, `phone`, `business-json-ld`, `opening-hours` and the `SETTINGS_QUERY` projection. End to end
  (`tests/e2e/business-info.spec.ts`): the footer's address, tel and mailto links and grouped hours, upcoming and passed
  special days, the badge in two time zones' worth of clock settings, the JSON-LD shape and axe. The fixture
  (`businessInfo` in `tests/e2e/fixtures/dataset.mjs`) puts a band in every page's footer, so the visual baselines need
  refreshing with the **Update visual baselines** workflow.

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

   | Variable                         | Value                                                                                   |
   | -------------------------------- | --------------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SANITY_PROJECT_ID`  | from `.env.local`                                                                       |
   | `NEXT_PUBLIC_SANITY_DATASET`     | from `.env.local`                                                                       |
   | `NEXT_PUBLIC_SANITY_API_VERSION` | from `.env.local`                                                                       |
   | `NEXT_PUBLIC_SITE_URL`           | your production URL, e.g. `https://example.com` (no slash)                              |
   | `NEXT_PUBLIC_SITE_LANGUAGE`      | optional: content language for `<html lang>` (default `en`)                             |
   | `NEXT_PUBLIC_STUDIO_TITLE`       | optional: name in the Studio header and tab (default: Nocturne)                         |
   | `SANITY_API_READ_TOKEN`          | from `.env.local` (Viewer token)                                                        |
   | `SANITY_REVALIDATE_SECRET`       | only for webhook mode (see below)                                                       |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | only for forms: Turnstile site key (public)                                             |
   | `TURNSTILE_SECRET_KEY`           | only for forms: Turnstile secret                                                        |
   | `RESEND_API_KEY`                 | only for forms: Resend API key                                                          |
   | `FORMS_FROM_EMAIL`               | only for forms: verified sender, e.g. `Site <forms@site.com>`                           |
   | `NEWSLETTER_PROVIDER`            | only for newsletter signup: `resend`, `loops` or `mailchimp` (see below)                |
   | `STRIPE_SECRET_KEY`              | only for pricing: Stripe secret or restricted key (see below)                           |
   | `STRIPE_WEBHOOK_SECRET`          | only for pricing: the webhook endpoint's `whsec_…` signing secret                       |
   | `SANITY_WRITE_TOKEN`             | only for pricing: Editor token the Stripe webhook writes with                           |
   | `STRIPE_SUCCESS_URL`             | optional: where buyers land after paying (default `/?checkout=success`)                 |
   | `STRIPE_CANCEL_URL`              | optional: where "back" from Stripe leads (default: the pricing page they came from)     |
   | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`   | optional: Plausible site domain (see Analytics, below)                                  |
   | `NEXT_PUBLIC_POSTHOG_KEY`        | optional: PostHog project token                                                         |
   | `NEXT_PUBLIC_POSTHOG_HOST`       | optional: PostHog host (default US cloud)                                               |
   | `NEXT_PUBLIC_GA_ID`              | optional: Google Analytics 4 measurement ID, `G-…`                                      |
   | `SENTRY_DSN`                     | optional: turns on Sentry error tracking (see Error tracking, below)                    |
   | `OPS_NOTICES_URL`                | optional: https endpoint for notices on the Studio's Start here screen (see Start here) |
   | `OPS_NOTICES_KEY`                | optional: bearer key sent to that endpoint from the server; never reaches the browser   |
   | `INDEXNOW_KEY`                   | optional: IndexNow key (see below)                                                      |
   | `STYLEGUIDE_PREVIEW_TOKEN`       | optional: opens the style guide on Vercel preview deployments (see Style guide)         |
   | `PREVIEW_ACCESS_SECRET`          | optional: signs the pre-launch preview pass (see Pre-launch and launch); 16+ characters |
   | `PRELAUNCH_PREVIEW_TOKEN`        | optional: the client preview link's token (see Pre-launch and launch); 16+ characters   |
   | `FLAGS_SECRET`                   | optional: signs A/B variant URLs; needed to run an A/B test                             |
   | `EXPERIMENT_CACHE_SECONDS`       | optional: how long the proxy remembers the running test (60)                            |
   | `EDGE_CONFIG`                    | optional: Edge Config redirects (see below); Vercel adds it                             |
   | `EDGE_CONFIG_ID`                 | optional: Edge Config redirects; the store's `ecfg_…` id                                |
   | `VERCEL_API_TOKEN`               | optional: Edge Config redirects; token that can edit the store                          |
   | `VERCEL_TEAM_ID`                 | optional: Edge Config redirects; only for team-owned stores                             |

3. **Allow the production origin in Sanity**, or Studio and live updates won't connect:
   `npx sanity cors add https://example.com --credentials` (or sanity.io/manage → API → CORS
   origins, "Allow credentials" checked). Preview deployments on other domains need their own entry.
4. **Deploy**, then open `https://example.com/studio` and sign in. Studio is part of the site, so
   there is nothing separate to deploy.
5. **Check the dataset is private:** `npm run check:dataset` (see [Dataset privacy](#dataset-privacy)). A public dataset
   exposes members-only content and form recipient addresses to anyone who knows the project ID.
6. **Check:** `/sitemap.xml` and `/robots.txt` list production URLs, and editing a page in
   Presentation updates the live site.
7. **Confirm the CMS brand:** open `/studio`. Either it carries the client's name, logo and colours
   (`studio-brand.json`, see [CMS branding](#cms-branding)), or you have decided to leave it as Currawong
   Creative's. `npm run check:studio-brand` prints what it resolves to.

8. **Run the launch check** once the real domain is attached: `npm run launch:check -- https://example.com`. See
   [Launch check](#launch-check). Fix every failure, read every warning, and hand the `launch:screens` folder to the
   designer.

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
    (site)/team/[slug]/page.tsx      a team member's profile page
    (site)/events/[slug]/page.tsx    an event's page
    api/events/[slug]/ics/route.ts   one event's calendar file (served at /events/<slug>.ics)
    api/events/feed/route.ts         every upcoming event as a calendar feed (served at /events/feed.ics)
    api/og/events/[slug]/route.tsx   an event's branded share image
    (site)/site-shell.tsx            header, <main>, footer: shared by (site)/layout and ab/[code]/layout
    (site)/site-consent.tsx          cookie banner with its text from the Cookie banner singleton
    ab/[code]/[[...slug]]/           pages prerendered per A/B option (proxy rewrites visitors here)
    api/experiments/route.ts         the running experiment as JSON, for proxy.ts
    feed.xml/route.ts                RSS 2.0 feed
    api/og/[[...slug]]/route.tsx     generated share image (PNG) for pages without one
    llms.txt/route.ts                /llms.txt for AI tools (404 when AI crawlers are off)
    (site)/search/page.tsx           /search?q= results (dynamic, no static shell)
    api/search/route.ts              JSON for the quick search dialog
    api/site-info/route.ts           template version, configured features, commit, build time (JSON, prerendered)
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
      components/                  form-view, newsletter-view (server; env check), contact-form (client), contact-form-lazy (the `next/dynamic` wrapper the views use, so only pages with a form download it), turnstile-widget
      utils/                       validate, build-email, resend, turnstile, rate-limit, client-ip, config,
                                   newsletter/ (provider modules: resend, loops, mailchimp)
    experiments/                   A/B tests: experiment schema, assignment logic, signed variant codes (flags)
      api/                         queries.ts, get-experiment.ts (running test, code -> option)
      utils/                       assign (weights, cookie), experiment-flag (flags SDK), experiment-source (proxy lookup)
    site/                          site settings singletons (siteIdentity, siteNavigation, announcement, cookieBanner, designSettings, businessInfo): header, footer, default metadata, brand colours, business details and hours
    search/                        site search: GROQ query, results page view, quick search dialog
      api/                         queries.ts (SEARCH_QUERY), search-pages.ts (cached read + snippets)
      components/                  search-view (server), search-form, quick-search (trigger), quick-search-dialog (lazy)
      utils/                       query (validate, cap, match pattern), snippet
    auth/                          members-only content: Auth.js sessions, the gate, sign-in and sign-out pages
      api/                         auth.ts (Auth.js config), get-session.ts, actions.ts (server actions)
      components/                  members-only (the gate), sign-in-prompt, sign-in-view, sign-out-view
      utils/                       allowed-members (AUTH_ALLOWED_EMAILS), providers (env), safe-path, messages
    consent/                       cookie banner, consent store (localStorage), analytics loader
      components/                  consent-banner, cookie-settings-button, analytics-scripts, analytics-dispatcher
      utils/                       analytics-dispatcher (window.trackEvent), analytics-snippets, clear-analytics-storage (the choice itself lives in src/lib/consent: consent-state, consent-store)
    pricing/                       Stripe prices: webhook sync, Checkout action, stripePrice schema
      api/                         handle-webhook.ts, write-prices.ts, checkout.ts (server action), queries.ts
      components/                  checkout-button (client form)
      utils/                       stripe-signature, map-stripe (event + price -> document), stripe-api (REST), config
    events/                        events: the event schema, event pages, calendar files
      api/                         event.ts (EVENT_QUERY, EVENTS_INDEX_QUERY, EVENTS_FEED_QUERY, metadata, sitemap)
      components/                  event-view (server)
      schemas/                     event.ts, event-category.ts
      utils/                       json-ld, to-ics, location, registration-url, slug
    draft-mode/components/         draft-mode-tools (lazy Visual Editing + exit button)
    personalization/               request-time (cookie) greeting, rendered in <Suspense> inside cached pages
    studio/                        desk structure, singletons, Presentation resolvers, content-health tool,
                                   AI settings tool, Start here tool, AI Assist presets
  components/ui/                   shared UI: sanity-image, sanity-link, cta-link, rich-text, json-ld, slider (+ slider-lazy, slider-snap)
  components/ui/overlay/           the shared overlay: useModalDialog, Overlay (modal, drawers, sheet, full screen)
  components/motion/               Motion: provider (LazyMotion), MotionDiv and friends, presets
  config/                          env.ts (validated), paths.ts (slug <-> URL), event-paths.ts (/events URLs),
                                   tokens.generated.ts (GENERATED: token values for the OG image)
  config/studio-brand/             CMS brand: currawong.ts (defaults), resolve.ts, validate.ts, client.ts, types.ts
  lib/events/                      time zones, recurrence, formatting, add-to-calendar links and .ics files (pure; shared by the Events section, event pages and Studio)
  lib/color/                       hex <-> OKLCH, WCAG contrast, lightness adjustment (shared with build-tokens)
  lib/sitemap-chunks.ts            sitemap split math (shared by pages and posts)
  lib/sanity/                      client (singleton), live, live-action, image, token, data-attribute,
                                   fragments.ts (shared GROQ), schema/ (link, cta, seo, blockContent, imageField)
  styles/tokens.json               design tokens: the one file to edit to re-skin a site
  styles/tokens.generated.css      GENERATED from tokens.json — commit it (Tailwind @theme + :root variables)
  styles/globals.css               Tailwind entry, base styles and focus ring; imports the tokens
  types/
    sanity.types.ts                GENERATED — commit it
    sanity.ts                      shared types: SanityImageData, CtaData, LinkData
studio-brand.json                  this site's CMS brand ({} = Currawong's); see CMS branding
scripts/check-studio-brand.mjs     `npm run check:studio-brand`: prints the resolved CMS brand and warnings
public/section-previews/           insert-menu thumbnails, one <typeName>.svg per section
    section-gallery/page.tsx       (in src/app) the style guide's sections view: every section type and variant, with controls
    section-gallery/tokens/page.tsx  (in src/app) the style guide's tokens view: colour, type, spacing, motion
  features/styleguide/             style guide controls, width frames and tokens panel (pure state in utils/)
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
- **Enquiries need it.** With `ENQUIRIES_STORE=1` the dataset holds visitors' names and email addresses. The server refuses to write them to a dataset it can't confirm is private ([Enquiries](#enquiries)).
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
- **Analytics hook.** `SiteShell` (`app/(site)/site-shell.tsx`) puts `data-experiment` and `data-variant` on `<main>` for pages rendered under `/ab/<code>`. The analytics dispatcher adds them to every `form_submit`, `cta_click` and `link_click` event as `experiment` and `variant` (see [Conversion events](#conversion-events)), so conversions can be split by variant in your analytics. Read them from your own script too, if you like: `document.querySelector('main').dataset.variant`.
- **Reserved slug.** `ab` joins `blog` and `studio` as a first path segment a page can't use. (`team` is reserved only _under_ itself: a page called `team` is fine, `team/anything` is not. See [Team](#team).)

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
  all posts, then all team profile pages, in that order. Past one file, `generateSitemaps` splits the sitemap into `/sitemap/0.xml`,
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
- **`/api/site-info`** adds none: it is prerendered and reads only environment variables.
- **Share images** add none: `/api/og/<slug>` reads the cached `PAGE_QUERY` and `SETTINGS_QUERY` entries that the page and layout already use.
- **Unknown URLs** (typos, bots probing `/wp-admin` or `/blog/anything`) are answered from the cached page and blog indexes at no cost.
- **Link list** adds none: its links, profile and social icons are resolved inside `PAGE_QUERY` (the social icons come from the settings entry the footer already fetched), and which links are due is decided at request time from that cached data. The page option is one more field in `PAGE_QUERY`.
- **Team** adds none to a page view: the members a Team section shows are resolved inside `PAGE_QUERY` (a `teamMember` change expires the pages, tagged `teamMember`). A profile page adds `TEAM_MEMBER_QUERY`, one per member, and `TEAM_INDEX_QUERY` (the slugs, for static params, the unknown-URL check and the sitemap) is shared by all of them, so unknown `/team/…` URLs cost nothing.
- **Events** add none to a page view: an Events section's events are resolved inside `PAGE_QUERY` (an `event` or `eventCategory` change expires the pages, tagged `event` and `eventCategory`; the business time zone comes from the same query). An event page adds `EVENT_QUERY`, one per event, and `EVENTS_INDEX_QUERY` (the slugs, for static params, the unknown-URL check and the sitemap) is shared by all of them, so unknown `/events/…` URLs cost nothing. The calendar feed adds `EVENTS_FEED_QUERY`, one cached entry for the whole site; an event's `.ics` file reads the event's own entry. Which events are upcoming is decided per request from that cached data, so no visitor causes a Sanity request.
- **Forms** add none to a page view: the `form` a section references is resolved inside `PAGE_QUERY` (without the
  recipient). A send costs one more, `FORM_QUERY` by the form's id, cached until the form changes. With
  `ENQUIRIES_STORE=1` a send also writes one document, and the first send per hour per server instance makes one
  unauthenticated query to check the dataset is private (see [Enquiries](#enquiries)); neither is read through the cache,
  and a page view still causes none.
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
   - **Filter:** `_type in ["page", "siteIdentity", "siteNavigation", "announcement", "cookieBanner", "designSettings", "businessInfo", "redirect", "sharedSection", "post", "author", "category", "teamMember", "frame", "panel", "event", "eventCategory", "form", "stripePrice", "experiment"]` · **Projection:** `{_type, "slug": slug.current}`
   - **HTTP method:** POST · **Secret:** the same value as step 1
   - Leave **Drafts** and **Versions** unchecked, so only publishes fire it
4. Redeploy. To go back to live mode, remove the env var and delete the webhook.

### Forms setup

1. **Turnstile:** in the Cloudflare dashboard → Turnstile, add a widget for your domain (and `localhost` for development). Put the site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the secret key in `TURNSTILE_SECRET_KEY`. Cloudflare's [always-passing test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) work locally.
2. **Resend:** at resend.com, verify your sending domain, create an API key (`RESEND_API_KEY`) and choose the sender (`FORMS_FROM_EMAIL`, e.g. `Test Co <forms@example.com>`; its domain must be verified).
3. Add all four to `.env.local` and to the deployment's environment variables, then redeploy (pages bake the check in at build time). `.env.example` lists them.

How a send works (`src/features/forms/api/submit-form.ts`, a server action that also handles a plain HTML POST): read the form's id from the request, **fetch the published form again** (`FORM_QUERY`, the only query that reads `recipientEmail`, tagged `form`), validate each of its fields (`utils/validate.ts`), rate-limit the IP (`x-real-ip`, else the first `x-forwarded-for` entry, so it only means something behind a proxy that sets them itself, as Vercel does), verify the Turnstile token with Cloudflare, then send through Resend's REST API (`utils/resend.ts`, no SDK). Cheap checks come first, so a mistake in a field never spends a token, a rate-limit slot or an email. Failures are logged on the server and shown to the visitor as a general message.

`FORMS_TEST_MODE=1` replaces Turnstile and Resend with mocks that accept everything and send nothing; the end-to-end tests use it (the form then carries a fixed token instead of the widget, and the server accepts only that token). It is ignored when `VERCEL_ENV` is `production`, so it can't switch the spam check off there. To change the email, edit `utils/build-email.ts`: values are HTML-escaped and a subject can't contain line breaks.

### Enquiries

Off by default. Submissions are emailed and nothing else. With `ENQUIRIES_STORE=1` each accepted submission is also
written to the dataset as an `enquiry` document, so clients can see what came in even if an email is lost. Both of these
must be true, and both are the developer's job:

1. **`ENQUIRIES_STORE=1`** in the deployment's environment variables (and `.env.local` to try it), plus a
   **`SANITY_WRITE_TOKEN`** with the Editor role (the token the Stripe webhook uses, if the site has one; `.env.example`
   lists both). Neither has a `NEXT_PUBLIC_` prefix. Pages bake in whether to collect the referrer and campaign
   (below) at build time, so redeploy after changing the flag.
2. **A private dataset** ([Dataset privacy](#dataset-privacy); `npm run check:dataset`). An enquiry holds a name, an email
   address and whatever else the form asks for, so it must never sit in a dataset anyone can read with the project ID. The
   server checks this itself: before the first write (then at most once an hour per server instance) it asks the dataset for
   something without a token. A private dataset refuses; if it answers, or the check can't tell (a network error), nothing is
   written and the server logs why. Visitors are not affected either way.

**What is stored** (`src/features/forms/utils/build-enquiry.ts`, unit tested): a weak reference to the form (so a form can
still be deleted) and its title at the time, every field as `{ label, value }` (checkboxes as _Yes_ or _No_, as in the
email), the page path, `createdAt`, `status` (`new`, `read`, `archived`) and, when present, the **attribution**: the
referrer (origin and path only; the query string and fragment are dropped, because they can carry search terms and tokens)
and the five UTM values (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`), plus the **landing page**: the
path (no query string) of the first page of the visit. Attribution is **first-touch**: a small inline script the site shell adds
once (`ATTRIBUTION_SCRIPT` in `utils/attribution.ts`, tested; inline so it adds nothing to the JavaScript budget, and only
rendered when `ENQUIRIES_STORE=1`) records those values in `sessionStorage` (key `attribution`) on the first full page load of a
visit and never overwrites them, so a visitor who clicked a campaign link, browsed on and then wrote to you is still attributed to
the campaign. Every storage access is in a `try/catch`; if storage is blocked the values last for that page load only. When a form
is sent, the script fills the hidden inputs `AttributionFields` renders in the **contact form and the newsletter form** (just before React
reads the form, so client-side navigation and hydration don't matter). The server reads only those inputs, on one line and
capped at 200 characters, because a visitor can forge anything, and keeps the landing page only if it is a path on your site.
Newsletter signups carry the same inputs but aren't stored, so nothing from them is kept. Without JavaScript there is no attribution. The page path comes from the `Referer` header.

**How a write goes** (`api/store-enquiry.ts`): after Resend has accepted the message, in Next's `after()`, so it never
delays the visitor. A failed write (no token, public or unreachable dataset, Sanity refusing) is logged with
`console.error` and never fails or changes the visitor's submission. **Nothing from a submission is ever logged**: not
the answers, not an email address, not even Sanity's error text (it can quote the document). The log line carries the form's id and an
HTTP status or error name. The document has the id `enquiry-<uuid>` and `liveEdit`, so there are no drafts: changing the
status saves at once and there is nothing to publish.

**In Studio** (_Enquiries_ in the sidebar, for clients and agency alike; hidden, like Forms, when the profile's `forms`
feature is off): a list ordered by `createdAt`, newest first, whose title carries the
count (_Enquiries (3 new)_; it updates as enquiries arrive). Every field is read-only except _Status_ (which needs the
Editor role: with `liveEdit` there is no draft for a Contributor to save). There is no
_create_ button and no _Duplicate_; _Delete_ stays, because people may ask for their details to be removed. **Download CSV**
builds the file in the browser from the signed-in editor's own read access (`studio/enquiries/csv.ts`, tested), so
nothing passes through the site's server. It has the landing page, referrer and UTM columns, then one column per answer label (forms that share a label share a column),
UTF-8 with a byte order mark so Excel reads it correctly, and times in the editor's own time zone (en-AU). Text that
starts with `=`, `@` or `+`/`-` followed by anything but digits gets a leading apostrophe, so a visitor can't plant a
spreadsheet formula (phone numbers such as `+61 400 000 000` are left alone). **Start here** shows
_N new enquiries_ with a **View enquiries** button once any enquiry exists (it adds two `count()`s to
`START_HERE_QUERY` and never fetches an enquiry). Pages never query enquiries, so they are not in `TAGS` or the
revalidation webhook filter.

**Retention** (`.github/workflows/enquiry-retention.yml`, selection logic in `scripts/enquiry-retention.mjs`, tested in
`scripts/enquiry-retention.test.mjs`): every Monday at 04:00 UTC the workflow deletes enquiries older than
`ENQUIRY_RETENTION_DAYS` (default **365**, a whole number of at least **30**: a typo of `1` can't wipe everything; anything
else fails the run). Age is `createdAt`, else the document's creation time; one with no readable date is kept.

- **Secret:** `SANITY_WRITE_TOKEN` (Editor role) in the repository's secrets. Variables: `NEXT_PUBLIC_SANITY_PROJECT_ID`,
  optionally `NEXT_PUBLIC_SANITY_DATASET` (default `production`) and `ENQUIRY_RETENTION_DAYS`, as for the
  [backup](#backups). With the secret or the project ID missing the run **skips with a notice and succeeds**.
- **Dry run:** a pull request that changes the script or the workflow runs it with `--dry-run`: it reports how many would be
  deleted and deletes nothing (pull requests from forks have no secrets, so they skip). A manual run
  (_Actions → Enquiry retention → Run workflow_) is a dry run unless you untick _Dry run_. The write token is available to
  that pull request's workflow, so only let people you trust open pull requests on a repository that holds it.
- Output is counts only, never what an enquiry says. Delete in Studio, or lower the period, to remove sooner. GitHub pauses scheduled
  workflows after 60 days without repository activity, so a quiet site should check _Actions_ now and then.
- Backups hold enquiries too (an export includes every document), and they are kept as long as the backup is. Set the backup's
  retention to match, or the policy below is not true.

#### Privacy notes (Australia)

Not legal advice; ask the client's adviser. Storing enquiries makes the site a holder of personal information, and
the Australian Privacy Principles (APPs) in the _Privacy Act 1988_ bind most organisations with annual turnover over
$3 million and some smaller ones (health service providers, businesses that trade in personal information, and others).
Many small businesses are exempt, but a privacy policy and these habits are good practice anyway, and customers expect them.

- **Collection notice (APP 5):** tell people what happens to their details at or before the moment they send them. Put it
  in the form section's **Intro** (plain text, so name the page rather than hoping for a link), for example: _"We use these
  details to reply to you, and keep your enquiry for up to 12 months. Our privacy policy at example.com.au/privacy explains
  how to see or correct it."_ It should say who you are, why you collect the details, who else may receive them (here: the
  email and hosting services below) and where to read the policy. Keep the retention wording in step with `ENQUIRY_RETENTION_DAYS`.
- **Privacy policy (APP 1):** publish one, linked from the footer, and mention enquiries: what is kept (including the page they first visited, where they came from and the campaign link they used), why, for how long,
  who can see it (the client's staff with Studio access) and how to ask for access, correction or deletion.
- **Collect only what you need (APP 3):** each field you add to a form is personal information you will hold. Don't ask
  for a phone number or date of birth you won't use. Landing page, referrer and campaign details are collected only when enquiries are stored.
- **Overseas services (APP 8):** the dataset is hosted by Sanity, the email goes through Resend, and the site runs on Vercel,
  all of which may handle the data outside Australia. The policy should say so, and the providers should be chosen with that in mind.
- **Security and destruction (APP 11):** the dataset is private and only people the client has added to the Sanity project
  can open Enquiries; remove former staff. Treat `SANITY_WRITE_TOKEN` as a secret (it can change content). Retention
  above is how enquiries are destroyed when no longer needed; delete a person's enquiry in Studio on request.
- **Access and correction (APPs 12 and 13):** someone can ask to see or correct their details. Enquiries are read-only in
  Studio because they record what was sent: answer an access request from the enquiry, and record a correction in the
  client's own system or delete the enquiry. Respond within a reasonable time (commonly 30 days).
- **If something leaks:** covered organisations must follow the Notifiable Data Breaches scheme. A leaked write token or a
  dataset made public by mistake is a candidate: revoke the token, make the dataset private and ask the adviser.

For developers: `tests/e2e/enquiries.spec.ts` runs a second server on the same build with the flag off (port 3101,
`APP_PORT_ENQUIRIES_OFF`), reads writes from the fake Content Lake's `/__fixture/mutations` and checks a send writes an
enquiry when the flag is on and nothing when it is off. The fake lake answers unauthenticated reads with 401, like a
private dataset, which is what the privacy check looks for.

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

- **Custom events:** `window.trackEvent(name, props)` and `data-track-event` / `data-track-props` on an element (`src/lib/analytics/track-script.ts`, an inline script the shell adds when a provider is configured, which hands a click to `trackEvent`). `trackEvent` is the dispatcher below. The Link list's `link_click` uses them (see [Link list](#link-list)).
- **Vercel Analytics** (`@vercel/analytics`) is always on in the public site. It sets no cookies and stores nothing on the visitor's device, so it needs no consent. It does nothing off Vercel.
- **Before consent:** no request to any provider and no provider `<script>` in the page. **Accept all** (or **Choose** with analytics ticked) mounts the `next/script` tags for each configured provider from `features/consent/components/analytics-scripts.tsx`; the choice is kept in `localStorage` (`consent`: analytics, marketing, version, time) and applies on later visits and in other tabs. **Reject all** keeps everything off and is remembered too. If storage is blocked the choice lasts until the page reloads.
- **Google Analytics:** the inline script first sets Consent Mode v2 `ad_storage`, `ad_user_data`, `ad_personalization` and `analytics_storage` to `denied`, then updates them to the visitor's choice (the three advertising signals follow _Marketing_), all before `gtag.js` is requested.
- **Withdrawing:** Cookie settings → change → save. Analytics cookies (`_ga*`, `ph_*`) and PostHog's local storage are removed, and the page reloads, because a loaded script can't be unloaded. Removal also runs on every visit by someone who has refused.
- **Marketing** is a category in the store and the banner, ready for an ad or pixel provider: read `useConsentState().consent?.marketing` in a client component and gate its `<Script>` the same way. Today it only drives the Google ad signals.
- **No provider, no banner.** `hasConsentProviders` in `src/config/analytics.ts` is false when none of the three variables is set; the banner, the footer link and the loader are then not rendered at all.
- **The banner** is a labelled region (`<section aria-labelledby>`), not a dialog: nothing is trapped and the page stays usable. It is fixed to the bottom of the viewport, so showing it never shifts content (no CLS). It sits first in the DOM and takes focus when it opens; Tab continues from there, and after a choice Tab reaches the skip link. A reopened banner returns focus to the footer link, and Escape closes it without changing the choice. Cached HTML contains the banner hidden. A small inline script reads the stored choice and reveals it before first paint when needed; React takes over its controls and focus after hydration. Saved choices keep it hidden, and no analytics provider loads before consent.
- **Bundle:** the banner and the loader are a few KB; the provider code is third-party and arrives only after consent. PostHog is loaded from its CDN (`array.js`), not bundled.
- **Your privacy policy** should name the providers you switch on, the `ab` cookie if you run A/B tests, what a choice stores, and (if enquiries are stored) that the first page of a visit, the referrer and campaign link are kept with an enquiry, using `sessionStorage` until the tab closes. This starter can't write that for you, and a banner is not legal advice.

#### Conversion events

Two events are sent for every site with a provider: **`form_submit`** (`form`: the form's title, when a send succeeds, for the contact form and the newsletter signup) and **`cta_click`** (`label` and `destination` of a button from a section's or the header's calls to action; a panel or booking button reports `panel:<id>` or `booking`). The Link list's `link_click` goes the same way.

- **One dispatcher.** `analyticsDispatcherScript` (`src/features/consent/utils/analytics-dispatcher.ts`, unit tested) is an inline script that defines `window.trackEvent`; the shell adds it with `AnalyticsDispatcher`. Client code calls `trackEvent` from `src/lib/analytics/track-event.ts` (a few lines; `ContactForm` uses it), and server markup uses `trackAttributes` (`cta_click` is a wrapper with `display: contents` around the button). Nothing here is in the page's JavaScript budget beyond that one call.
- **Nothing before consent.** On every call the dispatcher does nothing unless `window.__analyticsConsent` is `true`. `AnalyticsScripts` sets it from the consent store, the same state that mounts the provider scripts, so it is unset until the store has read the choice and `false` after **Reject all** or a withdrawal (events stop at once). It does not read `localStorage` itself, so if storage is blocked the in-memory choice still counts until the page reloads. It then calls only the providers configured by environment variable (Plausible `window.plausible`, PostHog `posthog.capture`, GA4 `gtag('event')`) that have loaded; one that throws never stops the others.
- **A/B tests.** When `<main>` has `data-experiment` and `data-variant` (a page in a running test), they are added to the event as `experiment` and `variant`.
- **In your reports.** Plausible shows an event once you add a goal of the same name (`form_submit`, `cta_click`, `link_click`) and, for the properties, a custom property; GA4 and PostHog record them straight away (GA4: mark `form_submit` as a key event to count it as a conversion).
- **Adding an event.** Call `trackEvent('name', { ... })` (strings, numbers and booleans only) or put `trackAttributes('name', {...})` on a wrapper around a link or button. Never put personal information (names, email addresses, message text) in the props.
- **Tests:** `tests/e2e/analytics-events.spec.ts` checks nothing fires before consent or after Reject all, and that `cta_click` and `form_submit` fire after Accept all. The providers' scripts are stubbed (the suite runs offline), so the test records the calls the dispatcher makes.

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

Search engines that support [IndexNow](https://www.indexnow.org) (Bing, Yandex and others) hear about a published page or blog post right away instead of waiting to crawl it. It runs from the webhook, so it needs webhook mode (above) with the projection `{_type, "slug": slug.current}`.

1. Generate a key: `openssl rand -hex 16` (8–128 letters, digits and dashes).
2. Set `INDEXNOW_KEY` to it in the deployment's environment variables and redeploy. The site then serves the key at `/<key>.txt`, which is how search engines check the site is yours. Without the variable that URL is a 404 and nothing is sent.

After each valid `page` or `post` webhook the route POSTs the document's URL to `api.indexnow.org` once the response has been sent, so a slow or failing IndexNow never delays or fails the webhook (failures are logged with `console.error`). Only pages and blog posts are sent, not other types. Nothing is sent when the site URL is localhost. A page's URL is the site URL plus its slug (`home` is the root); a post's is the site URL plus `/blog/<slug>`. The standard projection `{_type, "slug": slug.current}` already carries a post's slug.

### Structured data rules

Google requires structured data (JSON-LD) to describe content visitors can see. `tests/e2e/structured-data.spec.ts` crawls every page in the fixture sitemap and fails, naming the page and property, when it doesn't hold. The rules are pure functions in `src/lib/json-ld-visibility.ts`, unit-tested with a deliberately broken fixture.

- **Visible text:** each `name` and `headline` (organisation, person, event, place, breadcrumb, FAQ question), each part of an address, the weekly opening and closing times (compared as the page shows them, "5:30 pm") and each line of an FAQ answer must appear in the page's `document.body.innerText`. Comparison ignores case, whitespace, HTML entities and curly versus straight quotes and dashes. Answers inside a closed `<details>` count: the test opens them first, as a visitor can.
- **Not checked:** `legalName`, `description`, `areaServed`, links, dates and dated special days. Don't add structured data for something the page doesn't show; if a field is only for search engines, keep it out of the checked list on purpose.
- **`@id`s:** unique within a page. Across pages the same `@id` may repeat only with an identical definition (the Organization and WebSite are on every page); two different things sharing one would merge into a single entity.
- **WebPage:** every `WebPage` node (an Article's `mainEntityOfPage`) is `isPartOf` the site's `<origin>/#website` and names `<origin>/#organization` as its `publisher`.
- **Adding structured data:** build it from the same fields the page renders, put it in the fixtures so the spec covers it, and if it adds a new kind of visible string, teach `collectCheckableStrings` about it.

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

### Design tokens

Every colour, font, type size, space, radius, shadow and motion value the site uses is a **semantic
token**, so a client site is re-skinned by editing one file. Components never name a raw colour; they say
what a thing _is_ (`bg-surface`, `text-ink-muted`, `border-line`, `rounded-card`, `py-section`).

| File                              | Role                                                                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/tokens.json`          | **Source of truth. You edit this.** A project-owned Customize file.                                                                                                                 |
| `scripts/build-tokens.mjs`        | The dependency-free generator (`npm run tokens`). It validates `tokens.json`, then writes the two files below. `npm run typegen`, `npm run build` and `npm run dev` run it for you. |
| `src/styles/tokens.generated.css` | Generated. A Tailwind 4 `@theme` block (the utilities below) plus `:root` variables for motion. Imported by `globals.css`.                                                          |
| `src/config/tokens.generated.ts`  | Generated. Typed values needed outside CSS: `colorHex`/`colorOklch`, `ogImage` (hex, for the share image) and `motion` (durations in seconds, easings, reveal distance in px).      |

Commit the generated files. CI runs `npm run tokens` and fails if they differ from what is committed,
the same check as `src/types/sanity.types.ts`.

**Tokens and the utilities they give you**

| Group    | Tokens (`tokens.json`)                                                                                                                                      | Utilities                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `color`  | `surface`, `surface-alt`, `surface-inverse`, `ink`, `ink-muted`, `ink-inverse`, `ink-inverse-muted`, `accent`, `accent-ink`, `line`, `line-strong`, `focus` | `bg-surface`, `text-ink-muted`, `border-line`, `ring-line`, `bg-accent text-accent-ink`, `outline-focus`      |
| `color`  | status colours: `danger`, `danger-surface`, `danger-ink`, and the same three for `success` and `warning`                                                    | `border-danger bg-danger-surface text-danger-ink`                                                             |
| `color`  | Studio-settable roles (see [Colour systems](#colour-systems)): `accent-text`, `accent-2`, `accent-2-ink`, `highlight`, `highlight-ink`, `cta`, `cta-ink`    | `text-accent-text`, `bg-accent-2 text-accent-2-ink`, `bg-highlight text-highlight-ink`, `bg-cta text-cta-ink` |
| `font`   | `display` (defaults to the body font), `body`, `mono`                                                                                                       | `font-display`, `font-body`, `font-mono` (every `h1`–`h4` uses the display font)                              |
| `type`   | `display`, `h1`, `h2`, `h3`, `h4`, `lead`, `body`, `small`: a fluid `clamp()` size, line height and letter spacing each                                     | `text-display`, `text-h1`, `text-h2`, `text-lead`, `text-small`...                                            |
| `space`  | `section-y-compact`, `section-y`, `section-y-spacious`, `gutter`, `measure`, plus `measure-narrow` and `content` (widths)                                   | `py-section-compact`, `py-section`, `py-section-spacious`, `px-gutter`, `max-w-measure`, `max-w-content`      |
| `radius` | `sm`, `control` (inputs, small buttons), `card`, `panel` (banners), `button`, `pill`                                                                        | `rounded-sm`, `rounded-control`, `rounded-card`, `rounded-panel`, `rounded-button`, `rounded-pill`            |
| `shadow` | `card`, `raised`                                                                                                                                            | `shadow-card`, `shadow-raised`                                                                                |
| `motion` | `duration-fast`, `duration`, `duration-slow`, `ease-out`, `ease-in-out`, `reveal-distance`, `marquee-per-logo` (seconds per logo, optional)                 | `var(--duration)`, `var(--reveal-distance)`, `ease-out`; `motion` in `tokens.generated.ts` for JS             |

Two optional groups sit beside these: `emphasis` (heading emphasis) and `glass` (frosted rows, see
[Link list](#link-list)). A `tokens.json` without them gets the shipped values, so updating the template never
breaks `npm run tokens`.

Each colour has an `oklch` value (what the CSS uses) and a `hex` fallback, because `next/og` cannot
parse `oklch()`. The generator checks that the two agree (within 2/255 per channel), so a stale hex is an
error, not a silent mismatch. Type sizes such as `h4`, `lead`, `body` and `small` are written as
`clamp(1.25rem, 1.25rem, 1.25rem)` (the same size at every width); set the minimum and maximum apart to
make them fluid. Spacing and width tokens map to Tailwind's `--spacing-*` and `--container-*`
namespaces (`section-y` becomes `py-section`).

**Re-skinning a client site**

1. Edit `src/styles/tokens.json`: change `accent` and `accent-ink` first, then the surfaces and inks, the
   fonts (`display` can be a second family; load it with `next/font` in `src/app/layout.tsx` and
   reference its CSS variable), and the radii and spacing for a squarer or airier look.
2. Run `npm run tokens`. It prints what is wrong with the file (a missing token, a hex that does not
   match its oklch value, a type size that is not a `clamp()`).
3. Run `npm test`. The contrast test fails when a pairing drops below WCAG 2.2 AA, and tells you which.
4. Look at `/section-gallery` (see _Section gallery_ below) and refresh the visual baselines.

Need a value the tokens do not cover? Add it to `tokens.json` and to the `required*` lists at the top of
`scripts/build-tokens.mjs` (so the generator rejects a file that lacks it), rather than hard-coding it in a
component.

**Defaults.** The shipped values reproduce the earlier look: `surface` is white, `ink` and `surface-inverse` are
Tailwind's `gray-950`, `ink-muted` `gray-600`, `line` `gray-200` and `accent` the old blue. Where the old
markup used a grey step with no token of its own, it now uses the nearest one (`gray-50` and `gray-100` are both
`surface-alt`, `gray-700` and `gray-500` text is `ink-muted`, `gray-800` and `gray-900` text is `ink`,
`gray-300` borders are `line`, `gray-400` and `gray-500` borders are `line-strong`), and hover states are the
same colour at 85% (`hover:bg-surface-inverse/85`).

**Contrast test.** `src/config/tokens.test.ts` computes the WCAG contrast ratio (`src/lib/color/contrast.ts`)
over the hex values and requires 4.5:1 for `ink` on `surface`, `ink-muted` on `surface`, `ink-inverse` on
`surface-inverse` and `accent-ink` on `accent`, and for the other pairings the components use
(`ink-muted` on `surface-alt`, `ink-inverse-muted` and `accent` as text, the status colours). The `focus`
colour needs 3:1 against `surface`. When you add a pairing to a component, add it to that list.

**No raw palette classes.** `src/config/no-raw-palette.test.ts` scans `src/**/*.ts(x)` and fails on
Tailwind palette classes (`text-gray-600`, `bg-white`, `border-blue-500/50`, `bg-[#fff]`...). For a rare
exception, such as a third-party logo colour, put `palette-ok: <reason>` in a comment on the same line or
the line above.

**Older code.** `--color-brand` and `--color-brand-foreground` stay as aliases of `accent` and
`accent-ink`, so `bg-brand`, `text-brand` and `text-brand-foreground` in custom code keep working
. Move to the semantic names when you next touch the
file.

**The share image.** It can't read CSS variables. The generated share image
(`src/app/api/og/[[...slug]]/route.tsx`) takes the `accent` hex as its background and `accent-ink` hex as
its text: the Studio's Primary colour and its derived text colour when the Brand colours set one, otherwise
`ogImage` in `tokens.generated.ts` (read from the same cached settings entry as the page, so no extra
request). Changing the tokens changes it after `npm run tokens`;
the OG font file stays separate (see _Editing content_). The Studio is not tied to the tokens: it has its
own brand (see [CMS branding](#cms-branding)).

### Colour systems

Three separate things are called "colours". Pick by who changes them and what they colour:

| System                              | Where it lives                                                               | Colours                               | Change it when                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design tokens** (`tokens.json`)   | `src/styles/tokens.json`, in code                                            | The public site: the full palette     | Building or re-skinning a site: the designer's complete default palette (every role, status colours, fonts, radii).                                                        |
| **Brand colours** (Studio)          | Studio → Design → **Brand colours** (`designSettings`), agency only          | The public site: a small set of roles | The agency (or a client with agency help) adjusts the brand without a deploy: Primary, Secondary, Highlight, Light or Dark, and optionally the full palette and gradients. |
| **CMS brand** (`studio-brand.json`) | `studio-brand.json`, `src/assets/brand/` (see [CMS branding](#cms-branding)) | The Studio itself, not the site       | Making the Studio look like the client's (or Currawong's) product.                                                                                                         |

**Precedence on the public site**, lowest to highest:

1. `tokens.json`: the default. With nothing set in Brand colours the site looks exactly as this file defines it.
2. **Brand colours** override a small set of roles as `:root` CSS variables.
3. A section's **background tone** (`data-tone` remaps, see _Section style_) recolours everything inside that
   section from whatever the variables are by then, so a new Primary flows into the accent tone, and a dark
   appearance into the inverse tone.
4. Rare component overrides, in code only.

**Brand colours (Studio → Design → Brand colours).** Agency only: the item is hidden from clients in the desk
structure, which is a UI convenience, not a permission (the document can still be opened by id by anyone with
Studio access; see _Studio roles and permissions_).

- **Basic:** _Appearance_ (Light or Dark), _Primary_ (the `accent` role: buttons, the accent tone, links and
  eyebrows, the share image), _Secondary_ (a new `accent-2` role, available as `bg-accent-2 text-accent-2-ink` and
  in gradients) and _Highlight_ (optional, `bg-highlight text-highlight-ink`). Dark swaps the surface and ink pairs
  (the page goes dark, the inverse tone goes light) and sets `color-scheme: dark`.
- An empty colour shows the site's resolved default (from `tokens.json`, and following Appearance) in the swatch
  and as the placeholder, with a "Default" label; nothing is stored until a colour is picked, and **Clear** returns
  to the default. Buttons use the near-black `cta` colour until a Primary is set, while Primary's default swatch
  shows the blue `accent` used by accent sections.
- **Advanced** (collapsed): _Background_, _Alternate background_, _Inverse background_, _Text_, _Muted text_ and
  _Borders_, and **gradients**: a name, an angle and two or three colours each. Each gradient becomes a CSS variable
  `--gradient-<name>` (for example `--gradient-forest-dusk`) for headings and backgrounds to use.
- **Colour input:** a colour picker plus a hex field (stored as validated `#rrggbb`), contrast badges (AA pass or
  fail, with the ratio) for the colours it sits on, and **Suggest an accessible shade**, which moves OKLCH
  lightness (hue and chroma stay) by the smallest amount that reaches 4.5:1. A mock-up above the form redraws as you
  edit; use the Presentation tool for the real pages, which update live.
- **Derived automatically:** text on Primary (near-black or white, whichever reads better), accent-coloured text
  (`accent-text`: a darker or lighter shade of Primary when Primary alone fails 4.5:1 on the page, while buttons and
  backgrounds keep your exact colour), the button colours (`cta`, `cta-ink`), the tints and borders when only the
  background changes, and the inks after a Dark appearance or a new background. Hover shades follow the colour
  (`hover:bg-cta/85`). Colours you choose yourself are never changed; if they fail, Studio validation shows a warning
  naming the ratio.

With nothing set, no CSS is added. Otherwise `SiteShell` renders one `<style>` with `:root{...}` containing only
what differs from `tokens.json`, on the server, so there is no flash and no JavaScript. It comes from
`resolveDesignTokens` (`src/lib/color/resolve-design-tokens.ts`, pure and unit-tested), fed by the
`design` part of `SETTINGS_QUERY`, so it is one cached read like every other setting. The `designSettings` tag is in
`TAGS` and the webhook filter; drafts and Presentation update through `SanityLive`. The Studio's own colours are not
affected.

The **primary button** (`CtaLink`, the form, search and sign-in buttons) uses the `cta` colour, which is near-black
by default and becomes Primary once one is set. Use `bg-accent` where you want the accent itself.

### CMS branding

The Studio (the CMS editors log in to) has its own brand. It is deliberately separate from the public
site's design, so a client can have a bright website and a calm, readable CMS, or the other way round.
Four systems exist; only the first three live in this repo:

| System                   | Where                                                                    | Controls                                      |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------------------------- |
| Public site tokens       | `src/styles/tokens.json`                                                 | The website. Never the Studio.                |
| Client CMS brand         | `studio-brand.json` and `src/assets/brand/client/`                       | This site's Studio, when it sets anything.    |
| Currawong default        | `src/config/studio-brand/currawong.ts` and `src/assets/brand/currawong/` | The Studio's gaps, or all of it when `{}`.    |
| Ops dashboard (separate) | Currawong's Ops app, reading and writing `studio-brand.json`             | Edits a client's brand without touching code. |

`studio-brand.json` is plain JSON (not TypeScript) so the Ops dashboard can read and write it. The
Studio's colours are never derived from `tokens.json`. Nothing in the Studio imports
`tokens.generated.ts` for branding. The theme itself is built in `src/features/studio/theme.ts`; this
section covers the brand data it is built from, then [how it is applied](#how-the-studio-applies-the-brand).

**Precedence.** Client branding always wins; Currawong defaults only fill gaps.

- **Identity falls back field by field.** Logo: the client's logo; otherwise a monogram (the first
  letter of the name) in the client's primary colour, if the client set any colour; otherwise the
  Nocturne wordmark. Compact mark: the client's mark, then their logo, then the monogram, then Currawong's
  mark. Name: `name` in `studio-brand.json`, then `NEXT_PUBLIC_STUDIO_TITLE`, then "Nocturne" (Currawong's product brand).
- **Colours fall back as a whole set, never field by field.** Set any colour and the whole palette comes
  from the client: their secondary if given, otherwise one derived from their primary (same hue,
  lightness moved), with neutrals from Sanity's defaults tinted lightly toward the client's hue. A
  Currawong colour is used only when the client sets no colour at all. A lone `secondary` stands in for
  the missing primary the same way.
- **Accessibility guard.** Where a client colour is used as text, a focus ring or a selected state, its
  OKLCH lightness is adjusted (hue and chroma kept) until it reaches 4.5:1 (text) or 3:1 (non-text UI)
  against that scheme's background, in light and dark separately. Fills and logos keep the exact value.
  Every adjustment is recorded as a warning, so a client who picks `#ffd400` is told why their Studio
  links are a darker gold.

**Currawong's defaults** use the premium palette approved on 21 October 2026 (proposal §5):
light canvas `#f7f4fa`, text `#1f1a29`, surface `#fffeff`, accent `#6d47c8` and focus `#7651dc`;
dark canvas `#17151f`, text `#f6f3fa`, surface `#25212f`, accent `#c4a9f6` and focus `#d2b6ff`.
Borders are strengthened to `#8a7c9b` / `#8b7999` to reach 3:1 against both canvas and surface.
Highlight roles retain the classic amber values. `currawong.test.ts` checks every role pair in both
palettes and both schemes; the proposal's sample ratios are not used as proof.

The previous palette remains exported as **`currawongClassicBrand`** in
`src/config/studio-brand/currawong.ts`. To switch this site's default back, change just the import in
`src/config/studio-brand/client.ts` to
`import { currawongClassicBrand as currawongBrand } from './currawong.ts'`.
Client colours still replace either default as a whole set. The preview deliberately shows both palettes.

**New projects need no setup.** The template ships `studio-brand.json` with only a `$schema` line and
`src/assets/brand/client/` holding just a README, so Studio shows Currawong Creative's branding from the
first `npm run dev`. The setup wizard asks nothing about it; it sets `NEXT_PUBLIC_STUDIO_TITLE` from the
site name, which names the Studio only while `name` is unset in `studio-brand.json`.

**Brand a client's CMS.**

1. Put logo files in `src/assets/brand/client/` (SVG, PNG, WebP, JPEG or AVIF).
2. Edit `studio-brand.json` at the repo root. Every field is optional:

   ```json
   {
     "name": "Acme Plumbing",
     "logo": {
       "onLight": "src/assets/brand/client/logo.svg",
       "onDark": "src/assets/brand/client/logo-on-dark.svg",
       "mark": "src/assets/brand/client/mark.svg"
     },
     "colors": { "primary": "#1a73e8", "secondary": "#e8a317" }
   }
   ```

   Colours are six-digit hex. Logo paths must be inside `src/assets/brand/client/`. If you give only
   one of `onLight` and `onDark`, it is used for both.

   Keep the `"$schema": "./studio-brand.schema.json"` line at the top: VS Code then autocompletes and
   validates the file (`studio-brand.schema.json` describes the same fields as the check script, and
   Currawong's Ops dashboard will use it too). The line is ignored by the site and doesn't count as
   branding.

3. Run `npm run check:studio-brand`. It prints the resolved name, logos and both palettes with each
   contrast ratio, lists warnings, and fails on a bad value or a missing file. CI runs it too.

**Match the CMS to their website on purpose.** Nothing links the two, so copy the hex values from
`src/styles/tokens.json` (the `accent` token's `hex`) into `colors.primary` in `studio-brand.json`.
They stay in step only when someone changes both.

**Approved scope (21 October 2026).** Branding and typography apply to components that read the
workspace theme (UI 4). Sanity 6.19 also uses UI 5 alpha components; those retain Sanity's own styling
and CDN-hosted Inter. This exception is intentional: no CSS overrides are used to force the new
palette or fonts onto UI 5. There are no Google Fonts browser requests. See the
[API findings and download comparison](docs/studio-theme-spike.md). Client-configurable Studio fonts
remain a separate decision.

#### How the Studio applies the brand

Only supported Sanity APIs are used, in four places:

| What                      | Where                                               | Source of truth                                       |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| Theme (colours)           | `src/features/studio/theme.ts` -> `theme` in config | The resolved light and dark roles                     |
| Navbar logo               | `studio-logo.tsx`, shown by `brand-zone.tsx`        | `logo` (client), wordmark or bird, or monogram + name |
| Workspace icon (the mark) | `src/features/studio/components/studio-icon.tsx`    | `mark`, light or dark by colour scheme                |
| Workspace title           | `title` in `sanity.config.ts`                       | The resolved name                                     |

- **Theme.** `src/features/studio/theme.ts` uses the stable `buildTheme` from `@sanity/themer`
  0.10.4, with separate light/dark brand colours and public `RootTheme_v2` tokens for exact runtime
  roles. No legacy builder, internal conversion helpers or experimental Themer preview tool is used.
  The theme covers UI 4; UI 5 components keep their own styling as described above.
- **Light, dark and Appearance.** Editors choose _System_ (the default: follows the device), _Light_ or
  _Dark_ under **Appearance** in the Studio user menu. The choice is remembered in their browser.
  The theme contains both schemes without legacy scheme-lock markers. The preview at
  `/studio-brand-preview` renders both palettes and sample client brands in both schemes. Existing
  rendered contrast assertions remain at 4.5:1 for text and 3:1 for focus. Never pin a Studio scheme.
- **Controls.** Primary buttons use `accentFill` and `onAccent` directly, without legacy blend
  compensation. Neutral buttons mix the text and canvas colours. Hover and selected states use
  accent tints with readable labels. Inputs use `surface`, `text` and `surfaceBorder`; focus uses
  the scheme's independent `focus` role. Themer supplies the remaining semantic tones, including
  success, warning and danger. Badge labels are checked against their generated fill in each card
  tone and scheme; their OKLCH lightness is adjusted to 4.6:1 when needed, preserving the fill and
  the label's hue. Radius and focus-ring geometry retain the installed defaults.
- **Fonts.** The workspace theme uses Inter for interface text, labels and inputs, and Newsreader
  for display headings (including the Start here greeting and document headers where Sanity uses
  heading tokens). Code remains monospaced. `src/config/studio-fonts.ts` loads variable normal fonts
  through `next/font/google`, with the Latin subset, `display: 'swap'` and `preload: false`; only Studio and its preview
  import it. Disabling preload prevents unused Studio font hints leaking into public routes; Studio
  still loads the fonts through its CSS. Those font files are downloaded at build time and self-hosted.
  UI 5 may additionally
  load Sanity's own Inter from its CDN. `BrandedStudio` passes the resolved families through the
  theme, including compatibility font fields for document headers; the schema CLI never imports
  Next's font loader. The public site's font tokens are untouched. `studio-brand.json` has no font
  settings; client-selectable Studio fonts remain deferred.
- **Logo.** A client logo file is shown alone, the on-light or on-dark variant to match the colour scheme.
  If a client supplies only one file, it is never recoloured: on the other scheme it sits on a small
  background in the colour it was drawn for. With no logo file and no colours, the navbar shows the
  Nocturne wordmark alone (24px high, up to 178px wide), or the bird mark alone below 768px, named
  "Nocturne". With colours but no logo it shows the client's monogram beside the name. Client logos sit in a
  24px-high box up to 160px wide, so nothing shifts the navbar; the name is the accessible label. The
  logo appears in a 210px **brand zone** at the start of the Studio navbar from 900px wide (Sanity UI's
  third breakpoint, where Studio puts its tools in the top bar), as a link named "Studio home" to the
  Studio's root; narrower screens keep Sanity's own navbar. Sanity 6.19 deprecates `studio.components.logo` and
  never reads it, and the home button draws only the 25px workspace icon, so `RoleNavbar` wraps the default
  navbar with the zone instead. The zone lines up with Sanity's top row; the Version and Variant row sits
  under it, beside empty space.
- **Currawong's image files** (`src/assets/brand/currawong/`) are named `<kind>-on-<light|dark>`: `bird`
  (the bird alone, used as the mark and favicon), `wordmark` (the lettering alone, used as the logo),
  `logo-horizontal` and `logo-stacked` (bird and lettering together, not shown in the Studio).
- **Sign-in screen.** It shows the workspace icon and title, so it follows the mark and the resolved name.
  (It does not use the navbar logo.)
- **Images.** `studio-brand.json` holds paths as text, which a bundler can't follow, so
  `scripts/build-studio-brand-assets.mjs` imports every image in `src/assets/brand/` into
  `src/config/studio-brand/assets.generated.ts`. Run `npm run brand-assets` after adding or renaming a logo
  file (`npm run dev` and `npm run typegen` do it for you) and commit the result; a unit test fails when it
  is stale. Sanity's own build turns those imports into URLs, so no extra dependencies are needed.
- **No CSS overrides.** Never target Sanity UI's class names or `data-ui` attributes. A unit test scans
  `src/features/studio` for such selectors, stylesheets and global styles.

**Check it by hand** (any change to the brand or theme):

1. `npm run dev`, open `/studio` and sign in. Do this once with `studio-brand.json` as `{}` (Currawong), once
   with the sample client brand below.
2. In each, switch the Studio's appearance (user menu, Appearance: Light, Dark and System).
3. Look at: the navbar logo (right variant, no jump as it loads, name not cut off); the browser tab title;
   a primary button (Publish) and its hover; keyboard focus rings on a field and a button; a selected tool
   in the navbar; a warning and a danger state (these should still be amber and red).
4. Sign out (or open a private window) to see the sign-in screen: the mark and the name.
5. Sample client brand, with a wide on-light logo as `src/assets/brand/client/logo.svg` and no on-dark file:

   ```json
   {
     "name": "Acme Plumbing",
     "logo": { "onLight": "src/assets/brand/client/logo.svg" },
     "colors": { "primary": "#1a73e8", "secondary": "#e8a317" }
   }
   ```

   Run `npm run brand-assets`. In dark mode the logo should sit on a small light background rather than be
   recoloured. Remove the logo line to see the monogram instead.

#### Studio brand preview and its tests

Studio needs a login, so tests can't open it. `/studio-brand-preview` renders Sanity UI under the same theme
Studio gets, for four brands (Currawong default `{}`; a green and cream client with a sample logo; a partial
client with a logo and primary only; a client whose yellow primary `#FFD400` is too light for text), each in
light and dark. Per case it shows the logo, a mock navbar, buttons (default, primary, ghost, disabled), a text
input, tabs, a selected card, a badge in each tone, a dialog-style panel, and the resolved colours with any
adjustment the contrast guard made (so the yellow case visibly shows its darkened text and focus colours).

- **Not public.** It answers 404 unless `NODE_ENV` is `development` or `E2E_GALLERY=1` was set when the site was
  built (the check runs at prerender, so it is a real 404 status). `studio-brand-preview` is a reserved first slug segment
  (`STUDIO_BRAND_PREVIEW_SEGMENT` in `src/config/paths.ts`), the page is `noindex`, the sitemap lists only CMS pages, and
  `proxy.ts` leaves it out of A/B tests. Its JavaScript (Sanity UI, and `sanity` for the theme) is that route's own
  chunk: the home page budget in `tests/e2e/performance.spec.ts` is unchanged.
- **Same theme as Studio.** `buildStudioTheme` (theme.ts) gives the Studio theme. Studio turns it into what
  `@sanity/ui`'s `ThemeProvider` takes in `StudioThemeProvider` (not exported): the default `buildTheme()` from
  `@sanity/ui/theme` with the theme's `v2`, `fonts` and `color` laid over it. `src/features/studio/utils/ui-theme.ts`
  does the same. Studio then **pins one colour scheme** for a `buildLegacyTheme` theme (light unless the
  component background is darker than its text) and hides the scheme switch, so the page passes `scheme` itself to
  show both. That pinning is read from the code in `sanity` 6.18, not seen in a running Studio: confirm it in step 2 of
  "Check it by hand". If it holds, editors only ever see the light scheme and the dark cases are for brands whose
  light background is dark.
- **Tests.** `tests/e2e/studio-brand-preview.spec.ts`: axe (WCAG 2.2 AA) per case and scheme, keyboard focus drawing a
  visible ring on buttons and the input, the primary button's colour staying near the brand accent (and never
  Currawong violet `#5F2BD4` for a client), the yellow client's adjusted colours, `noindex` and the sitemap.
  `tests/e2e/studio-brand-visual.spec.ts`: one screenshot per case and scheme, desktop only, Linux only. Its name
  contains "visual", so `npm run test:e2e:update` and the **Update visual baselines** workflow refresh it with the
  section gallery's. Baselines live in `tests/e2e/studio-brand-visual.spec.ts-snapshots/`.
- **Contrast.** `studio-brand-visual.spec.ts` measures computed colours in every case and scheme (it runs on any
  system, unlike the screenshots in the same file): text on the default, primary, ghost and bleed buttons, the
  selected tool and tab, the selected card and all five badges must reach 4.5:1, and the focus ring on the primary
  button and the input must be the brand focus colour at 3:1 or more against the page. axe's `color-contrast`
  rule runs over each case as well and must find nothing. Neither has an exceptions list; if a new brand case
  fails, fix the mapping in `theme.ts` (or the brand roles), not the test.
- **Adding a case.** Add it to `brandPreviewCases` in `src/features/studio/brand-preview/cases.ts`, run the spec, add
  and refresh the baselines.

**Colour helpers.** `src/lib/color/` holds hex <-> OKLCH conversion, WCAG contrast and the lightness
adjustment. `scripts/build-tokens.mjs` uses the same conversion, so there is one implementation.

### Site profile

`site.profile.ts` at the repo root (a Customize file) declares what this site uses. Studio, the routes and
`/api/site-info` all read it, through `src/config/profile.ts` (Core: the types, defaults, validation and the
exported `siteProfile`).

```ts
export const siteProfileInput = defineSiteProfile({
  client: { name: 'Acme Plumbing', slug: 'acme-plumbing' },
  tier: 'content', // 'brochure' | 'content' | 'commerce' | 'custom' (default 'custom')
  features: { pricing: false, members: false, experiments: false, team: false },
  clientSections: ['richText', 'mediaText', 'faq'], // empty: the default list
  launch: { status: 'prelaunch', homepage: 'links', publicPages: ['privacy'] }, // left out: live
  help: { guideUrl: 'https://…', videos: { 'edit-a-page': 'https://…' }, supportEmail: 'help@…' },
})
```

- **`voice`**: the AI Assist tone summary and `do` / `dont` lists, all in Australian English (see _AI Assist_ above). Omitted in older profiles: clear, warm and practical defaults.
- **`features`**: `blog`, `forms`, `newsletter`, `pricing`, `members`, `experiments`, `search`, `businessInfo`,
  `team`, `teamProfiles`, `events` and `releases`. A feature you leave out stays **on**, except `releases`, which depends on your Sanity plan and starts **off** (see _Content releases_). A site that never edits the file otherwise behaves as the template always has.
- **`clientSections`**: the section types a client may add in the page builder (schema names such as `richText`;
  see `src/features/pages/schemas/sections/index.ts`). An unknown name fails `npm run check`. Empty or left out, the
  Studio's default list applies (see "Approved sections" under _Studio roles and permissions_). This replaces the
  old `siteProfile` document, which never existed in the schema.
- **`help`**: the client's editing guide and training videos (https links, by task name) and the support email
  address (`supportEmail`), for the Studio's help features to read. Start here shows the guide link and the address. `templateVersion` is added from `template-version.json`; the profile does not hold CMS branding
  (that is `studio-brand.json`).
- A bad profile (missing client name or slug, an unknown tier, feature or section name, a non-https link) throws
  with every problem listed, so the build, `npm run dev` and the Studio all stop with a readable message.

- **`launch`**: whether the site is open. Left out means **live**, so every existing site and the e2e fixtures are
  unchanged. See [Launch state](#launch-state) below.

**It controls visibility, not the schema.** Every document and section type stays registered, so `schema.json`,
typegen and the generators don't change, and content already in the dataset is never deleted. What a disabled
feature does:

| Feature                      | When off                                                                                                                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blog`                       | `/blog`, `/blog/<slug>`, `/blog/category/<slug>` and `/feed.xml` answer 404; posts leave the sitemap, `robots.txt` sitemap count and `llms.txt`; Blog leaves the desk and _New document_                                                                                           |
| `search`                     | `/search` and `/api/search` answer 404; the header's search button is not rendered                                                                                                                                                                                                 |
| `members`                    | `/sign-in`, `/sign-out` and `/api/auth/*` answer 404                                                                                                                                                                                                                               |
| `pricing`                    | The checkout action refuses ("Checkout isn't available right now"); Stripe prices leave the desk and _New document_                                                                                                                                                                |
| `forms`                      | Forms leave the desk and _New document_ (the form section and submissions are untouched)                                                                                                                                                                                           |
| `experiments`                | A/B tests leave the desk and _New document_ (a running test still serves; end it first)                                                                                                                                                                                            |
| `team`                       | Profile pages go too (as `teamProfiles` off, below); Team leaves the desk and _New document_. A Team section already on a page keeps showing its cards (remove it from the page)                                                                                                   |
| `teamProfiles`               | Members have no pages: `/team/<slug>` answers 404, profile pages leave the sitemap, cards stop linking, and the profile fields (page address, full bio, qualifications, contact details) leave the Studio form                                                                     |
| `events`                     | `/events/<slug>`, `/events/<slug>.ics` and `/events/feed.ics` answer 404; event pages leave the sitemap; Events leaves the desk, _New document_ and Start here. An Events section already on a page keeps drawing its list, without links to event pages (remove it from the page) |
| `releases`                   | Studio's Releases tool, scheduled drafts and the release options in the version menu go. Variants (A/B tests) keep working. See _Content releases_                                                                                                                                 |
| `newsletter`, `businessInfo` | Recorded in the profile and reported by `/api/site-info`; nothing is hidden yet                                                                                                                                                                                                    |

Read it in code with `isFeatureEnabled('blog')` from `src/config/profile.ts` (shared code, so features may
import it). Page-builder sections that depend on a disabled feature (a form, pricing table or newsletter section)
are not hidden: remove them from the page, or leave them out of `clientSections`.

`GET /api/site-info` adds `tier` and `enabled` (the profile's switches); its `features` still reports whether each
feature's environment is configured. The two are different questions: a feature can be on in the profile and not
yet configured.

Tests: `src/config/profile.test.ts` (validation and defaults), `src/features/studio/utils/feature-visibility.test.ts`
(what the Studio hides) and `site-profile-sections.test.ts` (the real profile against the real section list).
The end-to-end fixtures run with everything on.

#### Launch state

A site is **pre-launch** (a temporary page at `/`, everything else private) or **live**. This block only _declares_
the state and the helpers read it; the proxy that enforces it, the preview for the team and the launch checks are
written in [Pre-launch and launch](#pre-launch-and-launch).

```ts
launch: {
  status: 'prelaunch', // 'prelaunch' | 'live'
  homepage: 'links', // the slug shown at "/" before launch (default 'links')
  publicPages: ['privacy'], // other slugs visitors may open before launch (default none)
  unknownPaths: 'not-found', // or 'homepage': a 307 to the temporary page (default 'not-found')
},
```

- **Defaults.** Leave the block out and the site is live. Inside it, only `status` is required. `unknownPaths: 'homepage'`
  suits a business replacing an old site: a visitor following an old link lands on the temporary page, not a 404.
- **Validation** (`validateSiteProfile`, so the build, `npm run dev` and Studio stop with a readable message): `status` and
  `unknownPaths` must be one of their values; `homepage` and every `publicPages` entry must be a page slug (lowercase
  letters, numbers and hyphens, `/` only between parts, the pattern the page schema uses); `homepage` cannot be `home`
  (that is the real home page, which stays private until launch; the same goes for `publicPages`); none can start with
  a segment the site uses (`blog`, `api`, `studio`, `prelaunch-view` and so on, from `src/config/reserved-slug.ts`);
  `publicPages` cannot list a slug twice. A `publicPages` entry that repeats the `homepage` is allowed and ignored. A
  `homepage` that is not published yet is allowed too: the gate answers 404 until it is, and `launch:check --prelaunch` fails until it is published.
- **Reading it.** `getLaunchState()` in `src/config/launch.ts` (shared code, so Studio can show it) returns `status`,
  `homepage`, `publicPages`, `unknownPaths` and `visibleSlugs` (`[homepage, ...publicPages]`, no repeats).
  `isPublicBeforeLaunch(pathname, state)` says whether a page path may be opened: live, always; pre-launch, `/` and the
  `visibleSlugs`, matched whole (`/links` and `/links/` yes; `/links/more`, `/LINKS` and `//links` no, because it fails
  closed). Routes that are not pages (`/api`, `/studio`, `/_next`) are the proxy's to classify.
- **Why it is in code, not Studio.** On Sanity Growth every Editor can write any document, and hiding a field in the
  Studio is not a permission. A switch in a document could be flipped by anyone who can edit it. In `site.profile.ts`,
  changing the launch state is a reviewed commit and a deployment, and nothing in Sanity can change it.
- **`SITE_LAUNCH_OVERRIDE=prelaunch`** turns a live profile into pre-launch without a commit: the second e2e server uses
  it to test the gate, and it is the "hide the site now" lever in an emergency. It can **only hide**. Any other value,
  including `live`, is ignored with a console warning, because an environment variable is set outside code review and
  must never reveal a site the profile says is private. To open the site, change `status` in `site.profile.ts`.
- **Caching rule.** Nothing cached may read the launch state: no page, query, feed or `'use cache'` function branches on
  it. Pages render the same either way and the proxy decides what to serve; a cached read of it would bake one state
  into the cache and show it in the other. The same rule is in the comment on `getLaunchState`.
- **`/api/site-info`** adds `launch: { status, homepage }` and nothing else about it. It is prerendered, so it reports
  the build's profile, not the runtime override.
- **Reserved.** `prelaunch-view` (`PRELAUNCH_VIEW_PATH` in `src/config/paths.ts`) can't be a page slug: the team's
  preview of the real site will live there.

Tests: `src/config/launch.test.ts` (defaults, the override, `visibleSlugs`, `isPublicBeforeLaunch`),
`src/config/profile.test.ts` (validation messages), `src/config/reserved-slug.test.ts` and `tests/e2e/site-info.spec.ts`
(`launch.status` is `live` for the fixtures).

### Pre-launch and launch

While the profile says `launch.status: 'prelaunch'` (see [Launch state](#launch-state)), `src/proxy.ts` runs a gate
**before anything else** (before the style guide, Edge Config redirects and A/B tests). Live, the gate returns
immediately and nothing changes: a live site behaves exactly as it always has.

**Checking it.** `npm run launch:check -- <url> --prelaunch` proves the gate holds on a deployed site (day one), and the default mode proves the launch worked (on the launch PR's preview with `--bypass`, then after merging). See [Launch check](#launch-check).

**What the gate does.** For each page request it picks one answer (`decidePrelaunch`, `src/lib/prelaunch-gate.ts`):

| Request                                            | Answer                                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                | The `homepage` page (default `links`), served under `/` by a rewrite to `/prelaunch-view/<homepage>`                                                                      |
| A path in `publicPages`                            | That page, by a rewrite to `/prelaunch-view/<slug>`                                                                                                                       |
| `/prelaunch-view/…` typed directly                 | 404                                                                                                                                                                       |
| Anything else                                      | 404 (a rewrite to the bare view's not-found page, so the status is real), or with `unknownPaths: 'homepage'` a 307 to `/` for page paths (never for files such as `.ics`) |
| A valid preview pass (task 118; never, until then) | Passes through untouched                                                                                                                                                  |

Every gated response carries `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`. The address stays
what the visitor typed. Matching is exact and fails closed: `/links` and `/links/` are one page; `/links/more`, `/Links`
and `//links` are not public. The presence of a `__prerender_bypass` cookie proves nothing (anyone can set one), so it
never lets a request through. A/B tests are skipped before launch, and the style guide keeps its own token rule.

**The bare view.** Pre-launch pages render in `src/app/(prelaunch)/prelaunch-view/`, through the same `PageView` and render
props as the main route (`src/app/page-render-props.tsx`), in a layout that calls `SiteShell` with `chrome={false}`:
**no announcement bar, header, menu or footer in the HTML** (the Link page's _Minimal page_ option only hides them with
CSS, which is not enough here, because their links would still be in the source). Fonts, design colours, consent,
analytics, the track script, structured data and the motion provider all stay. The page's metadata is the real page's, so
its canonical is `/links`, never `/prelaunch-view/…` or `/`; it is marked `noindex`. `generateStaticParams` lists the
profile's `visibleSlugs` (never empty), and any other slug answers 404 from the page itself too (a second lock, in case the
proxy were skipped). The 404 page shows the site name, "This page isn’t open yet" and a link to `/`, with no navigation.

**Listing public pages.** In `site.profile.ts`: `launch: { status: 'prelaunch', homepage: 'links', publicPages: ['privacy'] }`.
Each slug is an exact page path. A page that is not published yet answers 404 until it is (`launch:check --prelaunch` fails until it is). A
page under a public page (`/privacy/policy`) is not public unless it is listed. Open the site by changing `status` to
`'live'`, in a reviewed commit, and deploying.

**Redirects wait for launch.** The gate runs before Studio's redirects (Edge Config and the page route's fallback), so a
published redirect from an old address answers 404 before launch, even one that points at a public page. Use
`unknownPaths: 'homepage'` to send old addresses to the temporary page instead.

**Caching rule.** Nothing cached may depend on the launch state. Pages, queries and feeds render the same either way;
the proxy decides what to serve. That is what keeps it safe: on Vercel, Routing Middleware runs _before_ the CDN cache,
so a gated request never reaches a cached page, and a cached page never has to know the site is pre-launch. A page that
branched on the launch state would bake one state into the cache and serve it in the other. The one place that reads it
is `generateStaticParams` and the slug check in the bare view, which only decide which slugs exist.

**Not supported: Cloudflare proxying (the orange cloud) in front of Vercel.** The gate relies on Vercel's routing
running first and on `Cache-Control: private, no-store` being honoured. A second CDN in front caches by its own rules and
can serve a gated answer to the wrong visitor, or the live page after launch. Use DNS only (grey cloud) to Vercel.

**Server actions.** A form on the temporary page posts to the address the visitor sees (`/`). The rewrite carries that
request, including the `Next-Action` header, to the bare view, which holds the same actions, so the newsletter signup on
`/` works (`tests/e2e/prelaunch-gate.spec.ts` submits it). Without JavaScript, a Link page with request-time parts (dated
links, the launch date) answers the signup with Next's data only, live or pre-launch; that test is marked `fixme`. Note that the proxy is not an
authorisation layer for Server Functions: they check their own inputs.

**Private access before launch.** Three ways to see the whole site while the gate is on:

1. **Presentation (the agency and editors).** Opening a page in Studio's Presentation tool turns on draft mode through
   `/api/draft-mode/enable`. That route also sets the signed **preview pass** (cookie `site_preview`: HttpOnly,
   SameSite=Lax, Secure on https, 8 hours) when the site is pre-launch. The gate lets a request with a valid pass through
   untouched, with `noindex` and `Cache-Control: private, no-store`. **Draft mode alone opens nothing**: anyone can set a
   cookie called `__prerender_bypass`, so only the signed pass counts. Exit preview (`/api/draft-mode/disable`) clears both.
2. **The client preview link.** Set `PRELAUNCH_PREVIEW_TOKEN` (16+ characters) and send the client
   `https://their-domain.com.au/api/preview-access?token=<token>`. It sets the pass and goes to `/`. A missing, wrong or
   unset token, an unset `PREVIEW_ACCESS_SECRET` and too many tries (ten per address per ten minutes, per server instance)
   all answer a plain 404, so the route doesn't confirm it exists. `/api/preview-access/exit` clears the pass.
3. **Vercel preview deployments.** A preview deployment is its own URL, so it can show the unfinished site without
   touching the real domain. Turn on Standard Protection (or Shareable Links) for it in Vercel's project settings. This is
   Vercel's access control, separate from the pass above.

The link is a **convenience, not a staging environment**: it shows the real site, with the real content, on the real
domain, to anyone holding the link. Treat the URL like a password. **To revoke it**, change `PRELAUNCH_PREVIEW_TOKEN`
(stops new links) and, to end passes already issued, change `PREVIEW_ACCESS_SECRET`; then redeploy, because both are read from the
environment. A pass is never valid after the secret changes, and it expires by itself after 8 hours. Without
`PREVIEW_ACCESS_SECRET` no pass is ever valid: the gate stays closed, and Presentation still works for pages the gate
already shows (the console says so once).

- **What the pass is.** `v1.<expiry>.<HMAC-SHA256 of that, keyed by PREVIEW_ACCESS_SECRET>`
  (`src/lib/preview-pass.ts`). It holds no user data. It's verified in constant time, a 60-second clock skew is allowed,
  and a malformed, expired, unsigned or differently signed value is refused. Neither secret has a `NEXT_PUBLIC_` prefix, is
  imported by Studio or is ever logged.
- **On a live site** the pass is ignored (the gate isn't running) and `/api/draft-mode/enable` doesn't issue one.
- **Presentation in Studio** is same-origin (`/studio`), so SameSite=Lax cookies are sent.
- **The cache.** A passed request is marked `private, no-store` by the proxy. On Vercel, Routing Middleware runs before the
  CDN cache, so the decision is made on every request. Whether Next.js keeps that header on a prerendered page in a
  production build is checked by `tests/e2e/prelaunch-gate.spec.ts`; if a future Next.js changes it, that test fails.
  Check the real deployment's headers with `curl -I` before relying on it.
- **No "Previewing before launch · Exit" notice.** It was optional and would need either a cookie read on public pages
  (a request-time read on every page of a live site, or a Suspense island that depends on the launch state, which would
  break the caching rule above because the override can hide a site that was built live) or JavaScript on every page. Pass
  holders can exit with `/api/preview-access/exit` or Studio's Exit preview.
- **Open redirect fixed.** `/api/draft-mode/disable?redirect=` now goes through `safePath`, which also refuses
  `/\evil.example` and `/<tab>/evil.example` (audit finding S-1).

**Route inventory.** `src/app/route-inventory.test.ts` lists every `page.tsx`, `route.ts`, `robots.ts` and `sitemap.ts`
under `src/app` and fails unless each has a classification and a reason:

| Classification         | Meaning                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public-before-launch` | Visitors may open it. Only the bare view.                                                                                                                                                  |
| `gated-by-proxy`       | The proxy answers 404 before launch: the CMS pages, blog, events, team, search page, sign-in, A/B.                                                                                         |
| `prelaunch-aware`      | Machine-readable files that list or serve unfinished content: sitemap, robots, feeds, `llms.txt`, search API, share images, event files. The proxy answers them before launch (see below). |
| `infrastructure`       | Not a visitor's page: Studio, webhooks, auth, draft mode, Ops endpoints, the style guide.                                                                                                  |

Add a new page or route and the test fails until it has a line.

**Machine-readable files.** The sitemap, robots, feeds, search, share images and calendar files list or serve every
published page, post, team member and event, so a page gate alone would still leak unfinished content. The normal routes
are unchanged (so nothing cached depends on the launch state); before launch the proxy answers these paths itself. The
proxy matcher (`config.matcher` in `src/proxy.ts`, which Next.js needs as literals) lists them beside the page pattern;
live, the proxy lets them straight through (no redirect or A/B rule applies), and a test checks every path below is
covered.

| Path                                                      | Before launch                                                                                                                                                                                | Live (and with a preview pass)                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `/sitemap.xml`, `/sitemap/0.xml`                          | One file: the public pages that are published and not "Hide from search engines", at their real paths (`/links`, never `/`). Empty but valid if none qualifies (a noindex Coming soon page). | Every page, post, team member and event, in chunks of 45,000 |
| `/sitemap/1.xml` and up                                   | 404                                                                                                                                                                                          | The next chunk                                               |
| `/robots.txt`                                             | Today's rules (Studio and `/api/` disallowed, the AI-crawler setting from Site settings), pointing at `/sitemap.xml`                                                                         | The normal file (`robots.ts`)                                |
| `/llms.txt`                                               | The site name, description and the public pages only; 404 if AI crawlers are off                                                                                                             | Pages and posts                                              |
| `/feed.xml`                                               | 404                                                                                                                                                                                          | The RSS feed                                                 |
| `/api/search`                                             | 404                                                                                                                                                                                          | Quick search results                                         |
| `/api/og/<slug>`                                          | The share image for a public page; 404 for every other slug, `/api/og` and event images                                                                                                      | Every share image                                            |
| `/api/events/*`, `/events/<slug>.ics`, `/events/feed.ics` | 404 (the `.ics` paths are page paths to the proxy, which answers 404; files never get the `unknownPaths` redirect)                                                                           | Calendar files                                               |

The three rewritten files are served by `src/app/(prelaunch)/prelaunch-view/FILES/{sitemap.xml,robots.txt,llms.txt}`,
built from the cached page index (no extra request) by `src/lib/prelaunch-files.ts`. The folder is `FILES`, in capitals,
because no page slug can be (and a folder starting with `_` would not be a route at all). A homepage that isn't published,
or is marked "Hide from search engines", is simply left out. A visitor with a valid preview pass gets the normal files.
All of them are `prelaunch-aware` in the route inventory.

**Structured data.** Pre-launch pages carry only the site-level Organization or LocalBusiness and WebSite data from the
shell. The bare view draws no breadcrumbs (`PageView breadcrumbs={false}`), because the trail and its markup would name
parent pages that are private. Content-level markup, such as a FAQ section's, is the page's own content and stays.

**Tests.** Vitest: `src/lib/prelaunch-gate.test.ts` (every decision, including the files), `src/lib/prelaunch-files.test.ts` (the sitemap, robots and llms builders), `src/proxy.test.ts` (the matcher covers every file) and `src/app/route-inventory.test.ts`.
`tests/e2e/prelaunch-gate.spec.ts` runs a third server from the same build with `SITE_LAUNCH_OVERRIDE=prelaunch` (a copy
of `.next` in `node_modules/.cache/e2e-prelaunch`, port 3102): `/` serves the Link page fixture with status 200 and the
canonical `/links`; `/about`, `/blog` and others answer 404 with `noindex` and no header, footer or menu in the raw HTML;
`/links` opens; the bare view can't be opened by address; a made-up cookie opens nothing; axe on `/` and on the 404; the
newsletter signup submits; and the main (live) server is unaffected. Run `rm -rf .next` after changing fixtures.

### Launch & visibility (Studio)

**Website settings → Launch & visibility** is a read-only screen: no fields, no document and nothing stored. It shows what
visitors get today and, for agency staff, what is left before launch. The state itself is `launch` in `site.profile.ts`
(see [Launch state](#launch-state)), read through `getLaunchState()`, which is bundled with the Studio and holds no secret.
Changing it is a reviewed commit and a deployment, so a field here (which anyone who can edit documents could flip) would
be the wrong place. It uses Sanity UI components and tones only, so the CMS brand and Studio dark mode apply.

**Agency view**

- **Status in words:** "Pre-launch: visitors see Links at /" or "Live".
- **Pages visitors can open:** each page in `visibleSlugs`, with **Open** (the public address) and **Edit**; a slug with no
  published page says "not published yet".
- **Open the temporary page** (the public address of `/`) and **Preview the full site** (Presentation at `/`; draft mode
  also issues the [preview pass](#pre-launch-and-launch), so the gate lets it through).
- **Before launch**, a checklist worked out from published content (a draft doesn't count), each with a **Fix it** button:
  the home page is published; the temporary page is published and has a share image and a description (the site defaults
  count); the header and footer menus are published and none links to an unpublished page (the same detector Start here
  uses); the browser icon is the client's, not the default; Business info has a phone or email; Business info has social
  links; and, as a **reminder** rather than a failure, the temporary page still has the coming-soon note ("Our new website
  is on its way", "Coming soon", "Replace:"). It updates live as content is published.
- **How to launch:** three plain steps (finish the checklist and preview; open a pull request that sets `launch.status` to
  `'live'` and run `launch:check` with `--bypass --expect-origin` on its preview; merge and run it on the real domain) and a
  link to this README section.
- Once live, the screen says **Live** and shows nothing to do.

**Client view** (editors): one sentence, "Your website is in pre-launch. Visitors see your Link page at example.com.au.
Currawong will launch the full site." (or "Your website is live."), and an **Edit your links** button to the page that uses
the Link list. Domains are not shown beyond the site address; they are managed by Currawong. The screen is in the client's
Website settings allow-list (`CLIENT_WEBSITE_SETTINGS_IDS`).

**It reports the profile the Studio was built with.** `SITE_LAUNCH_OVERRIDE` is a server environment variable and does not
reach the Studio bundle, so an emergency override shows as "Live" here until the profile changes.

**Where it lives.** `src/features/studio/launch/`: `utils/launch-checklist.ts` (the checklist, the public pages, the Link
page finder), `utils/launch-wording.ts` (every sentence), `utils/launch-view.ts` (the view model for each audience),
`api/launch-query.ts` (one `raw`-perspective query plus a listener filter) and `components/` (the pane and the
presentational `LaunchScreen`). The brand preview (`/studio-brand-preview`) shows the screen's static parts, agency and
client, in light and dark, so axe and screenshots cover them. Tests: `launch-checklist.test.ts`, `launch-wording.test.ts`
and `launch-view.test.ts`.

### Start here (Studio home screen)

A Studio tool (`src/features/studio/start-here/`, registered in `sanity.config.ts` as `startHere()`). Clients land on
it; agency staff find it in the toolbar with the other tools (`filterTools` puts it, then Presentation, first for
clients). It is read-only and makes one content query (`START_HERE_QUERY`, raw perspective, so drafts count), one
history request for the author names, and, only when notices are set up, one call to the site's own route.

- **Greeting:** the first word of the person's Sanity name ("Hello, Ben"; just "Hello" if the name is blank or an email
  address) and the site name from `site.profile.ts` (`client.name`).
- **Before launch** a banner under the greeting says what visitors get (the client sentence above); agency staff also get a **Launch & visibility** button. **Your links** is a card for the page that uses the Link list: first for clients, after _Edit your website_ for agency staff, and absent when no page has one.
- **Shortcut cards** (bordered, with an icon and a chevron; the first, _Edit your website_, is the primary card; icons are mapped by action id in `start-here-tool.tsx`), built from the site profile by `buildQuickActions`: _Edit your website_ (Presentation at `/`),
  _Write a blog post_ (opens a new post; needs `features.blog`), _Update the team_ (needs `features.team` **and** a
  `teamMember` document type, which the template does not have yet, so the card stays hidden until a project adds
  one), _Business info and opening hours_ (needs `features.businessInfo`) and _Help_ (scrolls to the Help panel).
- **Recent changes:** the newest eight documents the person can see, newest first, with the author ("by Ann Lee", or
  "by you") and when ("2 days ago", then a date from about two months). A draft and its published copy count once and
  show a _Draft_ badge. Clients only see the types in their sidebar (pages, posts, authors, categories, Identity &
  search, Navigation, Announcement bar, Business info, team); agency staff see every type the profile has not hidden.
  Names come from Sanity's history API; if it fails the time still shows.
- **Enquiries:** once any enquiry exists (the site stores form submissions; see [Enquiries](#enquiries)), a card with the number of new ones and a _View enquiries_ button. It comes from two counts in the one content query.
- **Things to check:** at most five, in this order: pages or menus that link to a page that is not published, pages with
  images that have no description (alt text), and drafts last edited more than seven days ago. They reuse the detectors
  in `content-health/utils/detect.ts`; fixing the problem in a draft clears it. Shared sections are only checked for
  agency staff, because clients cannot open them. Each row has a **Fix it** link.
- **Help tab:** the guide link (`help.guideUrl`) and _Ask Currawong_ with the support address (`help.supportEmail`) as
  selectable text and a **Copy email address** button. Each part is left out when the profile does not set it. The
  support form replaces the address in a later release. With neither set, Help names the studio from the CMS brand and asks editors to include the page name and a screenshot. `supportRoute` (`start-here/utils/support.ts`) picks the one place errors and dialogs link: the address, else the guide, else this Help section. Under them is this site's **editor guide** (next section).
  The **Help** shortcut card opens this tab.
- **Tabs:** Start here has two, **Overview** (shortcuts, recent changes, things to check) and **Help**.
- **Notices:** set `OPS_NOTICES_URL` (an https endpoint) and, if it needs one, `OPS_NOTICES_KEY`. The site's
  `/api/ops-notices` route asks `OPS_NOTICES_URL?site=<client.slug>` with `Authorization: Bearer <key>`, caches the answer
  for five minutes and passes on up to five notices; the key never reaches the browser. The endpoint answers
  `{ "notices": [{ "id", "title", "body", "tone": "info" | "caution" | "critical", "url" }] }` (only `title` is required;
  `url` must be https; everything is shown as plain text). With `OPS_NOTICES_URL` unset the route answers 204 and the
  panel is skipped; if the dashboard is down the panel is skipped too. **The route is public** (anyone can request it), so write
  notices as you would a public announcement and never put anything private in one.
- **Layout:** `@sanity/ui` with responsive padding; the cards wrap from three across to one column on a phone.

**Check it by hand (client account).** Use a throwaway project member with the **Editor** role (or, as an Administrator,
click **Preview client view**), and make sure the project has a few pages, one draft left alone for over a week (or
temporarily lower `STALE_DRAFT_DAYS` in `utils/relative-time.ts`), a page whose image has no alt text, and a link to a
draft-only page.

1. Open `/studio`. It opens on **Start here**, with Presentation next and no Vision, AI settings or Content health.
2. The greeting uses your first name and the card line names the site.
3. Click **Edit your website**: it opens Presentation on the home page. Go back and click **Write a blog post**: a new
   post opens. Click **Business info and opening hours**: the Business info document opens.
4. Switch `features.blog` to `false` in `site.profile.ts` and reload: the blog card disappears.
5. Recent changes lists the documents you just edited, newest first, with "by you" and a time such as "2 minutes ago".
   Edit a page and reload to see it jump to the top with a _Draft_ badge.
6. Things to check lists the missing description, the unpublished link and the old draft in plain words, and **Fix it**
   opens the right document. Fix one, reload, and it disappears.
7. Help: open the **Help** tab (or click the **Help** card). **Copy email address** copies the address (paste it somewhere to confirm) and says "Copied to your clipboard."
   The guide link opens in a new tab. Press Tab: every card, link and button shows a focus ring.
8. Narrow the window to phone width: no sideways scrolling, and the cards stack in one column.
9. Optional: point `OPS_NOTICES_URL` at a test endpoint that answers `{"notices":[{"title":"Test","tone":"caution"}]}`
   and the notice appears at the top. Unset it and it disappears with no error.

Tests: `start-here/utils/*.test.ts` (relative time, wording, shortcut list from a profile, recent changes, things to check,
history parsing), `src/lib/ops/notices.test.ts` (notice parsing and the endpoint check) and
`tests/e2e/ops-notices.spec.ts` (the route answers 204 when unset). The tool itself needs a signed-in Studio, so it
is checked by hand.

#### Editor guide (Help tab)

The Help tab shows short, plain-English task guides and a description of each section a client may add, and only
what **this site** uses. It is built from files, not written per client.

- **The guides** are markdown files in `docs/editor-guide/`, written once in the template: _Change a heading_, _Replace a photo_,
  _Publish and undo_, _Write a blog post_, _Update opening hours_, _Add a team member_ and _Change your logo or browser icon_. Each starts with frontmatter
  (`title`, `summary`, `order`, and optionally `feature` and `requires`). A guide with `feature: blog` appears only when
  `features.blog` is on, and `requires: post` also needs that document type in `schema.json`, so a client site that removes a type loses its guide.
  Write them in Australian English, in short steps, and use only headings, paragraphs, lists, **bold** and `[links](https://…)`:
  nothing else is rendered.
- **The sections** come from `clientSections` in `site.profile.ts` (the default list when it is empty). For each, the guide lists the
  fields a client edits, with the field's description, its **recommended picture size** (the sentence `imageField` adds, such as
  "1600 × 1200 px, landscape") and its **length guidance** (the `max`/`min` limits in the field's validation, such as "Up to 60 characters"
  or "Up to 2 items"). Agency-only fields (the Design tab and anything hidden from clients) are left out, and so is any field
  `schema.json` does not store. `schema.json` holds only the shape of the data, so titles, descriptions and limits are read from the
  section schemas themselves.
- **Videos** are not baked in. Add `help.videos` to `site.profile.ts`, keyed by the guide's file name without `.md`:

  ```ts
  help: { videos: { 'change-a-heading': 'https://…', 'publish-and-undo': 'https://…' } },
  ```

  A guide with a video shows **Watch the video (new tab)**; one without shows nothing. Each guide file has a comment
  marking where its video belongs.

- **Generating it:** `scripts/build-editor-guide.mjs` writes `src/features/studio/start-here/editor-guide.generated.json` (committed).
  `npm run typegen` runs it straight after `sanity schema extract`, and `npm run editor-guide` runs it alone
  (`-- --check` reports whether the file is current without writing). CI runs typegen and fails when the committed file differs, so after
  changing a guide, `site.profile.ts`, or a section's fields or descriptions, run `npm run typegen` and commit the result.
- **Showing it:** `start-here/components/editor-guide.tsx` lists each guide and section in an expandable row (native `details`, so
  it works by keyboard), and `markdown.tsx` renders the guide text from the small parser in `utils/markdown.ts`. Links must be
  `https://`; anything else shows as plain text. No markup is ever injected.

To add a guide, add a file to `docs/editor-guide/` and run `npm run typegen`. For a client site, edit `site.profile.ts` and run it again.

Tests: `scripts/editor-guide-utils.test.mjs` (frontmatter, image advice, limits, feature filtering, section fields),
`start-here/utils/markdown.test.ts` and `editor-guide.test.ts`. The tab itself needs a signed-in Studio, so check it by hand:
open **Start here → Help**, expand a guide and a section, switch `features.blog` to `false`, run `npm run typegen`, reload,
and confirm the blog guide is gone.

### Studio roles and permissions

The Studio shows a simple view to clients and the full view to Currawong staff. It reads each person's
Sanity project roles; the logic is in `src/lib/sanity/roles.ts` (re-exported from
`src/features/studio/roles.ts`) and is unit tested.

**Who is who.** _Agency_ is anyone with the **Administrator** or **Developer** role. Everyone else is a
_client editor_: **Editor** (can publish) or **Contributor** (drafts only; Viewers and custom roles get the
client view too). **Clients must hold Editor or Contributor on a Growth plan, never Administrator.** An
Administrator sees the agency view, can manage members, tokens, CORS and datasets, and can delete the project.

**Two kinds of limit.** Sanity's roles are enforced by Sanity's servers; hiding things in the Studio is a
convenience. Someone with the Editor role who knows the API can still do what the Studio hides.

| What                                                                                                            | Agency (Administrator, Developer) | Editor                                                                                                                                                         | Contributor         | Enforced by                                    |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------- |
| Publish, unpublish                                                                                              | Yes                               | Yes                                                                                                                                                            | No (drafts only)    | **Sanity** (the Studio also hides the buttons) |
| Project settings, members, API tokens, CORS, datasets                                                           | Administrator only                | No                                                                                                                                                             | No                  | **Sanity**                                     |
| Edit, create and delete content through the API or Vision                                                       | Yes                               | Yes (any document)                                                                                                                                             | Drafts only         | **Sanity**                                     |
| Studio tools                                                                                                    | All                               | Start here (first), Presentation, Structure                                                                                                                    | Same as Editor      | Studio                                         |
| Vision, AI settings, Content health                                                                             | Yes                               | Hidden                                                                                                                                                         | Hidden              | Studio                                         |
| Sidebar                                                                                                         | Everything                        | Pages, Blog, Reusable content (Panels only), Website settings (Name, logo & icon, Navigation, Announcement bar); Team and Business info when the site has them | Same as Editor      | Studio                                         |
| Redirects, A/B tests, Stripe prices, Forms (recipient addresses), Shared sections                               | Yes                               | Hidden                                                                                                                                                         | Hidden              | Studio                                         |
| Enquiries (read; status, Download CSV, delete)                                                                  | Yes                               | Yes                                                                                                                                                            | Read only           | Studio                                         |
| Cookie banner, and _Allow AI crawlers_ in Name, logo & icon                                                     | Yes                               | Hidden                                                                                                                                                         | Hidden              | Studio                                         |
| _Who can see this_ (members-only) fields                                                                        | Yes                               | Hidden                                                                                                                                                         | Hidden              | Studio                                         |
| Section **Layout** picker, **Design** tab (background, animation, more layout options) and **Advanced** options | Yes                               | Hidden                                                                                                                                                         | Hidden              | Studio                                         |
| SEO _Hide from search engines_                                                                                  | Yes                               | Hidden                                                                                                                                                         | Hidden              | Studio                                         |
| A page's slug once it has a value                                                                               | Editable                          | Read-only                                                                                                                                                      | Read-only           | Studio                                         |
| Sections in the _Add item_ menu                                                                                 | All                               | Approved list below                                                                                                                                            | Approved list below | Studio                                         |
| Delete, Duplicate on pages, posts, panels and singletons                                                        | Yes                               | Hidden                                                                                                                                                         | Hidden              | Studio                                         |
| _New document_ menu                                                                                             | Everything                        | Page templates, Post, Author, Category                                                                                                                         | Same as Editor      | Studio                                         |
| "Agency view" badge and client-view preview                                                                     | Yes                               | No                                                                                                                                                             | No                  | Studio                                         |

**Agency badge and client-view switch.** Agency staff see an "Agency view" badge and a **Preview client
view** button (**Back to agency** while previewing, with the badge reading "Client view" in the caution
colour). From 900px wide (Sanity UI's third breakpoint) they sit at the end of the navbar, so the top is one
row: brand zone, Sanity's controls, then the switch. Below 900px, where the bar has no room, the same switch
is a thin strip above the navbar, worded "Previewing client view" and "Back to agency view". Clients see
neither. The switch stores the choice in the browser and reloads, because tools and desk structure are
resolved when the Studio loads. The code is `AgencyControls` and `AgencyStrip` in
`src/features/studio/components/agency-controls.tsx`, chosen by `RoleNavbar`.

Because the Studio-only limits can be bypassed, don't rely on them to protect secrets. Form recipient
addresses, for example, stay readable to any Editor through the API. Real enforcement needs custom roles
with GROQ filters, which are a separate Sanity plan feature.

**Approved sections.** Clients may add _Rich text_, _Image + text_, _FAQ_, _Call to action banner_ and
_Testimonials_ (`DEFAULT_CLIENT_SECTIONS` in `src/features/studio/roles.ts`). When the site profile
(`site.profile.ts`, see _Site profile_) has a non-empty `clientSections`, that list is used instead. Sections already on a page stay
visible and editable whatever the list says. A Sanity array's `of` can't vary by user, so
`src/features/studio/components/section-insert-filter.tsx` wraps the page-builder input and hands only its
"Add item" button a copy of the type list with the approved sections; it is registered once for the whole
Studio as `form.components.input` in `sanity.config.ts`, and finds page-builder arrays by their section types.
Sanity leaves the array input's `arrayFunctions` undefined unless something sets it, so the filter wraps
Sanity's public `ArrayOfObjectsFunctions` in that case (wrapping the undefined prop crashed client view with
React error #130 before 1.7.0). Never import Sanity's internal chunks for this.

**A broken input never shows a client a raw error.** Every project input override (`StudioInput` in
`sanity.config.ts`) sits inside `StudioInputBoundary` (`src/features/studio/components/studio-input-boundary.tsx`).
If an input throws, a client sees "This part of the page couldn't be shown. Your content is safe." with
**Try again** and a link to `help.supportEmail` (else `help.guideUrl`) from the site profile. It never offers
Sanity's "Unset value", which would delete the field's content. Agency staff still get Sanity's own error, which
names the cause. Sanity's inputs that no override wraps keep Sanity's own handling.

**Preview the client view.** Agency staff see an **Agency view** badge above the navbar. **Preview client
view** switches to what an Editor sees (saved in that browser's `localStorage`, so it stays until you switch
back) and reloads the Studio, because tools, the sidebar and document actions are chosen when it loads. It
shows the Editor's view, not the Contributor's, and your real permissions still apply. **Back to agency
view** undoes it.

**Adding to the client view.**

- A new sidebar item or singleton is agency-only until its id is added to `CLIENT_STRUCTURE_IDS`
  (`src/features/studio/utils/structure-access.ts`). Ids for Team (`team`) and Business info
  (`businessInfo`) are already listed and appear once those items exist.
- Hide a field from clients with `hidden: hiddenFromClients` (`@/lib/sanity/roles`), or lock it once set
  with `readOnly: lockedForClientsOnceSet`. For a field group use `hidden: hiddenFromClients` on the group.
  A section's **Design** group, `style` field, **Layout** picker and Advanced fields already use it (`sectionFields` in `src/lib/sanity/schema/section-style.ts`), so every section, and the ones `npm run new:section` writes, hide them from clients without any extra code.
- New tools are visible to clients unless added to `AGENCY_ONLY_TOOLS` (`utils/tool-access.ts`).
- Delete and Duplicate are removed on `CLIENT_PROTECTED_TYPES` (`utils/document-access.ts`: pages, posts and panels) and singletons. Inside _Reusable content_ clients see only the ids in `CLIENT_REUSABLE_IDS` (Panels); clients can't create panels, because _New document_ lists only `CLIENT_NEW_DOCUMENT_IDS`.

Test it by hand with [the manual test script](docs/studio-roles-test-script.md), using a throwaway project
and three accounts (Administrator, Editor, Contributor).

### Motion

Animation uses [Motion](https://motion.dev) (the `motion` package, React API) in its lightest form: a
`LazyMotion` provider and the `m` component, with the `domMax` feature bundle (drag and layout animations)
downloaded after first render. It lives in `src/components/motion/`:

| File                  | Role                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `motion-provider.tsx` | `MotionConfig reducedMotion="user"` + `LazyMotion strict`. Mounted in `SiteShell`, so it wraps the public site and `/ab/*`, never `/studio`.                                                                       |
| `features.ts`         | Re-exports `domMax`; imported lazily by the provider.                                                                                                                                                              |
| `motion-elements.tsx` | `MotionDiv`, `MotionSection`, `MotionArticle`, `MotionUl`, `MotionLi`, `MotionSpan`, `MotionP`, `MotionFigure` (all `m.*`).                                                                                        |
| `parallax.tsx`        | `Parallax` (client): moves its children vertically as they scroll through the viewport. See _Parallax_ below.                                                                                                      |
| `parallax-lazy.tsx`   | `LazyParallax`: `Parallax` behind `next/dynamic`. Server components import this one, so the scroll code is downloaded only by pages that render a parallax section.                                                |
| `parallax-image.tsx`  | `ParallaxImage` (server): a `SanityImage` in a clipping frame, inside a `Parallax`, scaled so no edge shows. Used by the hero backgrounds.                                                                         |
| `presets.ts`          | Variants `fadeIn`, `fadeUp`, `scaleIn`, `staggerContainer`, `staggerItem` and the prop helpers `revealOnLoad`, `revealInView`, `revealChild`. Durations, easing and distance come from the `motion` design tokens. |

**Rules**

- Use `m` from `motion/react-m` (or the wrappers). Never import the `motion` component from `motion/react`, and never
  use `framer-motion`; ESLint (`no-restricted-imports`) fails on both. `motion.div` bundles every feature up front
  and throws inside the provider's `strict` mode. `LazyMotion`, `MotionConfig`, `AnimatePresence`, `useScroll`,
  `useTransform`, `useMotionValue`, `useSpring`, `useInView` and `useReducedMotion` are fine.
- Animate `transform` and `opacity` only.
- **Readable without JavaScript.** Anything that starts hidden carries `data-reveal` (the `reveal*` helpers add it).
  `globals.css` forces `[data-reveal]` to opacity 1 and no transform under `@media (scripting: none)` and under
  `prefers-reduced-motion: reduce`, which is also why visitors who ask for less motion see no fade at all. Never start the
  `<h1>`, the first image or any LCP element hidden.
- Clean up every listener, observer and timer in client code (the memory test).
- The end-to-end tests run with reduced motion by default so axe and screenshots never see an element mid-fade;
  `tests/e2e/motion.spec.ts` turns animation back on to check the reveal.

**Parallax**

`Parallax` moves its content up or down as the element crosses the screen, and `ParallaxImage` does the same for a Sanity
picture behind a hero. Editors switch it on with a section's **Design → Animation → Parallax**; developers use it directly:

```tsx
<ParallaxImage image={data.backgroundImage} sizes="100vw" speed={0.25} className="object-cover" />
<Parallax speed={0.15}>{picture}</Parallax>
```

- **When to use it.** A large picture behind text (a hero) or one picture beside text. Not for text, forms, tables or
  anything a visitor has to read while it moves, and not on every section: one or two on a page. The hero overlay and
  full-bleed layouts and the image + text section support it; `SectionFrame` has a `media` slot for a new section's picture.
- **Speed** is -1 to 1. Positive drifts with the scroll but slower, like a distant background; negative moves faster than
  the page, like a foreground. **0.1 to 0.15** is gentle (picture beside text; the preset uses 0.15), **0.25** suits a
  hero (the default for `ParallaxImage`), **0.4** is clearly visible, and above **0.5** it gets dramatic and the picture
  must be scaled up a lot. The picture travels `speed` times 20% of its own height at `md` and up, and 10% below it.
- **No gaps.** `ParallaxImage` scales its picture by exactly twice the travel (CSS, from the speed), so an edge never shows.
  Use a picture with spare room at the edges for high speeds; the extra scale crops it.
- **`from`.** `viewport` (default) moves from one end of its range to the other as the element crosses the screen and rests
  in the middle. A first section is already on screen at scroll 0, so it uses `from="top"`: it rests unshifted at the top of
  the page and moves as it scrolls away. The heroes choose this themselves.
- **Reduced motion and no JavaScript.** The picture is never moved and never scaled for visitors who ask for less motion
  (`useReducedMotion`, plus the scale is behind `prefers-reduced-motion: no-preference`), nor without JavaScript.
- **How it stays cheap.** Transform only (a `translateY` of a percentage of the element's own height, so nothing is
  measured and there is no resize observer); `will-change: transform` only while the element is on screen; no scroll
  listener of ours (`useScroll`, which uses the browser's scroll timeline where it has one). The server HTML and the
  hydration render carry no transform; it is attached right after, and first painted when the scroll position changes, so
  nothing jumps (CLS stays at 0).
- **Import `LazyParallax`, not `Parallax`, from a server component.** A client component a server component imports is
  added to every page that imports that server component, and `SectionFrame` is on every page. `LazyParallax`
  (`parallax-lazy.tsx`) is the same component behind `next/dynamic`: server-rendered as usual, with its 6.6 KB gzipped
  chunk fetched only on pages that have a parallax section. `ParallaxImage` and `SectionFrame` already do this.
- It needs the `MotionProvider` (the public site has it; `/section-gallery` and Studio do not), so the section gallery
  shows parallax sections still. `tests/e2e/parallax.spec.ts` covers movement on the `/parallax` fixture page.

**Adding a motion element to a server component**

```tsx
import { MotionDiv } from '@/components/motion/motion-elements'
import { fadeUp, revealInView } from '@/components/motion/presets'

;<MotionDiv {...revealInView(fadeUp)} className="...">
  …
</MotionDiv>
```

Props must be serialisable (`initial`, `animate`, `whileInView`, `viewport`, `transition`, `variants`). Function props
such as `onDragEnd` cannot cross the server/client boundary: write a small client component that imports
`* as m from 'motion/react-m'` itself. For a staggered group, put `revealOnLoad(staggerContainer)` on the parent and
`revealChild()` on each child. The first hero fades up its description and buttons this way.

**Measured sizes** (motion 14.2.0, Turbopack production build, gzip level 9, 1 KB = 1000 bytes)

| Part                                                                            | Size    |
| ------------------------------------------------------------------------------- | ------- |
| Added to the home page's initial scripts (LazyMotion + `m`)                     | 16.5 KB |
| `domMax` chunk, loaded after first render (not in the HTML)                     | 33.9 KB |
| Parallax: `LazyParallax` wrapper added to the home page's initial scripts       | 0.4 KB  |
| Parallax chunk (`useScroll` and friends), only on pages with a parallax section | 6.6 KB  |

The ~5 KB usually quoted for LazyMotion + `m` holds for esbuild (5.7 KB here), but Turbopack keeps much more of the
core. That is why the home page JavaScript budget went from 200 KB to 220 KB (see _Performance budgets_).

### Section animation

Section animation is a small preset library in three levels. Each level is a layer over the last, and the Studio shows
only what applies.

**1. Defaults, by kind of section (in code).** `MOTION_DEFAULTS` (`src/components/motion/presets.ts`) is what a section
does when its style names no animation. `SectionDefaults.motion` picks the kind:

| Kind      | Default   | Sections                                                                                                                                                                                                                                                     |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `content` | _Fade up_ | Everything unless it says otherwise (rich text, image + text, features, FAQ, testimonials, stats, gallery…). A section left out of `DEFAULTS` is content.                                                                                                    |
| `hero`    | _None_    | The four hero layouts. The hero's own text enters on load after the LCP-safe elements (the heading and picture never animate by default: `hero-text.tsx`), so the frame stays still. Each part can be animated on its own: see _Animating individual parts_. |
| `still`   | _None_    | The logo strip.                                                                                                                                                                                                                                              |

New sections added in the Studio store the kind's default, so what you see in the picker is what the site does. An
explicit _None_ always beats the default, and content saved before the library existed (no `motion` stored) now fades up
like any new content section. Stored `reveal` is still _Fade up_ and `parallax` still the original Parallax (now named
_Parallax · Subtle_), so nothing needs migrating.

**2. Presets (the Animation picker).** Typed data in `presets.ts`, drawn by `SectionFrame`; the picker shows a gently
animated picture for each (`animation-thumbnails.tsx`: SVG animation, mounted only while motion is allowed, so static
under reduced motion).

| Preset (stored)                        | What it does                                                                        | Needs a picture |
| -------------------------------------- | ----------------------------------------------------------------------------------- | --------------- |
| _None_ (`none`)                        | Appears with the page.                                                              |                 |
| _Fade up_ (`reveal`)                   | Fades in and rises 24 px (the `reveal-distance` token) over 0.6 s, once, in view.   |                 |
| _Subtle entrance_ (`subtle`)           | Fades in and rises 12 px.                                                           |                 |
| _Fade_ (`fade`)                        | Fades in; no movement.                                                              |                 |
| _Slide in_ (`slide`)                   | Fades in while sliding 32 px in from the start side (or the chosen direction).      |                 |
| _Staggered_ (`stagger`)                | The section's direct children fade up 0.08 s apart.                                 |                 |
| _Float_ (`float`)                      | The picture drifts up and down 16 px in a slow loop (9 s), paused while off screen. | yes             |
| _Parallax · Subtle_ (`parallax`)       | The picture drifts as the page scrolls: speed 0.15 beside the text, 0.25 behind it. | yes             |
| _Parallax · Medium_ (`parallaxMedium`) | Speed 0.3 beside, 0.4 behind.                                                       | yes             |
| _Parallax · Strong_ (`parallaxStrong`) | Speed 0.45 beside, 0.55 behind. Use on one picture per page.                        | yes             |

The picker offers only what fits the section (`visibleMotions`): Float and the Parallax strengths are withheld where the
layout has no picture (the hero's _Full background_ and _Image with panel_, and _Image + text_), and an unfitting value
left behind by a layout change stays selected with a yellow warning. Speeds are in the units `Parallax` takes (see
_Motion_); a picture behind a hero travels further than one beside text.

**3. Advanced (collapsed "Advanced: animation").** Each option is shown only for the presets that use it
(`MOTION_USES`; `motionOptionHidden` in the schema reads the same table), and `resolveMotion` ignores a stored value the
preset does not use, so a leftover from another preset can never change the result.

| Option                    | Values                                                                                                                  | Used by                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Intensity                 | Subtle (×0.6) · Normal · Bold (×1.5) of the strength chosen                                                             | Parallax (all three). Speed stays within 0.05–0.6.                                          |
| Duration                  | Fast 0.35 s · Normal 0.6 s · Slow 0.9 s (Float: 6 · 9 · 13 s loop)                                                      | Every entrance, and Float                                                                   |
| Delay                     | None · Short 0.15 s · Long 0.4 s                                                                                        | Every entrance                                                                              |
| Direction                 | From the start · end · below · above                                                                                    | Slide in. The start is the left (the site is LTR).                                          |
| When it plays             | On scroll into view · On load                                                                                           | Every entrance (see the first section below)                                                |
| Set exact values (Custom) | Duration 100–3000 ms, distance 0–120 px, easing (ease out · in and out · in · linear), how much must be in view 5–100 % | Entrances. Fade has no distance; Float takes a loop of 2–20 s and a travel of 0–40 px only. |

Exact values are validated in the Studio (whole numbers within the range, with a message) and clamped again by the
resolver, so a value saved from elsewhere cannot break the page.

**`resolveMotion(preset, advanced, { isFirst, hasMedia, reducedMotion, placement })`** is the one place that turns this
into what to draw: `{ kind: 'none' }`, an `enter` plan (variants, trigger, viewport), a `float` plan or a `parallax`
plan. It is pure and covered by `presets.test.ts`. The rules it enforces:

- **The first section never starts at opacity 0.** It stays still, even with an entrance chosen, unless the editor sets
  _When it plays_ to _On load_; then it plays as a transform only (opacity stays 1, so the heading and picture are in the
  server HTML and the LCP is untouched), and _Fade_ does nothing there. Parallax on a first section rests unshifted at the
  top of the page (`from: 'top'`).
- **No picture, no picture animation.** Float and Parallax resolve to nothing without a picture.
- **Reduced motion moves nothing.** The resolver returns nothing when told the visitor asked for less motion; on the
  server, which cannot know, CSS covers it: `[data-reveal]` is forced to its final state (`globals.css`), Parallax never
  attaches its transform, and Float's CSS animation is switched off.
- **Without JavaScript** every entrance is readable (`[data-reveal]` shows), and Float, being CSS, still runs.

**Phones and touch.** Parallax travels half as far below `md` (a CSS variable in `Parallax`, as before). Float _does_ run on
small screens, also at half the travel: it is a transform on the compositor with no script per frame, it pauses
off screen, and a still picture on a phone read as broken next to the desktop. Hover-free, so nothing depends on a pointer.

**Float** (`float.tsx`, `float-lazy.tsx`, `[data-float]` in `globals.css`) is a CSS keyframe animation (`translateY`, alternating
so one loop is the _Duration_). The client component only adds `data-paused` while the element is off screen
(`useInView`: one IntersectionObserver that Motion disconnects on unmount) and `LazyFloat` keeps even that out of pages
without a floating picture, so no JavaScript beyond the preset data joins the home page. For a hero background the picture is
drawn 20 px larger than its frame so the drift never shows an edge.

**Adding a preset.** Add the name to `SECTION_MOTIONS` and its title to `SECTION_MOTION_TITLES`
(`src/lib/sanity/section-style-options.ts`), its row in `MOTION_USES`, its behaviour in `resolveMotion`, a thumbnail in
`animation-thumbnails.tsx` and `registry.ts`, and a picker entry in `section-style.ts`. The tests fail until each table has
a row for it. Keep the library small: a preset needs a reason a Custom value or an Advanced option cannot give.

**Tests.** `presets.test.ts` (the resolver: compatibility of stored values, every preset, every option, clamping, the first
section, reduced motion), `section-style.test.ts` (defaults and `sectionMotion`), `section-form.test.ts` (which options and
presets the form shows), and `tests/e2e/motion-presets.spec.ts` on the `/motion-presets` fixture page (each entrance
starts from its own offset and settles, a leftover option is ignored, the first section plays on load and is in the
server HTML at full opacity, Float runs and pauses off screen, Parallax speeds, reduced motion, no JavaScript, axe).

### Animating individual parts

Agency only, in **Design → Advanced → Animate individual parts** on the hero (off by default). A section declares its
animatable parts in code; the hero's are `HERO_PARTS` in `src/features/pages/utils/hero-parts.ts`: **eyebrow, heading,
intro text, buttons, extra content (the slot), picture and background picture**. Each part is described once
(`HERO_PART_SPECS`): whether it is a picture, whether it takes a turn in the timing sequence, whether it is an LCP
candidate, and what it does with nothing chosen.

**Three levels, each over the one before** (`resolvePartMotion`, `src/components/motion/part-motion.ts`):

1. **The component default.** The intro, buttons and extra content rise one after another on load (150 ms, then 80 ms
   apart), exactly as the hero always has; the eyebrow, heading and pictures simply appear with the page. A hero without
   _Animate individual parts_ looks and behaves as before.
2. **The section's animation** (the Animation picker above). An entrance on the section moves all its content as one, so
   the parts add nothing of their own; Float and Parallax belong to the background picture.
3. **The part's own choice**, only while the switch is on. Inherit (the default) keeps what the levels above gave.

**What the form shows.** The switch, then one compact row per part the chosen layout and content actually have: an
**animation** (Inherit · None · Fade · Rise · Reveal · Slide · Scale, plus Parallax for the pictures) and a **delay**
(Auto · Short 0.15 s · Long 0.4 s). A part that is not there has no row: no eyebrow text, no buttons, no extra content,
no picture, or a layout without one (_Split_ and _Editorial_ have a picture beside the text; _Full background_ and
_Image with panel_ have a background; `heroPartsPresent` is the single source for the Studio and the page). Auto takes
turns, 80 ms apart, in the order above, among the text parts that animate; a Short or Long delay still keeps its part's
place in that order.

| Preset   | What it does                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------- |
| Fade     | Fades in.                                                                                          |
| Rise     | Fades in and rises 24 px (the `reveal-distance` token).                                            |
| Reveal   | Wipes in from the start edge with a `clip-path`; opacity is never touched.                         |
| Slide    | Fades in while sliding 32 px in from the start.                                                    |
| Scale    | Fades in while growing from 95 %.                                                                  |
| Parallax | Pictures only: drifts with the scroll, at the subtle speed (0.15 beside the text, 0.25 behind it). |

**Invalid combinations are ignored, never drawn.** Parallax on text falls back to Inherit (the form does not offer it);
a stored choice for a part the hero does not have, or while the switch is off, does nothing; an unknown preset or
delay reads as Inherit and Auto; reduced motion moves nothing.

**The first section's heading and pictures (LCP).** These must paint whole with the page, so on the first section they
never start at opacity 0, and they **ignore Fade, Reveal and Scale**, which start with less of the part showing. Rise
and Slide start at opacity 1 and only move; Parallax rests unshifted at the top. This is stricter than "Reveal with
opacity 1": Lighthouse showed that even a `clip-path` Reveal that leaves a sliver showing moves the LCP from 1.55 s to
4 s, because Chrome counts a heading again each time more of it is painted, so the LCP lands when the wipe finishes.
Further down the page the heading's Reveal works as described. The eyebrow, intro, buttons and extra content are not
LCP candidates and may start hidden, as they always have.

**Markup.** `hero-text.tsx` wraps a part in the existing `MotionDiv` or `MotionSpan` (the eyebrow's text, so the `<p>`
stays valid) only when it animates, with the variants the resolver returned (`partProps`); a part that does not animate
has no wrapper. Pictures use `hero-picture.tsx` (beside the text) and `hero-background.tsx`: an entrance animates a
frame around the picture, so its corners, crop and focal point are untouched, and Parallax drifts it inside a clipped
frame of the same shape. No new client component: the wrappers, `LazyParallax` and `LazyFloat` are the existing ones.
Everything keeps the `data-reveal` hook, so without JavaScript and under reduced motion the parts are simply there
(`globals.css` also clears `clip-path` for them).

**Adding a part** to the hero: add it to `HERO_PARTS`, `HERO_PART_TITLES`, `HERO_PART_SPECS` and `heroPartsPresent`, its
two fields (`<part>Preset`, `<part>Delay`) to the `partMotion` projection in `heroFragment`, and its element in
`hero-text.tsx` or the layout. The tests fail until each table has a row for it. **Another section** gets the same
feature with its own `PART_SPECS`, a `partMotion` object field in its `advanced` list (copy `hero-part-motion.ts`) and
`resolvePartMotion` in its layouts.

**Changed behaviour.** On a hero below the first section that has its own entrance (_Fade up_ and the like), the text no
longer also rises on load inside the moving section: the section's entrance moves it, once.

**Tests.** `part-motion.test.ts` (the three levels, inheritance, delays and the Auto sequence, invalid combinations, the
first section's LCP rules), `hero-parts.test.ts` (which parts exist for each layout, the hero's resolution),
`hero-part-motion.test.ts` (agency-only, one compact row per part, rows hidden for absent parts) and
`tests/e2e/hero-parts.spec.ts`: the server HTML of `/hero-parts` (heading and picture at full opacity, nothing clipped),
the parts ending whole, reduced motion, no JavaScript, axe, `/hero-parts-later` (the heading wipes in), and the gallery's
`hero-parts-*` entries. The visual baselines for `hero-parts-*` are rendered under reduced motion, so they show the
parts at rest and prove the wrappers change nothing about the layout. `/hero-parts` is also in `lighthouserc.json`
(LCP at most 2.5 s, like the home page).

### Image design

One treatment for a section's main picture: a **still frame with the picture moving gently inside it**, a handful of
**shapes**, and **decorative frames** that stay put while the picture drifts behind them. It lives on **Image + text**,
the **Hero's Split layout**, **Gallery** (Grid and Slider) and **Team** portraits. Not on logos, icons, Masonry pictures
or the small testimonial avatars, where it would not make sense. It is one component (`FramedImage`,
`src/components/ui/framed-image.tsx`) used by all of them, so there is one implementation.

**For editors (agency only: Design tab → Image design).** Three pictures to choose from, in this order; leave them alone and
the picture looks exactly as it always did.

1. **Image shape:** _Standard_ (the site's corners), _Rounded_, _Circle_ (always square), _Arch_ (a tall picture with a rounded top)
   or _Framed_. A hero that already had an "Image shape" keeps it and shows it here until it is changed
   (_Square corners_ is offered where a section already used it).
2. **Picture motion:** _None_, _Subtle parallax_ or _Medium parallax_. The picture moves inside its frame; the frame never does.
3. **Frame** (only for _Framed_): _No frame_, _Simple line_, _Double line_, _Offset border_, _Organic brush_, _Corner brackets_ or
   an **approved custom frame**.

A collapsed **Advanced: image** holds the exact values, and shows only those the choices above use:
_Set exact motion values_ (parallax only) reveals **Travel distance** (2–7 % of the picture's height each way; phones get half),
**Direction** (down drifts with the scroll, up goes against it) and **Picture scale** (1.05–1.15; empty uses just enough for the
travel). A frame has a **Frame colour** (a design token: accent, second accent, highlight or text colour) and a **Frame inset**
(how far it sits in from the edge, 0–12 %; for the offset border, how far it sticks out). Hidden fields keep their values, but the
site ignores a value the current choices do not use (a frame on a circle, a travel on a still picture). Hidden
controls also skip validation, including Sanity’s built-in reference checks. Switching a shape or frame keeps the
saved choices; unused frame references stay weak so an unpublished frame cannot block publishing. Switching back
checks the frame again. The same rule applies to Link list design controls and their nested custom colours.

**Image + text and the section's own Parallax.** Choosing the _Parallax_ animation preset on Image + text still works and the
stored values are unchanged, but it now moves **only the picture inside its still frame** (before, the whole framed picture
drifted). Subtle, Medium and Strong keep their strengths (Strong is held to the 1.15 scale limit). A picture whose own _Picture motion_
is not _None_ uses that instead.

**Approved custom frames.** An agency-uploaded SVG or transparent picture in a **Frame** document (Studio → Design → Image frames; agency only: clients
never see or create them, and an image design can only point at one). The Image design and Link list profile
frame pickers offer existing frames only: add and publish new frames under **Design → Image frames**. Choose **Artwork → SVG file** or **Picture**:

- **SVG file:** a `viewBox`, at most 50 KB, with no scripts, event handlers or `foreignObject` (checked by `checkFrameSvg`, `src/features/frames/utils/frame-svg.ts`).
- **Picture:** a Sanity image asset, PNG or WebP, with a transparent background and middle. Export a single-colour outline at **1600–2400 px on the long side**, at least 1600 px, at most **5 MB**. The Studio warns if Sanity's metadata reports no alpha channel; an alpha channel alone cannot prove that the middle is transparent, so check the preview. Picture thumbnails appear in the frame picker and Image frames list.

Complex hand-drawn SVGs are better exported as pictures: an SVG downloads all its paths at every display size, whereas the image CDN resizes a picture. Keep simple vector frames as SVG. The 5 MB limit is an **upload** budget allowing detailed transparent PNGs; visitors receive a resized WebP, never the original upload. Check actual transfer sizes for your artwork before using it above the fold (see [frame measurement notes](docs/frame-picture-measurement.md)).

Existing frame documents with no Artwork choice still use their SVG. Switching Artwork retains the other upload but only the selected format is queried and validated. Publish the frame after changing its artwork; there is no content migration.

The site **never inlines artwork**: it uses a CDN URL (and only a `cdn.sanity.io` URL) as an alpha CSS `mask-image` on a `div` filled with the
chosen colour token, so it recolours with the theme, scales to the picture and, loaded as an image, cannot run a script. Design it as
a single-colour outline; the transparent middle shows the picture. A frame document is tagged `frame`, so editing one refreshes the
pages that use it (add `"frame"` to the webhook filter in webhook mode: the filter above includes it).

The existing page queries resolve the selected asset URL without extra Content Lake requests. `frameMaskUrl` (`src/lib/sanity/frame-mask.ts`) uses the Sanity image URL builder for pictures with `fit=max&fm=webp` and no upscaling. CSS requests 1280 px below a 640 px viewport, 2048 px below 1024 px, and 2560 px above that: 2× the largest frame width in each range, up to the 80rem content width. Small Link list profile frames use their own 2× request widths (192, 256 or 384 px). SVG URLs are unchanged. If a client layout increases the maximum frame width beyond 80rem, update the mask widths accordingly. Frame colour and inset work identically for both formats. Public rendering makes no extra JavaScript measurement or Content Lake request.

**How it is built.**

```
box        aspect ratio and place in the layout (the corners of a plain picture)
  clip     the shape; overflow hidden
    picture  scaled up by exactly twice its travel, moved by Parallax: the only moving part
  frame    an SVG (or the mask div) over it: still, pointer-events none, aria-hidden
```

- **No edge ever shows.** `Parallax` moves its content by `speed × 0.2` of its height each way (`× 0.1` below `md`), and the
  picture is scaled by `1 + 2 × travel + 0.01` (a 1 % slack for rounding), held to 1.05–1.15 (`src/components/motion/image-travel.ts`, unit tested). Travel is
  therefore 2–7 %, and with a chosen scale the travel is held to what that scale covers.
- **Plain stays plain.** With no motion and no frame the output is exactly the `<img>` (with its shape), so a default picture is
  untouched. The picture keeps its alt text, `sizes`, hotspot (`object-position`) and preload.
- **Cost.** Transform only (the frame and clip never animate), `will-change` only while the picture is in view (Parallax), no
  new library, no scroll listener of ours, and the Parallax chunk is still downloaded only by pages that use it. Phones get half the
  travel. The scale applies only with `prefers-reduced-motion: no-preference` **and** `@media (scripting: enabled)`, so reduced motion
  and no-JavaScript visitors get the still, unscaled picture with its frame. The box has a fixed ratio, so there is no layout shift.
- **Frames.** The built-in ones are inline SVGs (`image-frames.tsx`) in a 0–100 box with `preserveAspectRatio="none"`,
  `currentColor` and `vector-effect: non-scaling-stroke`, so lines stay the same width however the picture stretches.

**Adding a shape, frame or preset.** Add the value to `IMAGE_APPEARANCES`, `IMAGE_FRAME_PRESETS` or `IMAGE_MOTIONS` and its title
(`src/lib/sanity/image-design-options.ts`), its drawing (`image-frames.tsx`), a thumbnail (`image-design-thumbnails.tsx` and
`registry.ts`) and a class (`SHAPE_CLASS`). Tests fail until each table has a row. **Adding it to another section:** add
`imageDesignField()` to its schema, `imageDesign { ${imageDesignFields} }` to its fragment, and render the picture with `FramedImage`.

**Validation investigation (21 October 2026).** See [hidden image settings](docs/hidden-image-settings.md) for the
local reproduction, exact error paths, hidden-field audit and reference publishing behaviour. No content migration is needed.

**Tests.** `image-travel.test.ts` (scale from travel, phones, range), `image-design-options.test.ts` (shape and frame rules, what
is ignored), `image-design.test.ts` (which fields the Studio shows), `framed-image.test.ts` (markup: layers, scale classes, frames,
masks), `frame-svg.test.ts`, and `tests/e2e/framed-image.spec.ts` on the `/framed-images` fixture page (the frame's position does not
change while the picture's transform does, the picture always covers its box, scale by viewport, custom frame mask, reduced motion, no
JavaScript, axe). The section gallery has an entry for every shape and frame and for parallax on and off; the baselines are Linux-only,
so refresh them with the **Update visual baselines** workflow after changing a look.

### Slider

`Slider` (`src/components/ui/slider.tsx`, client) is an accessible touch carousel on Motion's drag. The Testimonials
section uses it for its **Slider** layout (Layout picker: _Grid_ or _Slider_; the grid is the default, so existing content
is unchanged). Server components import `LazySlider` (`slider-lazy.tsx`, `next/dynamic` in a client file), never `Slider`,
for the reason given under _Parallax_ above.

```tsx
<LazySlider label="Customer testimonials" perView={{ base: 1, md: 2, lg: 3 }} gap>
  {slides}
</LazySlider>
```

| Prop            | What it does                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `label`         | Names the carousel for screen readers (required).                                                                            |
| `perView`       | Slides in view at `base`, `sm`, `md`, `lg`, `xl` (Tailwind breakpoints). A missing breakpoint keeps the smaller one's count. |
| `gap`           | Space (1.5 rem) between slides.                                                                                              |
| `autoplay`      | Milliseconds between automatic slides. **Off by default and not exposed in the CMS.** See _Autoplay_ below.                  |
| `initialIndex`  | The slide to start on, read once when the slider first measures itself (the lightbox opens on the picture clicked).          |
| `onIndexChange` | Called with the position at the start and after every move. Pass a stable function.                                          |
| `dots`          | The "Go to slide n" dots. On by default; the lightbox turns them off because a gallery can have 60 pictures.                 |
| `directionLock` | Locks a drag to the axis it starts on, for a slider inside something that drags the other way (the lightbox).                |
| `ref`           | A `SliderHandle` with `previous()` and `next()`, for a parent that handles keys itself.                                      |

- **How it moves.** The track is an `m.div` with `drag="x"` and a motion value for `x`. On release `snapIndex`
  (`slider-snap.ts`, pure and unit tested) picks the slide from the drag distance plus a short projection of the
  velocity (a flick moves at least one slide; a fast one can pass several), and `animate(x, …)` springs to it. Ends
  have elastic resistance (`dragElastic`, `dragConstraints` from a `ResizeObserver` that is disconnected on unmount).
  A drag of more than 5 px swallows the click that follows, so it never opens a link inside a slide.
  `touch-action: pan-y` keeps vertical page scrolling working on phones.
- **Without JavaScript** the slides are a horizontal CSS scroll-snap list (focusable, so the keyboard can scroll it).
  Slide widths come from the same CSS in both modes, the scrollbar is hidden in both, and the controls' space is reserved
  in the server HTML, so the script taking over shifts nothing (CLS 0). The server HTML and the hydration render are the
  scroll list; the next layout effect measures and switches to the drag track.
- **Controls.** Previous and Next (disabled at the ends; focus moves to the other button rather than being lost), one
  "Go to slide n" button per resting position, and Left/Right arrow keys while focus is inside. Slides out of view are
  `inert`, so Tab never lands on hidden content.
- **ARIA.** The `<section>` has `aria-roledescription="carousel"` and the label; each slide is `role="group"` with
  `aria-roledescription="slide"` and `aria-label="n of N"`; a polite live region says "Slide n of N" after a button or
  key, never while dragging or sliding by itself.
- **Reduced motion.** The move is a zero-length animation: instant, no spring. (Not `x.jump`: after a drag, Motion's own
  release, which it applies a frame late for these visitors, would land after it.)
- **Autoplay.** If a developer passes `autoplay`, it pauses on hover and focus, shows a visible Pause/Play button
  (WCAG 2.2.2) and never runs under reduced motion. Nothing in the CMS turns it on; it has no end-to-end test yet.
- **Needs the `MotionProvider`** for dragging (the public site has it; `/section-gallery` does not, so there it shows the
  layout and the buttons). The buttons, keys and spring use the standalone `animate`, so they work even in the moments
  before the `domMax` chunk, which drag needs, has downloaded.
- **Size** (motion 14.2.0, Turbopack, gzip level 9): the standalone `animate` pulls Motion's animation engine into the
  slider's own chunk. Imported directly, the slider added **22.2 KB** to the home page's scripts (217.2 → 239.4 KB, over
  the 220 KB budget), because the engine moved out of the lazily loaded `domMax` chunk. Behind `LazySlider` the home page
  is **217.3 KB** (+0.1 KB for the wrapper) and the budget is unchanged; a page with a slider loads about 12.6 KB gzipped
  more than the home page (227.6 vs 215.0 KB, all scripts after idle).
- **Tests.** `slider-snap.test.ts` (unit); `tests/e2e/slider.spec.ts` on the `/slider` fixture page (buttons, dots, keys,
  `inert`, `touch-action`, mouse drag, click suppression, spring and reduced motion, no JavaScript, CLS, axe). The gallery
  has `testimonials-slider` and `testimonials-slider-inverse`.

### Gallery

The **Gallery** section (`src/features/pages/components/sections/gallery/`) shows up to 60 pictures and opens each one full
screen. Editors: _Add section → Gallery_, add the pictures (each needs alt text; a caption is optional and appears under
the picture when it is opened), and pick a **Layout**: _Grid_ (equal tiles, the default), _Masonry_ (pictures keep their own
shape, packed into columns) or _Slider_ (a row to swipe or step through). Agencies set **Columns** (2–4, on the Design tab;
narrower screens show fewer). Clients cannot see the Layout or Columns. Pictures over the 4:3, 1600 px recommendation only
get a warning; more than 60 is an error (a page of that many is slow, and reads better as a blog post).

- **Layouts.** Grid and masonry are CSS only (a grid of 4:3 tiles; CSS `columns` for masonry). Masonry fills each column
  top to bottom, so the tab order is still the editor's order, which the eye reads down each column. The slider layout is
  the shared `Slider` (via `LazySlider`) with 1, 2 and then _Columns_ pictures in view.
- **Images.** `SanityImage` with `sizes` that match the layout, LQIP blur and `loading="lazy"`; only the first row of a
  gallery that opens the page loads eagerly.
- **Thumbnails are buttons** named "Open image 3 of 12: <alt text>" (`aria-haspopup="dialog"`); the picture inside has an
  empty `alt` so it is not read twice.
- **The lightbox** (`lightbox.tsx`) is a native modal `<dialog>` shown by `useModalDialog` (see _Panels and the overlay_), so the browser traps focus, makes the page behind it
  inert, closes on Escape and returns focus. It holds the shared `Slider` at full size (Previous and Next buttons, Left and
  Right arrow keys, drag), a counter ("3 of 12") and each picture's caption in its `<figcaption>`. Arrow keys also work
  while focus is on the Close button (the dialog hands them to the slider through its `ref`). Dragging down closes it:
  the panel is an `m.div` with `drag="y"` and `shouldDismiss` (`src/components/ui/swipe-dismiss.ts`, pure and unit
  tested) decides, a flick or a drag past a quarter of the height closes, anything less springs back. The slider is
  `directionLock`ed so a sideways drag changes picture and a downward one closes. Focus goes back to the thumbnail that
  opened it (also set by hand, because Safari does not focus a button on click).
- **Loaded on first open.** `lightbox-provider.tsx` is the only gallery code in the page's scripts: it holds the open
  state and imports the lightbox with `next/dynamic` (`ssr: false`, which has to sit in a client file), so the dialog, the
  Slider and Motion's spring arrive when a picture is first clicked. The thumbnails stay server components; the provider
  takes them as `children`.
- **Full-size images only nearby.** The lightbox renders the picture for the current slide and the one either side; the
  rest are empty placeholders until they are close, so opening a 60-picture gallery downloads three pictures, not 60.
- **Reduced motion.** The thumbnails' hover zoom is `motion-safe:`, the slider moves instantly, the dialog does not animate,
  and the page behind is not scrolled while it is open. The swipe is a drag the visitor makes themselves, so it still works.
- **Needs the `MotionProvider`** for the swipe and the drag (the public site has it; `/section-gallery` does not, so
  there the layouts show and the buttons and keys work). The Slider's `ref`/`dots`/`directionLock` props are the only
  change to the shared component; each is off or unchanged by default.
- **Tests.** `swipe-dismiss.test.ts` (unit); `tests/e2e/gallery.spec.ts` on the `/gallery` fixture page (button names, the
  lightbox code only downloading on open, opening, keyboard navigation, Escape, focus return, three images at a time,
  swipe down and spring back, reduced motion, axe with the lightbox open). The section gallery has `gallery-grid`,
  `gallery-grid-four`, `gallery-masonry` and `gallery-slider`; their screenshot baselines need the **Update visual
  baselines** workflow (macOS skips visual tests).

### Location

The **Location** section (`src/features/pages/components/sections/location/`) shows where the business is: the address,
opening hours, phone and email from [Business info](#business-info), with a "Get directions" button and either a map
image or address cards. Editors: _Add section → Location_ and fill in the title. It looks finished with nothing else
set, and the details themselves are edited once, in _Business info_ (the section says so in its description).

- **Editors' fields.** _Section title_ (starts as "Visit us"), _Intro_, _Map image_ (optional), _Show opening hours_,
  _Show the "Open now" badge_ (hidden unless hours are shown), _Show phone and email_ and _Directions button label_
  ("Get directions"). With no map image the details sit on cards, the address one first; with one, the details stack
  beside the picture (below it on a phone). A section whose Business info has nothing to show (no document, or all of
  the address, contact and hours empty or switched off) renders nothing rather than an empty box.
- **The map image** is a styled static map the designer exports, so no map service loads. It needs alt text, and the
  usual image guidance applies (4:3, 1200 px wide or more).
- **Social icons.** _Show social icons_ (off by default, so existing sections are unchanged) draws Business info's
  social profiles under the phone and email, in the shared `SocialLinks` (circles, `rel="me"`; see
  [Social icons](#social-icons)). It adds no query, and shows nothing until Business info has a profile.
- **Agencies** get **Offer an interactive map** in the Design tab's collapsed Advanced area (off by default).
- **Directions.** A plain link to `https://www.google.com/maps/dir/?api=1&destination=…`, opened in a new tab (with the
  "opens in a new tab" notice for screen readers). The destination is the **map coordinates** from Business info
  _Advanced_ when they are set (an exact pin), otherwise the address in full ("1 King Street, Newtown NSW 2042,
  Australia"), always URL-encoded (`utils/location-links.ts`, unit tested). With neither, there is no button.
- **No Google by default.** The page holds no Google iframe, script or request, and following the directions link is
  the visitor's own navigation. With the interactive map on, a "Load interactive map" button and a note ("This map comes
  from Google. Loading it shares your visit with Google.") appear; only the click adds the `<iframe>`
  (`output=embed`, the keyless Google Maps embed address) and moves focus to it. The button is a client island
  (`map-embed.tsx`, no listeners or timers) drawn only after hydration, so without JavaScript there is no dead button
  and everything else is still there. The static map or card is server-rendered and swapped for the frame on click.
  The embed address is not Google's official, keyed Maps Embed API; it is the long-standing public one. Check it loads
  on the live site, and switch to an API-key embed in `utils/location-links.ts` if Google changes it.
- **Data, with no query.** Business info is already in `SETTINGS_QUERY`. The route resolves it with
  `getLocationBusiness` (`src/features/site/api/get-location-business.ts`: the settings the footer already fetched, so
  the same cache entry, cleaned with `stegaClean`, upcoming special days from `getToday`, and the `tel:` link from
  `parseAuPhone`) and passes it down `PageView` → `SectionRenderer` → `SectionProps.business` (`LocationBusiness`,
  `src/types/business.ts`), because a section can't import the site feature. The page, A/B and section-gallery routes all
  pass it; a new route that renders `PageView` or `SectionRenderer` must too. As in the footer, the business text is not
  click-to-edit in Presentation.
- **Hours.** The shared `OpeningHours` (grouped days, closed days, split shifts, upcoming special days) and the optional
  `OpenNowBadge`, which works out open or closed in the browser from the business time zone (see _Business info_).
- **Contact.** Phone and email are text and links (`tel:` and `mailto:`); a phone number we can't dial shows as text.
- **Tests.** `location-links.test.ts` and `location/index.test.tsx` (unit: the encoded URLs, switches, nothing to show, no
  `<iframe>` in the server markup); `tests/e2e/location.spec.ts` on the `/location` fixture page (address, contact,
  hours and special days, the directions link, the badge in the business time zone, a map image, no request to Google
  before the click and the frame, focus and title after it, no JavaScript, axe before and after loading the map). The
  section gallery has `location`, `location-image`, `location-interactive` and `location-address-only`; their screenshot
  baselines need the **Update visual baselines** workflow (macOS skips visual tests).

### Social icons

`SocialLinks` (`src/components/ui/social-links.tsx`) draws labelled icon links in four styles (plain, circles, rounded
squares, squares), so social profiles look the same everywhere. It is used by the [Link list](#link-list), the footer,
the [Location](#location) section and team profile pages.

- **Footer** (Studio › Navigation › Footer, agency only): _Show social icons_ (off by default, so nothing changes) adds a
  row of Business info's profiles above the copyright line, and _Social icon style_ picks the shape. The icons come from
  Business info, so editors change them there. The flag rides in `SETTINGS_QUERY` (no extra request).
- **Location:** _Show social icons_ in the section's content (off by default).
- **Team profiles:** each member's social links are icons named "<name> on <network>" ("Ann Lee on LinkedIn"). A member
  whose _Show social links as_ is _Text links_ keeps the visible text links.
- **`rel`.** The site's own profiles (footer, Location, Link list) take `rel="me"`. A team member's links take
  `rel="noopener"` only: the profile is theirs, not the site's, so the page must not claim it.
- **Tests.** `social-links.test.tsx` and `location/index.test.tsx` (unit); `tests/e2e/social-icons.spec.ts` (each
  placement, keyboard focus and axe). The footer test turns the switch on in the fake lake
  (`POST /__fixture/footer-social/on`) and expires the cached settings, because the fixture leaves it off. No public
  JavaScript is added: all three are server-rendered.

### Team

Team members are documents (`teamMember`, in `src/features/team`), shown by the **Team** section and, when the site has
profile pages, on their own page at `/team/<slug>`.

- **A member.** _Name_ (required), _Role_, _Portrait_ (required, square, 800 px or wider; alt text is required and the usual
  image guidance warns about size and shape), _Short bio_ (up to 300 characters; the cards and the page's search
  description) and _Order_ (a number; editors rarely touch it, see below). If the site has profile pages there are also
  two collapsed groups: **Profile page** (_Page address_, _Full bio_ in rich text, _Qualifications_ as tags) and
  **Contact details** (_Public email_, _Phone_, _Social links_ with a platform and an https link, and _Show social links as_: icons by default, or text links). With
  [`teamProfiles`](#site-profile) off those fields are hidden, so editors are not asked for what the site never shows.
- **Ordering.** _Team_ in the desk is a custom list (`src/features/studio/team-order/`), not the stock document list.
  Drag a row, or use its up and down buttons (keyboard and touch), and everyone is numbered 1, 2, 3… in `order`. Only the
  members whose number changed are written, to the published document and any draft, so a later publish never undoes
  the order. The list listens to the dataset, so another editor's change appears at once. Members with no `order` come
  last, then by name; the site sorts the same way (`order(coalesce(order, 999999) asc, name asc)`). The writing needs the
  editor to be allowed to edit team members; if it fails, the list reverts and says so. `team-order.test.ts` covers the logic.
- **The section.** _Add item → Team_: _Section title_, _Intro_, **Who to show** (_Everyone_, the first 60 in team order, or
  _Choose members_ with a list of references in the editor's order; references to members who are not published are
  skipped, and "Choose members" with none chosen is a validation error). Agencies pick the **Layout**: _Grid_ (the
  default; one, two then three across), _Slider_ (the shared `Slider` via `LazySlider`: one, two then three in view) or
  _List_ (a row each with a small portrait). A section with no members renders nothing. The members are resolved inside
  `teamFragment` (`src/features/pages/api/sections.ts`), so a page needs no second request.
- **Cards.** Portrait, name (a heading, one level under the section title), role and short bio, drawn by components in
  the pages feature (`sections/team/team-card.tsx`), because the pages feature cannot import the team feature. A card is
  a `MotionDiv` that lifts 4 px on hover (`whileHover`, transform only; Motion drops it for visitors who ask for less
  motion; nothing moves on touch). The name is the card's only link (stretched over the card) when the site has profile
  pages and the member has a page address.
- **Profile pages.** `src/app/(site)/team/[slug]/page.tsx` composes the team feature like the blog post route:
  published members are cached and prerendered (`generateStaticParams` from `TEAM_INDEX_QUERY`), draft mode reads its
  options inside `<Suspense>`. The page has one `<h1>` (the name), the portrait, role, qualifications, short and full bio
  and a "Get in touch" list (email as `mailto:`, phone as `tel:`, social links); anything the member lacks is left out,
  and with no contact details there is no "Get in touch". `Person` JSON-LD carries the name, job title, description,
  image, email, telephone, `sameAs` (social links), `hasCredential` (qualifications) and `worksFor` pointing at the
  site's Organization. Metadata is the name and role, the short bio and the portrait as the share image.
- **404s.** An unknown slug, a member with no page address, one who is only a draft (the published perspective hides drafts), and every `/team/…` URL when
  `teamProfiles` (or `team`) is off answer a real 404, checked against the cached `TEAM_INDEX_QUERY` first so probing costs
  nothing. Drafts skip the check so an unpublished member can be previewed in Presentation.
- **Slugs.** A member's address is one path segment (`ann-lee`; `utils/slug.ts`). In the page schema `team/<anything>` is
  reserved, because `/team/[slug]` would answer first, but a page called exactly `team` is allowed: that is where the
  Team section usually lives (`reservedSegment`, `src/features/pages/utils/reserved-slug.ts`, unit tested). The proxy
  leaves `/team/…` out of A/B tests (they are not CMS pages).
- **Sitemap.** Profile pages are listed after the pages and posts (`getTeamSitemap`, from the cached index, so no extra
  request). A member without an address is not listed.
- **Studio.** Presentation opens `/team/<slug>` on the member and lists their page under "Used on these pages"; a member
  with no page shows a note instead. Quick action "Update the team" on Start here opens the Team list.
  Clients see _Team_ by default (`CLIENT_STRUCTURE_IDS`), and may add the Team section if `team` is in `clientSections`.
  Publishing a member whose address changed does not offer a redirect (that confirmation covers pages and posts); add one
  under _Redirects_.
- **Adding a field** means the schema (`src/features/team/schemas/team-member.ts`), the queries (`TEAM_MEMBER_QUERY` for the
  page, `teamCardFields` in the section fragment for cards), then `npm run typegen`. Keep contact fields on the profile page
  only: a card is a link, and a phone number in a link is hard to use.
- **Tests.** Unit: `slug.test.ts`, `phone.test.ts`, `social.test.ts`, `team-order.test.ts`, `reserved-slug.test.ts`,
  `sitemap-chunks.test.ts` (three lists) and the profile switch in `profile.test.ts`. End to end: `tests/e2e/team.spec.ts`
  (the section on `/team`: order, picked members in order, linked or not; the hover lift with and without
  reduced motion; a profile page with its contact details, JSON-LD and metadata; no-contact member; 404s for an unknown
  slug and a member with no address; the sitemap; axe) and `accessibility.spec.ts` (`/team`, `/team/ann-lee`).
  The section gallery has `team-grid`, `team-slider` and `team-list`; their screenshot baselines need the **Update visual
  baselines** workflow (macOS skips visual tests).

### Events

A content calendar: what is on, when and where. Events are documents (`event`, in `src/features/events`), shown by the
**Events** section and on their own pages at `/events/<slug>`, with a calendar file for each and a feed people can subscribe
to. It is **not** booking availability (task 95): an event is something that happens, not a slot a customer picks. External
calendar sync (Google or Outlook) is out of scope; the feed is the way in. A month grid is task 98; the section leads with a
list and an agenda, which is what most clients need.

**Default, presets, advanced.**

- **Default:** add events, then _Add item → Events_. It shows the next six, soonest first, nicely, with nothing else to set.
  Past events drop off by themselves.
- **Presets** (the Layout picker, with pictures): _List_ (a row each: date badge, when and where, title, summary), _Agenda_
  (grouped by day, times in a column) and _Featured_ (the next event large with its picture, the rest beside it).
- **Advanced** (agency-only, Design tab → Advanced): _Only show one category_ and _Most to show_ (empty: six rows, ten agenda
  entries, four featured; 24 at most). On an event, the collapsed **Repeats** group.

**An event.** _Title_ and _Page address_ (a single path segment; `feed` is taken), _Start_, _End_ (optional), _All day_,
_Time zone_ (starts as Business info's), _Summary_ (the cards and search results), _Description_ (rich text, stored as
`body` like posts: a field called `description` that isn't text would change the type of every query that reads the site
description), _Image_ (alt text required), _Where_ (_At a venue_: name and address, or _Online_ with the link to join),
_Category_ (a reference to an _Event category_), _Registration button_ (a label and the shared **Goes to** action: a page, a
website, and booking or a panel once those exist), _Status_ (_Scheduled_, _Cancelled_ or _Sold out_) and _Places note_ (text
such as "Limited to 12 people"; it does not count bookings). Cancelled and sold-out events stay on the site with a label, and
the registration button goes. Validation: the end must be after the start (an all-day event may end on its first day), a
timed event needs a time zone, an online event needs its link, and the last date of a series can't precede its first.

**Time zones.** Times are stored as instants and shown in the **event's** time zone for everyone ("Sat 14 Mar, 10:00 am –
12:00 pm"; the event page also names the zone, "AEDT"), so a visitor in Perth sees Sydney's 10 am rather than a guess at
their own. The picker offers the same zones as Business info (`TIME_ZONES`, `src/lib/time-zones.ts`). An all-day event is
dates only, in that zone. An event saved with no zone (an all-day event) uses Business info's.

**Repeats.** _Does not repeat_, _Every week_, _Every fortnight_ or _Every month, on the same weekday_ (the second Tuesday
stays the second Tuesday; the fifth means "the last", so every month has one), with an optional **last date** and **days it
doesn't happen** (public holidays, school breaks). Occurrences are worked out when they are needed, in a pure function
(`expandOccurrences`, `src/lib/events/recurrence.ts`); nothing is stored per date. They keep the same wall-clock time across
daylight saving changes: a Tuesday 10 am class in Sydney is 10 am before and after the clocks move, which is a different
UTC instant. Without a last date a series never ends, so give classes one at the end of term. The List and Featured layouts
show a series once, at its next date; the Agenda shows each of its next dates (at most eight per series).

**The section.** _Section title_ (starts as "What’s on"), _Intro_, an optional **“See all events” link** (any **Goes to**
action; usually your page with every event) and its text. A section also offers "Subscribe to the calendar" (the feed) unless
it is filtered to one category, since the feed lists them all. A section with nothing coming up says so, and keeps its links.

**How "upcoming" works without the clock.** Pages are cached, and the clock may not be read in a cached result. So the query
returns events without looking at the date (it keeps the 200 that matter longest, ordered by `eventLastRelevant`, so a long
history can't crowd out what is coming), and the list is worked out **per request**, in a small `<Suspense>` boundary of its
own (`requestTime()`, `src/lib/request-time.ts`): the title, intro and links stay prerendered, and only the list streams in
(a placeholder holds its place so nothing jumps). It adds no client JavaScript. Two consequences: the list needs JavaScript
to appear in the page (React swaps the streamed list in; without it only the placeholder and the links show, and the events
are still reachable through their pages, the feed and the sitemap), and an event disappears the moment it ends, with no
rebuild. An event under way still counts, and an all-day event stays up to the end of its last day.

**Event pages.** `/events/<slug>` has one `<h1>`, the summary, the image, the description and a details panel (when, where
with a "Get directions" link or the online link, places note, the registration button, and Add to calendar). A series shows
its next date, the next five dates and its repeat; those are worked out per request in their own `<Suspense>` boundary, so
the page is otherwise prerendered like a post. The page has `Event` structured data (`schema.org`): `startDate` and
`endDate` with the zone's offset (dates only for all-day events), `eventStatus` (`EventScheduled` or `EventCancelled`),
`eventAttendanceMode`, `location` (a `Place` or a `VirtualLocation`), `offers` pointing at the registration address
(`InStock`, or `SoldOut`; none for a cancelled event or a button with no address of its own) and the site's Organization as
`organizer`. The share image is generated and branded (`/api/og/events/<slug>`: site name, the event's date or repeat, title,
venue, in the brand colours), so it always carries the date. Metadata is the event's title and summary.

**Add to calendar.** Each event page offers _Add to Google Calendar_ and _Add to Outlook_ (links built from the event: the
next date of a series) and the file for Apple Calendar and others.

- `/events/<slug>.ics` is one event as an iCalendar file (RFC 5545): `DTSTART;TZID=Australia/Sydney:20261105T100000`, a
  `VTIMEZONE` generated from the zone's real daylight saving changes (so an app that doesn't know the zone still shows 10 am
  as 10 am), text escaped (commas, semicolons, backslashes, line breaks) and lines folded at 75 bytes. A series is **one**
  entry with an `RRULE` (`FREQ=WEEKLY;BYDAY=TU;UNTIL=…`, `FREQ=MONTHLY;BYDAY=2TU`, …) and `EXDATE`s for skipped days, so a
  calendar keeps the whole series. A cancelled event is written `STATUS:CANCELLED`; all-day events are dates. The file is
  prerendered and refreshed with the event.
- `/events/feed.ics` is every upcoming event, for **Subscribe** in a calendar app (use the address, or `webcal://` in place
  of `https://`). It renders per request so finished events fall out, asks calendars to refresh every 12 hours and sends
  `s-maxage=600`. The calendar is named after the site ("Test Co events"). It costs no Sanity request.
- `next.config.ts` rewrites both to handlers under `/api/events`; the feed first, so `feed` is never read as a slug. That is
  why an event can't use `feed` as its address.

**Studio.** _Events_ in the desk has _Upcoming_ (soonest first), _Past_ (latest first), _All events_ and _Categories_. The
list subtitle reads "Sat 14 Mar, 10:00 am · Workshop" (the category is left out when unset, and "· Cancelled" or "· Sold
out" is added). Presentation opens `/events/<slug>` on the event. Clients see _Events_ by default
(`CLIENT_STRUCTURE_IDS`); _Add an event_ is a card on Start here.

**Slugs.** An event's address is one path segment (`utils/slug.ts`). In the page schema `events/<anything>` is reserved
(`/events/[slug]` would answer first), but a page called exactly `events` is allowed: that is where an Events section with
every event usually lives. The proxy leaves `/events/…` out of A/B tests. Unknown events, drafts (the published perspective
hides them) and every `/events/…` URL when the `events` feature is off answer a real 404, checked against the cached
`EVENTS_INDEX_QUERY` first. Events are in the sitemap after pages, posts and team profiles.

**Adding a field** means the schema (`src/features/events/schemas/event.ts`), the query (`eventCardFields` in
`src/lib/sanity/fragments.ts` for lists, `EVENT_QUERY` for the page, `EVENTS_FEED_QUERY` for the feed), then
`npm run typegen`. Keep anything that needs the date out of the queries: it belongs in the request-time step.

**Tests.** Unit (Vitest): `src/lib/events/` (`time-zone`, `recurrence` including daylight saving changes in Australia/Sydney,
`format`, `calendar-links`, `ics` escaping, folding, `VTIMEZONE`, `RRULE` and `EXDATE`), `src/features/events/` (schema
validation and the Studio subtitle, `json-ld`, `to-ics`, `location`, `registration-url`, `slug`),
`src/features/pages/utils/events.test.ts` (what a section shows at a given time), the Studio's desk filters
(`event-lists.test.ts`, run with groq-js) and the reserved slug. End to end: `tests/e2e/events.spec.ts` (the list hides past
events and orders the rest; labels; the agenda, featured and empty states; the event page, its JSON-LD, share image and
calendar links; the `.ics` content type and body, and the feed; the sitemap; axe) and `accessibility.spec.ts` (`/events`,
`/events/pottery-workshop`). The fixtures are dated from the day the suite runs, except the section gallery's four events
(2099, category _Workshop_), so its screenshots never change. The gallery has `events-list`, `events-agenda` and
`events-featured`; their baselines need the **Update visual baselines** workflow (macOS skips visual tests).

### Logo strip

The **Logo strip** (_Add item → Logo strip_) has two layouts, chosen by agencies in the **Layout** picker (_Grid_ is the
default and looks as it always did: greyscale logos in a wrapped, centred row that turn to colour on hover).

- **Marquee.** One endless row of the same logos that scrolls by itself, faded at both edges, with a **Pause** button
  below it. It pauses while the pointer is over the logos or keyboard focus is on one, and the button holds it still
  until pressed again (WCAG 2.2.2: moving content that lasts over five seconds must be stoppable). The button is the
  marquee's only JavaScript (`marquee-toggle.tsx`, a few lines that set `data-paused`, loaded lazily so other pages don't pay for it); the motion is CSS.
  - _Logo colour_ (Design tab → _Advanced_, shown only for _Marquee_; clients never see it): **Greyscale** (the default,
    turning to colour on hover and focus) or **Full colour**. Stored as `logoColour` (`grey`, `colour`); unset or unknown
    renders greyscale.
  - _Speed._ The loop takes the `motion.marquee-per-logo` design token (5 s) times the number of logos, so the pace stays
    steady whether there are four logos or twenty (a ten-logo row takes 50 s). Edit it in `src/styles/tokens.json` and
    run `npm run tokens`. A `tokens.json` without it (older client sites) uses 5 s.
  - _Reduced motion, and no JavaScript._ Visitors who ask for reduced motion see the **static wrapped grid** instead:
    no animation, no fade, no copy, no button. So do visitors with JavaScript off, since nothing could stop the motion.
  - _Accessibility._ The list is rendered twice so the loop has no seam. The copy is `aria-hidden`, its logos have empty
    `alt`, and its links have `tabindex="-1"`, so screen readers and the Tab key meet each logo once. Short rows are
    spaced out to at least the screen width, so the copy never shows a gap. Animation is `transform` only.
  - _Tests._ `tests/e2e/logo-marquee.spec.ts` checks the copy (hidden, out of the tab order), the duration, Pause and
    Play, pausing on hover and focus, greyscale versus colour, the static grid under reduced motion and without
    JavaScript (on `/logos`, since the gallery streams in with a script), and axe in each state. The gallery has
    `logo-cloud-marquee` and `logo-cloud-marquee-colour`; their screenshot baselines need the **Update visual
    baselines** workflow (macOS skips visual tests).

### Video

The **Video** section (_Add item → Video_) has two layouts, chosen by agencies in the **Layout** picker (_Embed_ is the
default). Both need a **Poster image** (required, with alt text; 16:9 and 1600 px or wider is recommended and warned
about), a **Title** (required; also names the Play button) and an optional **Description**.

- **Embed.** _Video source_ is **YouTube**, **Vimeo** or **Uploaded video (MP4)**; the form shows only the fields that
  source uses.
  - _YouTube / Vimeo:_ paste the address from the browser (watch, share, short and embed links all work, and a Vimeo
    link to an unlisted video keeps its key). Publishing is blocked if the address isn't a video on the chosen service.
    The page shows only the poster, a **Play** button named "Play video: <title>" and a note ("Plays from YouTube" or
    "Plays from Vimeo"). **Nothing from YouTube or Vimeo loads until the click**: no script, no iframe, no request. The
    click swaps in one iframe (`youtube-nocookie.com`, or `player.vimeo.com` with `dnt=1`) with autoplay on and the
    title as its `title`, and moves focus into it. Without JavaScript the poster shows with a "Watch … on YouTube" link.
  - _Uploaded video:_ a native `<video controls preload="none">` with the poster. It downloads nothing until played. An
    optional **Captions file** (WebVTT, `.vtt`) becomes a captions track (English; YouTube and Vimeo supply their own).
    Please caption every uploaded video that has speech.
- **Ambient** (uploaded MP4 only, so _Video source_ is hidden). Words over a dimmed, silent, looping video, like the
  hero's _Full background_ layout (dark by default). It is `muted loop playsInline autoPlay` with no controls, and a
  visible **Pause** button (WCAG 2.2.2: moving content that starts by itself must be stoppable) that becomes **Play**.
  If a browser refuses to autoplay (low-power mode) the button says **Play**. **For visitors who ask for reduced
  motion the poster shows instead**: the video is never requested, and there is no button. The poster is also what
  shows without JavaScript and before the video starts. Keep clips short, silent and compressed; the file field
  **warns above 5 MB** (it doesn't block publishing, because an agency may have a reason). An Ambient section with no
  file renders as an Embed.
- **Shape** (16:9 default, 4:3, 1:1 or 21:9) sets the frame of an Embed. An unset or unknown value is 16:9.
- **JavaScript cost.** The page itself stays server-rendered. The only client code is `video-facade.tsx` (a button and
  one piece of state) and `ambient-player.tsx` (a media-query store and the Pause button), both plain React with no Motion.
  They load through `dynamic` wrappers (`lazy-facade.tsx`, shared with the Embed section's card because each wrapper is itself shared JavaScript, and `ambient-player-lazy.tsx`; the `LazySlider` pattern), so
  a page without a Video section downloads neither: imported directly, they added about 1.5 KB gzipped to every page and
  pushed the home page over its budget. The home page fixture includes an Embed, so the JavaScript budget test covers a
  page that has one.
- **Security headers.** `next.config.ts` sets no `frame-src`, `default-src` or `Permissions-Policy` entry that
  stops a player: its only Content-Security-Policy is `frame-ancestors 'self'` (who may frame _us_), the referrer policy
  is `strict-origin-when-cross-origin` (YouTube needs a referrer), and the iframe's own `allow` attribute delegates
  autoplay, fullscreen and picture-in-picture. If you add a CSP to a project, allow `frame-src https://www.youtube-nocookie.com
https://player.vimeo.com`, and `media-src` / `img-src` for `https://cdn.sanity.io`.
  `tests/e2e/video.spec.ts` checks the headers and that the iframe request is made.
- **Logic and tests.** `src/features/pages/utils/video-source.ts` (unit tested: address parsing including look-alike
  hosts, player addresses, aspect classes, the size warning) is shared by Studio validation and the page. End to end,
  `tests/e2e/video.spec.ts` on `/video`: no iframe before the click and exactly one after (YouTube and Vimeo, with
  their parameters), focus moves into it, the keyboard works, the native player fetches nothing until played, the
  Ambient loop pauses and resumes with the button (headless Chromium can't decode H.264, so the test stands in for
  `play()` and `pause()`), reduced motion shows the poster, and axe passes before and after Play and on the gallery
  entries. The section gallery has `video-embed`, `video-embed-upload` and `video-ambient`; their screenshot baselines
  need the **Update visual baselines** workflow (macOS skips visual tests).
- **Launch check.** Not yet confirmed against the live Sanity CDN: that `cdn.sanity.io/files/...` serves a `.vtt` with
  CORS headers (browsers fetch caption tracks with CORS) and plays the MP4 with range requests. Open an uploaded video with
  captions on a staging page before launch.

### Embed

The **Embed** section (_Add item → Embed_) puts an **approved** third-party form, map or player in a page: Typeform,
Google Maps and Spotify. It never takes embed code, HTML or a script: an editor picks a service and pastes its public
address, and the page rebuilds the iframe address from the ids in it.

- **Fields.** _Heading_ (also the iframe's `title`, so say what it is: "Book a consultation"), an optional _Description_,
  _Service_, _Address_ (shown once a service is chosen; publishing is blocked if it isn't one of that service's
  addresses, and the message shows an example) and _Height_. _Height_ is a picture picker of **Short** (240 px),
  **Medium** (480 px) and **Tall** (720 px). Left alone it follows the service (a Spotify player is short; a form or map
  is medium), and the picker shows that choice as selected without storing it. Agencies also get **Exact height (px)**
  (120 to 1600) in the Design tab's collapsed _Advanced_ area; it replaces the preset.
- **What visitors see.** A card with the service's name, a short note and a button ("Show the form", "Show the map" or
  "Show the player"). Nothing from the service loads until the button is pressed: no iframe, no request, no cookie. The
  note says the service sets cookies before anything loads, and a link (_Open on Typeform_) always offers the service's
  own page in a new tab, which is also all there is without JavaScript. After the click the iframe has the section's
  heading as its `title`, `loading="lazy"`, `referrerpolicy="strict-origin-when-cross-origin"` and focus moves into it.
  The card and the iframe share one height, so nothing shifts.
- **Consent.** Every provider in the registry sets cookies, so each asks for the **marketing** category
  (`src/features/consent`; the store itself is shared, in `src/lib/consent/`). While marketing is off, or the visitor
  hasn't chosen, the card says so, offers **Cookie settings** (which reopens the banner) and the link to the service
  instead of the button. Accepting marketing in the banner brings the button back with no reload, and withdrawing it
  removes an iframe that is already showing. Until the browser has read the choice the card shows the same note as for a visitor who hasn't allowed marketing, so the page looks identical before and after hydration (which keeps the screenshot stable); a returning visitor who allowed marketing sees the button a moment later. A provider with `consent: null` in the registry skips the gate.
- **Sandbox.** The iframe's `sandbox` is the narrowest token list its provider works with, kept in the registry
  (`allow-scripts allow-same-origin` plus what that service needs: forms, popups that escape the sandbox so the
  service's own links work, presentation for Spotify). Never `allow-top-navigation` or `allow-modals`; a test fails if a
  provider adds either.
- **The provider registry** is `src/config/embed-providers.ts`, shared with booking (task 95): `id`, `label`, `noun`,
  `delivery` (`iframe` or `script`), `displays` (`inline` or `dialog`), `setsCookies`, `consent`, the URL `pattern`
  (matched against `https://host/path` only, so look-alike hosts, other ports, credentials and `http` are refused), a
  `resolve` that returns the iframe address and the service's own page from the matched ids, `sandbox`, `allow` and
  `defaultHeight`. The Embed section offers `delivery: 'iframe'` providers that list `inline`. **To add a service**: add
  an entry (a regular expression with named groups, never a catch-all), the registry's test checks that its example
  resolves and that its sandbox stays narrow, then list its iframe host in your CSP if the project has one.
- **Security headers.** As with Video, `next.config.ts` sets no `frame-src`: if you add a CSP, allow
  `frame-src https://form.typeform.com https://www.google.com https://open.spotify.com`. `Permissions-Policy` already
  denies camera, microphone and location, so a Typeform with a video or audio question can't use them.
- **JavaScript cost.** The page stays server-rendered. The only client code is `embed-facade.tsx` (one piece of state and
  the shared consent store, with no listeners, observers or timers of its own), loaded through a `dynamic` wrapper
  (`lazy-facade.tsx`, shared with the Video facade: a second wrapper cost the home page about 100 bytes of a budget with no headroom), so a page without an Embed downloads none of it.
- **Logic and tests.** `src/config/embed-providers.ts` (unit tested: every address form, look-alike and injected
  addresses, heights, the notes) and the section's schema test. End to end, `tests/e2e/embed.spec.ts` on `/embed`: no
  iframe and no provider request before the click, the cookie note, sandbox and `title`, heights, the open link, the
  consent states (accepted, rejected, undecided, changed in the banner) and axe in each. The section gallery has an
  `embed` entry; its screenshot baseline needs the **Update visual baselines** workflow (macOS skips visual tests).
- **Launch check.** Not yet confirmed against the live providers: that each sandbox is enough for the service to work
  (a Typeform submits and shows its thank-you screen, the map's _View larger map_ and the Spotify _Open in Spotify_
  links open, a Spotify track plays), and that the _Short_ height suits Spotify's player. Try one of each on a staging
  page before launch.

### Cursors and interaction feedback

Cursors come from `src/styles/globals.css` (`@layer base`, "Cursors"), not from component classes, because Tailwind 4's
preflight leaves buttons with the arrow. Links, enabled buttons, `[role="button"]`, `summary`, `label[for]`, selects and
checkbox, radio, submit, button and reset inputs get `cursor: pointer`; disabled controls and `[aria-disabled="true"]`
get `not-allowed`; text fields keep the text cursor. Don't add `cursor-pointer` to a component.

Disabled controls also switch to the muted tokens (`surface-alt` background, `ink-muted` text) and ignore hover, from one
rule at the end of `globals.css`. Use `disabled` or `aria-disabled="true"` and the look follows; don't add `disabled:`
colour classes. `CtaLink` has the shared press feedback: one `--duration-fast` transition, an `active:` colour and a
2% scale-down, all removed under reduced motion. A card that leads somewhere uses a stretched link (the title link with
`after:absolute after:inset-0`, see `PostCard`), so the whole card is clickable with one link in the accessibility tree.
`tests/e2e/cursors.spec.ts` checks the computed cursor on a sample of controls.

### Navigation feedback

A thin accent-coloured bar (`RouteProgress`, `src/components/ui/route-progress.tsx`, mounted once in
`site-shell.tsx`, so never in Studio) shows only when a client-side navigation takes longer than 150 ms. Pages are
prerendered and prefetched, so most navigations are instant and show nothing. It replaces `nextjs-toploader`, which
brings two dependencies and patches clicks and history globally for something Next.js exposes natively.

- **Start:** `src/instrumentation-client.ts` exports `onRouterTransitionStart`, which dispatches a
  `currawong:navigation-start` event on `window`. Hash links and links to the page you are already on are ignored.
- **Finish:** `usePathname()` or `useSearchParams()` changing. A 10 s safety timeout hides the bar if Next.js never
  reports a finish. A new navigation restarts the timers, and keeps a visible bar up rather than flashing it away.
- **Look:** a 3 px bar below the top safe-area inset, coloured with `--color-accent` (`.route-progress` in
  `globals.css`). It eases toward 85% with a CSS `transform` transition (no JavaScript animation loop), then
  completes and fades. Under reduced motion it appears at full width and disappears, with nothing growing. It is
  `aria-hidden` and announces nothing.
- **Logic:** the timing is a pure reducer in `route-progress-state.ts`, with unit tests.
  `tests/e2e/route-progress.spec.ts` checks that prerendered navigations never show it and that a navigation
  delayed with `page.route()` does, then hides it.

There is deliberately no `loading.tsx` for `/search`. A `loading.tsx` wraps the page in `<Suspense>`, and streamed
content is hidden until a script reveals it, which would leave the results blank without JavaScript (see the note in
`app/(site)/search/page.tsx`). Add one only to a dynamic route whose slow content can't be served inline, and never
to a prerendered route.

### Section style

Every page-builder section carries one shared `style` object (type `sectionStyle`,
`src/lib/sanity/schema/section-style.ts`), edited in the section's **Design** field group, which is hidden from
clients (UI only: see _Studio roles and permissions_). Sections list their own fields and
`sectionFields([...], initial, { rules, advanced })` puts them in the Content group (the `variant` layout picker
first), adds `style` in Design and puts any `advanced` fields in a collapsed Advanced fieldset. A section type also
passes `groups: sectionGroups` and `fieldsets: sectionFieldsets`.

**How the form is laid out.** `style` is drawn without a box of its own (`options.frameless` on `sectionStyle`, honoured
by `FramelessAwareField`, the Studio-wide `form.components.field` in `sanity.config.ts`), and keeps its stored shape.
`tone` ("Background") and `motion` ("Animation") are `presetField` pickers with thumbnails
(`src/lib/sanity/schema/thumbnails/`; the swatches are drawn from the design tokens, so they follow the palette).
`spacing`, `width`, `align` and `anchorId` sit in one collapsed `layoutOptions` fieldset.

**Which options suit which layout.** The shared type can't see its section, so its `hidden` callbacks and validation
find the section from the field's path (`sectionAtStylePath`, `src/lib/sanity/schema/section-form.ts`) and ask the
rules the section registered through `sectionFields`' `rules` option, keyed by its `_type`:

```ts
sectionFields(content, initial, {
  rules: {
    type: 'hero',
    hasPicture: (section) => ['overlay', 'full-bleed'].includes(section.variant ?? 'overlay'), // Parallax
    fixesAlignment: (section) => ['split', 'editorial'].includes(section.variant ?? 'overlay'), // no Alignment
  },
})
```

A section with no `rules` has no picture (so no Parallax) and offers everything else. Parallax is withheld with the
picker's `visibleOptions` (the stored value is always shown), Alignment with `hidden`, and both warn when a value
from a previous layout is left behind. For fields that depend on the chosen layout, hide them with the layout
(`hidden: ({ parent }) => parent?.variant !== 'split'`). `advanced` fields are agency-only (their own `hidden` is
combined with `hiddenFromClients`) and the fieldset vanishes when none of them apply. Previews read as a sentence
with `joinSubtitle` / `variantSubtitle` ("Hero · Split · Contrast"). The rules are unit tested per section and layout
(`section-form.test.ts`, `sections/section-form.test.ts`, `sections/section-fields.test.ts`).

| Field      | Values                                                                                                                   | What it does                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `tone`     | `surface` · `alt` · `inverse` · `accent`                                                                                 | `data-tone` on the `<section>`; recolours everything inside (see below).                                  |
| `spacing`  | `compact` · `default` · `spacious`                                                                                       | `py-section-compact` / the section's usual / `py-section-spacious`.                                       |
| `width`    | `narrow` · `default` · `wide` · `full`                                                                                   | `max-w-measure-narrow` / the section's usual / `max-w-content` / `max-w-none` and no gutters.             |
| `align`    | `start` · `center`                                                                                                       | Alignment classes for the parts the section aligns (headings, intro, buttons).                            |
| `gradient` | slug of a brand gradient                                                                                                 | A gradient layer behind the content (see _Section backgrounds_ below).                                    |
| `image`    | image with hotspot                                                                                                       | A picture layer behind the content (see _Section backgrounds_); not offered for the hero.                 |
| `overlay`  | `none` · `light` · `medium` · `strong`                                                                                   | How strongly the tone's colour covers the picture.                                                        |
| `edge`     | `none` · `diagonal` · `wave` · `curve` · `arch` · `layered`                                                              | The shape of the section's bottom edge (see _Section dividers_ below); `edge*` siblings hold its options. |
| `anchorId` | slug-like string                                                                                                         | The `<section>`'s `id`. The page's Sections field rejects a repeat (`findDuplicateAnchors`).              |
| `motion`   | `none` · `reveal` · `subtle` · `fade` · `slide` · `stagger` · `float` · `parallax` · `parallaxMedium` · `parallaxStrong` | The animation preset (see _Section animation_); the `motion*` siblings hold its Advanced options.         |

**Rendering.** A section component renders inside `SectionFrame` (`src/components/ui/section-frame.tsx`, a server
component) instead of its own `<section>` and padding, and passes its content as children:

```tsx
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'center' }

export function FeaturesGrid({ data, isFirst }: SectionProps<'featuresGrid'>) {
  const { block, text } = sectionTraits(data.style, DEFAULTS) // alignment classes for headings
  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <header className={`mb-16 max-w-measure-narrow ${block} ${text}`}>…</header>
    </SectionFrame>
  )
}
```

`SectionFrame` renders `<section id data-tone class>` around a container `<div>` that holds the width. The style-to-class
mapping is `resolveSectionStyle` in `src/components/ui/section-style.ts` (pure, unit tested). Keep the headings and the
`isFirst` / `<h1>` rule in the section; pass `isFirst` to the frame so the first section never waits for an animation
(it holds the LCP candidates).

**Empty style means "as before".** `DEFAULTS` is how that kind of section looks with no style: unset fields, and
_Default_ spacing and width, fall back to it, so existing content needs no migration. Keep it equal to the
`initial` argument of `sectionFields` in the section's schema (what a newly added section starts with), and to the
fixture in the gallery. Motion is the exception: it is `none` when unset, and new sections start at `reveal`.

**Tones** are defined in the token CSS (`scripts/build-tokens.mjs` writes them into `src/styles/tokens.generated.css`).
`[data-tone='inverse']` and `[data-tone='accent']` redefine `--color-surface`, `--color-ink`, `--color-ink-muted`,
`--color-line`, `--color-accent` and `--color-focus`; `[data-tone='alt']` only paints the soft background. So section
markup written with `bg-surface`, `text-ink`, `text-ink-muted`, `border-line` and `text-accent` is already right on every
tone: never hard-code a palette class in a section. On the dark tones `--color-focus` becomes the light ink, which is what
the global `:focus-visible` rule draws. Buttons are drawn for a background through `CtaGroup`'s `surface`: pass
`ctaSurfaceFor(tone)` (dark tones get the light buttons). Any element can carry `data-tone` too: the CTA banner's card does.

**Motion presets.** `SectionFrame` asks `sectionMotion` (`section-style.ts`) for a plan from `resolveMotion` and draws it: an
entrance wraps the container in a `MotionDiv` (or, `stagger`, each direct child, so give a section sensible top-level
parts: a header, a list), Float and Parallax wrap the frame's `media` slot (a section that doesn't pass `media` stays still;
the hero backgrounds draw their own, see `HeroBackground`). All of it keeps content visible without JavaScript and with
reduced motion. The presets, their options and the defaults per kind of section are described under _Section animation_.

**Tests.** `section-style.test.ts` covers the mapping; `tests/e2e/section-style.spec.ts` checks tones (axe on every tone for
two sections), the focus colour, spacing, anchors and motion; the gallery has an entry per tone and spacing for the features
grid and the image + text section (ids `features-grid-style-<tone>`, `media-text-style-compact`, …), and a narrow, centred
rich text.

### Section backgrounds

Beyond its tone, a section can have a **brand gradient** and a **background image**, both in the Design tab under
_Background_ (agency only). Editors choose; nothing is configured by default, so a section keeps its tone.

- **Tone** (as before): Page, Tinted, Contrast, Brand, as swatches. It sets the text colours, so text always follows the
  tone, not the picture.
- **Gradient** (optional): a list of swatches, one per gradient in Studio → Design → Brand colours → Gradients. It is
  stored as the gradient's slug (`forest-dusk`) and drawn as `var(--gradient-forest-dusk)`, the variable the site
  already defines, so a re-skin changes it everywhere. The field disappears while there are no gradients. If a gradient
  is renamed or removed, the section shows no gradient and the picker marks it _Not in Brand colours_.
- **Background image** (optional): an image with a hotspot, which keeps the subject in view as the section crops it. It
  is decoration, so it needs no alt text (the page gives it an empty one). **Overlay** appears once there is a picture:
  None, Light, Medium or Strong (45%, 70% and 88% of the tone's background colour laid over the picture). An unset
  overlay is **Medium on the dark tones (Contrast, Brand) and Light on the others**; the picker shows that default as chosen
  and nothing is stored until the editor picks.
- **Not for the hero.** The hero has its own Image, so its Design tab offers the gradient but not the background image
  (`hasOwnBackgroundImage` in its section rules).

**Rendering.** `SectionFrame` draws `SectionBackground` (`src/components/ui/section-background.tsx`, a server component)
first inside the `<section>`: a wrapper that is `absolute inset-0 -z-10 aria-hidden`, holding the gradient layer, the
picture (`SanityImage` with `fill`, `object-cover`, the hotspot as `object-position`) and the overlay, in that order.
Everything is absolutely positioned, so it takes no space and cannot shift the layout (CLS stays at 0 for it). The
picture is lazy unless the section is the first on the page, where it is preloaded because it may be the LCP. The
hero's own background goes above these layers. The style-to-layers mapping (`gradient`, `image`, `overlay`) is
`resolveSectionStyle` (unit tested); only a slug matching `GRADIENT_SLUG_PATTERN` ever reaches a style attribute.

**Contrast warnings in Studio.** `backgroundContrastProblem` (`src/lib/color/background-contrast.ts`) checks that body
text and secondary text reach **4.5:1** and shows a warning (never a block) on the Background image or Gradient field.
A picture is unknown, so it is measured at its worst: the overlay laid over a pure black and a pure white area. A
gradient is measured at each of its colours. Notes for agencies:

- _None_ always warns: a photo can be any colour. _Medium_ passes on Contrast; on Page and Tinted it passes for body text but
  warns for secondary text; _Strong_ passes on Page, Tinted and Contrast.
- _Brand_ with a picture warns at every strength, because its white-on-brand text has little contrast to spare before
  any picture. Prefer Contrast for pictures.
- The check uses the colours in `tokens.json`, as the heading emphasis check does, not custom colours from Brand
  colours; check those with the warnings on the Brand colours document.
- When both are set the picture covers the gradient, so only the picture is checked.

**Picture placement, strength and overlay colour.** With a background image, three more named choices appear (each with a
thumbnail), and a collapsed _Advanced: background_ holds the fine-tuning. Unset, every picture looks exactly as it always
did: Fill the section, the hotspot, Full, the background colour.

- **Picture size**: _Fill the section_ (the default: crops to the section, the hotspot kept in view), _Show the whole
  picture_ (all of it, `object-fit: contain`) or _Actual size_ (not scaled, for small patterns).
- **Picture strength**: _Full_ (default), _Soft_ (60%) or _Faint_ (30%). The picture's layer is made see-through, so the
  section's own background shows through; the overlay then lies on top, as before.
- **Overlay colour**: _Background colour_ (default, the tone's own colour), _Light wash_ (white), _Dark wash_ (near
  black) or _Gradient_, at the existing Overlay strengths (Light 45%, Medium 70%, Strong 88%). A wash stays light or dark whatever the
  tone or brand colours, so it is a plain colour (`SECTION_WASH_COLOURS`), not a token. Text colours still follow the tone,
  so pair a Dark wash with Contrast and a Light wash with Page.
- **Gradient** (`src/lib/sanity/overlay-gradient.ts`): a see-through, multi-stop gradient of the site's own colours on the
  same overlay layer, so it sits above the picture and below the content, covers the whole section however long it is,
  and never fades the content. Three presets with pictures: _Soft top, deep bottom_ (default: the section's colour barely
  there at the top, Primary through the middle, a deep Primary at the bottom), _Even atmosphere_ and _Focused centre_
  (darker edges). The Overlay strength (Light, Medium, Strong) sets how strong it is. The brand colours are the root ones
  (`--tone-accent`, `--color-accent-2`, `--color-highlight`), so a client's Primary is used in any tone. _Advanced:
  gradient_ (collapsed) sets each of the top, middle and bottom stops' colour (Background colour, Light, Dark, Primary,
  Deep Primary, Secondary, Highlight or Custom) and opacity (a 0 to 90% slider); anything empty follows the preset. The
  CSS adds eased in-between stops so it never bands. Studio shows a preview under the picker over the section's own
  picture (a phone-shaped crop, in the site's Brand colours), and the background contrast warning measures each stop over
  the darkest and lightest photo: a soft top usually warns, because there the text sits on the photo itself.
- **Advanced: background** (shown only where they apply): _Position_ (up and down: Top, Middle, Bottom; left and right: Left,
  Centre, Right; for Show the whole picture and Actual size only, since Fill the section uses the hotspot), _Repeat_ (Actual
  size only: No repeat, Repeat across, Repeat down, Tile), _Exact strength (%)_ (5 to 100, wins over the named strength) and
  _Stays put while scrolling_ (off by default).
- A Position or Repeat left over from another size stays visible with a warning saying it is ignored, as Alignment does.
- <a id="section-height"></a>**At least the screen's height** (stored as `fillScreen`; titled _Fill the screen_ before
  v1.7, same meaning) in _Advanced: layout_ on every section: the section is at least the screen tall (`min-h-dvh`, a
  minimum, so long content still scrolls) with its content centred. This is a per-section option rather than a page-level background, so the background travels with
  the section (reordering, shared sections), the page needs no second background field, and the section's tone, overlay
  and contrast check all stay in one place. It is explicit rather than automatic for single-section Minimal pages
  because a Link page is also fine as a short band, and `SectionFrame` cannot see the page. Turn it on for a Link page
  that should have a full-window photo or pattern.
- **Cover the screen** (a _Picture size_, next to Fill the section) is the background half of that, on its own: the
  picture is the window's size (`h-lvh`, so no gap opens when a phone's toolbar hides) and sticks to the top of the
  viewport while the section scrolls past, so a long Link list never stretches a landscape photo to its height. The section
  is then at least the window's height so the picture covers it, but the content stays at the top. Combine it with _At
  least the screen's height_ to centre the content as well. It uses the hotspot, needs no JavaScript, and makes _Stays put
  while scrolling_ redundant (hidden). The background layer clips with `overflow: clip` rather than `hidden`, which would
  stop the sticky layer. Saved sections keep their picture size, so nothing published changes.

**How they are drawn.** All choices map through fixed lookups in `resolveBackgroundImage`
(`src/components/ui/section-style.ts`, unit tested): nine positions to `x% y%` for `object-position` and
`background-position` (Bottom + Centre is `50% 100%`), the same nine to flex alignment classes, each repeat to a
`background-repeat` value, each strength to an opacity. No class name is built from a string.

- _Fill the section_ and _Show the whole picture_ use `SanityImage` with `fill` (`object-cover` or `object-contain`).
- _Actual size_ without repeat uses `SanityImage` at the asset's own width and height (`max-w-none`), placed by flex
  alignment. It cannot use `fill`: the CDN would resize it to the screen, not the picture.
- _Repeat_ draws a CSS `background-image` (the same Sanity URL, `auto=format`), because an `<img>` cannot tile. A CSS
  background cannot be lazy-loaded, so it loads with the page.
- Transparency survives: `.auto('format')` serves WebP or AVIF (both have alpha) and an SVG stays an SVG. The picture is
  decoration, so `alt=""`; it is lazy unless the section is first, where it keeps `preload` as a likely LCP.
- _Stays put while scrolling_ is a `position: fixed` layer inside a wrapper with `clip-path: inset(0)`, because
  `background-attachment: fixed` does not apply to an image element. It applies at 1024 px and wider
  (`lg:motion-safe:fixed`) and not for visitors who ask for less motion; elsewhere the layer scrolls with the section.
  **Not yet measured:** scrolling cost has not been profiled. Before relying on it, scroll a long page with it on in
  Chrome's Performance panel and Safari; if it janks, remove the option rather than shipping it.

**Contrast with a wash and a faint picture.** `backgroundContrastProblem` measures the worst case: the picture at its
strength over a pure black or white area on the tone's background, then the wash at the overlay opacity. Fainter pictures
therefore pass more easily; a wash of the wrong colour for the tone warns, naming the wash.

**Keeping the Studio list in step with the page.** `brandGradients` (`src/lib/color/gradients.ts`) decides which gradients
are usable and their slugs; `resolveDesignTokens` writes the CSS variables from it and the Studio picker lists from it,
so they cannot disagree. The Studio reads the _published_ Brand colours (the site draws what is published), shared for
three seconds between the fields of a form (`fetchBrandGradients`).

**Tests.** `section-style.test.ts`, `background-contrast.test.ts`, `gradients.test.ts`, `section-background.test.ts` and the
hero rule in `sections/section-form.test.ts` cover the logic; `tests/e2e/section-background-image.spec.ts` covers placement on three Link page fixtures (`links-photo`, `links-pattern`, `links-tiled`) at 375, 768 and 1280 px; `tests/e2e/section-background.spec.ts` checks the layers on
the `style-background` fixture page (position, `aria-hidden`, empty alt, lazy and first-section loading, a removed gradient,
server rendering) and runs axe over the gallery entries `features-grid-gradient-*` and `media-text-background-*` (one per
overlay, plus the unset defaults on a light and a dark tone). The fixture's `designSettings` holds two gradients and no
colours; a palette served by `tests/e2e/design-settings.spec.ts` replaces it. Axe cannot measure text over a picture, so
the real guard for pictures is the Studio warning and the overlay values above.

### Decorative dividers

A decorative divider is a small rule _inside_ a section, between two parts of its content: a line, a fading line or three
dots, with an optional middle between two lines: a diamond, an icon (the badge icon set), a few words ("Stay connected")
or a small picture. Not to be confused with [Section dividers](#section-dividers), the shaped edge between two sections.

| Option              | Choices                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Divider             | None (default), Line, Fading line, Three dots, as pictures                                                  |
| In the middle       | Nothing, Diamond, Icon, Words (up to about 30 characters; As typed or Capitals), Picture                    |
| Size in the middle  | Small, Medium (default), Large, for an icon, the words or a picture                                         |
| Length              | Short, Medium (default), Long, Full width: the whole rule, or each line beside a middle                     |
| Thickness           | Thin (default), Bold                                                                                        |
| Colours (collapsed) | Line colour (Inherit is the line colour) and Colour in the middle (Inherit follows the lines); theme or hex |

Words also offer **Letter spacing**: Normal, Wide or Extra wide. Unset preserves the previous
spacing (including the wider capitals). This is the same choice as Link list service categories.

Each option appears only once it applies (three dots take no middle and no length). A fading line fades towards its outer
ends around a middle. Lines, diamonds, icons and pictures are decoration and hidden from screen readers; words in the
middle are read like any text. A picture is a small mark with a transparent background, shown without a blurred
preview (no alt text: it is decoration). CSS and server components only, no JavaScript.

- **Code.** The schema type is `decorativeDivider` (`src/lib/sanity/schema/decorative-divider.ts`, registered in
  `sharedSchemaTypes`), queried with `decorativeDividerFields` (`src/lib/sanity/fragments.ts`), resolved by
  `resolveDivider` (`src/lib/sanity/divider-options.ts`) and drawn by `DecorativeDivider`
  (`src/components/ui/decorative-divider.tsx`).
- **Adding one to another section.** Add a field `{ name: 'divider', type: 'decorativeDivider' }` to the section's Design
  group (agency only), project it as `divider { ${decorativeDividerFields} }`, run `npm run typegen`, and render
  `resolveDivider(data.divider)` with `DecorativeDivider` between the parts it divides, dropping their margin on that
  side. Empty is None, so nothing changes until a divider is chosen. Only the Link list offers dividers so far (build
  plan task 151 lists the candidates).

**Shared surface contrast.** `src/lib/color/surface-contrast.ts` layers background, strength and
foreground independently of section schemas, and checks solid or glass surfaces. Use
`surfaceColourCheck` for a candidate text/background choice and `surfaceTextContrast` for an
effective surface. `card-contrast.ts` maps the Link list’s label fields onto that contract; other
sections should provide their own typed adapter, keeping schema paths out of the shared calculation.

### Section dividers

A section can end in a shape instead of a straight line: a diagonal, a wave, a curve, an arch or a layered wave. The
section below shows through the cut, whatever its background is (a flat tone, a gradient or a picture), and moves up to
meet it, so the colours and spacing come out right without anything to configure.

**For editors** (Design tab, agency only). Under _Bottom edge_ pick a picture: None (the default, a straight edge),
Diagonal, Wave, Curve, Arch or Layered wave. Then, as they apply to the shape:

- **Edge height**: Small, Medium or Large. Smaller on phones.
- **Flip**: mirror the shape left to right (Diagonal, Wave and Layered wave; Curve and Arch are symmetrical, so it is not offered).
- **Accent line**: none, or a thin line along the edge in Primary, Secondary or Highlight.
- **Back wave colour** (Layered wave only): Secondary or Highlight, drawn behind the front wave and partly see-through.
- **Advanced: edge** (collapsed): **Invert** (the shape bulges into the next section instead; not offered for Diagonal,
  where it is the same as Flip) and a **custom height** for phones, tablets (from 768 px) and desktops (from 1024 px), in
  pixels from 16 to 320. A screen size left empty keeps the smaller one's height; the phone falls back to Medium.

The edge belongs to the **upper** section: one owner per boundary, it moves with its section when reordered, and a shared
section carries its own edge wherever it is used. To change a boundary, edit the section above it.

**How it is drawn.**

- _The shapes_ are defined once in `src/components/ui/section-edges.ts` as paths in a 0 to 1 box
  (`viewBox="0 0 1 1"`, `preserveAspectRatio="none"`, so they stretch to any width and height). A shape is the line where
  the section ends; Flip mirrors x, Invert mirrors y. Wave and Layered wave are generated from a sine so they stay smooth;
  the others are written by hand. Everything is unit tested (`section-edges.test.ts`): the paths stay inside the box,
  run the full width, and Flip and Invert each change a wave.
- _The cut_: `SectionFrame` wraps a section that has an edge in `[data-section-edge-frame]` (lifted with a `z-index` that `SectionRenderer` lowers
  for each later section, so every cut sits above whatever follows it) and sets `--edge-mask`, an SVG data URI of the shape. `globals.css` applies it to the
  `<section>` as `mask-image` (and `-webkit-mask-image`) in two layers: a solid one for everything above the bottom band,
  and the shape for the band, so **only the bottom band is cut and the content area is never masked**. The section adds the
  edge's height to its bottom padding (`--edge-h`), so its content stays out of the band. Nothing samples colours.
- _The section below_: `SectionRenderer` (`section-renderer.tsx`) puts `data-edge-above` and `--edge-above` (the same height)
  on the element that wraps the next section. `globals.css` pulls it up by that height (negative `margin-top`) and adds the
  same amount to its top padding, so its content lands exactly where it would without the edge. In draft mode the editable
  `<div data-sanity>` wrapper carries the attributes, so Presentation shows the same result. A section that renders nothing
  does not pull the next one up (`:empty`).
- _Heights_ are tokens, `edge` in `src/styles/tokens.json` (`small`, `medium`, `large`; fluid `clamp()` values, smaller on
  phones), written to `--edge-height-*`. The group is optional in a client's `tokens.json` (defaults in
  `scripts/build-tokens.mjs`). A custom height sets three variables switched at the breakpoints (`data-edge-custom`).
- _Accent line and back wave_ are decorative SVGs (`aria-hidden`, `pointer-events: none`) in the frame: the back wave under
  the section, so it shows only through the cut, and the line over it as a stroke with `vector-effect: non-scaling-stroke`,
  so it keeps its width however the shape stretches.
- Browsers **without mask support** show a straight edge: the section is still taller by the edge's height and the next one
  still meets it, only the cut is missing, and the SVGs are hidden (`@supports not`).

**Edge cases.**

| Case                             | What happens                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First section                    | Works like any other; the hero's LCP picture is still preloaded.                                                                                                                                                                                                                                                                                              |
| Last section                     | The footer takes the edge like a section would: `SectionRenderer` adds a band of the footer's colour (`bg-surface-alt`) under the cut (`[data-edge-backdrop]`) and hides the footer's top border. If a project changes the footer's background, change `[data-edge-backdrop]` in `globals.css` to match.                                                      |
| Members-only sections            | A locked section is a stub with no style, so it has no edge and nothing is pulled up under it; the cut above it shows the page colour. Once unlocked, its own edge draws, but the section after it is not pulled up, because the public page does not know the edge until sign-in. In preview (draft mode) every section is complete, so edges work normally. |
| A/B variants and shared sections | Both go through the same `SectionRenderer`; a shared section's edge comes with its `style`.                                                                                                                                                                                                                                                                   |
| Anchors                          | The section below an edge has `scroll-margin-top: 6rem + the edge's height`, so a `#link` lands with the whole cut in view.                                                                                                                                                                                                                                   |
| Reordering                       | Neighbours are worked out at render time, so moving a section moves its edge with it.                                                                                                                                                                                                                                                                         |

**Adding a shape.** Add the line to `LINES` in `section-edges.ts` (a path in the 0 to 1 box that runs from one side to the
other), the value to `SECTION_EDGES` and its title in `section-style-options.ts`, a picker entry in
`section-style.ts` and a thumbnail in `thumbnails/edge-thumbnails.tsx` and the registry (a test fails until all agree), then
add a gallery pair to `tests/e2e/fixtures/dataset.mjs` and run `npm run typegen`.

**Tests.** Unit: `section-edges.test.ts` (paths, heights, spacing variables), `section-style.test.ts` (`resolveEdge`: options that do
nothing for a shape are ignored), `section-style.test.ts` in the schema folder (which options show for which shape). End to
end: `tests/e2e/section-edges.spec.ts` runs axe over every gallery pair, checks by bounding box on phone and desktop widths
that the section below is pulled up by exactly the edge's height while its content is neither covered nor moved, the
mask and its `-webkit-` twin, the layered wave's layers, heights and breakpoints, and the `/edges` fixture page (followers,
members stub, shared section, anchor margin, footer band, layout shift). Gallery pairs are `edge-*` entries (the section
below has a key ending `--below` and is drawn in the same frame); their visual baselines are Linux-only, so run the
**Update visual baselines** workflow after changing a shape or the CSS.

### Paragraphs in plain text

Multiline text boxes (Sanity `text` fields: intros, descriptions, card text, testimonials, short bios, event summaries,
blog excerpts) follow one rule everywhere, in `plainTextParagraphs` (`src/lib/plain-text.ts`):

- **A blank line starts a new paragraph.** Several blank lines in a row are still one paragraph break, so extra empty
  lines never add extra space.
- **A single new line is a line break** inside the paragraph, where the editor pressed Enter.
- Spaces around each line are dropped; text that is only spaces and new lines draws nothing, so no gap is left.

`PlainText` (`src/components/ui/plain-text.tsx`, server only, no JavaScript) draws it. One paragraph is the same single
`<p>` the sections always drew, so existing text looks the same; several are a `<div>` holding a `<p>` each, spaced 0.75em
(it follows the text size), never a `<p>` inside a `<p>`. Everything is plain strings rendered by React, so nothing typed
is ever treated as HTML. The hero's description (a motion element) and testimonial quotes (quotation marks around all the
paragraphs) use `PlainLines` and `PARAGRAPH_GAP` from the same file. Visual editing still works: the invisible
click-to-edit characters move to the end of the last paragraph.

Not affected: one-line `string` fields (labels, names, eyebrows, link descriptions), addresses, embed code, SEO and form
messages, and Portable Text (rich text and headings), which has its own blocks. Use `PlainText` for any new multiline
`text` field shown on the site.

**Rich text later.** Bold, italic, links, lists or coloured words belong in Portable Text, the format the rich text section,
team and author bios and heading highlights already use (`src/components/ui/rich-text.tsx`, `rich-heading.tsx`), not in a
syntax typed into plain text. A field moves to it with a migration like
[`hero-title-to-heading-text`](migrations/hero-title-to-heading-text/index.ts): each plain-text paragraph becomes one
`block`, which is why paragraphs are split on blank lines and nothing else. There is deliberately no punctuation parser
that colours bullets inside ordinary text: lists of labels use Service categories (`InlineList`), and highlighted words
will use Portable Text annotations.

### Highlighting words in a heading

Editors select words in a heading and choose how they stand out. Every section's title uses it: the hero, CTA banner,
media + text, features grid, FAQ, form, newsletter, pricing, process, stats, team, testimonials, gallery, logo strip,
location, events, video, embed and link list. Item titles inside a section (a feature, a plan, a step) stay plain text.

**For editors.** Select the words in the title and click **Highlight**, then pick one of six looks: _Brand colour_,
_Solid colour_ (any colour you choose), _Gradient_, _Highlight colour_ (a soft marker behind the words), _Underline_ or
_Bold or italic only_. **Bold** and **Italic** are switches that go with any look, so "bold brand colour" is one
highlight. Studio checks a solid colour against the section's background like a gradient colour (3:1, a warning only),
and a call to action banner is checked against its own card. With no highlight the heading looks as it always did. Gradient shows one picker: the gradients from **Design → Brand colours** by name (the same names a
section's background offers), then _Brand to ink_ (the default), then _Custom_. See
[Custom gradient colours](#custom-gradient-colours). Studio warns, and never blocks
publishing, when more than two phrases are highlighted, the title is longer than the design handles, or a look is hard to
read on the section's background (large text needs 3:1, and every gradient stop is checked). On the _Brand_ background a
brand colour is the same as the text colour, so it shows no difference: pick another look or background.

#### Custom gradient colours

Choose **Gradient → Custom** to blend your own colours across the words.

**For editors.** Custom shows two or three colours (a swatch and a hex code, like Brand colours: type `3266e4` or use
the picker) and, in the collapsed _Advanced_ area, the **Angle** (90 is left to right, the default; 180 is top to
bottom). Any colour is allowed: Studio never blocks one. Instead each colour shows a contrast badge against the
section's background (large text needs 3:1), the field warns when a colour is hard to read, and **Suggest an accessible
shade** moves the colour's lightness (OKLCH, as Brand colours does) to the nearest shade that reaches 3:1. Changing the
section's background (its tone) changes the check. A gradient from Brand colours is checked the same way, stop by stop.
The built-in gradients, the Brand highlight and the other treatments are measured with the site's Brand colours too.

**Custom colours bypass the brand palette on purpose.** A heading can use colours that are not in Design → Brand
colours, and a re-skin does not change them. Anyone who can highlight words can do this; there is no separate
permission. If a client should only use their brand colours, create their gradients in Brand colours and tell editors to
pick from the list.

**For developers.**

- **Stored on the `emphasis` annotation:** `gradient` is `brand` (Brand to ink, the default), `custom`, or
  `brand-colours:<slug>` (a Brand colours gradient; the slug is the one `--gradient-<slug>` uses). `custom` also uses
  `stops` (two or three `#rrggbb` strings) and `angle` (an integer, default 90). `brand-green` and `brand-red` are no
  longer offered (they use the success and danger colours) but content that stored them is drawn and checked as before,
  so no content changes. The heading is queried whole (`heading`), so the new fields arrive without changing the
  fragments; `npm run typegen` updates the types.
- **Nothing from the content is free CSS.** `gradientCssFor` (`src/config/heading-gradients.ts`) builds the gradient:
  presets from the list, custom gradients from `validStops` / `validAngle` (`src/lib/color/heading-gradient.ts`: six-digit
  hex only, an integer angle wrapped to 0-359), and Brand colours gradients as `var(--gradient-<slug>, <default>)` with
  a slug that must match `GRADIENT_SLUG_PATTERN`. A half-filled Custom, or a slug that is not valid, draws the default.
  A Brand colours gradient deleted from Design settings falls back to the default through that `var()` fallback, so the
  words never turn transparent over nothing.
- **Rendering** is unchanged apart from the value of `--emphasis-gradient`: `background-clip: text`,
  `box-decoration-break: clone`, a solid accent where that is unsupported and `CanvasText` under forced colours.
- **Contrast:** `emphasisContrastProblems(tone, phrases, brandGradients)` and `stopContrast(tone, hex)` in
  `src/lib/color/heading-contrast.ts`. The field validation fetches the Brand colours gradients only when a phrase picked
  one by name. The colour input is the Brand colours input (`ColourInput`) with `options.headingStop`; it reads the
  section's tone from the form (`headingSectionPath`) and is composed in `sanity.config.ts`, because a shared or studio
  module may not import a feature.
- **Studio picker:** `heading-gradient-input.tsx` (features/studio) lists Brand colours, then the field's own list
  (Brand to ink, Custom). A stored value that is no longer offered stays visible so it can be changed.

**For developers.**

- **Adding it to a section:** in the schema use `headingField({ name: 'heading', max, requiredUnless: 'title' })` plus
  `legacyTitleField(max)` (the old string, shown only on content not yet migrated); in the fragment add
  `heading, "headingPlain": pt::text(heading)` next to `title`; in the component
  `const title = sectionTitle(data)` (`src/lib/sanity/section-title.ts`: the heading's words, else the old title; use it
  for "has a title?", labels and accessible names) and
  `<RichHeading as="h2" blocks={data.heading} fallback={title} className=... />`. The check reads the background with
  `headingTone` (`src/lib/sanity/heading-text.ts`), which knows the CTA banner's card.
- **Solid colour, bold, italic:** `treatment: 'colour'` stores `colour` (a `#rrggbb` string; only a validated hex reaches
  the `--emphasis-colour` custom property). `bold` and `italic` are booleans on the annotation, drawn as
  `data-bold` / `data-italic` on the same `<span>` (heavier weight 800, `font-style: italic`), not `<strong>` or `<em>`,
  so the accessible name is still just the words. `plain` is the look with nothing but bold or italic, and the schema
  requires one of them.
- **Migration:** `npx sanity migration run section-titles-to-heading-text` (dry run first, then `--no-dry-run`) copies each
  section's `title` into `heading`. It is safe to run twice, keeps `title` so the page still reads it until the run, and
  skips the hero (its own migration, below). Run it on every dataset, then remove the old `title` fields in a later release.
- **Type:** `headingText` (`src/lib/sanity/schema/heading-text.ts`) is a Portable Text array limited to one block, the
  normal style, no lists and no decorators, with one `emphasis` annotation (`treatment`, and `gradient` for Gradient).
  Add it to a section with `headingField({ name, max, defaultTone })`, which adds the length and contrast warnings (the
  tone is read from the section's `style.tone`, else `defaultTone`).
- **Queries:** project the blocks for rendering and `pt::text()` for everything that needs plain text (metadata, search,
  the share image, breadcrumbs, aria): `heading, "headingPlain": pt::text(heading)`. The hero's fragment does; pure helpers
  for plain text and phrases are in `src/lib/sanity/heading-text.ts`.
- **Rendering:** `<RichHeading as="h1" blocks={heading} fallback={title} />` (`src/components/ui/rich-heading.tsx`, a
  server component). It draws only `<span data-emphasis="brand|gradient|highlight|underline">`, so the accessible name is
  the words. The look is the `[data-emphasis]` rules in `globals.css`, which use the tokens and follow the section tone.
  Gradients: `background-clip: text` with a transparent fill and `box-decoration-break: clone`, so wrapped lines keep the
  whole gradient; a solid accent where that isn't supported and `CanvasText` under forced colours.
- **Tokens and presets:** underline thickness and offset and the highlight strength are `emphasis` tokens in
  `tokens.json` (optional). The built-in gradient presets are in `src/config/heading-gradients.ts`: stops are colour
  tokens (so they follow a re-skin and the tone), the first is the default, and a stored value is never renamed. Named
  gradients come from Brand colours and custom ones from the annotation (below).
- **Contrast:** `src/lib/color/heading-contrast.ts` resolves the colours the way `[data-tone]` does and checks each
  treatment at 3:1. Keep it in step with the CSS if you change the highlight or the tone rules.
- **Old title:** the hero reads `heading` first and falls back to the plain `title`. Run the migration on every dataset,
  then remove `title` in a later release.

```bash
npx sanity login                                                    # once
npx sanity migration run hero-title-to-heading-text                 # dry run: prints each patch, writes nothing
npx sanity dataset export production backup.tar.gz                  # backup
npx sanity migration run hero-title-to-heading-text --no-dry-run    # asks before it writes
```

It converts each hero's `title` into one block in `heading` (pages, shared sections, drafts and release versions), keeps
`title`, and is safe to run twice. Publish the migrated drafts afterwards. Delete the folder once every dataset has run it.

### Statistics

A row of headline figures ("12,500+ projects delivered"), as a section of its own and as a compact bar for the hero.
Both read the same two shared types, `statItem` and `statsBar` (`src/lib/sanity/schema/stats.ts`).

**For editors.** Add a **Stats** section. It starts with three example figures (replace them) and looks finished as it
is. Each figure has a **value** (type `12500`, not `12,500`: the site adds the commas), a **label** and, under _Number
format_, an optional **prefix** (`$`), **suffix** (`+`, `%`, `m`) and **decimal places** (0 to 3; `4.9` needs 1). A
section holds one to six figures; Studio warns when text is too long, and never blocks publishing. The agency-only
**Layout** is _Inline_ (big figures side by side on the page) or _Cards_ (one card each). The figures count up from 0 the
first time they scroll into view; set the Design tab's **Animation** to _None_ and they are plain text. A **statistics
bar** is two to four figures and an optional caption; the hero shows one in its supporting slot (_Hero supporting
content_).

**For developers.**

- **Schema:** `statItem` is `value`, `label` and (in a collapsed _Number format_ fieldset) `prefix`, `suffix`, `decimals`;
  `statsBar` is `items` (2 to 4) and `caption`. Reuse them in any schema with `type: 'statItem'` or `'statsBar'`, and in
  GROQ with `statItemFields` / `statsBarFields` (`src/lib/sanity/fragments.ts`), so a hero folds them into its existing
  query: `statsBar { ${statsBarFields} }`. No extra request.
- **The figure is formatted on the server.** `formatStat` (`src/lib/stats/format-stat.ts`, unit tested) uses
  `Intl.NumberFormat('en-AU')` with exactly `decimals` places, then adds prefix and suffix. The result is in the HTML, so
  it is right for search engines, with JavaScript off and under reduced motion. Pass a figure through `cleanFigure` before
  formatting a stega-encoded value (draft mode); `StatFigure` does.
- **`StatFigure`** (`src/components/ui/stat-figure.tsx`, server) renders one figure. Not animated, it is plain text.
  Animated, the counting text is `aria-hidden` and a visually hidden span holds the final value, so a screen reader hears
  it once, not "0, 3, 41". It is `tabular-nums` with a `min-width` of the final text's width in `ch`, so the box is the same
  size from the first frame to the last and the count shifts nothing (CLS stays 0).
- **`CountUp`** (`src/components/motion/count-up.tsx`) is the island: `useInView` (once), then `useSpring` (1.6 s, no
  overshoot; Motion's spring takes milliseconds) into `useTransform`, written straight to the text node, with no React
  render per frame. It never counts under `prefers-reduced-motion`, and ends by writing the server's text exactly. Server
  components import `count-up-lazy.tsx` (`next/dynamic` in a client file, like `LazyParallax`), so its code is a separate
  chunk that only a page rendering an animated figure downloads. A page without statistics pays nothing, so the home page
  budget is unchanged.
- **When it counts:** any Animation but _None_ (the section starts on _Fade up_). _None_ means no count-up, and so
  does being the page's first section (`SectionFrame` never animates the first section either).
- **`StatsBar`** (`src/components/ui/stats-bar.tsx`) is the hero-slot component: no section frame, no colours of its own
  (text, muted text and dividers come from the surrounding tone, so it reads on a dark or a light hero). Its columns follow
  its own width (container queries), not the screen's: three figures sit in a row from about 32 rem across, four from about
  42 rem, and narrower than that they wrap two to a row, which is what lets one bar suit a full-width hero, a text panel and
  a narrow column. Every figure has a thin divider before it and the row is pulled one gutter to the left inside an
  `overflow-hidden` box, so the first figure of each row loses its divider however the row wraps. Pass `animate` only when
  the hosting section's Animation is not _None_, and `centred` under a centred heading. `/section-gallery/stats-bar` shows it
  on all four tones (404 outside development and the end-to-end run).
- **Tests:** unit tests for the formatter and `StatFigure`; `tests/e2e/stats.spec.ts` checks the final values in the
  server HTML, axe on both layouts and the bar, the divider and 2×2 layout, a real count-up (and that its box never changes
  size), reduced motion, no JavaScript and Animation _None_. The gallery has `stats-inline`, `stats-cards` and
  `stats-cards-six` (dark, no animation); the `/stats` fixture page holds an animated and a still section below the fold.

### Process timeline

A numbered list of steps ("Discover, Design, Build, Launch") beside a line that fills as the visitor scrolls.

**For editors.** Add a **Process** section. It starts with four example steps (replace them) and looks finished as it
is. Each step has a **title**, an optional short **label** above it ("Week 1"), optional **text** and an optional
**icon or image** (decorative; the title says what it means). A section holds two to ten steps, in the order the page
reads; Studio warns when text is too long and never blocks publishing. The agency-only **Layout** is _Vertical_ (one
line down the left, every step beside it) or _Alternating_ (from tablet width the line runs down the middle and steps
fall to the left and right in turn; phones always see the vertical layout). The first step is visible immediately;
later steps appear as they scroll into view (the _Stagger_ animation). Set the Design tab's **Animation** to _None_ and they are simply there. The
line fills as the page scrolls either way.

**For developers.**

- **Markup:** an `<ol>` of `<li>` steps, each with an `aria-hidden` number on the line, an optional label, an `<h3>`
  title and text. The line is decorative (`aria-hidden`). The order is the order of the `steps` array.
- **Components** (`src/features/pages/components/sections/process/`): `index.tsx` picks the layout from `variant`;
  `vertical.tsx` and `alternating.tsx` differ only in where the line runs and which side a step sits on, and share
  `process-layout.tsx` (header, line, list) and `process-step.tsx` (one step, a `MotionLi`).
- **The line** (`process-timeline.tsx`, client): `useScroll({ target, offset: ['start 80%', 'end 60%'] })` drives a
  `scaleY` on an `m.div` with `transform-origin: top`. It is empty when the steps' top is 80% down the screen and full
  when their bottom is 60% down. Only `transform` animates, and Motion uses a ScrollTimeline where the browser has one,
  so there is no scroll listener of ours to clean up. The track is faded out over its last 4 rem so it doesn't trail
  below the last marker.
- **Lazy:** server components import `process-timeline-lazy.tsx` (`next/dynamic` in a client file, like `LazyParallax`),
  so Motion's scroll code is a separate chunk only a page with a Process section downloads. The home page budget is
  unchanged. The server still renders it.
- **No JavaScript or reduced motion:** the scale is attached only after hydration and never under
  `prefers-reduced-motion`, so the server HTML, visitors without JavaScript and visitors who ask for less motion all see
  the line fully drawn. Steps carry `data-reveal`, which `globals.css` forces visible in both cases.
- **Later steps reveal** with the section's animation preset (`stagger` by default, so `DEFAULTS.motion` is `'stagger'` in
  `process-layout.tsx` and the schema's initial style). The section resolves it with `sectionMotion` and each step plays
  its child variant as it arrives, rather than the whole list waiting for its top to enter, which on a tall list would
  reveal steps before they are on screen. The `SectionFrame` itself is given `motion: 'none'` so nothing animates twice.
- **Tests:** `tests/e2e/process.spec.ts` checks the `<ol>` and step order in the server HTML, axe on both layouts and a
  page, the line empty above, part drawn midway and full below the timeline, the reveal, reduced motion and no
  JavaScript. The About fixture page holds an alternating timeline, so the memory test (`memory.spec.ts`) repeats it.
  The gallery has `process-vertical` and `process-alternating` (it has no `MotionProvider`, so it shows the layout only);
  the `/process` fixture page holds one below the fold.

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

### Link list

The **Link list** section (_Add item → Link list_) is a profile, social icons and a list of links, usable on any page. On its
own page it is a link-in-bio page (the kind people open from an Instagram profile) built from the site's own design
tokens, tones and section backgrounds, so it looks like part of the site. There is no separate page type and no duplicated
rendering: the **Link page** template is a page with this section and one page option.

**Five minutes for a new Link page.**

1. _Pages → New → Link page_. It starts at `/links` with a profile, three links and a footer note, and **Minimal page** ticked.
2. Fill in the profile (a picture or logo, a name, optional **Service categories**, a bio of up to 160 characters). The social
   icons come from [Business info](#business-info) by default.
3. Give each link a label and a destination (**Goes to**, the same picker as every other link: a page, a website, a section, a
   panel or booking). Drag to reorder.
4. Publish. Add `https://yoursite.com.au/links` to the Instagram bio.

**What a link has.**

| Field            | What it does                                                                                                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eyebrow          | Optional small line above the label ("New", "Free guide"), read before it. A warning past 28 characters. Empty takes no space. Not shown in Compact.                                                                              |
| Label            | The button text. A warning past 40 characters.                                                                                                                                                                                    |
| Where it goes    | The shared link picker (see [Link actions](#link-actions)).                                                                                                                                                                       |
| Description      | A line under the label. Not shown in the Compact layout.                                                                                                                                                                          |
| Icon             | From the shared icon set (eighteen, including Lotus and Gift), picked from a grid that draws each icon above its name. Not shown in Editorial.                                                                                    |
| Show large       | One link is drawn large: the first one ticked. A second tick is ignored (Studio warns). Not used by Compact.                                                                                                                      |
| Heading above it | Optional group heading, as Text or Image. Links under the same heading are grouped; a link with no heading joins the group above it.                                                                                              |
| Show or Hide     | Hide takes a link off the page without deleting it. A hidden link never leaves the Content Lake.                                                                                                                                  |
| Advanced         | A **thumbnail** (Minimal and Cards only; Glass rows draw it beside the icon, the other layouts instead of it), **Show from** / **Show until**, and **UTM** source, medium and campaign (shown for links to another website only). |
| Appearance       | Agency only. _Use the Link list design_ (default) or _Customise this card_; see [Card design and overrides](#card-design-and-overrides).                                                                                          |

Studio warns above 12 links. The link management (add, edit, reorder, hide, schedule) is open to clients.

**Layouts.** The preset bar at the top of the section (agency only, like the hero's) offers six pictures:

| Preset        | Looks like                                                                          | Stored as                                |
| ------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| Minimal       | Full-width buttons, one under the other. The large link is a filled, taller button. | `variant: stacked`                       |
| Cards         | A small thumbnail (or icon) and the text on each card, two across from `md`.        | `variant: cards`                         |
| Editorial     | Larger type, a ruled list, a chevron at the end of each row.                        | `variant: editorial`                     |
| Compact       | Small pills that wrap; for tucking into another page.                               | `variant: compact`                       |
| Image-focused | Cards with a big picture leading each card. Give every link a thumbnail.            | `variant: cards`, `thumbnailSize: large` |
| Glass rows    | Frosted-glass rows over a background photo: thumbnail, icon, text and a chevron.    | `variant: stacked`, `rowStyle: glass`    |

A section has at most four layouts (see [Section variants](#section-variants)), so Image-focused is Cards with large pictures
and Glass rows is Minimal with the glass row style, rather than a fifth and sixth variant. A preset also sets the alignment that suits it (`style.align`), and leaves content and tone
alone; every field stays editable afterwards and the bar shows _Custom_ once one no longer matches. Fields that a layout
doesn't draw are hidden on the links (`enclosingOfArray` reads the section's layout from the document and the field's path).

**Glass rows.** Choose the **Glass rows** preset for a Link page that sits over a full-page photo (give the
section a **Background image** in its Design tab; leave the overlay on _None_ or _Light_ so the photo shows).
Each link is one row on a frosted-glass card, left to right: a **thumbnail** that fills the row's height (rounded
on the outer corners only, about 30% of the row on a phone), a round **icon** badge, the **title and description**,
and a round badge with the section's **arrow style** (a chevron by default; see _Design_ below). Unlike the other layouts, a link can
have an icon _and_ a thumbnail; either, both or neither works, and the row holds together. The whole row is one
link, so there is one Tab stop per row, and every row is at least 44 px tall.

- **Glass strength** (Light, Medium or Strong; Medium by default) chooses how see-through the rows are. It only
  shows for Glass rows. The glass is made from the page colour, so it follows Brand colours, the Appearance
  (light or dark) and the section's background tone with no extra setting.
- **Readability.** The photo behind is unknown, so Studio measures the worst case, as it does for a section's
  background picture (`src/lib/color/glass-contrast.ts`): the glass laid over pure black and pure white. Title and
  description both use the tone's main text colour and must reach 4.5:1. Medium and Strong pass on the Surface, Soft
  and Dark tones; Light passes on Surface and Soft but can fall just short on Dark, and no strength passes on the
  Brand colour tone (light text on the brand colour over a white photo). Studio warns on **Glass strength** when the
  chosen one can fail, and says whether a stronger one would pass. It is a warning, never a block.
- **Tokens.** `glass` in `src/styles/tokens.json`: `light`, `medium`, `strong` (how much of the page colour each
  strength keeps, 0 to 1, increasing), `solid` (the nearly opaque surface), `blur` (12 to 16 px), `border` and
  `border-hover` (how strong the light edge is) and `shadow`. `npm run tokens` writes them as `.glass-row` variables
  in `tokens.generated.css`, defined per element, not at `:root`, so a dark or brand-coloured section's own surface
  colour is the one the glass reads. The rules that use them are `.glass-row` in `src/styles/globals.css`.
- **Fallbacks.** A browser that can't blur (`@supports not (backdrop-filter: blur(1px))`) and a visitor who asks
  for less transparency (`prefers-reduced-transparency: reduce`) both get the nearly solid surface, which reads
  better than the measured glass, so only the see-through strengths are checked.
- **Hover and focus.** The row uses the shared button feedback (`buttonFeedback`) and its edge brightens on hover;
  the focus ring is the one `globals.css` draws for everything.
- **Cost.** None in JavaScript: a server component (`glass-row.tsx`) and CSS. `stacked.tsx` picks it when
  `rowStyle` is `glass`; existing content has no `rowStyle` and renders exactly as before. The Link page template
  still starts as Minimal.
- **Icons.** The shared set gained Care, Sun, Community, Person, Location, Email, Calendar and Phone, so badge rows
  (the hero slot) offer them too. A new one is a line in `BADGE_ICONS` and a drawing in `badge-icon.tsx`.

**Where inline lists are offered.** Link list → Profile → _Service categories_, and Hero → _Eyebrow labels_.
These are explicit arrays of short labels; ordinary text is never split at punctuation. Add them one section at a
time when a client asks. Event categories remain references with their existing pill/link treatment; the footer’s
copyright text and team members’ role text remain prose. There is no separate footer or team tagline field today.

**Hero eyebrow labels.** Optional, beside the existing _Eyebrow_ text: add one label per item (Yoga, Pilates, Barre),
then drag to reorder. Non-empty labels replace the text above the heading; removing them brings the original text
back. Empty arrays keep the old rendering, with no migration. Labels share the eyebrow’s 40-character warning,
with a warning past six items and no duplicate labels. The default is small, bold capitals with Primary bullets,
wrapping naturally on phones. Design → _Eyebrow labels_ (agency only, shown when labels exist) offers separator
thumbnails: Bullet, Middle dot, Line, Diamond and None. Its collapsed _Advanced_ area has separate label and separator
colours; separator colour disappears for None. The hero owns the size and alignment. Labels also follow its eyebrow
part animation. Hidden Studio controls are UI guidance, not permissions.

Developers: `eyebrowLabels` and `eyebrowDesign` live on the hero, projected in its existing query fragment. The
shared server component emits a named list with decorative separators, adding no browser JavaScript or Sanity reads.
Existing gallery entries and baselines stay unchanged; refresh only the new `hero-eyebrow-labels` and
`hero-eyebrow-labels-start` desktop/mobile baselines using **Update visual baselines** on Linux.

**Service categories.** _Content › Profile › Service categories_ is a list of short words for what the business offers
(Bodywork, Breathwork, Movement, Retreats), one per line, using Sanity's own list: **Add item**, type, drag to reorder, and
the menu on a line to remove it. The page draws them in one row under the name, with a separator between each two:
"Bodywork • Breathwork • Movement • Retreats". The separators are drawn, never typed, so editors don't type dots, and the
agency can colour them on their own. **Show the categories** (Show / Hide) appears once there is one, to take them off the
page without deleting them; hidden categories never leave the Content Lake. Studio warns past 24 characters a category or
6 categories, and the same category can't be listed twice.

- **Stored as** `profile.categories`, an array of strings, and `profile.categoriesVisibility`. Optional: a profile without
  them renders exactly as before, so no content needs migrating.
- **Drawn by** `InlineList` (`src/components/ui/inline-list.tsx`), a server component with no JavaScript: a real `<ul>`
  named "Services" (read as "list, 4 items"), each label an `<li>`, each separator an `aria-hidden` shape before its label.
- **Wrapping.** Each separator sits in the gap _before_ its label and the list clips what falls outside it. A label that
  starts a line starts at the list's edge, so its separator is clipped, and no separator is ever drawn after a label: no
  line begins or ends with one. For that every line has to start at the edge, so centred lines share out their room (each
  label centred in its share), and a list that fits on one line is only as wide as its labels. Long labels wrap inside
  themselves. **On a phone: One per line** stacks the labels below 640 px and hides the separators there.
- **The bio** stays its own field. When a bio's first paragraph is _exactly_ the categories (any of • · | ◆ , / between them,
  any case), the page leaves that paragraph out, so an editor who has filled in categories but not yet tidied the bio never
  sees them twice. Anything else in the bio is drawn as typed.
- **Moving an old bio over.** Nothing changes by itself: a bio that starts "Bodywork • Breathwork • Retreats" keeps
  rendering that line as text (now as its own paragraph). Studio shows a warning on such a bio suggesting Service
  categories; put each one in the list and delete the line from the bio. Once the categories are set, a bio that still
  repeats them gets a warning to delete the line. No migration script: the fields are optional, and only the editor can tell
  a typed list of services from a sentence that happens to use a bullet.

**Design.** The Link list's Design tab (agency only) has six boxes and a collapsed **Depth and glow** above the shared Background and Animation. Everything
empty is the look the section always had, so no content needs migrating. The colour overrides sit in a collapsed **Colours**
inside each box, and every option that depends on another only shows once it applies.

| Box                | Options                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile            | **Picture size** Small, Medium (each layout's own size) or Large. **Shape** Circle, Rounded square, or Logo, uncropped (a logo in its own proportions). **Border** None, Solid ring, Gradient ring (a Brand colours gradient, else Primary to Secondary) or Decorative frame (an approved SVG or transparent picture from _Design › Image frames_, the same frames as Image design); rings have a thickness and a see-through gap. Colours: name, bio, border.                                                                                                                                                                                                                                                                                           |
| Service categories | **Separator** Bullet (default), Middle dot, Line, Diamond or None, drawn in CSS so it looks the same in every font. **On a phone** One row that wraps (default) or One per line. Text (collapsed): **Size** Small (default), Medium or Large (the `small`, `body` and `lead` type tokens), **Weight** Regular, Medium (default) or Bold, **Letters** As typed (default) or Capitals, **Letter spacing** Normal, Wide or Extra wide (unset keeps the existing spacing), **Space between** Compact, Comfortable (default) or Wide. Colours: category (Inherit is the text colour) and separator (Inherit is Primary), each Text, Muted text, Primary, Secondary, Highlight or Custom. It follows the section's alignment. Shown once there are categories. |
| Cards              | Every link's **Background colour** (Primary, Secondary, Highlight, Text, Transparent or Custom), **Background strength** (Light, Medium, Strong, Solid), **Border** (None, Thin, Medium, Thick) and **Border colour**, then a collapsed **Text** with the **Eyebrow**, **Label** and **Description** (size Small, Medium or Large as steps from the layout's own, weight, colour; the eyebrow's capitals and letter spacing; the description's line height). Every option starts on _Inherit_ (the layout's own). Not offered for Editorial's ruled list. See [Card design and overrides](#card-design-and-overrides).                                                                                                                                   |
| Arrows and icons   | **Arrow style** Chevron, Arrow, External link (↗ for other websites, → for pages on this one) or None, for every link. Glass rows and Editorial default to the chevron; Minimal and Cards to none; Compact has none. Colours: arrow. **Icons** (collapsed): **Icon container** No container, Circle, Rounded square or Square (the social icon shapes), its colour, strength, border and border colour, and the icon colour.                                                                                                                                                                                                                                                                                                                             |
| Social icons       | **Icon style** Plain icons, Circles, Rounded squares or Squares; with Glass rows the buttons are frosted glass at the rows' strength. **Position** above or below the links. **Button border** None, Thin, Medium or Thick. Colours: icon, button (a tint on glass: the blur stays), button strength, border.                                                                                                                                                                                                                                                                                                                                                                                                                                            |

- **Dividers**: a divider of its own at each of four positions: **Between the categories and the bio** (shown once
  both exist), **After the profile**, **Above the social icons** (words here make a heading for the icons, such as "Stay
  connected", also used as the social navigation’s accessible name) and **Below the social icons**.
  Without those visible words, the navigation keeps its “Social profiles” name. Each is the shared `decorativeDivider` (see
  [Decorative dividers](#decorative-dividers)). A divider only sits between two parts that are drawn: never first or
  last, never for social icons that aren't shown, and where two would meet (after the profile, right above the icons)
  the later one stays (`linkListParts` in `src/lib/sanity/divider-options.ts`). The part beside a divider drops its own
  margin on that side, so the spacing never doubles.
- **Depth and glow** (collapsed; empty is each layout's own look, so nothing changes until a level is chosen).
  **Link shadow** Flat, Soft, Raised or Floating, as pictures, for every link (not offered for Editorial, whose links are a
  ruled list); **Social button shadow** for the shaped icon styles; **Picture shadow**, drawn as a filter so it follows a
  round crop, a ring, a frame or a transparent logo instead of a square box. **Glow** Off, Soft or Strong: a soft halo
  around the ticked parts (the links while nothing is ticked) in a theme colour (Inherit is Primary). A level replaces
  the element's own shadow and keeps the ring the layouts use as a border; a glow on its own is added to the element's
  own shadow (on Glass rows, the glass's). Values: `shadow.floating` and the optional `depth` group in
  `src/styles/tokens.json` (picture shadows, glow size and strength); choices and defaults in
  `src/lib/sanity/depth-options.ts` (`resolveDepth`), which is not tied to the Link list so other sections can reuse it.
  CSS only, no JavaScript. Browsers drop shadows in forced-colours mode, where the rings still mark each link. Glow is
  decorative: it never carries meaning, and is clearest on a dark tone.
- **Colours** are one shared field (`themeColourField`, `src/lib/sanity/schema/theme-colour.ts`): Inherit, Text, Muted text,
  Primary, Secondary, Highlight or Custom (a hex field appears only then). Each element offers only the choices that suit it.
  Every choice but Custom is a token, so it follows the section's tone; the site draws it with `themeColourCss`, which ignores
  anything not offered and lets only a valid six-digit hex through. The swatch picker shows the colour on this section's tone
  and a contrast badge (4.5:1 for text, 3:1 for icons), measured on the background colour. The swatches and badges use the
  site's **Brand colours** (Design settings, published), not `tokens.json`: a site that changed Primary sees its own Primary,
  and the picker says which it used ("Swatches and contrast use this site's Brand colours", or the defaults when nothing is
  changed). On **Glass rows** the arrow and icon colours are measured on the glass at its worst (over the darkest or lightest
  photo, at the section's glass strength). Over any other background picture the badge is still the background colour; check
  it by eye. Every check is a warning, never an error.
- **Wordmarks.** _Content › Profile › Show as_ and the section heading's _Show as_ offer **Image** for a client's wordmark. The text
  stays and becomes the image's alt text, inside the same heading element, so the heading hierarchy, the accessible name and
  the indexed words are unchanged and nothing is read twice. Studio warns if the image or the text is missing.
- **Image headings above links.** A link’s _Heading above it_ offers _Show as → Image_ once text is entered.
  The first visible link in a group supplies its heading image and size. Repeat the same heading text to
  share one group; use different headings for separate images. Missing images fall back to text. Text is
  the image’s alt text, so the heading keeps its accessible name. Hidden or not-yet-due links supply no image.
- **The older "Arrow on each row"** is hidden but still read: Glass rows saved with it unticked draw no arrow until an Arrow
  style is chosen.
- **Composition.** `link-list-parts.tsx` composes the profile, headings, groups, scheduling, dividers and depth.
  `profile.tsx` and `wordmark-heading.tsx` render the profile and wordmarks; `link-design.tsx` owns link
  text, icons, thumbnails and shadows, with layout contracts in `link-list-types.ts`. Small CSS shapes
  are shared through `src/components/ui/shape-classes.ts`.
- **Shared parts.** `LinkArrow`, `SocialLinks`, `ProfileImage` and `Wordmark` in `src/components/ui/` are server components
  with no JavaScript, ready for other sections (see the follow-up tasks in the build plan).

<a id="card-design-and-overrides"></a>**Card design and overrides.** A card's look is resolved in four layers, each more
specific than the last, one property at a time (`layerDesign`, `src/lib/sanity/design-overrides.ts`):

1. the site's design tokens;
2. the layout's preset (Minimal's buttons, Cards' cards, Glass rows' glass);
3. the list's _Design › Cards_, _Arrows and icons_ and _Depth and glow › Link shadow_;
4. one link's _Appearance_, only while it is set to _Customise this card_.

The most specific value **chosen** wins for that property only: a card that sets a thick border keeps the list's tint,
label size and everything else. Only an unset value inherits. _None_ borders, _Transparent_ backgrounds, _Flat_ shadows,
_None_ arrows and _No container_ icons are real values and are never mistaken for "inherit". Every option shows an
**Inherit** button first, so going back is one click; switching a card back to _Use the Link list design_ keeps its
choices but the page ignores them (and the query never sends them).

- **Glass stays glass.** On Glass rows a colour **tints** the glass at the glass strength (or the chosen strength) through
  CSS variables `.glass-row` reads (`--glass-tint`, `--glass-border-width`, `--glass-border-colour`), so the blur, the
  glass's shadow and the nearly solid fallback (no blur support, reduced transparency) all stay. Only _Solid_ makes it
  opaque. Solid cards draw their border as an inset ring, so a thicker border never changes a card's size.
- **Icon containers** (`iconLook`, `src/lib/sanity/surface-options.ts`) use the social icon shapes; the container keeps the
  layout's size whatever the shape, so mixed shapes line up. Social buttons use the same surface primitives.
- **Contrast.** A card background or text colour is measured on the card it draws on: Studio layers the list's and the
  card's choices (`src/lib/color/card-contrast.ts`), over the section's background, or for glass over the darkest and
  lightest photo. Transparent glass never passes on its own: its text sits on the photo. Warnings only.
- **Rendering** is server-only CSS: classes plus custom properties on each link's `<li>`, no JavaScript.

**Scheduling and hiding.** Pages are cached, so the server can't know the time while it builds one.

- _Hide_ is applied in the query (`links[visibility != "hide"]`), so a hidden link is never in the page.
- A list with no **Show from** / **Show until** dates is fully prerendered and costs nothing extra. A list with any is
  split in two: the prerendered page shows the links that are always due, and a small `<Suspense>` boundary around the
  list reads the clock at request time (`requestTime()` in `src/lib/request-time.ts`, which waits for a real request first)
  and streams in the right set. Nothing reads the clock inside `'use cache'`, visitors cause no Sanity request (the data is
  in the cached page), and it works without JavaScript.
- A link that isn't due is not in the HTML at all, so its address isn't in the page source either. `isLinkVisible` is the
  rule: _from_ is inclusive, _until_ exclusive, and an empty or unreadable date leaves that side open.
- **Know the limits.** The boundary renders on the server for every visit to a page that has a dated link (the data comes from
  the cache; the cost is rendering that list), so keep dated links to the pages that need them. A link with only a _Show
  until_ date appears a moment after the rest on its first paint, because the prerendered page can't know it is still due.
- Which link is large and every link's place follow what is drawn: the first ticked link that is due. If it expires, the next
  ticked one takes over.

**The Link page.** The **Minimal page (no header or footer)** option on a page (agency only) takes the announcement bar,
header and footer away. The site shell is a layout, so it can't see which page it frames, and a client component to check the
path would add to every page's JavaScript (the home page sits at its budget). Instead the page marks itself:
`PAGE_QUERY` has a `minimal` flag, `PageView` renders a `<span hidden data-minimal-page>`, the shell wraps the header and
announcement, and the footer, in `[data-site-chrome]` (`display: contents`, so the sticky header behaves as before), and
`globals.css` hides them with `body:has([data-minimal-page]) [data-site-chrome]`. They are `display: none`, so they leave the
accessibility tree and the tab order, but they are still in the HTML. Notes:

- Next keeps the page you left in the DOM, hidden (it styles that page's top-level elements `display: none`), so the rule
  only counts a marker that isn't hidden, and the marker has to be a top-level element of the page. If a Next upgrade changes
  how hidden pages are marked, `tests/e2e/link-list.spec.ts` (leaving and returning to a minimal page) fails.
- The cookie banner still appears, but its "Cookie settings" link lives in the footer, so a visitor on a Link page can't reopen it there.
- An A/B variant (`/ab/...`) renders the same marker, so a minimal page stays minimal.

**Analytics.** A click on a link sends a `link_click` event: `label`, `kind` (`page`, `external`, `anchor`, `panel`,
`booking`), `outbound`, `position`, `group`, `page` and, for another website, `url` without its query string or tags. It adds
no JavaScript to the bundle: the shell puts one small inline script in the page (`TRACK_SCRIPT`, `src/lib/analytics/track-script.ts`,
only when an analytics provider is configured) that listens on the document for clicks inside an element with
`data-track-event` and `data-track-props`, and sends the event to whichever of Plausible (`window.plausible`), PostHog
(`posthog.capture`) and GA4 (`gtag('event')`) has loaded. Those load only after the visitor accepts analytics (see
[Analytics and cookie consent](#analytics-and-cookie-consent)), so with no consent nothing is sent and the click is
untouched. The script also defines `window.trackEvent(name, props)` for your own code. A listener on the document survives
client navigations, which an inline script inside a page's markup would not. In Plausible, add a goal called `link_click`.
UTM tags are added to the address by the server (`withUtm`: only `http` and `https`, and a tag already in the address wins),
per link, in Advanced.

**Seeing link clicks.** The site keeps no click data of its own: reports come from the analytics provider you switched on
(see [Analytics and cookie consent](#analytics-and-cookie-consent)), and only for visitors who accepted analytics.

| Provider  | Where to look                                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plausible | Add a custom event **goal** called `link_click` in the site's settings, and the event's properties (`label`, `kind`, `group`, `page`) so the goal can be broken down by them. |
| PostHog   | The Events list, or a Trends insight on `link_click`, broken down by `label`, `kind`, `group` or `page`. Nothing to set up.                                                   |
| GA4       | `link_click` appears in the Events report. To report by `label` or `kind`, register them as event-scoped custom dimensions; they only fill from then on.                      |

Each event carries the link's `label`, `kind`, `outbound`, `position`, `group`, the `page` it was on and, for another website,
its `url` without query string or tags. A link-in-bio page usually has one job, so "clicks by `label` on `page` = `/links`" is
the report to build. We do **not** run a click store of our own: it would be a second place for visitor data, with its own
consent and retention to explain. Revisit this only if the Ops monthly report (task 52) needs numbers the provider can't give it.

**Share helpers (pages).** Two actions on every page's **⋯** menu in Studio, open to clients and agency staff. Both use the
page's _published_ address (`NEXT_PUBLIC_SITE_URL`, else the address Studio is opened from), so they are greyed out, with a
reason, until the page is published.

- **Copy link** puts the public address on the clipboard and confirms with a notice. If the browser blocks the clipboard, the
  notice shows the address to copy by hand.
- **Download QR code** opens a preview and two buttons: **Download SVG** (for print; sharp at any size) and **Download PNG**
  (1024 px or just under, whole pixels per square, for screens and social posts). The code is the site's `ink` colour on its
  `surface` colour (from `tokens.json`) with the four-square quiet zone scanners need. If a client's tokens would not scan
  (the ink lighter than the surface, or less than 4.5:1 contrast), it falls back to black on white. A tick box, on by default,
  adds `utm_source=qr` to the encoded address so scans show up as the source **qr** in analytics; a `utm_source` already in the
  address is kept. The dialog shows the exact address the code opens. The code has the address inside it, so if the page's
  slug changes, download a new one (the old code keeps working only while a redirect from the old address exists, which the
  publish dialog offers to create).

**Cost of the QR code.** None for visitors: `uqr` (MIT, no dependencies, under 8 KB gzipped for the whole library) is imported
only by the Studio action (`src/features/studio/qr-code/qr-code.ts`), which only `sanity.config.ts` loads, so it ships with
the Studio and never in a public page's JavaScript. We use it for one thing, the grid of squares for an address; the SVG, the PNG
canvas drawing, the colours and the quiet zone are ours, so the output is under our control and the dependency stays small and
replaceable. A Vitest test fails if anything outside Studio imports it. Tests: the payload (address, UTM added once, existing tag
kept, non-web addresses untouched), the colours, the squares and the SVG in `qr-code.test.ts`, and that the actions are added to
pages only. Studio needs a login, so there is no browser test for the dialog; `npm run test:e2e` still builds the whole site and
holds the home page to its JavaScript budget.

**Headings.** The page's `<h1>` is the page title (hidden, as for any page that doesn't start with a hero). The profile name
(or the section's heading) is an `<h2>`; group headings are one level under it.

**Cost.** None in the JavaScript bundle: the layouts, icons, schedule and the page option are server components and CSS, the
click tracking is an inline script, and the buttons use CSS transitions rather than Motion. The home page's JavaScript
sits very close to its budget (`JS_BUDGET_KB` in `tests/e2e/performance.spec.ts`), so nothing here adds a client component
to the shared layout; a client component imported by a server component that every page renders joins every page. `tests/e2e/performance.spec.ts` also holds `/links`
to the same budget.

**Pre-launch pages.** Four page templates (_Pages → New_) cover the weeks before a site is ready. They are made only of
existing sections, so every design choice is in the sections' own Design tabs, and each starts as a **Minimal page**.

| Template                    | Use it when                                                                   | Starts at             | Search engines |
| --------------------------- | ----------------------------------------------------------------------------- | --------------------- | -------------- |
| **Link page**               | The business only needs a link-in-bio page, now or for good.                  | `/links`              | Hidden         |
| **Link page + coming soon** | There is a link-in-bio page now and a new website is on its way. The default. | `/links`              | Hidden         |
| **Coming soon**             | The domain points at the site but it opens on a date.                         | `/coming-soon`        | Hidden         |
| **Under construction**      | A live site is being rebuilt and visitors still need to reach you.            | `/under-construction` | Hidden         |

- **Link page + coming soon** is the Link page with a short note above the list ("Our new website is on its way. Until then,
  everything is here."), a compact **Newsletter signup** under it and a footer note. The first link, "Book now", is the large
  one.
- **Both Link page templates are hidden from search engines** (_Search & sharing → Hide from search engines_ is on). A
  link-in-bio page is a list of links: it has little for a search engine to rank, and after launch it would compete with the
  home page for the business's name. People reach it from bios and QR codes, not search. Before launch that leaves the
  pre-launch sitemap empty (valid, with no URLs), which is expected. Turn the option off on a page that should be found.
- **Coming soon** is a **Hero** on the _Centred text, no image_ preset that fills the screen, a **Newsletter signup** and a
  compact **Link list** of the social icons from [Business info](#business-info). The line "Replace: Opening [date]" is plain
  text in the hero's intro; type the date by hand, or add a [Launch date](#link-list) to the hero for a formatted one.
- **Under construction** is a centred **Hero** with a short message, a **Location** section with no map and a **Form** section.
  The contact details come from Business info rather than a rich-text block, so they are typed once and stay in step with the
  footer when they change. The Form section has no form chosen, so Studio won't publish the page until you pick one.
- **Agency only.** Coming soon and Under construction are hidden from clients in _New_ (`AGENCY_ONLY_TEMPLATE_IDS` in
  `src/features/pages/schemas/templates.ts`); clients can start either Link page. Both are saved with **Hide from search
  engines** ticked, so they stay out of the sitemap and search results.
- **Placeholders.** Copy the editor must change starts with "Replace:" (the profile, two of the three links, the date, the
  footer note), so `npm run launch:check` reports any that reach the live site. Each link's address is empty, so Studio won't
  publish until it is filled in.

**At launch**, on the Link page + coming soon: delete the first section (the coming-soon note), add a **Visit our website**
link to the list (make it the large one) and, if the newsletter signup has done its job, delete that too. On Coming soon and
Under construction, publish the real home page, then delete the page or redirect `/coming-soon` to `/` (_Redirects_).

**Pre-launch looks.** Six one-click looks for **Link page + coming soon** and **Coming soon**, agency only. Pick one in
_Pages → New_ ("Link page + coming soon: Dark and atmospheric", and so on; each has its thumbnail as the menu icon). A look is
the base template with a handful of existing values set, so **it stores nothing of its own**: the page is an ordinary page
afterwards, and every section keeps its preset bar and Design tab. The base templates are unchanged.

| Look                     | Tone     | Link list preset            | Hero (Coming soon) | Also                                                              |
| ------------------------ | -------- | --------------------------- | ------------------ | ----------------------------------------------------------------- |
| **Minimal and elegant**  | Page     | Minimal                     | Full background    | The plain default.                                                |
| **Dark and atmospheric** | Contrast | Glass rows, Medium strength | Full background    | Fills the screen, light dark wash. **Add the photo** (see below). |
| **Editorial**            | Page     | Editorial                   | Editorial          | Aligned to the start.                                             |
| **Bold and colourful**   | Brand    | Minimal                     | Full background    | The page in the Primary brand colour.                             |
| **Image-led**            | Page     | Image-focused (Cards)       | Split              | Add a picture to every link.                                      |
| **Soft and refined**     | Tinted   | Cards                       | Full background    | A gently tinted page.                                             |

- **Why templates, not a preset bar on the page.** The presets bar works on one object's own fields (a section). A look spans
  several sections, so a page-level bar would need either a new stored field or a new array-path mechanism, plus matching
  ("Custom") across sections. Templates need neither. The trade-off: a look is chosen when the page is made. To change the look
  later, use each section's own preset bar and tone.
- **The photo.** Dark and atmospheric fills the screen (the hero on Coming soon, the Link list on the Link page) and sets a
  light dark wash; upload the photo in that section's **Design → Background image**. Without one it is a plain dark page. The
  Glass strength and contrast warnings are the Link list's (see [Glass rows](#link-list)).
- **Coming soon's social list stays Compact.** It has no links of its own, so only its tone changes.
- **Where it lives.** `PRELAUNCH_LOOKS` and `applyPrelaunchLook` in `src/features/pages/utils/prelaunch-looks.ts` (unit tested
  against the Link list presets, tones and hero layouts, so a renamed preset fails the test); the templates are made in
  `templates.ts`; the thumbnails are in `src/lib/sanity/schema/thumbnails/prelaunch-look-thumbnails.tsx`. A new look is one
  entry in the table and one thumbnail.

**Launch date.** A **Launch date** item for the hero's _Extra content under the heading_ (agency adds it; clients edit it).
It draws one line, "Opening Monday 3 November" (en-AU, the label is yours: "Doors open", "Launching"), in the hero's tone.

- **Fields.** _Label_ (default "Opening"), _Date_, and in a collapsed **Advanced**: _Time of day_ (24-hour; adds ", 9:30 am"
  to the line) and _Live countdown_ (off). Studio warns when the date has already passed.
- **Time zone.** The date and time are the wall clock in **Business info → Time zone**, read in the same query as the page (no
  extra request; the page's cache tags already include Business info). Daylight saving is handled by the zone's rules for that
  day (`zonedInstant` in `src/lib/launch-date.ts`): Sydney moves in October and April, Brisbane never.
- **After the date.** A date with no time is shown all day and gone the next day in the business's zone; with a time it is gone
  at that time. Pages are cached, so the clock can't be read while one is built. The line sits in a `<Suspense>` boundary of its
  own that reads `requestTime()` and renders nothing once the date has passed, the same pattern as the Link list's dated links
  (see _Scheduling and hiding_). The prerendered page holds the line as the boundary's fallback. Only that line renders per
  visit; a page with no launch date has no boundary. A date that cannot be read draws nothing.
- **No JavaScript** for the line: it is server text, and a screen reader hears it.
- **Countdown (Advanced, off by default).** A tiny client island ("12 days 3 hours 5 minutes to go", then "42 minutes 10 seconds
  to go" in the last hour) loaded with `next/dynamic` (`launch-countdown-lazy.tsx`) only on a page that turns it on, so other pages
  (the Link page included) download none of it. It redraws once a minute, once a second in the last hour, stops while the tab is hidden and
  catches up when it is shown, shows nothing under `prefers-reduced-motion` (the date line is all that remains), and clears its
  timer and both listeners on unmount. It is `aria-hidden` so the date is announced once, and the server reserves its height so
  nothing moves when it fills in. A whole-day date counts to the start of that day.
- **Link page + coming soon has no hero**, so it has no slot for this; its note is plain text.
- **Tests.** Vitest (`src/lib/launch-date.test.ts`): the line, the time zones across the clock changes in Sydney and Brisbane
  (including the 23- and 25-hour days), before and after the date, the countdown text and its interval.
  `tests/e2e/launch-date.spec.ts`: the line without JavaScript, nothing after the date, the island loaded only where it is on
  (and not on `/links`), the tick by the minute and the second, the hidden tab, reduced motion and the reserved height;
  `tests/e2e/prelaunch-looks.spec.ts`: every look on both pages at 375 and 1280 px with axe; `memory.spec.ts`: leaving and
  returning to the countdown page leaves nothing behind. New gallery entries (`hero-slot-launch-*`) need the **Update visual
  baselines** workflow.

**Tests.** Vitest: the scheduling rule, which links are drawn and which is large, grouping, UTM tags, the click props,
headings, social sources, the tracking script, the template and the presets. `tests/e2e/link-list.spec.ts`: order, hidden and
not-yet-due links (absent from the HTML, addresses included), the header and footer going away and coming back across client
navigations, UTM tags, one large link, keyboard order and focus, 375 px layout and tap size, the analytics events (and none
without a provider), Cards two across and stacked, and axe on the Link page, an ordinary page and all six presets.
`tests/e2e/link-list-glass.spec.ts` covers Glass rows on `/link-glass` (a Link page over a background photo): the
row's parts, the blurred surface and its fallbacks, one Tab stop per row, hover, axe at desktop and 375 px, the
page rendering without JavaScript, the thumbnail's share of the row and the 44 px height, and screenshots at 375, 768
and 1280 px; `design-settings-visual.spec.ts` repeats them in the Light and Dark Brand colours. Vitest covers the preset
table, which fields show for which layout, the icon list and drawings, the glass tokens and the contrast check at each
strength. The section gallery has one entry per preset (`link-list-stacked`, `-cards`, `-editorial`, `-compact`,
`-image-focused`, `-glass-rows`), screenshot on desktop and mobile; macOS skips them, so refresh the baselines with the **Update visual baselines** workflow.
`tests/e2e/prelaunch-pages.spec.ts` checks the Coming soon and Under construction fixtures at 375 and 1280 px (one `h1`, axe, no header or footer, `noindex`, left out of the sitemap); Vitest (`templates.test.ts`) checks all three new templates.

#### Link list pictures

The profile picture and every link's thumbnail have **Adjust picture** (see [Adjust picture (Studio)](#adjust-picture-studio)). The dialog shows the picture in the shape this section draws: a circle or rounded square for the profile (Design › Profile), with its ring or frame; for a thumbnail, the layout's own shape (a square in Minimal and Cards, 4:3 across an Image-focused card and 16:9 for the large link, the row's strip in Glass rows). Other shapes the same link can take are outlines ("Also shown as…"). Glass rows' strip changes with the text, so the dialog previews its shortest row and its tallest. The thumbnail shape follows the link's own **Show large** flag, and only the first ticked, shown link is drawn large, as on the page. Changing a shape never clears or confirms anything; only **Reset** under the field (after "Remove the saved positioning?") removes the saved positioning.

**One set of rules**, from `src/lib/sanity/image-framing.ts`, for the editor and the site:

1. **Positioned with Adjust picture:** its crop and hotspot decide. They replace the field's earlier hotspot, so the last manual positioning wins.
2. **A hotspot (or crop) but no adjustment:** the thumbnail is cut to its drawn shape around the hotspot, so the subject stays in view. This is the one intended visual change.
3. **Neither:** exactly what thumbnails showed before. Before, every thumbnail was requested as 600 × 450 (4:3) and CSS then cut it again; now the same area (the centre of the 4:3 cut, then the drawn shape from its centre) is requested as an explicit `rect` at the drawn ratio, so a portrait or near-square upload shows what it did. Only the file is smaller.
4. **Logo, uncropped (profile):** the whole picture, `object-fit: contain`, no crop and no zoom, even with an adjustment saved. The adjustment stays stored and applies again when Circle or Rounded square is chosen. The field says "Your image positioning is saved but isn't applied in uncropped mode." with Reset. This also means a logo that had a stored crop (from Sanity's crop tool) now shows whole, which is intended.
5. Nothing else changes: no other image, field or component uses these rules.

**What the site asks the CDN for** (`servedThumbnail`; never the original upload). `SanityImage` takes a `placement` and sends `visibleArea` as an explicit `rect`; the CDN's own width and height then follow the shape:

| Layout                    | Ratio | Requested (2x the largest drawn size)    | Drawn at most |
| ------------------------- | ----- | ---------------------------------------- | ------------- |
| Minimal                   | 1:1   | 80 × 80                                  | 40 px         |
| Cards                     | 1:1   | 128 × 128                                | 64 px         |
| Image-focused             | 4:3   | 1440 × 1080                              | about 720 px  |
| Image-focused, large link | 16:9  | 1440 × 810                               | about 720 px  |
| Glass rows, no framing    | 4:3   | 256 × 192                                | 128 px wide   |
| Glass rows, framed        | strip | 256 × 112 (256 × 160 for the large link) | 128 px wide   |

The browser still picks the width it needs from `sizes`, so those figures only fix the ratio and the ceiling. Glass rows' strip is as tall as the row's text, so its ratio varies: an unframed picture keeps the 4:3 cut it always had (no row moves), a framed one is requested at the shortest row's own area (the widest the strip gets) and CSS places it with `hotspotObjectPosition` (centred when there is no hotspot); a taller row shows a narrower slice of it. Framing belongs to the field: a second section reusing the same upload without framing is unchanged. The public JavaScript and layout (every size is fixed by the layout, not the picture) are unchanged.

**Before upgrading a site:** find Link lists whose logo has a stored crop, because it will now show whole. Run this read-only query in Vision (it changes nothing):

```groq
*[_type == "page" && count(pageBuilder[_type == "linkList" && profileDesign.imageShape == "natural" && defined(profile.image.crop)]) > 0]{ title, "slug": slug.current }
```

**Tests.** Vitest: the layout map, the visible area for each rule on landscape, near-square and portrait uploads in every layout (rule 3 against today's 600 × 450 plus CSS crop, computed both ways), the resolvers, and that the editor opens on the area the renderer serves; `ProfileImage` classes and requested sizes for every design (a snapshot, so a change to a circle or rounded square is visible). Playwright: `tests/e2e/link-list-framing.spec.ts` reads the URLs `/link-framing` asks for (rect, width, height, format), checks no thumbnail is requested at more than 2x its drawn size at 375, 768 and 1280 px, and covers a circle, rounded square, ring and frame, axe, and one Tab stop per link; `picture-framing.spec.ts` covers the editors on the brand preview. Screenshots are `link-list-framing-visual.spec.ts` (Linux-only; refresh with **Update visual baselines**).

### Style guide

`/section-gallery` is a living style guide for design reviews with a client, in two views:

- **Sections** (`/section-gallery`): every section type and variant on one page, each under its label.
  - **Tone and layout, per section.** Links above each section switch its Background tone (surface, soft, dark, accent)
    and, where it has one, its layout (hero: full background, split, editorial, image with panel; statistics: inline,
    cards; gallery: grid, masonry, slider; media and text: image left or right; features grid: 2, 3 or 4 columns).
    **As authored** is the default and shows the content as the page has it. A group is left out where a section has
    nothing to choose, so every combination offered is a sensible one (`applySectionOverride` ignores anything else,
    hand-edited URLs included).
  - **Width.** **Full**, **375 px**, **768 px** or **1280 px** at the top previews every section at a phone, tablet or
    laptop width. These are container widths, not iframes: each section sits in a box of that width that is a
    [size container](https://developer.mozilla.org/docs/Web/CSS/CSS_containment/Container_queries) named `styleguide`
    (`WidthFrame`). A frame wider than the window shrinks to fit it.
  - **The choices live in the URL** (`?width=375&tone.<section key>=inverse&layout.<section key>=split`), so a view can be
    pasted into an email or a ticket. Nothing is stored. **Reset** goes back to the page as authored.
- **Design tokens** (`/section-gallery/tokens`): every colour role as a swatch with its class name and hex, then the
  **contrast ratio** of each pair sections draw (text needs 4.5:1, borders and focus rings 3:1, per WCAG 2.2 AA; ratios are
  cut, not rounded, so 4.496 never reads as 4.50), the **type scale** (each step set in its class, fluid sizes shown as a
  pixel range), the three font families, **spacing**, **radii**, **shadows** and the **motion** tokens with samples to
  play. The colours are the ones in use: `tokens.json` with the Studio's Brand colours applied, so a client's palette
  that fails AA says so here. The motion samples animate only scale and opacity on the tokens' own durations and easing;
  with `prefers-reduced-motion` they are drawn already finished, the Play button is replaced by a note, and nothing moves.

**Why the width frames need a stylesheet step.** Tailwind's `sm:`, `md:` and `lg:` are window media queries, so a 375 px
box on a wide screen would still lay out for desktop. `scripts/postcss-container-frames.mjs` (wired in `postcss.config.mjs`,
for `src/styles/globals.css` only) adds, for every width media query, the same rules as a query on the `styleguide`
container, and wraps the original rules in `@container not style(--sg-frame: 1)`; the frame sets `--sg-frame: 1`, which
inherits to everything inside it. Outside a frame nothing changes, and with no frame chosen the page is laid out by the
window as normal. Lengths in viewport units (`vh`, `vw`, `min-h-screen`) still follow the window. **Live production builds
leave the plugin out** (`VERCEL_ENV=production`), so the live site's stylesheet is unchanged; every other build (development,
previews, the end-to-end build) has it, about 4 KB larger before compression and 0.2 KB after. If you add a width media
query by hand to `globals.css`, the plugin picks it up as long as it is a single `min-width`/`max-width` or `width >=`/`<`
condition; a combined query (`(width >= 40rem) and (hover: hover)`) is left to the window.

#### Access

| Where                                      | Result                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `next dev`, and the end-to-end build       | Open (`NODE_ENV=development`, `E2E_GALLERY=1`).                                            |
| Vercel **production**                      | **404**, always, a real status from the prerender. A token set there changes nothing.      |
| Vercel **preview**, token set              | Open with `?preview=<STYLEGUIDE_PREVIEW_TOKEN>`; without it, or with a wrong one, **404**. |
| A preview with no token, or any other host | **404**.                                                                                   |

To let a client review on a (password-protected) preview URL: add `STYLEGUIDE_PREVIEW_TOKEN` to the project's **Preview**
environment variables only (16 or more characters, e.g. `openssl rand -hex 16`; shorter is treated as not set), redeploy,
and send `https://<preview-url>/section-gallery?preview=<token>`. `proxy.ts` checks the token, answers a missing page
without it, and keeps the token in an `HttpOnly` cookie for eight hours, so the guide's own links need no token and the
token stays out of the URLs a client copies from the address bar after the first visit. The page checks it again where the
content is made. The comparison takes the same time whatever the guess. Rotate the token by changing the variable and
redeploying; existing cookies stop working at once.

It is **never indexed**: `noindex, nofollow` in the page metadata and in an `X-Robots-Tag` header (set by `proxy.ts`, also
on the 404s), the fixture page that feeds it is left out of the sitemap, and `section-gallery` is a reserved slug. It is
left out of A/B tests (`proxy.ts`), and `robots.txt` deliberately does not disallow it: a crawler that cannot fetch a page
cannot see its `noindex`. Responses on a preview are `Cache-Control: private, no-store`.

**Tests.** `tests/e2e/styleguide.spec.ts` (tone and layout switching, impossible combinations ignored, width frames laying
out two, one and three columns in a desktop window, no iframe, the tokens page, reduced motion, axe, noindex, sitemap);
`src/proxy.test.ts` and `src/lib/styleguide-access.test.ts` (the token rules, including cookie, wrong and short tokens);
`scripts/postcss-container-frames.test.mjs` (the stylesheet step). The preview-deployment path cannot run in the
end-to-end build (it is open there), so check it by hand after changing `proxy.ts`: build with
`VERCEL_ENV=preview STYLEGUIDE_PREVIEW_TOKEN=<16+ characters>` and request the guide with and without the token.

**Adding to it.** A new section type needs no work here: it appears with a tone control (it has a `style`), and if it has
layouts, add them to `VARIANT_CONTROLS` in `src/features/pages/utils/section-override.ts` (a test fails when the lists
drift from the schemas). A new colour pair worth checking goes in `CONTRAST_PAIRS`
(`src/features/styleguide/utils/token-contrast.ts`).

## Code quality

**CI** (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request. It checks
that the committed Sanity types and design token files are current, runs `npm run check`, proves each generator's
output (section, feature, document, singleton) passes too, and runs the end-to-end suite and Lighthouse in a real browser. **Dependabot** opens
weekly grouped update PRs (Sanity, Next/React, dev tooling, GitHub Actions), waiting a week after
each release before proposing it. Two scheduled workflows run beside CI: [Backups](#backups) and the
weekly [enquiry retention](#enquiries) clean-up.

| Command                   | Does                                                                           |
| ------------------------- | ------------------------------------------------------------------------------ |
| `npm run check`           | Typecheck, lint, format and unit tests, read-only. Run it before pushing.      |
| `npm run tokens`          | Regenerate the design token CSS and TypeScript from `tokens.json`              |
| `npm run typecheck`       | TypeScript, strict mode                                                        |
| `npm run lint`            | ESLint, zero warnings allowed (`lint:fix` to autofix)                          |
| `npm run format:check`    | Prettier (`format` to apply)                                                   |
| `npm test`                | Unit tests (Vitest; `test:watch` while working)                                |
| `npm run test:e2e`        | End-to-end tests (Playwright; first run `npx playwright install chromium`)     |
| `npm run test:e2e:update` | Refresh the visual regression baselines (Linux or Docker; see below)           |
| `npm run test:lighthouse` | Lighthouse budgets on `/`, `/about`, `/hero-parts` and `/links` (needs Chrome) |

The standalone `npm run typecheck` disables TypeScript incremental caching so stale build info
cannot hide diagnostics. `*.tsbuildinfo` is already gitignored; CI must not restore it for typecheck.
Next.js may still use its own incremental build cache.

### Link actions

Every link (CTAs, menus, rich text) is a typed action, chosen with the **Goes to** picker. The default is _A page on this site_, as before, and fields appear only for the chosen action.

| Choice                 | Stored `linkType` | Fields                                                   | Renders                                         |
| ---------------------- | ----------------- | -------------------------------------------------------- | ----------------------------------------------- |
| A page on this site    | `internal`        | Page                                                     | `<Link>`                                        |
| Another website        | `external`        | URL; Advanced: open in a new tab                         | `<a>`                                           |
| A section on this page | `anchor`          | Section (buttons for this page's anchors, or type one)   | `<a href="#id">`                                |
| Open a panel           | `panel`           | Panel; Advanced: fallback link                           | `<button aria-haspopup="dialog">` in a GET form |
| Book                   | `booking`         | Optional booking link (else the site's booking settings) | `<button aria-haspopup="dialog">` in a GET form |

`internal` and `external` store exactly what they always did, so existing content needs no migration. Resolving a stored link to what to render is pure and tested (`src/components/ui/resolve-link.ts`); `SanityLink` and `CtaLink` render the result.

**Sections.** A section link needs an anchor on a section of the same page (_Layout options → Anchor_). It only works on the page the link sits on, so use it in page content rather than the menu. The target's `scroll-margin` leaves room for the sticky header and the section edge. Scrolling is smooth unless the visitor prefers reduced motion.

**Panels and booking.** _Open a panel_ is on (`LINK_ACTIONS.panel` in `src/config/link-actions.ts`): see _Panels and the overlay_ below. _Book_ stays out of the Studio until booking (task 95) exists; switch it on in the same file. The button is plain server markup (`<button data-overlay-kind="panel|booking" data-overlay-id="...">`), so it adds no JavaScript. The panel controller adds one delegated `click` listener, finds the trigger with `event.target.closest('[data-overlay-kind]')` (`OVERLAY_TRIGGER_SELECTOR`) and calls `event.preventDefault()` before opening its dialog, which also stops the fallback form submitting. If JavaScript hasn't loaded, or nothing claims the click (a booking button, or a panel button in the header or footer, which the page's panels don't cover), the form submits to the fallback URL (for booking, the override or the booking page). The panel reference resolves to an id and title only; its content comes from the page's `panels` (below). The title is added to the button's accessible name ("Enquire (opens Enquire now)").

**Content health** reports section links whose anchor no section on the page has (shared sections the page uses count) and buttons for panels with no published version. Links inside shared sections and the menu can't be checked against a single page, so they are skipped.

**Tests.** Vitest covers the resolver and the health checks; `tests/e2e/link-actions.spec.ts` covers section scrolling, the dialog attributes, a panel opening, an overlay claiming a booking click, and the no-JavaScript fallback.

### Panels and the overlay

A **panel** is a pop-up an editor opens from any button or link: choose **Goes to → Open a panel**, pick a panel, done. Panels are one small, deliberate feature, not "anything in a modal": only the content types listed below are designed for them. Two layers:

- **The overlay** (`src/components/ui/overlay/`, shared) is the one dialog the site uses for anything that opens over the page. `useModalDialog(ref, open, onClose)` wraps a native `<dialog>`: `showModal()` (the browser traps focus, makes the page behind inert and closes on Escape), a scroll lock that doesn't shift the page, focus returned to what opened it, and one `onClose` for every way it can close. `<Overlay>` adds the presentation (`modal`, `drawer-right`, `drawer-left`, `sheet`, `fullscreen`), a heading that names the dialog and takes focus, a Close button, a click on the backdrop to close, an entrance from the motion tokens (it simply appears under reduced motion), and swipe-to-dismiss for drawers and sheets using the shared `shouldDismiss`. Quick search and the gallery lightbox use the hook; the navigation drawer (task 07) uses `<Overlay presentation="drawer-left">`.
- **Panels** (`src/features/panels/`) are a `panel` document the page renders through that overlay.

**For editors.** _Reusable content → Panels_ lists them; agency staff create them, clients edit their content. At the top of a panel, **Opened by** lists the buttons and links that open it, page by page, so you know what you are about to change; a button in a menu is listed with a note that it uses its fallback link (see _Limits_). A panel has:

| Field                         | Who                                  | What                                                                                                                |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Title                         | Everyone                             | Shown at the top, and the dialog's accessible name                                                                  |
| Content                       | Everyone                             | Up to four blocks, shown in order: _Text_ (rich text with an optional picture) and _Form_ (one of the site's forms) |
| How it appears                | Agency                               | Four pictures: **Auto** (default), **Centred window**, **Side panel**, **Full screen**                              |
| Advanced → Width              | Agency, not for _Full screen_        | _Narrow_, _Medium_ (default), _Wide_                                                                                |
| Advanced → Close with a swipe | Agency, only _Auto_ and _Side panel_ | On by default. Close, Escape and a click beside the panel always work                                               |
| Advanced → Link name          | Agency                               | The name in the deep link `/page#panel-<link name>`; empty uses the title                                           |

**Auto** is a centred window on a computer and a bottom sheet on a phone (below 40 rem); a panel holding a booking embed takes the whole screen on a phone. The other three are what you chose on every screen. The rules are pure and unit tested (`resolvePresentation`, `src/features/panels/utils/presentation.ts`).

**How it renders.** `PAGE_QUERY` returns the panels the page's buttons open as `panels`, in the same request as the page (`panelFields` in `lib/sanity/fragments.ts`, `panelRefsFragment` in `pages/api/sections.ts`), so opening one costs nothing. `PageView` takes a `renderPanels` render prop (features can't import each other), and the route supplies `PanelHost`, which renders each panel **once** per page as a closed `<dialog>` with its content built on the server. Only a page that has a panel loads any overlay code: `PanelController` and `Overlay` are client components behind that wrapper, downloaded only when `renderPanels` is called, so the home page's JavaScript doesn't grow. What is heavy waits until the panel first opens: a block marked `deferred` (a form) is mounted by the controller on first open and kept mounted after, so a half-written form survives closing and reopening. A booking iframe will be deferred the same way. The route is shared by every page, so the controller is reached only through `lazy-panel-controller.tsx`, a thin `next/dynamic` wrapper: importing the controller (or `PanelHost`'s client parts) statically anywhere in the route's graph, even through an async `import()` in a server file, puts the overlay's code in every page's scripts.

**Opening.** One delegated click listener (see _Link actions_) opens the panel a button names; it ignores modified clicks on a button that has a fallback link (open in a new tab) and leaves booking buttons alone. `#panel-<name>` in the address opens a panel on load (and when the hash changes), the address shows it while it is open (`history.replaceState`, so Back still leaves the page), and closing puts back the address from before, dropping the panel's hash but keeping any section anchor. Two panels that would share a name get `-2`, `-3` (`assignPanelSlugs`). Without JavaScript the panels stay closed and each button goes to its fallback link.

**Accessibility.** The dialog is named by its heading (`aria-labelledby`), which takes focus on opening (the first control is one Tab away); focus returns to the button on closing; the page behind is inert; Escape and a visible Close button always close it; the scrolling body is a labelled, keyboard-focusable region; a swipe is only an extra, and starts from anywhere on a drawer but only from the top bar of a sheet, so long content still scrolls.

**Limits.**

- Panels open from buttons and links in **page content** and **shared sections**. A button in the header, footer or menu can't (the site shell doesn't fetch panels), so it uses its fallback link; set one. A button in a members-only _section_ also uses its fallback link: its panel isn't in the cached public result.
- A panel's own rich text can't open another panel (its links aren't collected).
- A new section type with links in a place the query doesn't read must add the path to `panelRefsFragment`; `sections.test.ts` fails until it does. The list is explicit because GROQ's recursive descent (`..`) isn't available in the fake Content Lake the tests use.

**Adding a content type** (booking embed, event details, link list): add an object type in `src/features/panels/schemas/`, register it in `schemas/index.ts` and in the panel's `content` (`// new-panel-content: member`), project it in `panelFields`, add its kind to `PanelContentKind` and `KIND_OF` in `panel-host.tsx`, and render it in `PanelBlockView`; mark anything heavy `deferred` in `PanelHost`'s `blocks`. Run `npm run typegen`.

**Adding the overlay elsewhere.** Render `<Overlay open onClose presentation title>` and keep `open` in state, or call `useModalDialog` on your own `<dialog>` as quick search does. Keep heavy children behind your own "has been open" flag.

**Tests.** Vitest: the hook's core (`modal-dialog.test.ts`, `scroll-lock.test.ts`), Auto and the other presentation rules, deep-link and slug helpers, the schema's agency-only and conditional fields, the usage note, the query's coverage of every place a section keeps links. `tests/e2e/panels.spec.ts`: opening from a button, keyboard, Escape, focus return, backdrop and Close, deep links, each presentation, a phone-width sheet, the form waiting for first open, no JavaScript, and axe with each panel open; `memory.spec.ts` opens and closes panels 30 times.

### Preset picker (Studio)

Editors choose by picture instead of a text radio list, and can apply a preset that sets several fields in one click. It is Studio-only code in `src/features/studio/components/preset-picker/`, switched on by the global input override in `sanity.config.ts` (`withPresetPicker`, wrapped around the role-aware input). Schema files never import it; they describe the field with `src/lib/sanity/schema/preset-field.ts`.

**Option picker.** `presetField` builds a string field shown as a grid of cards (4:3 thumbnail, title, one-line description):

```ts
presetField({
  name: 'variant',
  title: 'Layout',
  group: 'design',
  options: [
    {
      value: 'split',
      title: 'Split',
      description: 'Picture beside the text.',
      thumbnail: SplitThumbnail,
    },
    {
      value: 'centred',
      title: 'Centred',
      description: 'Text in the middle.',
      thumbnail: '/studio/centred.svg',
    },
  ],
})
```

The stored value is the same string as a radio list, so existing content needs no migration. The options also live in `options.list`, so a Studio without the input still shows a plain radio list. A `thumbnail` is either a URL or static file path, or an inline React component that receives `{ scheme, selected }` and can follow light and dark (draw with `currentColor`). An option with no thumbnail shows its first letter.

**Conditional options.** `presetField` also takes `hidden`, `fieldset`, `validation` and `visibleOptions`, a function from `{ document, path }` to the values to offer now (the section's Animation withholds Parallax where there is no picture). The stored value is always shown, so a choice that no longer fits stays visible rather than silently changing. The shared section design also uses `options.frameless` on an object type to drop the box Studio draws around a nested object (see _Section style_).

**Preset mode.** Give an object type (a section) `options: presetsOption([...])` and the Studio shows a preset bar above its normal form. Each preset is `{ value, title, description?, thumbnail?, set }`, where `set` maps field paths to values and dots reach into objects:

```ts
{ value: 'feature', title: 'Feature', thumbnail: FeatureThumbnail,
  set: { variant: 'split', imagePosition: 'left', 'style.tone': 'alt' } }
```

The preset bar is agency-only, like the other design controls: clients, and the agency's client-view preview, get the plain form. A fresh section's initial values count as what an unset field holds, so a hero with no style (older content) shows as _Full background image_, the look it renders, not as whatever the shared style type would start with.

A preset sets the values once, as ordinary patches relative to the section (parent objects such as `style` are created if missing), so undo, drafts and collaboration treat it like any edit. Every field stays editable. The bar shows the preset whose values all match now (a field that was never set counts as its `initialValue`), or **Custom** once any one differs.

**What editors see.** Once something is chosen the picker collapses to one row (picture, title, description and a **Change** button) so long forms stay short. **Change** opens the cards; choosing one closes them again and returns focus to the button. The cards are a `radiogroup`: Tab reaches the chosen card (or the first), the arrow keys, Home and End move focus, and Enter or Space choose. It uses Sanity UI, so it follows the CMS brand theme in light and dark.

**Tests.** Vitest covers option normalisation, preset-to-patch building, preset matching and the keyboard order. `/studio-brand-preview` shows the grid, the collapsed row and a preset bar in light and dark, so the end-to-end tests run axe and keyboard checks over them, and `studio-brand-visual.spec.ts` takes screenshots (Linux baselines: refresh with the "Update visual baselines" workflow). Colour contrast on the picker's own cards is not asserted separately; the page's buttons, tabs and badges are (see _Contrast_ under the brand preview).

#### Thumbnails

The pictures the picker shows are in `src/lib/sanity/schema/thumbnails/`, drawn in one visual language: simple wireframes at 4:3 (blocks are headings, thin lines are text, a framed panel with a hill and a sun is a picture, a pill is a button), readable at the 160 px a card gives them. They are not screenshots, so they never go stale. The parts are in `wireframe.tsx`; draw a new thumbnail from them rather than with new shapes.

| Kind            | Files                                                                                                  | Shown for                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Section layouts | `hero-thumbnails.tsx`, `stats-thumbnails.tsx`, `testimonials-thumbnails.tsx`, `gallery-thumbnails.tsx` | each section's `variant` (the hero, Stats, Testimonials and Gallery layouts)                          |
| Hero presets    | `hero-thumbnails.tsx`                                                                                  | the six presets, and the Split proportions and shapes                                                 |
| Animations      | `animation-thumbnails.tsx`                                                                             | the Animation field: none, fade up, subtle, fade, slide, staggered, float, parallax (three strengths) |
| Tones           | `tone-thumbnails.tsx`                                                                                  | the Tone field: live swatches, not pictures                                                           |
| Insert menu     | `public/section-previews/<typeName>.svg`                                                               | the "Add item" menu in the page builder (static files)                                                |

`registry.ts` maps every value stored in content to its thumbnail (`sectionVariantThumbnails[type][variant]`, `animationThumbnails`, `toneThumbnails`). `heroPresetThumbnails`, `heroProportionThumbnails` and `heroImageShapeThumbnails` are the hero's own. Dividers will add their entries when that field exists.

- **Theme-aware.** The drawings use the Card colours Sanity UI sets from the Studio theme (`--card-fg-color` and friends), so they follow the CMS brand in light and dark and in a chosen card, with no stylesheet.
- **Tones show the site, not the Studio.** The swatches read `src/config/tokens.generated.ts`, so a re-skinned site shows its real colours, in both Studio schemes.
- **Animations.** Each loops gently on the same little section, changing transform and opacity only. The loops are SVG animation elements that are only mounted while the visitor allows motion, so with `prefers-reduced-motion: reduce` (and on the server) they are the still drawing. (The Studio may not contain `<style>` elements, which is why they are not CSS keyframes.)
- **The insert-menu pictures** are static SVGs that follow the system light or dark setting (the Studio can't restyle a file loaded as an image). They share the drawing language and 4:3 shape (600 × 450). `npm run new:section` copies `_placeholder.svg`, so start a new picture from one of its neighbours.
- **Adding an option.** A new section variant, animation preset or tone needs a thumbnail: add the component and its `registry.ts` entry. `src/app/studio-brand-preview/thumbnails.test.ts` fails if any section type has no insert-menu picture, any variant, animation or tone has no thumbnail, or a thumbnail is left over for a value that no longer exists. It also checks that drawings use the theme (no hard-coded colours outside tones), are 4:3, and are still when drawn without a browser.
- **Review.** `/studio-brand-preview` shows every thumbnail in light and dark under "Preset picker thumbnails". The end-to-end tests run axe over them, check that each is 4:3 and at least 150 px wide, that they change with the scheme (tones don't), and that animations stop under reduced motion. There is no screenshot baseline for them yet.

The thumbnails sit in `src/lib/sanity/schema/` beside `presetField`, free of Studio code, so schema files import them directly: `hero.ts` gives each layout one, and `sectionStyle` gives each tone and animation one. `registry.ts` lists the same components for the brand preview page, and the test checks the two are identical.

### Adjust picture (Studio)

A dialog under an image field where an editor sees the picture inside the exact shape the site draws it in, drags it into place, zooms with a slider and applies. Nothing is uploaded and the file never changes. It is on the **Link list's profile picture and link thumbnails** (see [Link list pictures](#link-list-pictures)); any image field can opt in.

**What it changes.** Sanity's own `crop` and `hotspot` on that image field, and nothing else. The crop box is the visible area (zoom and position); the hotspot is set to the crop box's centre and size. Both live on the field in the document, never on the asset, so the same photo used elsewhere keeps its own framing. `SanityImage` already passes both to `@sanity/image-url`, so there is no new rendering path, no canvas, no new asset and no public JavaScript.

**Sanity's crop tool.** It edits the same two values, so it stays the precise fallback: framing in either one opens correctly in the other. An adjustment replaces the field's earlier hotspot, so the last manual positioning wins. There is no separate "position" setting.

**For editors.**

- Under the picture: **Adjust picture**, and one line of state, "Automatic fit" or "Adjusted · Reset". Reset asks "Remove the saved positioning?" and unsets both values, which goes back to the component's default.
- In the dialog: drag the picture (mouse, pen or touch), pinch with two fingers or ctrl + scroll (a trackpad pinch) to zoom, or use the slider and the − and + buttons. A plain scroll still scrolls the dialog. The arrow buttons are the single-pointer alternative to dragging. With the picture area focused: arrows move it (Shift for further), + and − zoom, 0 resets. **Apply** writes one change (so one Undo); **Cancel** and Escape change nothing, and closing after a change asks "Discard changes?".
- The area outside the shape is dimmed and the shape outlined. A decorative frame and a ring are drawn as the page draws them (the colours are indicative: the Studio doesn't know the site's palette). Other shapes the same picture appears in are labelled outlines, never separate editors.
- Zoom stops where the visible part has about one source pixel per drawn pixel (never more than 400%). Below two source pixels per drawn pixel the dialog says "Zooming further may make the picture look soft."
- Logos are never cropped. When the design shows a picture whole ("Logo, uncropped"), the field says so instead of offering the button. A saved adjustment stays stored and applies again when a cropping shape is chosen again; changing a shape never clears or confirms anything.
- A read-only field shows "View framing": the dialog has no controls. Clients and the agency both get the editor, because it edits content, not the design.

**For developers.**

- `src/lib/sanity/image-framing.ts` is the maths (plain TypeScript, no React or Studio code). `toCrop` and `fromImage` convert between the editor's state (zoom of at least 1 and a centre point) and the stored values; `servedRect` is `@sanity/image-url`'s `fit()` rule, step for step; `visibleArea(placement, image)` is the one answer to "what part of the upload shows?", for the editor and for the renderer: the adjustment, else the hotspot, else `defaultArea` (what the picture shows today), and null for an uncropped shape. Zoom 1 is "cover", so the shape is always full. `image-framing.test.ts` builds real URLs with `@sanity/image-url` and parses their `rect` to prove the parity.
- `src/lib/sanity/image-frame-geometry.ts` describes shapes (`aspect`, `corner`, `insetPct`, `ring`, `frameUrl`, `drawnPx`). `FRAMING_RESOLVERS` has one resolver per placement, which turns the component's resolved design into descriptors (main shape first). `linkListProfile` does it for `resolveProfileImage`'s output through `profileFrameShape`, which `ProfileImage` draws from too; Logo, uncropped returns none. `linkListThumbnail` reads the section (three segments up from the thumbnail) and the link's key, and takes its shapes from `thumbnailShapes` in `src/lib/sanity/link-thumbnail-framing.ts`, the same map the components use for what to ask the CDN. A resolver's `resolve(design, frameUrl, path)` also gets the field's path, for placements that depend on which item the picture sits in. Add a placement beside the `// new-framing: resolver` marker, with a test.
- Opt a field in with `options: { ...imageOptions, ...framing('linkListProfile') }` (`src/lib/sanity/schema/image-framing-option.ts`); schema files don't import Studio code. `withPresetPicker` (the global input override in `sanity.config.ts`) switches on `PictureFramingInput` for those fields. It reads the design from the document with `useFormValue`, at the resolver's `designPath` (relative to the image field), and fetches a decorative frame's artwork once per session.
- The preview is the Sanity CDN at 1200 px (fit max, automatic format) with the asset's blurred placeholder while it loads, never the original upload. The dialog is `AdjustPictureDialog` (no Studio hooks, so `/studio-brand-preview` mounts it directly); the Studio wrapper only supplies the picture, shapes and `onChange`. The preview page's "Adjust picture" examples (a circle and 16:9, light and dark) hold their values in memory and are covered by `tests/e2e/picture-framing.spec.ts`.
- Pointer events use pointer capture, so mouse, pen and touch share one path. Updates are batched to one per animation frame and only the picture's transform changes. Every listener and frame request is removed when the dialog closes.
- Tests: Vitest (maths, geometry, style helpers, and Testing Library for the dialog), Playwright + axe on the brand preview page. The Testing Library tests use `jsdom` (`// @vitest-environment jsdom` at the top of the file); everything else stays in Node.
- **Real Studio checks** (open, drag, keyboard, touch, Apply, Undo, reopen, Reset, publish, and the draft in Presentation against the published page) need a signed-in scratch project and are done by hand once a field is opted in; record them in the PR.

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

**Splitting Site settings.** The single _Site settings_ document is now four singletons (`siteIdentity`,
`siteNavigation`, `announcement`, `cookieBanner`). Until `migrations/split-site-settings` has run on a dataset,
the site keeps reading the old `settings` document (see `SETTINGS_QUERY`), so deploying first is safe, but the
new Studio screens start empty. Run it once per dataset (it copies, never deletes, and is safe to repeat):

```bash
npx sanity login                                                  # once
npx sanity migration run split-site-settings                      # dry run: prints what it would create
npx sanity dataset export production backup.tar.gz                # backup
npx sanity migration run split-site-settings --no-dry-run         # asks before it writes
```

Then publish the new documents (the migration copies drafts as drafts), and check the site. Once every dataset
has been migrated, delete the `settings` fallbacks from `SETTINGS_QUERY`, delete the migration folder, and delete
the old `settings` document by hand.

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

- **Unit** (`*.test.ts` next to the code, or `*.test.tsx` for a component rendered to HTML): design token generation, the WCAG contrast of every token pairing and the no-raw-palette guardrail, slug/URL mapping, redirect matching and the Edge Config map and proxy, the live-update
  dedupe logic, the section generator's naming, sitemap splitting, blog pagination, the RSS XML builder and date formatting, form validation, the members allow-list and callback-path checks, A/B option choice and cookie handling and the proxy's experiment lookup, the `/llms.txt` builder, consent parsing and the Google Analytics snippet, the rate limiter, the notification email, the Stripe webhook signature check, event and price mapping, config and REST calls, price formatting, the Turnstile and Resend calls and the forms environment check, the newsletter provider modules (Resend, Loops, Mailchimp, with `fetch` mocked) and their environment check, the setup wizard's validation and the launch check's pure checks (against saved pages and headers).
- **End to end** (`tests/e2e`): a production build pointed at a fake Content Lake that serves
  `tests/e2e/fixtures/dataset.mjs`, so it runs offline with no Sanity project. On desktop and mobile
  Chrome it checks pages and metadata, redirects, security headers, robots and sitemap, the webhook
  route, keyboard focus and the skip link, the mobile menu, the announcement bar (inside, before and after its window; dismissal), the returning-visitor greeting (absent on a first visit, shown on the second), the blog (index, pagination, categories, a post with its Article JSON-LD and related posts, 404s, the RSS feed parsed as XML, the sitemap), forms (required-field errors announced and focused, kept answers, server-side re-validation, the success message, a failed spam check, the rate limit, and the same flow with JavaScript off), the newsletter signup (validation, the success message, an identical answer for a repeated address, a failed spam check, the rate limit, JavaScript off), the AI crawler policy in both states (`robots.txt` and `/llms.txt` with crawlers allowed and switched off; the fake Content Lake serves a settings variant and the test expires the cache with a signed webhook), A/B tests (no running test leaves pages, cookies and attributes untouched; with one running, an `ab` cookie for control and for the variant each get their content and `data-variant`, new visitors are assigned and kept in an option, crawlers and the blog are skipped; the fake Content Lake serves variant documents and the test starts and stops the experiment with a signed webhook), search (the page with and without JavaScript, title and body matches, hidden and members-only pages left out, validation and the length cap, the JSON route, the dialog by pointer and keyboard, debounce, failure states, axe with the dialog open), the cookie banner (first visit with focus in the banner and no shift, Accept all and Reject all identical, no provider request before consent, Accept loading Plausible, PostHog and Google with Consent Mode defaults denied first, Reject staying off and persisting, Choose, reopening from the footer and withdrawing, keyboard use, axe with the banner open and expanded; every other test starts as a visitor who already rejected, so the banner doesn't take focus), members-only content (an anonymous visitor gets the sign-in prompt and none of the content, not even in the HTML; signing in through the test form returns to the page and shows it; refused passwords and addresses; sign-out; members pages left out of the sitemap, `/llms.txt` and search), the pricing table (active plans with Intl-formatted amounts in three currencies, one highlighted plan, distinct button names, archived prices left out), Checkout (a subscription and a one-time price create the right Stripe session and redirect; a tampered price id is refused) and the Stripe webhook (bad, tampered and replayed signatures rejected; unused events acknowledged; a price event upserts a document with the write token; a deleted price is marked inactive; the fake Content Lake also plays Stripe and records writes), and runs axe for WCAG 2.2 AA on every page, including the blog index, a category and a post. A separate `design` project (after everything else, because it changes the whole site's colours) serves a sample Brand colours palette from the fake Content Lake, light and dark, and checks the primary button's computed colour with JavaScript off, that the home page ships the same scripts, the share image, and axe on every tone and the home page; `design-visual` takes screenshots of the same palettes.

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
It is the sections view of the style guide (see _Style guide_ above). It is not part of the public site: it answers 404
unless `NODE_ENV` is `development` or `E2E_GALLERY=1` (`playwright.config.ts` sets it for the test build), or on a
preview deployment with the preview token, and `section-gallery` is a reserved first slug segment, so no CMS page can
use it. With no tone, layout or width chosen it renders exactly as it did before the controls existed; the controls sit
outside each `[data-gallery-section]` box, so they never reach the screenshots.

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
- **Which specs it refreshes:** those whose file name contains `visual`, plus `link-list-glass.spec.ts` (named in the
  `test:e2e:update` script). A new spec that takes screenshots must be added to that script, or the workflow will
  never create its baselines.
- **Refreshing** after an intended design change: `npm run test:e2e:update` on Linux, or from any system in
  Docker (use the image tag that matches `@playwright/test` in `package.json`). CI's runner is the reference:
  if a Docker-made baseline differs from CI by a few pixels (system fonts), use the workflow below instead.

  ```bash
  docker run --rm --ipc=host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.64.0-noble \
    sh -c "npm ci && npm run test:e2e:update"
  ```

  Without Docker, run the **Update visual baselines** workflow (Actions tab) and download its
  `visual-baselines` artifact into `tests/e2e/` (it holds one `*.spec.ts-snapshots` folder per visual spec: the
  section gallery's and the Studio brand preview's). Review the images before committing:
  a baseline is a promise that this is how the section should look.

- **A failed run** leaves the expected, actual and diff images in `test-results/` (CI uploads them).
- **Adding a section or a variant:** `npm run new:section` adds a placeholder gallery entry; give it real
  content, add one entry per look (as for the banner tones), refresh the baselines and commit them. The
  spec fails when a section type with a thumbnail in `public/section-previews/` has no gallery entry.

The A/B test spec starts a site-wide experiment, which rewrites every page request while it runs. It is its own Playwright project (`experiments`) that waits for `desktop` and `mobile` to finish, so no other test ever sees an experiment running. Any new spec that changes site-wide state (settings variants, experiments) should do the same, or restore the state before other specs can run.

### Launch check

`npm run launch:check -- https://example.com` asks a **deployed** site whether it is ready to go live. It is
dependency-free, makes only ordinary page requests plus the Sanity lookups below, and never changes anything. Run it
against the production domain, not a preview, because it compares the site with its own address (to check a protected preview deployment, see `--bypass` and `--expect-origin` below).

It prints one line per check (pass, warning or fail) with what to do about anything that isn't a pass, then exits `1`
if any check failed. Warnings never fail the run; read them anyway. `--json` prints the same results as JSON (for the
future Ops dashboard), and `--max-urls=N` lowers the page cap.

| Area      | Checks                                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HTTP      | Home page is 200 over HTTPS; `http://` redirects to HTTPS (permanently); `www` and the bare domain end on the same address; the security headers from `next.config.ts` are present; `/studio` responds                                                                               |
| SEO       | Canonical URLs use the production domain (not `localhost` or `*.vercel.app`); `robots.txt` allows crawling and lists the sitemap; every sitemap URL returns 200; titles and meta descriptions are unique; each page has one `h1`; no page is `noindex`; `og:image` returns an image  |
| Leftovers | The favicon isn't the old purple placeholder (fail), isn't still Currawong's default (warning), and a Browser icon from Studio loads as a PNG of the size its URL asks for; no "A clear headline about what you offer", "Replace:" or "lorem" in visible text; no links to localhost |
| 404       | An unknown URL returns 404                                                                                                                                                                                                                                                           |
| Sanity    | The dataset is private (the same check as `npm run check:dataset`); the production origin is in CORS; `/api/revalidate` answers an unsigned POST with 401 (or 404 when webhook mode is off)                                                                                          |
| Speed     | Optional: PageSpeed Insights scores for mobile and desktop (at least 90 for performance, accessibility and SEO) when `PSI_API_KEY` is set                                                                                                                                            |

- **Pages checked.** The home page plus every URL in the sitemap, capped at 200 (it says when it caps). Sitemap URLs on
  a different host are reported, then checked at the same path on the site you passed, so a wrong `NEXT_PUBLIC_SITE_URL`
  can't send the check to `localhost`.
- **Sanity values.** The dataset and CORS checks read `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` and
  `SANITY_API_READ_TOKEN` from `.env.local` or the environment, and the PageSpeed check reads `PSI_API_KEY`. None are
  printed. Without them the dataset check is a warning that says to run it with them set.
- **CORS is often a reminder.** Sanity only lets a token that can manage the project read the CORS list, and the
  Viewer token the site holds cannot. In that case the check is a warning with the exact `npx sanity cors add` command
  and where to look (sanity.io/manage → API → CORS origins). With a token that can read it, it fails when the origin is
  missing or lacks _Allow credentials_.
- **Favicon.** It fetches each icon link on the home page. The old purple placeholder SVG fails. Currawong's default
  `icon.png` or `apple-icon.png`, served byte for byte, is a warning ("still using Currawong's default favicon"):
  set the Browser icon in Studio. Icons from the Sanity CDN must answer 200 with `image/png` and be the size their
  URL asks for, which also proves the CDN rasterised an SVG upload.
- **Not covered.** Content and design quality, forms actually delivering email, analytics, and Stripe in live mode. Test
  those by hand.

#### Launch state: `--prelaunch`, `--bypass` and the launch lines

The check knows about [Pre-launch and launch](#pre-launch-and-launch). It reads the launch block from `/api/site-info`
(the profile the build saw), so the mode you run must match the site.

**Launch mode (the default)** gains three lines in the _Launch state_ area: `/api/site-info` says the site is **live**
(fail if it still says pre-launch); the home page is the real one, with canonical `/`, not the temporary page; and the
temporary page's own path (`/links`, or the profile's `homepage`) still answers 200 (a warning if not, because people
have shared that address: keep it published or add a redirect).

**`--prelaunch`** proves a pre-launch site is private:

`npm run launch:check -- https://example.com.au --prelaunch [--expect-private=/about,/pricing] [--expect-public=/privacy]`

| Check                           | Passes when                                                                                                                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/site-info` is pre-launch  | `launch.status` is `prelaunch` (it fails on a live site, and on a template older than the launch block). If it fails the rest are skipped                                                                                                                         |
| Home page is the temporary page | `/` answers 200 with a canonical to the homepage slug (`https://example.com.au/links`), never `/`                                                                                                                                                                 |
| The homepage is open            | `/links` (the profile's homepage) answers 200                                                                                                                                                                                                                     |
| Unfinished pages are private    | Each `--expect-private` path (default `/about`, `/blog`, `/search`, `/team`) answers **404** with `noindex` (header or meta) and **no navigation markup** in the raw HTML (`<nav>`, `<header>`, `<footer>` or `data-site-chrome`; CSS-hidden chrome still counts) |
| Sitemap lists only public pages | `/sitemap.xml` lists only the homepage and the `--expect-public` paths (match `launch.publicPages`)                                                                                                                                                               |
| Feed and search are closed      | `/feed.xml` and `/api/search?q=a` answer 404                                                                                                                                                                                                                      |
| Favicon isn't Currawong's       | The home page's icons aren't Currawong's default or the template placeholder (a **fail** here, because the client shares this page before launch)                                                                                                                 |
| Share image                     | The `og:image` the temporary page names returns an image (the generated `/api/og/<homepage>` when it names none)                                                                                                                                                  |

- **`--bypass`** sends `x-vercel-protection-bypass` on every request to the site's own host, so a protected Vercel preview
  deployment can be checked. The secret is `VERCEL_AUTOMATION_BYPASS_SECRET` from the environment or `.env.local`
  (Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation). It is **never printed**, is
  never sent to another host (a redirect elsewhere doesn't receive it), and the run stops with a message if it isn't set.
- **`--expect-origin=https://example.com.au`.** A preview deployment's canonicals, sitemap and share images name the
  production domain (`NEXT_PUBLIC_SITE_URL`), not the preview's address, so the canonical checks would fail. Pass the
  production domain and they compare against it. The run adds a note saying which it used.
- **`--expect-private`, `--expect-public`.** Comma-separated paths, repeatable, each starting with `/`.
- Nothing is crawled in this mode: about a dozen requests.

**When to run which.**

1. **Day one**, once the real domain is attached and the temporary page is published, before the client shares her link:
   `npm run launch:check -- https://example.com.au --prelaunch`. Replace the favicon if it fails.
2. **On the launch pull request's preview** (`status: 'live'` in `site.profile.ts`): run the default mode with
   `--bypass --expect-origin=https://example.com.au` against the preview URL. It must pass before you merge.
3. **After merging and deploying**, against the real domain: `npm run launch:check -- https://example.com.au`.

Sample output, from the saved fixtures (a site whose gate lets `/blog` open and whose sitemap lists too much):

```text
Pre-launch check for https://example.com.au

  STATUS  AREA          CHECK
  ✓ PASS  Launch state  /api/site-info says the site is pre-launch
  ✓ PASS  Launch state  Home page shows the temporary page
  ✓ PASS  Launch state  /links is open
  ✗ FAIL  Launch state  Unfinished pages are private
                        /blog answered 200, not 404.
                        Fix: Check launch.status is 'prelaunch' in site.profile.ts and the proxy gate is deployed (README, 'Pre-launch and launch').
  ✗ FAIL  Launch state  Sitemap lists only public pages
                        It also lists https://example.com.au/about, https://example.com.au/blog/hello.
                        Fix: The sitemap must come from the pre-launch handler. Check launch.status and redeploy.
  ✓ PASS  Launch state  Feed and search are closed
  ✓ PASS  Launch state  Favicon isn't Currawong's
  ✓ PASS  Launch state  Temporary page has a share image

Not private yet: 6 passed, 0 to review, 2 failed.
```

In launch mode the same area reads `✓ PASS  Launch state  /api/site-info says the site is live`, `Home page is the real
home page` (canonical `https://example.com.au/`) and `/links still answers`, beside the checks above.

The new checks are in `scripts/launch-check/prelaunch.mjs`, tested in `prelaunch.test.mjs` against saved HTML, header,
site-info and sitemap fixtures (no network; the bypass header is tested with a stubbed `fetch`).

For developers: each check is a pure function in `scripts/launch-check/*.mjs` (`http`, `seo`, `leftovers`, `sanity`,
`psi`) that takes already-fetched data and returns result lines; `scripts/launch-check.mjs` does the fetching and the
printing. Unit tests run them against the saved pages, headers, `robots.txt` and sitemaps in
`scripts/launch-check/fixtures/` and never touch a real site. `http.test.mjs` fails if `next.config.ts` and the header
list drift apart; `leftovers.test.mjs` fails if the placeholder icon copy drifts from `src/app/icon.svg`. To add a
check, write the function and its test, then call it from `runLaunchChecks`.

#### Screenshot sweep

`npm run launch:screens -- https://example.com` photographs every sitemap URL (and the home page) at 375, 768, 1280 and
1920 px wide into `launch-screens/<date>/` (gitignored), one full-page PNG per page and width, named like
`about-375.png` (`home-…` for `/`). Send the folder to the designer. It uses the Playwright browser from the end-to-end
tests (`npx playwright install chromium` once per machine) with reduced motion on, so scroll-in animations show their
final state; the cookie banner appears as a first-time visitor sees it. `--max-urls=N` limits pages (default 200, so up
to 800 images).

### Performance budgets

CI fails when a page gets heavier or slower than these. They run against the same production build and fake
Content Lake as the end-to-end tests.

| Budget                                  | Limit     | Where it lives                                    |
| --------------------------------------- | --------- | ------------------------------------------------- |
| JavaScript loaded by `/` (gzipped)      | 220 KB    | `JS_BUDGET_KB` in `tests/e2e/performance.spec.ts` |
| Lighthouse performance (all four pages) | ≥ 0.9     | `lighthouserc.json`                               |
| Lighthouse accessibility                | 1         | `lighthouserc.json`                               |
| Cumulative Layout Shift                 | ≤ 0.05    | `lighthouserc.json`                               |
| Largest Contentful Paint                | ≤ 2.5 s   | `lighthouserc.json`                               |
| Client memory (30 rounds of browsing)   | see below | `tests/e2e/memory.spec.ts`                        |

- **JavaScript:** the test fetches `/`, takes every `<script src>` in the HTML, gzips each file from
  `.next/static` (level 9) and adds them up (1 KB = 1000 bytes). Over budget, it lists every chunk, largest
  first. The total is about 218.5 KB today (200 KB before Motion, which adds 16.5 KB), so a new client-side dependency of even 2 KB trips it. Look first
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
  public site afresh with the gallery disabled, after the fake lake is ready. Applied (`devtools`)
  throttling is retained. It needs Chrome installed (CI's runner has it); on Windows set `CHROME_PATH`
  to the installed Chrome executable, or the Playwright Chromium executable. Reports go to
  `.lighthouseci/`. Each matrix entry nests its rules under `assertions` and explicitly selects
  median aggregation. `scripts/lighthouse-config.test.mjs` checks these rules against the installed
  LHCI assertion engine, including failures in two out of three runs; a successful collection alone
  does not establish budget compliance.
  The CLI's Lighthouse dependency is pinned to 13.5.0, the release targeting Chrome 156,
  rather than its bundled 12.6.1. Use Node 24 (see `.nvmrc`); a portable Node installation
  on the terminal's `PATH` is sufficient and does not require a computer-wide update.
  Browser/engine upgrades can change measurements, so compare runs using the same versions.
- **First-visit rendering:** the cookie banner's hidden markup is server-rendered and revealed by a small
  inline storage check after the banner's content, before hydration, when no valid choice exists.
  Revealing it after its children are parsed prevents a thin empty banner painting and then expanding.
  Its controls and keyboard focus
  take over after hydration; saved choices keep it hidden. All four pages now have the same 2500 ms
  LCP limit (About previously allowed 3000 ms for the late banner). Studio font loaders disable
  preloading so unused CMS fonts do not compete with public assets. Default browser tabs download a
  32 px icon rather than the 512 px original.
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
The section is immediately in Studio's _Add item_ menu with a title and text field, a **Design** tab (the shared
`style`, see [Section style](#section-style)) and a `SectionFrame` in its component. Then:

1. Add fields in `src/features/pages/schemas/sections/pricing-table.ts`
2. Query them in `pricingTableFragment` (`src/features/pages/api/sections.ts`) and run `npm run typegen`
3. Build the UI in `src/features/pages/components/sections/pricing-table.tsx` (a folder when it has
   [variants](#section-variants)), typed from the query, inside its
   `SectionFrame` (keep `style { ${sectionStyleFields} }` in the fragment, and keep `DEFAULTS` equal to the schema's
   initial style), and style it with the
   [design tokens](#design-tokens) (`bg-surface-alt`, `text-ink-muted`, `py-section`, `text-h2`): a raw colour class fails the
   `no-raw-palette` test
4. Optionally replace `public/section-previews/pricingTable.svg`
5. Give the placeholder entry the generator added to the section gallery (`gallerySections` in
   `tests/e2e/fixtures/dataset.mjs`) real content, one entry per variant, then add the screenshot baselines
   with `npm run test:e2e:update` (see _Section gallery and visual regression_).

Guidance is not automatic for new fields: give `imageField` the spot's `aspect` (`'4:3'`), `minWidth` (px) and/or
`orientation`, and add `lengthWarning(rule, max, 'Headings')` (`src/lib/sanity/schema/length-guidance.ts`) to titles and
intros, next to the other rules (`validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')]`).
Record the limits in a `LIMITS` constant at the top of the section's schema file with the CSS they come from, and change
them together with the component's typography. The comparison logic is `src/lib/sanity/schema/image-guidance.ts`
(unit tested); the validator reads `metadata.dimensions` once per asset per Studio session.

### Section variants

A section can have several layouts that share one data contract: the same fields, a different look. The
hero has four (`overlay`, `split`, `editorial`, `full-bleed`). Use a variant when editors should pick the
look per use and every layout reads the same fields; use a new section when the content differs.

- **The field.** `variant` is the **Layout** picker, first in the **Content** tab and agency-only (`variantField`,
  `src/lib/sanity/schema/section-variant.ts`). Give each variant a `description` and a `thumbnail` (an inline SVG
  component like `hero-thumbnails.tsx`, or a static file); without one the card shows only the title. The first variant is the default and reproduces the section's
  original look, so content saved before variants existed renders as it always did. The Studio list subtitle
  shows the choice and the background (`variantSubtitle`: "Hero · Split · Contrast"). The hero's `heroSubtitle` shows the matching preset's title ("Hero · Split, image left") using `matchPreset` from `src/lib/sanity/schema/preset-match.ts`, which the preset bar shares.
- **The folder.** `components/sections/hero/` holds `index.tsx` (the dispatcher, a `switch` on
  `stegaClean(data.variant)` whose `default` is the first variant, so an unknown value falls back safely) and one
  component per variant. `section-renderer.tsx` still imports `./sections/hero`. Shared markup (the hero's
  eyebrow, heading, intro and buttons: `hero-text.tsx`) is a helper in the folder. Every variant renders in a
  `SectionFrame` and styles with tokens only, and the first section's heading is the `<h1>` and its image is
  preloaded (`isFirst`). Keep the LCP element (the image or the heading) in the server-rendered HTML in each layout.
- **The hero's picker** is the preset bar (see _Hero presets_), so its Layout field is hidden.
- **Fields a variant needs.** Add them to the schema (hide them unless their variant is chosen, as `imagePosition`
  and `secondaryImage` are on the hero, and `backgroundImage` is for Editorial, which has no big picture), keep them in
  the Content tab, and say in the section's `rules` whether the variant has a picture (Parallax) or fixes its alignment and to the fragment, then run `npm run typegen`. The hero's `backgroundImage`
  is the one picture all variants share (behind the text, beside it, or full bleed).
- **The rule: at most four variants per section.** More means two sections, or the layout is a one-off. A bespoke
  layout for one client belongs in that client's repo (a new component and variant there), never in the template.
- **Gallery and tests.** Add a gallery entry per variant, and per option that changes the look (`hero-split-left`,
  `hero-editorial-inset`), in `tests/e2e/fixtures/dataset.mjs`. They are screenshot on desktop and mobile, and the
  axe, LCP and JavaScript-budget tests run against the home page. `variants.test.ts` fails if the schema's list and
  the component files drift apart.

```bash
npm run new:section pricing-table -- --variants cards,table,compact
```

`--variants` takes two to four names (the first is the default). The generator makes
`components/sections/pricing-table/` with `index.tsx` and one `<variant>.tsx` per name instead of a single file,
adds the `variant` field (with a `PRICING_TABLE_VARIANTS` list; add descriptions and thumbnails), projects it in the fragment, and writes one gallery
placeholder per variant. Fill in each layout and give each gallery entry real content.

The generator inserts code at the `// new-section:*` marker comments; keep them in place. To add a section
by hand, follow the same steps and register it in `schemas/sections/index.ts`, `pageBuilderFragment` and
`components/section-renderer.tsx`. Until a section is registered in the renderer, `tsc` fails with
"Property '<name>' is missing".

### Hero presets

Choosing a hero is choosing a design. A new hero is **Full background image**, dark, with nothing to configure. The
bar at the top of its Content tab offers six pictures, each setting the layout, the image side and the background in
one click (preset mode, see _Preset picker (Studio)_). Every field stays editable afterwards, and the bar shows
_Custom_ once one no longer matches.

| Preset                 | Layout (`variant`) | Also sets                          |
| ---------------------- | ------------------ | ---------------------------------- |
| Full background image  | `overlay`          | Background _Contrast_ (a new hero) |
| Split, image right     | `split`            | _Image side_ right, _Page_         |
| Split, image left      | `split`            | _Image side_ left, _Page_          |
| Centred text, no image | `overlay`          | Background _Page_                  |
| Editorial              | `editorial`        | _Page_                             |
| Image with panel       | `full-bleed`       | _Contrast_                         |

The four layouts are unchanged (the rule of four variants stands: `overlay`, `split`, `editorial`, `full-bleed`), and
the stored values are the same, so no migration is needed. Only the names editors read changed: _Overlay_ is
_Full background_ and _Full bleed_ is _Image with panel_ (in the Studio list too: "Hero · Full background · Contrast").
The old **Layout** picker is hidden, because the presets are the one picker. The presets are `HERO_PRESETS` in
`src/features/pages/schemas/sections/hero.ts`, with thumbnails in `hero-thumbnails.tsx`.

- **Centred text, no image** is _Full background_ on the page colour. A preset never clears a field, so nothing
  is lost by trying one: leave _Image_ empty, or remove it, for text only. With a picture it is a faded picture
  behind dark text.
- **Split options** (Design tab → _Advanced_, shown only for _Split_; clients never see them). _Proportion_: _50 / 50_
  (the default), _60 / 40 text_ or _40 / 60 image_. _Image shape_: _Rounded_ (the default), _Square corners_,
  _Circle_ or _Arch_. The picture is cropped to the shape with CSS (`border-radius`), so there is no extra image. A circle is
  always 1:1 and an arch is 4:5; rounded and square keep 4:3. The proportion applies from the `lg` breakpoint up and
  follows _Image side_ (the wider column is the picture's or the text's whichever side it is on); below `lg` the text and
  picture stack. Stored as `proportion` (`even`, `text`, `image`) and `imageShape` (`rounded`, `square`, `circle`,
  `arch`); unset or unknown values render the default. The logic is in `src/features/pages/utils/hero-split.ts`.
- **The hotspot is respected.** All four layouts set `object-position` from the picture's hotspot
  (`src/lib/sanity/image-focus.ts`; the editor's crop is taken into account), so a face or a product stays in
  view when the shape crops the picture. A picture with no hotspot stays centred.
- **Background video** is the Video section's _Ambient_ layout (see _Video_), not a hero option: it is a separate
  section so the hero's layouts and its LCP picture stay as they are.
- **Six decisions.** A split hero with an eyebrow, heading, description, two buttons and an image takes six
  decisions, not counting typing: add the _Hero_ section, pick _Split, image right_, upload the image, then each
  button's link, and the second button's style. Nothing else needs to be opened.

**Layout audit** (375, 768, 1280 and 1920 px; each layout with and without eyebrow, description, no, one or two
buttons, image and small picture, plus a long heading and description). Nothing overflowed sideways at any width. What it
found, and what changed:

- _Split_ on a tablet (768 px) drew its picture 696 × 540 px, taller than the text and most of the screen. Rounded and
  square pictures now stop at 24 rem tall below `lg` (the picture is cropped wider, not distorted).
- _Split_ cropped from the centre and ignored the editor's hotspot, so a face could be cut off. Fixed, as above.
- _Image with panel_ with no image kept its 28 to 40 rem minimum height, leaving a tall empty block. It now takes the
  height of its text, like the other layouts without a picture.
- The Layout picker beside the new preset bar was a second way to choose the same thing. Hidden.

Not changed, on purpose: _Split_ with no image sits in a narrower, centred column (its heading's left edge differs
from the one with a picture), and _Editorial_'s small picture sits below the text on a phone, left aligned.

The gallery has an entry for each preset that is not a layout of its own and for every Split option
(`hero-centred-text`, `hero-split-text-wide`, `hero-split-image-wide-left`, `hero-split-square`, `hero-split-circle`,
`hero-split-arch-left`, `hero-split-hotspot`), beside the existing layouts. `tests/e2e/hero-variants.spec.ts` runs axe on each, checks that the heading
(and the picture, when there is one) is in the server HTML and not lazy, and measures the proportions, shapes and
`object-position` in the browser. LCP for each preset used as the first section follows from that: the picture or the
heading is server-rendered, never lazy, and the picture's frame has a fixed ratio so it causes no layout shift. A
Lighthouse run per preset has not been done; `npm run test:lighthouse` still measures the home page.

### Hero supporting content

The hero has one approved slot, **Extra content under the heading** (Content tab), for something that backs the
heading up: a **Statistics bar** (two to four figures, see _Statistics_), **Badges** (one to three short labels, each with
an optional icon: tick, star, shield, clock, heart, lightning bolt, leaf or award) or **Logos** (one to six, in grey by
default; the _Greyscale_ switch keeps their colours instead). Nothing is added by default, so a hero looks the same
until an agency adds one.

**For editors.** Open the hero's Content tab, choose _Add item_ under _Extra content under the heading_ and pick one of the
three pictures. Add the figures, labels or logos and publish. It sits where the layout puts it, and the spacing, widths and
wrapping at every screen size are automatic. Clients see the slot only when it has something in it, and can change that
content; adding it and taking it out are for the agency. The slot holds one item: remove it to choose another type.

| Layout           | Where the slot sits                                                                     |
| ---------------- | --------------------------------------------------------------------------------------- |
| Full background  | Under the buttons (centred when the text is)                                            |
| Split            | Under the buttons, in the text column                                                   |
| Editorial        | In a column beside the text from `lg` up (under the small picture); below it on a phone |
| Image with panel | Inside the panel, under the buttons                                                     |

The slot takes the hero's tone, so it reads on a dark or a light hero. Greyscale logos stay dark grey, so on a dark
hero use white or transparent-background logos, or turn _Greyscale_ off.

**Animation.** The slot is the hero's _extra content_ part (see _Animating individual parts_): by default it rises after
the buttons, in the same sequence in every layout, and the agency can give it its own animation and delay. Figures count up only when the hero is not the first section and its
Animation is not _None_. Under `prefers-reduced-motion`, and without JavaScript, the slot is simply there.

**Studio rules.** The array is `supporting` with `options.slot: true`, which the Studio-wide input
(`src/features/studio/components/slot-input.tsx`) reads: _Add item_ disappears once the slot is full, duplicating is
off, and for clients adding and removing are off too (the field is hidden from them while empty). The rules are
`slotDisabledActions` in `src/lib/sanity/schema/slot-actions.ts` (unit tested). They use Sanity's `disableActions`, so
they are about the form, not permissions: for a hard guarantee use a document-level role rule. The insert-menu pictures are
`public/hero-slot-previews/<type>.svg`.

#### Adding a hero slot

A new slot type is one schema object, one component and one registry line:

1. **Schema.** Create the type as a shared object (`src/lib/sanity/schema/<name>.ts`, registered in `index.ts`; see
   `badge-row.ts` for a small one) and add `defineArrayMember({ type: '<name>' })` to the hero's `supporting` array
   (`src/features/pages/schemas/sections/hero.ts`). Add `public/hero-slot-previews/<name>.svg` for the insert menu.
2. **GROQ.** Add a fields fragment to `src/lib/sanity/fragments.ts` and a `_type == "<name>" => { ... }` line to
   `heroSupportingFields`. Run `npm run typegen` (with the fake project from `tests/e2e/constants.ts`, never your `.env`).
3. **Component.** Make a compact component in `src/components/ui/` with no section frame and no colours of its own (use
   `text-ink`, `text-ink-muted`, `border-line`, `text-accent-text`), and size it to the room it is given (container
   queries, as `StatsBar` does), because any layout can host it. Take a `centred` prop if it has an alignment.
4. **Registry.** Add the type to `SLOTS` in `src/features/pages/components/sections/hero/slots.tsx`. TypeScript fails
   until you do, because `SLOTS` is keyed by every `_type` the generated query can return.

Nothing else changes: the layouts do not know which types exist. Where the slot sits is a separate table,
`HERO_SLOT_PLACEMENT` in `src/features/pages/utils/hero-slot.ts` (unit tested against `HERO_VARIANTS`), which a new
**layout** extends. Each layout renders `<HeroSlot placement="...">` for the spot it has, and the slot appears only if the
map agrees. Add a fixture and a gallery entry for the new type in `tests/e2e/fixtures/dataset.mjs` (`SLOT_TYPES` and
`slotItem`, which put every type in every hero preset) and refresh the visual baselines. Reuse this pattern in another
section only when there is a real need: free nesting was rejected because it gives awkward layouts and complex rendering,
and a fixed optional field per feature makes the schema grow with every release.

**Tests.** Unit: the placement map, the slot actions, the badge icons. End to end (`tests/e2e/hero-slot.spec.ts`): every
slot type in every hero preset passes axe and fits at 375, 768 and 1280 px; placement (under the buttons, inside the
panel, beside the text, below it on a phone); the server HTML holds the figures; and the slot on a real page (`/hero-slot`)
fades in, is there at once under reduced motion and without JavaScript. The visual baselines for `hero-slot-*` are
Linux-only: refresh them with the **Update visual baselines** workflow.

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
git remote add template https://github.com/CurrawongCreativeCo/nocturne.git   # once
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

| Kind      | Paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Expect                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Customize | `site.profile.ts` (what the site uses: client, tier, features, approved sections, help links), `src/styles/tokens.json` (design tokens: colours, type, spacing), `src/styles/globals.css`, `studio-brand.json` (with `studio-brand.schema.json` kept as shipped), `src/assets/brand/client/`                                                                                                                                                                                                                                                            | Conflicts if the theme changed      |
| Customize | `src/features/pages/schemas/sections/*`, `src/features/pages/components/sections/*`, `src/features/pages/api/sections.ts`, `section-renderer.tsx`, `schemas/sections/index.ts`, `public/section-previews/*`                                                                                                                                                                                                                                                                                                                                             | Conflicts at each section you added |
| Customize | `tests/e2e/fixtures/dataset.mjs`, page templates (`schemas/templates.ts`), `public/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Conflicts where you added content   |
| Customize | `package.json` (name, scripts, your dependencies), `.env.example`, `sanity.config.ts` (project-specific plugins), `next.config.ts`, `README.md`                                                                                                                                                                                                                                                                                                                                                                                                         | Small conflicts                     |
| Core      | `src/lib/**`, `src/config/{env,paths,site-url,profile,define-site-profile}.ts`, `src/config/studio-brand/**`, `src/assets/brand/currawong/**`, `src/features/studio/theme.ts`, `scripts/build-tokens.mjs`, `src/components/ui/**`, `src/features/{studio,draft-mode,personalization,experiments,auth,pricing}/**`, forms and blog logic (`api`, `utils`), `scripts/{new-section,new-feature,new-document,new-singleton,generator-utils,section-names,e2e-server,release,release-utils,check-version}.mjs`, `template-version.json`, `eslint.config.mjs` | Clean                               |
| Core      | `.github/**` (CI, Dependabot), `tests/e2e/*.spec.ts` and `tests/e2e/{fake-sanity.mjs,constants.ts}`, `playwright.config.ts`, `vitest.config.mts`, `tsconfig.json`, `prettier.config.mjs`, `lighthouserc.json`, `.nvmrc`                                                                                                                                                                                                                                                                                                                                 | Clean                               |
| Generated | `src/types/sanity.types.ts`, `schema.json`, `src/styles/tokens.generated.css`, `src/config/tokens.generated.ts`, `package-lock.json`                                                                                                                                                                                                                                                                                                                                                                                                                    | Take either side, regenerate        |

Keep customisations out of core files where you can: add a section, a page template or a fixture
document in a new file or at the marker comments rather than editing shared code. Layout and design
tweaks to feature components (`src/features/*/components`) conflict like customize files. Where several
projects keep editing the same core file, see [docs/template-packaging.md](docs/template-packaging.md)
for when to extract it into a versioned package.

### Template version and `/api/site-info`

`template-version.json` at the repo root holds `{ "version": "1.2.0", "released": "2026-10-14" }`, the template release this
site was last brought up to. `src/config/template-version.ts` reads it. It is a core file: when you merge a template tag,
take the template's copy.

`GET /api/site-info` reports it for the Ops dashboard:

```json
{
  "templateVersion": "1.2.0",
  "tier": "content",
  "enabled": { "blog": true, "forms": true, "pricing": false, "…": "…" },
  "features": {
    "forms": true,
    "newsletter": false,
    "pricing": false,
    "members": true,
    "analytics": true,
    "sentry": false
  },
  "commit": "9f53519…",
  "builtAt": "2026-10-14T03:21:09.412Z"
}
```

- `tier` and `enabled` come from the site profile (`site.profile.ts`): what the site has switched on, for every feature in the profile.
- `features` says whether each feature's environment is complete, using the checks the features themselves use (forms:
  Turnstile, Resend and the from address; newsletter: also a provider; pricing: `STRIPE_SECRET_KEY`; members: at least one
  sign-in provider; analytics: at least one provider; sentry: `SENTRY_DSN`). It never contains a key or any other env value.
- `commit` is `VERCEL_GIT_COMMIT_SHA` (`null` off Vercel); `builtAt` is stamped by `next.config.ts` when the site is built.
- The response is prerendered and cached, so it costs no Sanity request and reflects the environment of the **last build**:
  after changing an environment variable, redeploy.
- A CMS page with a slug starting `api/` would clash with it, as with the other `/api` routes.

### Cutting a release (template maintainers)

1. Make sure `main` has everything and `npm run check`, `npm run test:e2e` and `npm run test:lighthouse` pass.
2. Run `npm run release -- 1.2.0` (add `--date YYYY-MM-DD` to override today). It checks the version is greater than
   `template-version.json`'s, moves the _Unreleased_ entries in `CHANGELOG.md` under a `## [1.2.0] - date` heading (empty
   subsections are dropped; _Breaking changes / migration steps_ is kept and says "None." when empty), refreshes the
   compare links and `template-version.json`, and leaves a fresh _Unreleased_ block. Write the migration steps in
   _Unreleased_ **before** running it.
3. Review the diff, then `npm run format`, `npm run check` and `npm run test:e2e`.
4. The script prints the git commands to commit, then tag and push (`git tag -a vx.y.z -m "vx.y.z"`,
   `git push origin main vx.y.z`). It never runs git or pushes. Never force-push a tag or `main`.

CI runs `npm run check:version` and fails when `template-version.json` doesn't match the latest `CHANGELOG.md` version
heading (or its date), so a release can't be tagged with one of them forgotten. `scripts/release-utils.test.mjs` tests
the changelog transformation.

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
- Structured data (schema.org Organization and WebSite) is generated from the site settings on every
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

## Studio performance check

This opt-in, local-only Playwright project measures the **production Studio** against a real,
signed-in, throwaway Content Lake. Normal `npm run test:e2e` and CI never discover it. It does not
create Sanity projects, datasets, tokens, CORS origins or memberships. An agency developer must set
those up by hand in Sanity Manage. Never use a client project, including a client's staging project.

1. Create a disposable project named **Nocturne Studio performance**, with a private dataset named
   **studio-perf**. Add `http://localhost:3200` to its CORS origins with credentials. Give your test
   account the Developer or Administrator role (the harness measures agency view and the built-in
   client-view preview with the same sign-in).
2. Add **every protected template/client project ID** to `tests/studio-perf/denied-projects.json`
   before setting the target. Keep this committed deny list current in client clones. The included
   `e2etest1` entry also prevents confusing this with the offline e2e fixture project. Missing,
   empty or malformed lists fail closed. A target matching the normal site's exported project ID
   or its `.env` files is also refused. There is no default project and no dataset override.
3. In a separate terminal, export `STUDIO_PERF_PROJECT_ID` and
   `STUDIO_PERF_CONFIRM_PROJECT_ID` to the **same throwaway ID**. Export a dataset-scoped write token
   as `STUDIO_PERF_WRITE_TOKEN` and a Viewer token as `STUDIO_PERF_READ_TOKEN`, both belonging only
   to the throwaway project. Use your secret manager; never paste tokens into committed files or
   command arguments. Do not export the normal site's `NEXT_PUBLIC_SANITY_PROJECT_ID` as the target.
4. Seed and build, then serve for the one-off sign-in:

   ```bash
   npm run studio-perf:seed
   npm run studio-perf:build
   npm run studio-perf:serve
   ```

   In another terminal:

   ```bash
   mkdir -p tests/studio-perf/.auth
   npx playwright codegen --save-storage=tests/studio-perf/.auth/state.json http://localhost:3200/studio
   ```

   Sign in to the throwaway project, wait until the Studio opens, then close codegen so it saves
   storage. The entire `.auth/` directory is gitignored: it contains credentials. Never upload it,
   traces or browser profiles. Stop the sign-in server before running the check; the harness refuses
   to reuse an existing server. Repeat sign-in when the saved session expires.

5. Run the measurement with the same environment:

   ```bash
   STUDIO_PERF_LABEL=baseline npm run test:studio-perf
   ```

   The separate server uses the build in `node_modules/.cache/studio-perf` and port 3200. Rebuild
   whenever code or target credentials change. The public site and Studio use the same throwaway
   project; the ordinary `.next` build is untouched. The browser blocks Content Lake requests for
   other projects/datasets. The seed uses fixed API URLs and `createIfNotExists`: reruns preserve
   existing fixture edits. It writes only the fixed dataset, including one SVG image asset, 10 small
   pages, 40 pages in a folder referencing shared content, a mixed 40-section page (hero slots and part motion),
   20 posts, their author, a shared section and site identity. It never deletes existing content.

Each complete experiment appends to `tests/studio-perf/results/<Brisbane-date>.json`, retaining
previous experiments from that day. Results include five raw samples and their median for each view:
first load to a populated, clickable desk; small and 40-section page opens; five document switches;
section expansion; the agency Design tab; typing on the large page through the Studio’s **Saved**
indicator; Presentation load; five preview route switches; and an actual Studio input edit
appearing in the preview. Edits are restored in `finally`; an interrupted process may leave a draft
in the disposable dataset. Discard that draft by hand before comparing experiments. Client view has
no Design tab, so that metric is agency-only. This reproduces task 160's client page opening path.

Every run starts a fresh browser context with cold HTTP cache and the saved sign-in; document and
Presentation interactions then run warm in that context. Server caches remain warm across runs.
Request interception disables the browser's HTTP cache
throughout the experiment, so warm interactions reuse Studio state rather than cached network assets.
Long tasks **over 200 ms** are captured per operation in both Studio and preview frames, with start
times relative to each frame's navigation. Timings include Playwright interaction/assertion overhead
and two animation frames to paint; they are consistent interaction proxies, not internal Sanity
instrumentation. Large-page typing uses a fixed 50 ms between characters and includes Sanity’s
one-second Saved-indicator delay; compare the same marker lengths and inspect long tasks for stalls.
A failed interaction fails the experiment; it never reports a timeout as a speed.

The desk-load download sample records script count, decoded script bytes and locally recompressed
gzip bytes (not negotiated wire bytes). This makes the 16 October script baseline comparable without
mixing fonts into JavaScript. Font count and decoded font bytes are recorded separately. Compare
font impact using the same run on the revisions before and
after task 172; fonts affect load timing even though their bytes are excluded from script totals.
Results also record revision, dirty-tree flag, browser version and platform. Use the same machine,
browser, network, dataset and viewport, with other tabs closed, for comparisons.

**Make a fix only after measuring.** Record a labelled baseline, change one measured bottleneck,
rebuild, then run with `STUDIO_PERF_LABEL=after-<fix>`. Review both raw samples and medians and commit
the result JSON alongside the fix. No fix is justified by bundle size alone. As of this harness's
implementation, client-section permissions already come synchronously from `site.profile.ts`, and
Presentation location `select` fields already contain only title and slug. Do not add a redundant
session cache or projection change. Profile validation while typing if the large-page measurement
or long tasks show a problem. No authenticated timings are included until this procedure is run with
a disposable project and saved sign-in.

When finished, revoke the throwaway tokens and remove the disposable project through Sanity Manage.
No public sections or visual baselines are changed by this harness.

### Link list clean-up verification

The browser specs import `test` from `tests/e2e/fixtures/test.ts`. Its context route serves real PNG
pixels from the fake Content Lake for unmocked Sanity images; a spec’s page routes take precedence,
so existing visual placeholder pixels stay unchanged. `fixture-images.spec.ts` checks both the PNG
response and decoded page images. Explicit `browser.newContext()` contexts are independent; add their
own image routes when a test needs loaded pictures. Public image handling and production Content Lake
requests are unchanged. After editing fixture documents, restart the test servers and rebuild; use a
fresh local Next.js build cache if old 404 responses persist.

The brand preview’s separate **Design inputs** examples exercise InheritableChoiceInput, IconPickerInput,
SliderInput and the actual OverlayPreview used by OverlayPreviewInput, without a Studio login or Content
Lake. Keyboard and axe checks cover both schemes and the expanded icon grid. Screenshot cases are
separate from the existing picker cases.

Existing baseline files have not been edited. Run **Update visual baselines** on Linux to add:

- `link-list-group-heading-image` and `link-list-spacing-{normal,wide,extra-wide}` in the section gallery,
  desktop and mobile;
- `studio-brand-design-inputs-{light,dark}` and `studio-brand-design-inputs-icons-{light,dark}` on desktop.

The authenticated six-panel Design audit is still required; the source review, capture checklist and
reason it could not be captured here are in
[the 23 October audit note](docs/studio-audit/2026-10-23/link-list-review.md).

## Empty lists

Sanity 6.19's Structure Builder has no empty-state, description or subtitle option, and the one empty line of a whole-type list ("No documents of this type") is a single global string. So the Studio does only what is supported and cheap:

- `src/features/studio/empty-list-wording.ts` overrides that string, through an `i18n` bundle in `sanity.config.ts`, with "Nothing here yet." It names no action or type because it appears in every such list, including for clients who can't create documents and in Enquiries.
- Shared sections, Forms and Panels use the native `showCount()` badge. Enquiries can't: its list is a filtered, listener-backed pane, which Sanity withholds the badge from; its title already shows the new count.
- **AI context** is not a Structure list. It is the `assist.instruction.context` type that the `@sanity/assist` plugin registers and manages, so its empty state is Sanity's.

**Deferred (task 165):** per-list purpose, example and who-uses-it lines, and role-aware create buttons, need either replacing the native list pane (rejected: upgrade risk) or a new surface such as a section on _Start here_. Creation already follows Sanity's permissions and the client `CLIENT_NEW_DOCUMENT_IDS` list.
