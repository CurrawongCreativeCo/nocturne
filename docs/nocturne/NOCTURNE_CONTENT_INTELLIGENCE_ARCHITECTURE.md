# Nocturne Content Intelligence Architecture (Document E2)

**Status:** the direction was approved by the owner on 26 October 2026. This is **revision r2**, the same day, refining:

- stable entity identifiers (§3.2);
- semantic parity instead of literal string matching (§3.5);
- AI-search intelligence from current official sources (§8);
- crawler controls (§8.3).

Nothing is implemented, and the canonical build plan (version 19) is unchanged.

**Companion documents:**

- [E1, Design Engine](./NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md);
- [E3, product architecture](./NOCTURNE_PRODUCT_ARCHITECTURE.md);
- [E4, roadmap integration](./NOCTURNE_DE_CI_ROADMAP_INTEGRATION.md).

The evidence labels are the same as in E1: `[Code]`, `[Test]`, `[Plan]` and `[Hyp]`.

---

## 1. The product, in one question

> **What is wrong with this website's content, what should we improve, why, and did the improvement work?**

Content Intelligence answers that question with **findings**, not scores. A finding:

- names a rule;
- shows the observed evidence;
- says whether it's an objective error or a judgement;
- points to the exact Studio field that fixes it;
- can be re-checked.

Improvements are recorded so their outcomes can be reviewed later, with honest caveats.

**The most important architectural decision (CI-1): one entity graph, many projections.**

1. Business facts live **once**, in typed Sanity documents.
2. Everything a search engine or an AI system reads is generated from those documents: the visible page, metadata, JSON-LD, `sitemap.xml` and `llms.txt`.
3. The audit then checks that **the projections agree with each other and with the facts.** Disagreement is the most valuable class of finding, and most of it can be detected deterministically.

---

## 2. Existing SEO and content capabilities

| Capability                           | Class                    | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Tasks         |
| ------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Page metadata                        | 1                        | <ul><li>The `seo` object (`metaTitle`, `metaDescription`, `ogImage`, `noIndex`) on pages, with `generateMetadata` in each route.</li><li>A generated OG image route. `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                             | —             |
| Sitemap, robots and canonicals       | 1                        | `src/app/sitemap.ts` (chunked), `robots.ts`, canonical URLs `[Code][Test]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —             |
| AI crawler policy                    | 1                        | The `allowAiCrawlers` switch in Site identity, plus `src/lib/ai-crawlers.ts`, with an e2e spec `[Code][Test]`. **r2:** the one switch mixes training and search crawlers (§8.3)                                                                                                                                                                                                                                                                                                                                                                                                           | —             |
| `llms.txt`                           | 1                        | Built from page titles and summaries (`src/lib/llms-txt.ts`) `[Code][Test]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —             |
| IndexNow                             | 1                        | Pages and posts are submitted on publish `[Code][Test]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 36            |
| JSON-LD                              | 1, but fragile (class 3) | <ul><li>`Organization` or a LocalBusiness subtype, plus `WebSite`, as one `@graph` (`site-json-ld.tsx`, `business-json-ld.ts`).</li><li>Separate emitters for `Article`, `Person`, `Event`, `BreadcrumbList` and `FAQPage`.</li><li>**Fragile:** six emitters each build their own `@id` strings (`${new URL('/', siteUrl)}#organization` is repeated); ordinary pages have no `WebPage` node; an Article's `author` is an anonymous `Person` even when the author is a team member; `author` and `teamMember` are separate types, so one person can be entered twice.</li></ul> `[Code]` | 16, 21, 97    |
| JSON-LD tests                        | 4, in progress           | PR #102 (task 188) adds `src/lib/json-ld-visibility.ts`: names, addresses, opening times and FAQ text are checked against visible text, `@id`s are unique, and `WebPage` references are checked, crawled across the sitemap fixtures `[Code: PR]`                                                                                                                                                                                                                                                                                                                                         | 188           |
| Site-wide launch audit               | 1                        | <ul><li>`npm run launch:check <url> --json` covers HTTPS and redirects, www and apex, security headers, canonicals, robots, sitemap entries and statuses, unique titles and descriptions, a single H1, indexability, OG images, leftovers, the dataset being private, CORS, the revalidate webhook, PSI and the verification marker.</li><li>All of it is pure functions with tests (`scripts/launch-check/*.mjs`). `[Code][Test]`</li></ul>                                                                                                                                              | 28, 187       |
| Daily health                         | 1                        | `.github/workflows/health.yml` (`origin/main`) runs `launch:check --json` and `check:dataset` every day and opens, updates or closes a GitHub issue (`scripts/health-report.mjs`) `[Code]`                                                                                                                                                                                                                                                                                                                                                                                                | 189           |
| Studio content health                | 1                        | <ul><li>`src/features/studio/content-health/utils/detect.ts` is pure and draft-aware.</li><li>It finds missing meta descriptions, missing alt text, broken internal links, broken anchors, broken panels, redirect loops and chains, and orphan pages.</li><li>Each item has a Studio intent link. `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                               | —             |
| Writing help                         | 1                        | Length guidance on headings and descriptions; AI Assist presets that use the site's voice (`assist-presets.ts`), for example "Write meta description" from the page's own facts `[Code]`                                                                                                                                                                                                                                                                                                                                                                                                  | 23, 35        |
| Business facts                       | 1, with a gap            | <ul><li>`businessInfo` holds trading and legal name, ABN, phone, email, address, time zone, hours, special hours, service areas (plain strings), social links, business type, geo and price range.</li><li>`siteIdentity` holds the title, description, logo and OG image. `[Code]`</li></ul>                                                                                                                                                                                                                                                                                             | 21            |
| Services and locations               | 4                        | Content contract v2 (tasks 191, 192 and 212) `[Plan]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 191, 192, 212 |
| Internal-link graph on the live site | 4                        | Task 195 `[Plan]`. **It overlaps** content health's orphan and broken-link detection, which already runs on content                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 195           |
| Search Console                       | 4                        | Tasks 202 and 210, in the Foundation app. Nothing in the repo yet `[Plan]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 202, 210      |
| Content-quality analysis             | 5                        | Nothing beyond length warnings. Fleet content QA is planned for later (57) `[Plan]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 57            |
| Improvement tracking                 | 5                        | Nothing records which change was made for which reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —             |

