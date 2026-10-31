# Content contract v2: design note (task 191)

Status: **approved by the owner with two corrections (improvement-record privacy; FAQ markup), 31 October 2026**. Basis: master plan §9.7, E2 §3 (`NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md`), E4 §3, and the current `businessInfo`, `siteIdentity`, `teamMember`, `author`, `post` and `event` schemas and JSON-LD emitters. No code changes.

## 1. Decisions for the owner

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Adopt E2 §3 as the contract**: the fact-ownership table (§3.1), document-keyed `@id`s (§3.2), page versus site entities (§3.3), type-selection rules (§3.4) and typed, provenance-based parity (§3.5). This note adds only `service`, `location` and their wiring.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D2  | **`post.author` may reference a `teamMember`.** Widen the reference to `[author, teamMember]`; no data migration (§5). A person is entered once, and the byline becomes their `#person-{id}` node. A plain `author` stays a named `Person` with no `@id`, as today.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D3  | **Improvement records (224) are an agency-only type that requires a private dataset.** Not querying them from public routes is not protection: on a public dataset anyone can read them with the project ID. The `improvements` flag is therefore **off by default** and is switched on only for a site whose `npm run check:dataset` reports the dataset as private. A site on an accepted public dataset (`ACCEPT_PUBLIC_DATASET`) or an unreadable one keeps it off, and the check fails if the flag is on. No new storage is built: 224 reuses `check:dataset` and lists the type in `scripts/dataset-exposure.json`. `TAGS` and the route inventory are unchanged. This narrows E4's "on by default" for 224; the canonical roadmap is not changed here. |
| D4  | **`services` and `locations` flags default to off, like `improvements`.** A site that doesn't use them carries no routes, Studio entries or JSON-LD for them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## 2. Rules carried over (E2 §3)