**Reading of the evidence.** The deterministic foundations are unusually strong for a starter. What's missing is:

1. one place that owns the entity graph;
2. a common **finding** format across the three places checks already run (Studio, `launch:check` and health);
3. a page-level view;
4. a record of changes.

---

## 3. Structured-data architecture

### 3.1 Who owns each business fact

**Rule: each fact has one owning field.** Everything else is a projection.

| Fact                    | Owning document and field                                                                                    | Visible where                          | JSON-LD                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------- |
| Trading name            | `businessInfo.tradingName` (falls back to `siteIdentity.title`)                                              | Header and footer                      | `#organization.name`                                                              |
| Legal name and ABN      | `businessInfo.legalName`, `abn`                                                                              | Footer                                 | `legalName`; `taxID` only if the ABN is shown `[Hyp: it is in the footer]`        |
| Logo                    | `siteIdentity.logo`                                                                                          | Header                                 | `logo`                                                                            |
| Phone, email, address   | `businessInfo` (primary place); `location` documents for branches                                            | Location section, footer, contact page | The LocalBusiness `telephone`, `email` and `address`; each branch on its own node |
| Hours and special hours | `businessInfo`, or `location`                                                                                | Location section, Open now badge       | `openingHoursSpecification`                                                       |
| Service areas           | Today `businessInfo.serviceAreas` (strings). **Proposed:** `location` documents of kind _service area_ (212) | Location and service pages             | `areaServed`, as `@id` references once areas are documents                        |
| Services                | `service` documents (192)                                                                                    | Service pages and listings             | `Service` with `provider` and `areaServed`                                        |
| People                  | `teamMember`. **Proposed (191):** `author` can reference a `teamMember`, so one person isn't entered twice   | Team pages, bylines                    | `Person` with `worksFor`; an Article's `author` → `#person`                       |
| Articles                | `post`                                                                                                       | Blog                                   | `Article` with `isPartOf` → `#website`                                            |
| Events                  | `event`                                                                                                      | Events                                 | `Event`, with `location` → a location's `@id` when one exists                     |
| Questions               | FAQ section items                                                                                            | The page the FAQ is on                 | `FAQPage`, once per page, only where the FAQ is visible                           |
| Social profiles         | `businessInfo.socialLinks`                                                                                   | Footer, Link list                      | `sameAs`                                                                          |