- **One owning field per fact.** Pages reference entities and never copy facts into rich text. `businessInfo` stays the **primary place**; a `location` document is an _additional_ place. A single-location business creates no `location` documents.
- **Persistent entities** (service, location, person, event, article) use `{origin}/#<type>-{key}`, where `key` is the published `_id` with `drafts.` and `versions.` prefixes removed. They survive slug changes, and a draft or version id is never emitted. **Page nodes** (`WebPage`, `BreadcrumbList`, `FAQPage`) are keyed by URL. `#organization` and `#website` are singletons. All ids come from `ids.ts` (222).
- **Describe once, reference elsewhere.** An entity is described in full on its canonical page and referenced by `@id` everywhere else. Its `url` carries the current path.
- **Every JSON-LD string is visible** on the page or in the site's visible business facts. Parity is checked by property class (names, phones, addresses, hours and prices as typed values; descriptions by provenance; `areaServed` visible somewhere on the site).
- **New type-selection rules:** `Service` only on a page that visibly describes that service; no `Offer` unless a price is shown; no `AggregateRating` or `Review` anywhere, so testimonials stay plain content; `FAQPage` only for questions shown on that page, one node per page (a service's own FAQs and an FAQ section merge into one `{pageUrl}#faq`). **FAQ markup describes visible questions and answers so machines read the page accurately. It is not sold or planned as a Google FAQ rich-result opportunity**, and no report or recommendation promises one. It must still agree with the visible text.

## 3. Entities

| Entity                 | Owns (key fields)                                                                                                                                                                                                                                                            | Flag           | Page                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------- |
| **`service`** (192)    | name; slug; summary (≤160 characters); description (rich text); audience; image; optional "from" price with a visible unit; `faqs[]` (question, answer); `locations[]` (empty means all); `evidence[]` (case-study posts or pages); optional `sections[]` below the template | `services`     | `/services/{slug}`      |
| **`location`** (212)   | name; `kind` (branch or service area); slug; address (the `businessInfo` shape and validation); geo; phone; email; timeZone; opening and special hours (the `businessInfo` objects); area description; image                                                                 | `locations`    | `/locations/{slug}`     |
| `teamMember` (changed) | adds `services[]` and `locations[]`                                                                                                                                                                                                                                          | `team`         | `/team/{slug}` (exists) |
| `post` (changed)       | `author` accepts `teamMember`; adds `services[]`                                                                                                                                                                                                                             | `blog`         | exists                  |
| `event` (changed)      | adds optional `venue` → `location`; the inline location stays for one-off venues                                                                                                                                                                                             | `events`       | exists                  |
| `improvement` (224)    | finding, page, before and after, revision, review date, outcome                                                                                                                                                                                                              | `improvements` | none (agency-only)      |

**Relationships have one owning side**, and the other side is a reverse GROQ read (`references(^._id)`), never a second field to keep in step:

| Relationship                  | Owned by                 | Reverse read on                     |
| ----------------------------- | ------------------------ | ----------------------------------- |
| Service offered at a location | `service.locations[]`    | Location page lists its services    |
| Team member provides service  | `teamMember.services[]`  | Service page lists its people       |
| Team member works at location | `teamMember.locations[]` | Location page lists its people      |
| Article about a service       | `post.services[]`        | Service page lists related articles |
| Service FAQs                  | `service.faqs[]`         | None (rendered on the service page) |
| Event at a location           | `event.venue`            | Location page lists upcoming events |

Testimonials remain a section. FAQs do not become documents: they are section items today and inline on `service`. `businessInfo.serviceAreas` (strings) stays until an area needs its own page, then it becomes a `location` of kind service area.

## 4. JSON-LD per new type

Origin `https://example.com.au`; keys are document ids. `provider`, `areaServed` and `parentOrganization` are `@id` references; the full organisation node is emitted once in the site graph. The `WebPage` node points at each entity through `about`.

```json
{
  "@type": "Service",
  "@id": "https://example.com.au/#service-4c1e9b7a",
  "name": "Emergency plumbing",
  "url": "https://example.com.au/services/emergency-plumbing",
  "description": "Burst pipes, blocked drains and gas leaks, fixed the same day.",
  "provider": { "@id": "https://example.com.au/#organization" },
  "areaServed": [{ "@id": "https://example.com.au/#location-9d3f02be" }],
  "mainEntityOfPage": { "@id": "https://example.com.au/services/emergency-plumbing#webpage" }
}
```

A visible price adds `offers` (`price`, `priceCurrency: "AUD"`); without one it is omitted.

```json
{
  "@type": "Plumber",
  "@id": "https://example.com.au/#location-9d3f02be",
  "name": "Example Plumbing, Parramatta",
  "url": "https://example.com.au/locations/parramatta",
  "parentOrganization": { "@id": "https://example.com.au/#organization" },
  "telephone": "+61290000000",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1 Church St",
    "addressLocality": "Parramatta",
    "addressRegion": "NSW",
    "postalCode": "2150",
    "addressCountry": "AU"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": -33.8151, "longitude": 151.0011 },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "07:00",
      "closes": "17:00"
    }
  ]
}
```

The type comes from `businessSchemaType` (the site's business type). A **service area** location emits `{"@type": "Place", "@id": …, "name": "Western Sydney"}` with no address, phone or hours. Fields left empty are omitted, as in `buildLocalBusinessJsonLd`.

**Existing nodes that change (222):** the `Person` `@id` moves from `{teamUrl}#person` to `{origin}/#person-{id}`; `Article.author` becomes `{"@id": …#person-{id}}` for a linked team member; the FAQ and breadcrumb nodes gain URL-keyed `@id`s; every page gains a `WebPage` node.

## 5. Templates, flags and migration

**Templates.** Both are server components in the new feature folders, composed in `src/app`, with the section builder beneath.

| Route                     | Renders                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/services/{slug}`        | H1 name, summary, description, image; "Who it's for"; locations; people; evidence; FAQs (with `FAQPage`); related articles; enquiry CTA |
| `/locations/{slug}`       | H1 name; address, hours, Open now badge and directions link (the existing location section); services here; people here; events; FAQs   |
| `/services`, `/locations` | Ordinary `page` documents with a list section, so editors keep control of the intro copy                                                |

**Site profile.** Add `services`, `locations` and `improvements` to `FEATURE_NAMES`. Off means a 404 and no Studio entry (schemas stay registered, as for other flags). `locations` requires `businessInfo`. `services` and `locations` switch on rules F-1, F-2 and F-8 (225). Both new types go in `TAGS`, every fetch's tags, the README webhook filter and the route inventory test; `/services` and `/locations` become reserved first segments only while the flag is on.

**Migration is additive.**

1. Widening `post.author` and adding optional arrays needs no data change. Existing posts keep their `author`.
2. Before enabling a flag, a dry run lists existing `page` slugs that start with `services/` or `locations/`; each becomes a `service` or `location`, or is renamed. Redirects cover moved paths.
3. The `#person` id change is the only emitted change to existing markup, and it is one-off.
4. **Content entry waits for 192.** Home, About and Contact can be entered now, because they use no new entity. Services go in only once the `service` schema is merged, so they are never re-keyed.

## 6. What the active client's site needs

The owner confirmed the first client needs both: multiple distinct offerings (192) and physical-location or service-area pages (212). The client's facts (service list, branch versus service area, services per location, contact and hours) are not in the repository and must come from the client before content entry.

| Part                          | Needed when                                                                        | Task                                  |
| ----------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------- |
| `service`, its template, FAQs | The client sells distinct offerings that each deserve a page (about three or more) | **192: in scope**, after 222          |
| `location`                    | More than one physical place, or pages for areas served                            | **212: in scope**, after 192          |
| `author` → `teamMember`       | The client has a team page and a blog                                              | Part of 222's author step             |
| `improvements`                | A live site whose dataset is private                                               | 224, off until `check:dataset` passes |

Order: 191 (this note) → 222 → 192 → 212 → 225 (after the entities exist). Services and locations stay hidden by default, so other client sites carry nothing extra.