**No field asks for the same fact twice.** Pages _reference_ entities (a service page's template reads its `service` document). They never copy facts into rich text. Where an editor does type a fact into rich text, such as a phone number in a paragraph, the audit compares it with the owner (§5, rule F-3).

### 3.2 Stable entity identifiers (revised in r2)

**Decision: a persistent business entity keeps its `@id` when its page URL or slug changes.** Only nodes that _describe a URL_ use the URL.

- An `@id` is a node identifier, not a link. Search engines merge facts about an entity by `@id`, so a changing `@id` splits one service or person into "two" over time.
- The Sanity document `_id` is already stable across slug changes, renames and redirects. It's unique, and it needs no new field.

`@id`s are generated by one module (`src/lib/structured-data/ids.ts`, task 222). `{key}` is the published document `_id`, with any `drafts.` or version prefix removed:

| Entity                                   | `@id`                                   | Keyed by                         |
| ---------------------------------------- | --------------------------------------- | -------------------------------- |
| Organisation or business                 | `{origin}/#organization`                | Singleton                        |
| Website                                  | `{origin}/#website`                     | Singleton                        |
| Service                                  | `{origin}/#service-{key}`               | Document: survives slug changes  |
| Location, branch or service area         | `{origin}/#location-{key}`              | Document                         |
| Person (team member, or a linked author) | `{origin}/#person-{key}`                | Document                         |
| Event                                    | `{origin}/#event-{key}`                 | Document                         |
| Article                                  | `{origin}/#article-{key}`               | Document                         |
| WebPage                                  | `{pageUrl}#webpage`                     | URL: the node describes that URL |
| BreadcrumbList, FAQPage                  | `{pageUrl}#breadcrumb`, `{pageUrl}#faq` | URL                              |

**Rules:**

- **The origin** is the production origin (`siteUrl`), never a preview host. A domain change changes every `@id`. That's rare, accepted, and covered by redirects.
- **Each entity is described in full once,** on its canonical page (the organisation in the site graph), and **referenced by `@id` everywhere else.** The node's `url` property carries the current page URL, so a slug change updates `url` while the `@id` stays the same.
- **Moving from today's ids is a one-off change.** Today's URL-based `#person` ids (`person-json-ld.tsx`) move to document-keyed ids. Search engines re-read the graph, so nothing persisted breaks.
- **Readable keys were considered and rejected.** A dedicated readable key field would also survive slug changes, but Studio's Duplicate action copies it, so it would need uniqueness validation. Document ids avoid that. They're not secret: the dataset is private, and an id grants no access.

### 3.3 Page-level versus site-level entities

- **Site level** (every page, from the site shell): the `#organization` and `#website` nodes.
- **Page level:**
  - the `WebPage` node: `isPartOf` → `#website`, `about` → the page's main entity when it has one;
  - the breadcrumbs;
  - **the page's own main entity:** a `Service` on a service page, a `Person` on a profile page, an `Article` on a post.
- **References, not repetition.** A page refers to site entities by `@id` and never repeats their properties. This prevents contradictory duplicates, such as two different phone numbers for `#organization`.

### 3.4 Choosing schema types

| Rule                                                                                                                                                                                                                                                            | Status                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| The business type comes from `businessInfo.businessType`, a curated LocalBusiness subtype list or a validated "Other" (`businessSchemaType`)                                                                                                                    | Exists                      |
| A type is emitted only when its source content exists and is visible                                                                                                                                                                                            | Partly; 188 tests it        |
| No `AggregateRating` or `Review` markup about the business itself. Search engines treat self-serving review markup on LocalBusiness and Organization as ineligible, so testimonials stay plain content `[Hyp: re-check Google's current policy when 192 lands]` | **New rule**                |
| No `Product` or `Offer` unless the pricing section shows the price                                                                                                                                                                                              | **New rule**                |
| `FAQPage` only for FAQs on the page, never site-wide                                                                                                                                                                                                            | Exists (in the FAQ section) |

### 3.5 Validation

1. **Unit tests** on each node builder, for the required and recommended properties per type, following the search engine documentation at the time of writing.
2. **Semantic parity (revised in r2), replacing literal string matching.** The graph module records each JSON-LD property's **provenance**: the document and field it came from. Validation then checks meaning, by property class:

   | Class                                                                                                                      | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
   | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | **Visible facts:** name, headline, telephone, email, address, opening hours, price, event dates, FAQ questions and answers | <ul><li>The fact must be presented on the page, or in the site's visible business facts, as the **same value**. "Same" is compared by type, not by characters.</li><li>Phones are compared as E.164 (`parseAuPhone`); addresses by component, with St/Street and state abbreviations accepted; hours as day and time ranges (5:30 pm = 17:30); dates as dates; prices as amount plus currency; names after case, punctuation, diacritic and "&"/"and" folding.</li></ul> |
   | **Descriptive text:** description, abstract                                                                                | Must come from a field that's **rendered on this page** (provenance). It may be truncated or stripped of formatting. No string match is required                                                                                                                                                                                                                                                                                                                         |
   | **Reach:** `areaServed`                                                                                                    | Stated visibly somewhere on the site (for example a service-areas list), not necessarily on this page                                                                                                                                                                                                                                                                                                                                                                    |
   | **Identity and technical:** `@id`, `url`, `sameAs`, `logo`, `image`, `geo`, `inLanguage`, dates modified                   | Exempt from visibility, but must be valid and consistent: URLs are absolute https and answer 200 or canonical; `geo` is within Australia unless the business says otherwise                                                                                                                                                                                                                                                                                              |

   **"Visible" means present in the rendered page and reachable by a visitor.** Content in collapsed accordions or tabs counts; text hidden from everyone doesn't. A check that reads only currently painted text (`innerText`) would wrongly fail collapsed FAQ answers, so the rendered DOM is read with hidden-by-design containers expanded.

   **Contradiction checks stay strict:**

   - one `@id` with different property values on different pages;
   - a JSON-LD value that differs from its owning field;
   - visible text stating a different fact (rule F-3).

   **Unsupported claims stay on the deny list (§3.4):**

   - self-serving ratings and reviews;
   - offers without a visible price;
   - FAQs that aren't on the page;
   - credentials that aren't shown;
   - types that don't match the business.

   **Relation to task 188.** Task 188's helper (PR #102) already normalises text. It merges as the first layer, and task 222 replaces its literal comparisons with these typed and provenance checks.

3. **Graph integrity:** `@id`s are unique per entity, every reference resolves within the site's graph, and there's one node per `@id` per page.
4. **`launch:check`:** the same parity and integrity checks against the live site.
5. **Manual and occasional:** Google's Rich Results Test and the schema.org validator have no supported API. The runbook lists them as a launch step (198), not an automated check.

---

## 4. Technical SEO analysis

**What's detectable, and how sure it is:**

| Check                                                           | Where it runs today                                 | Basis                                                        | Gap                                                                                                                         |
| --------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Indexable: status, `noindex`, robots, canonical to self         | `launch:check`                                      | Deterministic                                                | Per page, as one view (223)                                                                                                 |
| Canonical points to a 200 page, not a redirect                  | `launch:check` (canonicals)                         | Deterministic                                                | —                                                                                                                           |
| Sitemap entries are 200, indexable and canonical                | `launch:check`                                      | Deterministic                                                | —                                                                                                                           |
| Title and description present and unique                        | `launch:check`, content health                      | Deterministic                                                | Length outside 30–60 or 70–160 characters is a **heuristic** (the length guidance exists in Studio)                         |
| A single H1, and heading order                                  | `launch:check` (H1), axe (order)                    | Deterministic                                                | Heading order isn't in `launch:check`                                                                                       |
| Internal links: broken, orphan pages, services nothing links to | Content health (content), 195 planned (HTML)        | Deterministic                                                | **Merge, don't duplicate:** 195 reuses `detect.ts` and only adds what HTML shows (links in rendered navigation and footers) |
| Redirect loops and chains                                       | Content health (rules), `launch:check` (HTTP)       | Deterministic                                                | —                                                                                                                           |
| Image alt text                                                  | Content health, axe                                 | Deterministic for missing alt; **judgement** for alt quality | —                                                                                                                           |
| Performance and accessibility                                   | Lighthouse CI, PSI in `launch:check`, the JS budget | Measured                                                     | Field data (CrUX) only at volume; report "not enough data" rather than guessing                                             |

**Human judgement is needed for:**

- whether a page _should_ be indexed;
- which page is the canonical one for a topic;
- the quality of alt text;
- the quality of a title.

---

## 5. Content quality and relevance

The rules are split by basis, and every finding carries its basis.

| Rule | What it checks                                                                                                                      | Basis                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| F-1  | A service or location page is missing its summary, its main body, or a call to action                                               | Deterministic                                                             |
| F-2  | A service exists but no page or navigation item links to it; a location has services nothing offers there                           | Deterministic (needs 192 and 212)                                         |
| F-3  | **Fact conflict:** a phone number, email, ABN or street address in rich text or a heading differs from the owning field             | Deterministic, matched against the owning fields' values                  |
| F-4  | Stale facts: special hours in the past still shown, a past event still featured, a "this year" claim with an old date               | Deterministic                                                             |
| F-5  | Duplicate or near-duplicate titles, descriptions or summaries across pages                                                          | Deterministic for exact matches; heuristic for near matches               |
| F-6  | A thin page: visible word count well below other pages of the same template                                                         | **Heuristic:** reported with the numbers, never as "thin content penalty" |
| F-7  | Clarity and completeness for the page's purpose (for example, does a service page say who it's for, what happens and how to start?) | **Judgement:** an AI-assisted review in Studio, as suggestions only       |
| F-8  | Location-specific information on location pages (address, hours, how to get there, local proof)                                     | Deterministic presence; judgement for usefulness                          |

**F-7 is the only AI rule.** It runs on request, through Studio's AI Assist or a review action, and produces suggestions with the instruction it used. It never writes published content. Fleet-wide, it's task 57's AI pass, which reports the same finding format.

---

## 6. The finding contract (decision CI-2)

```ts
export interface Finding {
  ruleId: string // 'sd.visible-parity', 'seo.title-duplicate', 'content.fact-conflict' …
  basis: 'deterministic' | 'heuristic' | 'judgement'
  severity: 'blocker' | 'error' | 'warning' | 'suggestion'
  scope: { kind: 'site' | 'page' | 'entity'; url?: string; documentId?: string; path?: string }
  evidence: {
    observed: unknown // the actual value or values seen
    expected?: unknown // the rule's expectation, when there is one
    source:
      | 'content'
      | 'html'
      | 'json-ld'
      | 'headers'
      | 'search-console'
      | 'ai-report'
      | 'analytics'
      | 'model'
    at: string // ISO time of the observation
    caveats?: string[]
  }
  why: string // one plain sentence: why this matters
  fix: { summary: string; studioIntent?: string } // a deep link to the field, where one exists
  verify: string // how to re-check, for example 'npm run audit:page -- <url>'
}
```

**One rule library, three runners:**

| Runner                                                          | What it sees                                                                      | Rules                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Studio content health (exists)                                  | Drafts and published content                                                      | Content rules: links, alt text, metadata, fact conflicts, stale facts |
| `launch:check` and `audit:page` (proposed), run daily by health | Rendered HTML, headers and JSON-LD, plus published content through the read token | Projection rules: parity, graph, indexability, HTML-only links        |
| Foundation, later                                               | The above outputs, plus Search Console                                            | Evidence rules: CTR gap, decline, query without a page                |

**Ordering:**

1. severity: blocker (not indexable, broken canonical, a private dataset that's public), then error, then warning, then suggestion;
2. then basis: deterministic before heuristic before judgement;
3. then how much the page matters: its share of internal links, and its Search Console impressions once available.

The order is stated, not computed into a score.

---

## 7. Search Console integration design

**Access:**

- The client adds a **service account** as a **restricted (read-only) user** on their property. This needs the client's consent, recorded at handover (task 32).
- The account holds read-only access; Search Console is read with the `webmasters.readonly` scope.

**Data:** `searchAnalytics.query` by `page × query × date`, for **final data only** (2–3 days' lag). It's paged to 25,000 rows per request, and truncation is recorded. Anonymised queries are counted but not named.

**Where it runs:**

- **First, a local spike (226):** a script in the template's `scripts/` writes to a git-ignored folder, so the evidence model can be tried on a real site before Foundation exists.
- **Then:** Foundation imports it on a schedule (202). The spike's code is the starting point.

**Opportunity rules, each with its evidence and caveats:**

| Card                 | Evidence                                                                                                                           | Minimum data `[Hyp: tune on real data]`                  | Caveats shown                                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CTR gap              | A page's CTR for a query, against **the site's own** CTR at a similar average position (bucketed), not an industry curve           | 28 days, at least 200 impressions for the page and query | Position is an average; SERP features change CTR; **AI Overviews and AI Mode impressions are inside the Web totals and can't be separated through the API (as of October 2026)**; a branded or non-branded mix; the title may be rewritten by Google |
| Declining page       | Clicks and impressions in the last 28 days against the previous 28, plus the same period last year when 13 months exist            | At least 100 clicks in the earlier window                | Seasonality (stated as unknown until 13 months exist), algorithm updates, site changes in the window                                                                                                                                                 |
| Query without a page | Impressions for a query whose best page isn't about it (the query's words against service and location names and the page's title) | 28 days, at least 100 impressions                        | **Heuristic** label; intent is guessed                                                                                                                                                                                                               |
| Indexing anomaly     | Sitemap URLs with no impressions after 28 days, or URL Inspection (rate-limited, and only on request)                              | —                                                        | A new page; low demand                                                                                                                                                                                                                               |

**Example output for "a service page with low CTR"** (illustrative numbers and a made-up business, not real data):

> **Evidence:** /services/remedial-massage had 1,240 impressions and 11 clicks (CTR 0.9%) for "remedial massage newtown" from 1 to 28 October, at an average position of 6.2. Your site's CTR at positions 5–7 is 2.8%.
>
> **Why it might matter:** the title is "Services", which doesn't name the service or the suburb.
>
> **Suggestion:** "Remedial massage in Newtown | Example Clinic" (the proposed title is checked against length and duplicates).
>
> **Caveats:** one query; Google may rewrite titles; the position is an average.
>
> **No outcome is promised.**

**Measuring outcomes.** After the change is published (its revision is recorded), compare 28 days before and after, aligned by weekday, for the same page and query set. Report it as an **observed change**, with:

- the confounders that are known: other changes to the same page, site-wide changes in the window, and update dates entered by hand;
- "too little data" when the window falls below the minimums.

It's never presented as causation.

---

## 8. AI-search intelligence (revised in r2 from official sources, checked 26 October 2026)

### 8.1 What's observable, and how

| Source                                                                                   | What it reports                                                                                                                                                                                                                                                                                                                                                | Programmatic access                                                                                                                                                                                             | Doesn't report                                                                     |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Google Search Console, Generative AI performance report (Search)**, launched June 2026 | <ul><li>**Impressions** of links to the site in **AI Overviews and AI Mode**, by page, country, device and date.</li><li>A separate report covers generative AI features in Discover.</li><li>The same impressions are already included in the overall Performance report.</li><li>The report may not appear when a site has too few AI impressions.</li></ul> | **UI and export only, as far as Google's help pages say.** API access isn't documented `[Hyp: re-check in 229]`. The existing `searchAnalytics` API returns Web totals with AI features included, not separated | Clicks, CTR, queries, positions                                                    |
| **Google Search Console, Search generative AI control**, worldwide from 31 August 2026   | A setting that **excludes** a site from AI Overviews, AI Mode and Discover's generative AI features. It isn't a ranking signal for other results, and it doesn't affect training (that's Google-Extended)                                                                                                                                                      | A Search Console setting, set by hand                                                                                                                                                                           | —                                                                                  |
| **Bing Webmaster Tools, AI Performance**, public preview from February 2026              | <ul><li>**Citations** in Microsoft Copilot, Bing's AI summaries and select partners: total citations, average cited pages, page-level citations and trends.</li><li>**Grounding queries**, which are a sample.</li></ul>                                                                                                                                       | Dashboard. No API is announced by Microsoft. Third parties report API support is "on the backlog"                                                                                                               | Clicks; ranking or placement within an answer; ChatGPT, Gemini, Perplexity, Claude |
| **ChatGPT search** (OpenAI)                                                              | No publisher console. Referral visits from `chatgpt.com` appear in the site's analytics. A `utm_source=chatgpt.com` tag is widely reported, but isn't in OpenAI's crawler documentation `[Hyp]`                                                                                                                                                                | Analytics only (task 55's referrer classification)                                                                                                                                                              | Impressions, citations                                                             |
| **Perplexity, Claude, Gemini app, Copilot**                                              | No publisher consoles. Referral visits only                                                                                                                                                                                                                                                                                                                    | Analytics only                                                                                                                                                                                                  | Impressions, citations                                                             |
| **Server and CDN logs**                                                                  | Which crawlers fetched which URLs                                                                                                                                                                                                                                                                                                                              | Host logs. Retention on Vercel is short, and depends on the plan                                                                                                                                                | Whether fetched content was used or shown                                          |

### 8.2 Technical readiness versus observed visibility

They're **two separate families of findings,** never combined into one number.

| Readiness: can AI systems read and trust it? (deterministic, in the site's own checks)                                                                                                                                                                                                                                                                                                                                                                    | Observed visibility: did it appear? (measured, from external reports)                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <ul><li>Indexable and eligible for a snippet: no unintended `nosnippet`, `max-snippet`, `data-nosnippet` or `noindex`.</li><li>robots.txt allows the search crawlers the owner intends to allow (§8.3).</li><li>The main text is in the server HTML.</li><li>Entity facts are consistent (§3, F-3).</li><li>Services and locations state what, who, where and how (F-1).</li><li>Fresh content is announced through IndexNow (task 36, exists).</li></ul> | <ul><li>Google: AI impressions by page, from the generative AI report.</li><li>Bing: citations and grounding queries, from AI Performance.</li><li>All: AI-assistant referral sessions in analytics.</li><li>Crawler fetches in logs, as evidence of access only.</li></ul> |
| **Proves:** that nothing technical prevents inclusion                                                                                                                                                                                                                                                                                                                                                                                                     | **Proves:** what was shown or clicked, on the surfaces that report it                                                                                                                                                                                                       |
| **Doesn't prove:** inclusion, citation or traffic                                                                                                                                                                                                                                                                                                                                                                                                         | **Doesn't prove:** why; and most surfaces report nothing                                                                                                                                                                                                                    |

### 8.3 Crawler-access controls

The audit found that **the current single `allowAiCrawlers` switch mixes three different purposes.** `src/lib/ai-crawlers.ts` blocks GPTBot, ClaudeBot, Google-Extended and CCBot (training) together with PerplexityBot (search). Opting out of training therefore also removes a site from Perplexity's search answers, which an owner wouldn't expect. The vendors document the purposes separately:

| Purpose                             | User agents                                                  | Notes from the vendors                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model training**                  | GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot | <ul><li>Disallowing GPTBot signals "content should not be used in training" (OpenAI).</li><li>Google-Extended limits training and grounding in _other_ Google systems, not Search.</li></ul> |
| **AI search indexing**              | OAI-SearchBot, Claude-SearchBot, PerplexityBot               | <ul><li>Opting out of OAI-SearchBot removes a site from ChatGPT search answers, though it may still appear as a navigational link.</li><li>Changes take about 24 hours to apply.</li></ul>   |
| **User-triggered fetches**          | ChatGPT-User, Claude-User, Perplexity-User                   | OpenAI says robots.txt "may not apply" to user-initiated actions. Treat these as visits, not crawling                                                                                        |
| **Google AI Overviews and AI Mode** | Googlebot, plus the Search Console generative AI control     | Not controllable through Google-Extended. The Search Console control or snippet controls apply                                                                                               |

**Recommendation (new task 228):** replace the one switch with two, each in plain English:

- **"Let AI companies train on this site's content"** (the training crawlers);
- **"Show this site in AI search answers"** (the search crawlers, on by default).

**The migration keeps each site's effective behaviour exactly (approved R2-4):**

- Existing sites keep a **legacy policy** whose robots.txt output is unchanged, byte for byte: the same five user agents are blocked or allowed as today.
- The newly grouped agents (OAI-SearchBot, Claude-SearchBot, Applebot-Extended) apply only after a person reviews and saves the two new switches in Studio, which records the new policy version.
- No consent or exposure changes silently.
- Studio shows "Review AI crawler settings" until that happens. New sites start with search on; the training default is the owner's choice at setup. Google's AI features control is recorded as a handover decision (task 32), because it's set in Search Console, not in the site.

### 8.4 Evidence-based recommendations

- **From Google's own guidance:**
  - SEO fundamentals apply to AI features;
  - there are "no additional requirements" and no special markup;
  - pages must be indexed and snippet-eligible;
  - keep important content in text, provide a good page experience, and keep structured data consistent with visible text;
  - keep Business Profile and Merchant Center data current;
  - no need to chunk content or write for AI.

  These map to existing and planned rules: indexability (223), parity (222), F-1 and F-7, and the runbook's off-site consistency check (198).

- **From Microsoft's guidance:**
  - clear headings, tables and FAQs;
  - claims supported with evidence;
  - fresh content (IndexNow);
  - text, images and video describing the same entities;
  - Bing Places for local businesses.

  Add Bing Places beside Google Business Profile in the handover checklist (32).

- **What's deliberately not done:**
  - no AI visibility score;
  - no "AI-optimised" rewriting;
  - no pages per query variation (Google warns that can be scaled content abuse).

### 8.5 `llms.txt` stays low priority

Google says Google Search doesn't use machine-readable AI files such as `llms.txt`. No major engine has published evidence of using it. The existing file stays, because it's cheap and already built. It isn't a readiness rule, gets no further investment, and is only checked for consistency with the sitemap when present.

**No AI visibility score.** If a summary number is ever wanted, it's a count per family ("readiness: 7 of 9 checks pass"; "Bing citations: 41 in 28 days"), each linked to its source.

**Sources:**

- [Google, AI features and your website](https://developers.google.com/search/docs/appearance/ai-features);
- [Google, optimising for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide);
- [Search Console help, generative AI performance report](https://support.google.com/webmasters/answer/16984139);
- [Search Console help, generative AI control](https://support.google.com/webmasters/answer/16908024);
- [Bing, AI Performance public preview](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview);
- [OpenAI, crawlers](https://developers.openai.com/api/docs/bots);
- [Anthropic, crawlers](https://support.claude.com/en/articles/8896518);
- [Perplexity, crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md);
- the Bing API backlog claim, from [Search Engine Land](https://searchengineland.com/bing-webmaster-tools-ai-performance-report-468751) (secondary).

---

## 9. Evidence-based recommendations

**The lifecycle:** detected → explained → proposed → previewed → approved → recorded → measured.

| Stage   | Mechanism                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Detect  | The rule runners (§6)                                                                                                                          |
| Explain | The finding's `why`, `evidence` and `caveats`                                                                                                  |
| Propose | A suggested value in the finding (a title, a description, a missing summary), drafted deterministically or by AI Assist with the voice presets |
| Preview | A Studio draft opened from the finding's intent link; Presentation shows the page and the SEO preview (`schema/seo-preview` exists)            |
| Approve | Publishing. A client's `seo.title` change follows the publish policy (tasks 205 and 206)                                                       |
| Record  | An **improvement record** (224): the finding, the before and after values, the published revision, the date, and a review date                 |
| Measure | A deterministic re-check straight away (the finding is resolved); search outcomes after 28 days, with caveats (226, then 210)                  |

**Where improvement records live (decision CI-3).** An agency-only `improvement` document type in **each site's private dataset**, behind a profile flag, never queried by public pages.

Why there:

- it's the site's own history;
- it survives without Foundation;
- the backup workflow covers it;
- Foundation imports it later.

The alternative, Foundation's database, would leave sites without a record until Foundation exists, and would split the record from the content it describes.

---

## 10. Highest-priority gaps, in order

1. **Finish 188** (PR #102 is open): parity and `@id` tests.
2. **One structured-data module (222):** the ID scheme, `WebPage` on every page, and authors linked to `Person`. It has to come before services and locations add more emitters.
3. **The content contract v2 note (191)** with this document's ownership table, then services (192) and locations (212), when the real site needs them.
4. **The finding contract and a page audit (223):** the core of slice B.
5. **Improvement records (224).**
6. **Fact-consistency and completeness rules (225).**
7. **Separate AI training from AI search in the crawler settings (228).** A small correctness fix.
8. **The Search Console spike (226)** on a site with at least 28 days of data, then Foundation's 202 and 210.
9. **The AI-search evidence spike (229),** once the site's AI reports have data and task 55 classifies AI referrers.

---

## 11. Vertical slice B — Content Intelligence

**Goal:** on a real client page, find and fix an SEO or structured-data problem with evidence, verify the result, and record it.

| Step                                        | How                                                                                                                                                                           | Task                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1. Analyse a page                           | `npm run audit:page -- <url>` fetches the page, parses the metadata, links and JSON-LD, and reads the page's document and the business facts (published, with the read token) | 223                           |
| 2. Find SEO and structured-data issues      | `launch:check`'s pure checks for one page, plus 188's parity helper, plus graph integrity                                                                                     | 223 (reuses 28 and 188)       |
| 3. Check consistency with the content model | F-3 fact conflicts, the `@id` scheme, the main entity matching the page's document type                                                                                       | 223, 225                      |
| 4. Prioritised, evidence-backed findings    | `Finding[]`, ordered as in §6, printed and written as `audit.json`                                                                                                            | 223                           |
| 5. Correct an issue                         | The finding's Studio intent link, then edit and publish                                                                                                                       | Exists (content health links) |
| 6. Verify the metadata and JSON-LD          | Re-run: the finding is resolved, and the JSON-LD diff is shown                                                                                                                | 223                           |
| 7. Record the change                        | **Record improvement** in Studio (from the finding ID) creates an `improvement` with the before, after, revision and review date                                              | 224                           |

**Tasks:** 222, 223 and 224, plus 191 and the rest of 188 before them (225 is optional for the slice). About **8–9 sessions**.

**Acceptance tests:**

1. **Broken fixtures:** a fixture site with five deliberately broken pages (a duplicate title, a JSON-LD phone number that doesn't match, a `WebPage` without `isPartOf`, a canonical to a redirect, a phone number in rich text that doesn't match Business info). The audit reports exactly those five `ruleId`s. Unit and e2e tests cover this.
2. **No false positives:** the clean fixture site produces **no deterministic findings** (`basis: 'deterministic'`, severity warning or above).
3. **Evidence:** every finding has `observed`, `source`, `at`, a `why`, and a `fix` with a Studio intent where the fix is a field.
4. **Time:** auditing one live page takes under 30 seconds on a home connection `[Hyp]`.
5. **Re-check:** after the fix is published and revalidated, re-running shows the finding resolved and prints a JSON-LD diff.
6. **Record:** the `improvement` document holds the finding ID, the page reference, before and after values, `publishedRev` and a review date 28 days later. The health issue lists improvements due for review.
7. **Read-only:** the audit sends no write requests to Sanity, checked with a mocked client in tests.

**Next experiment:** Search Console (226), once the real site has at least 28 days of data.

---

## 12. Self-challenge (revisions made)

- **Useful evidence, or attractive scores?** There are no scores. A finding without observed evidence and a fix location fails the contract test.
- **Duplication?** I merged 195 into the existing `detect.ts` rules instead of re-crawling for the same orphan check. The page audit reuses `launch:check`'s pure checks.
- **Premature?** Search Console stays a spike until there's data, and the Foundation version (202, 210) is unchanged in sequence. AI is limited to one judgement rule (F-7), on request.
- **Can independent sites support it?** Yes. Every rule runs inside the client repo, from its own CI, with its own dataset. Foundation adds aggregation and Search Console, not capability that sites depend on.
- **Privacy:**
  - Search Console data is the client's: the spike keeps it in a git-ignored folder and deletes it after use.
  - Foundation stores it only with the client's consent (task 32's handover).
  - Improvement records hold content values the site already publishes, nothing personal.
