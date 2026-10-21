# Nocturne Studio — UI/UX & Product Quality Audit

**Audit date:** 21 October 2026 (AEST)  
**Application:** Nocturne Studio / Currawong Creative Co.  
**Observed environment:** Authenticated live Sanity Studio at `https://living-prana.vercel.app/studio/structure`; desktop browser viewport approximately 1363 × 938 px.  
**Scope:** Read-only exploratory product/UX audit, not a code, security, accessibility-conformance, or performance certification.  
**Status:** No content, settings, drafts, published pages, repository files, or development-plan entries were changed.

## Reading guide

**Observed** means the behaviour was directly visible, usually on a specific workflow. **Partially verified** means a symptom was observed but its wider consequences were not established. **Hypothesis** is an opportunity or risk to validate, not a confirmed defect. Severity describes user impact; priority accounts for impact, breadth, and sequencing. All effort sizes are **preliminary**, because implementation and repository architecture were not inspected.

The example site's incomplete copy and configuration should not automatically be interpreted as a Nocturne product defect. The design target used throughout is **Beautiful defaults → Simple presets → Advanced customisation**.

---

# Part A — Executive summary

## Verdict

**Nocturne already has the ingredients of a premium creative CMS, especially its visual presets, colour previews, thoughtful field guidance, and real separation between agency and client views. It is not yet reliably client-ready for page editing.** A reproducible React error in the **Sections** field of both tested pages blocks a central client workflow. The highest-value investment is stabilising that journey and then reducing the mental load of advanced appearance controls, while keeping the designer's expressive power.

The application is more sophisticated than a generic Sanity content tree. It presents a branded workspace, curated information architecture, a reassuring Start here experience, polished visual layout selectors, and on-screen colour-contrast feedback. On a good screen it feels purpose-built. In deeper editing, nested content, highly granular appearance overrides, and occasional raw platform states dilute that ease. The client/agency role distinction is a strong foundation that should be extended, not replaced.

### Five highest-impact next moves

1. **Fix the client-view Sections crash (UX-001; P0).** Validate Home, Links, existing nested sections, and safe error recovery end to end in client mode.
2. **Make Preview's page-to-document relationship trustworthy (UX-002; P1).** The visible site should connect to the corresponding editable document without an unexplained “Missing a main document” message on the root route.
3. **Simplify inherited/custom appearance editing (UX-003; P1).** Make the effective preset, inherited values, and changed properties obvious, with a safe “reset to preset” path.
4. **Treat visible contrast failures as actionable design safeguards (UX-004; P1).** Keep the existing live diagnostics, improve remediation, and test actual combinations used in client sites.
5. **Finish the client-facing support, empty, and system-state layer (UX-005–008; P2).** Clear task-based copy and contextual help can improve confidence across numerous journeys.

### Ready for whom?

| Audience              | Current assessment                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agency designers      | **Promising for guided use.** Broad control, good presets, section types, nested breadcrumbs, and diagnostics; some efficiency and preview issues remain.            |
| Nontechnical clients  | **Not ready for unsupervised page-section editing until UX-001 is fixed.** Start here and constrained settings are strong, but a core editor error undermines trust. |
| Platform/product team | **Good base for focused refinement.** Preserve existing strengths; prioritise reliability, interaction consistency, and verification over more controls.             |

---

# Part B — Audit coverage and methodology

## Areas opened and inspected

| Navigation area                  | What was explored                                                                                                                                        | Coverage / qualifications                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Structure → Pages**            | Home (`/test`), Links (`/links`), page fields, Sections, nested Link List content, one link card, appearance, Hero fields and design, Add section picker | Deep inspection of representative existing content. No new section/card created or saved.                              |
| **Structure → Business info**    | Identity, contact, address, timezone, opening hours, holiday exceptions, service areas, socials, advanced                                                | Field organisation and explanatory copy examined; private values excluded from report.                                 |
| **Structure → Enquiries**        | Empty document list, search and CSV affordance                                                                                                           | No records available; did not export.                                                                                  |
| **Structure → Reusable content** | Shared sections, Forms, Panels                                                                                                                           | Lists were empty; no creation tested.                                                                                  |
| **Structure → Website settings** | Name/logo/icon, navigation header/footer, announcement bar, cookie banner, launch/visibility                                                             | Inspected image crop/hotspot dialog, favicon choices and examples, publication help. No configuration changed.         |
| **Structure → Design**           | Brand colours, semantic palette, gradient choices, live previews, Image frames and validation                                                            | Deep inspection of colour feedback and existing SVG validation.                                                        |
| **Structure → Advanced**         | Redirects, AI context                                                                                                                                    | One temporary root redirect was visible; AI context empty. No execution/change.                                        |
| **Presentation**                 | Site preview, document association, refresh, visual selection, mobile viewport toggle, version/publication controls                                      | Visually checked desktop and simulated mobile mode; no external breakpoint measurement or edit-save-publish roundtrip. |
| **Vision**                       | Query-console landing                                                                                                                                    | Opened, did not run queries.                                                                                           |
| **Start here**                   | Agency/client onboarding, client help categories, tasks, recent changes, readiness states                                                                | Inspected both views, especially client guidance.                                                                      |
| **Content health**               | SEO, image alt, link/anchor, panel, redirects, orphan-page checks                                                                                        | Opened results; did not independently crawl site.                                                                      |
| **AI settings**                  | Browser-side automatic alt text toggle and explanatory guidance                                                                                          | Observed off; not activated.                                                                                           |
| **Variants**                     | Definitions, empty state, New affordance                                                                                                                 | Opened, no variant created.                                                                                            |
| **Releases**                     | Access/upgrade screen                                                                                                                                    | Observed in both top navigation contexts; no upgrade action.                                                           |

## Representative journeys exercised

1. **Find and edit a page:** navigated Home and Links, inspected editing fields and nested Sections. **Blocked in client view** by the Sections error; worked in agency view.
2. **Update a Link List:** traced Links → Living Prana → link cards → one card's content and Appearance without changing data. Found clearly nested content plus numerous style overrides.
3. **Customise branding:** explored basic colour tokens, previews, extended semantic palette, and contrast guidance without editing.
4. **Change component appearance:** compared Link List preset selector with section- and card-level custom styles; inspected inherited and override states.
5. **Update imagery:** opened the site's image hotspot/crop UI; reviewed image/alt prompts and an existing frame asset validation.
6. **Navigate nested settings:** breadcrumbs, editor close/back affordances, tabs, accordions, and section picker examined.
7. **Preview:** loaded site in Presentation, refreshed, selected visible content, toggled simulated mobile, inspected document mapping and publishing state.
8. **Locate publication actions:** observed draft/published indicators, disabled Publish, version manager, and launch checklists. Did not trigger publication.

## Contexts and limits

- Desktop cloud browser, ~1363 × 938 viewport. The Presentation **mobile simulation control** was inspected, but this is **not** a full mobile responsive, touch, tablet, or cross-browser test.
- Two role contexts: **Agency view** and **Preview client view**, both authenticated; the latter is a mode of the same observed account, not independent client permission testing.
- Navigation and read-only UI were explored. **Save/publish, undo, concurrent edits, revisions, creation, deletion, uploads, export, performance benchmarking, and durable permission tests were intentionally not exercised.**
- No repository access. Underlying code, component architecture, frontend rendering, live CSS, design-token implementation, accessibility tree completeness, and actual roadmap state are **unknown**.
- No automated WCAG audit, screen reader, keyboard-only traversal, physical device test, or quantified load metrics. Accessibility and performance comments are scoped accordingly.
- Evidence descriptions reference live paths and visible controls; exact private contact details, authentication data, and private preview parameters are omitted. Three cropped screenshots were captured during the session (error, brand-preview, preset chooser), but could not be transferred into this deliverable; there are intentionally **no broken image links**.

---

# Part C — Existing strengths worth preserving

**C1 — Meaningful client/agency separation.** Toggling Preview client view significantly simplifies navigation. It hides Design, Advanced, Vision, Content health, and AI settings; removes the Cookie banner settings; and reduces Launch & visibility to client-appropriate information. Crucially, the agency's technical launch instructions and PR/CLI checklist **do not leak into the client view**. Preserve that boundary and apply it consistently.

**C2 — Task-oriented client welcome.** A personalised greeting, Your links, Edit your website, Business info and opening hours, Help, Recent changes, and Things to check provide a recognisable starting point. The help topics cover editorial headings, photos, publishing/undo, opening hours, logos, and section types. Build on this rather than introducing another dashboard.

**C3 — Visual, explained presets.** The Link List layout picker presents six illustrated alternatives—Minimal, Cards, Editorial, Compact, Image-focused, and Glass rows—with short descriptions and a clearly selected card. The Add section picker shows ~21 distinct visual types plus search. These convey design outcomes much better than a configuration dropdown.

**C4 — Real creative range.** Link List profile, card presentation, social icons, background imagery, edge shape, motion, dividers, arrows, and more provide agency flexibility. Per-card appearance can inherit the list or be customised independently. This breadth is valuable; the challenge is making it _progressive_ and predictable.

**C5 — Brand colours as an integrated experience.** Basic Light/Dark/Primary/Secondary/Highlight choices appear alongside a live mock-up of text, buttons, inverse, and sectional treatments. Contrast badges and suggested accessible colour adjustments provide feedback in the place decisions are made. The advanced semantic palette is tucked underneath. This is an exemplary pattern to propagate.

**C6 — Useful field-level affordances.** Link destination type, icon choice, eyebrow/label/description, heading/group, card size, visibility, alt text, and responsive image crop controls have understandable intent. Breadcrumbs like `Sections / Living Prana / Links / Book a Bodywork Session` help retain location in nested editors.

**C7 — Honest preset state.** The existing Home Hero indicates “Custom — The fields below no longer match a preset.” This is exactly the kind of transparent inherited-versus-edited state advanced creative tools need.

**C8 — Validation in context.** An existing SVG frame exceeding the stated file-size limit is explicitly flagged, with corrective advice. Link styles warn about contrast and one gradient-over-photo combination. Animation guidance mentions reduced-motion behaviour. Keep these early, explanatory safety rails.

**C9 — Publishing separation.** Draft/published indicators, a last-published timestamp, version management, and a disabled Publish control when no edits were made convey that editing and going live are separate. Their exact post-edit behaviour was not exercised, but the affordance is useful.

**C10 — Coherent visual identity.** Purple selected states, quiet warm-neutral surfaces, rounded cards, focused typography, branded navigation, and recognisable section illustrations already feel more curated than out-of-box CMS chrome. Preserve restrained colour/spacing and focus effort on consistency, state clarity, and density.

---

# Part D — Detailed findings

## UX-001 — Client-view page Sections crash

| Attribute           | Assessment                                                          |
| ------------------- | ------------------------------------------------------------------- |
| Area                | Preview client view → Structure → Pages → Home and Links → Sections |
| Severity / priority | **Critical / P0**                                                   |
| Audience            | Clients; any team testing client mode                               |
| Confidence          | **Observed**, reproduced on two page types                          |
| Effort              | **Medium (preliminary)**; root cause unverified                     |

**Observation / evidence.** In client view, navigating to the **Sections** field on the Links document displayed a panel beginning **“An error occurred. Minified React error #130”**, with “Dismiss” and a red **“Unset value”** control. After navigating away and returning, the same error remained. The Home page's Sections field reproduced the same problem. In **agency view**, the corresponding sections were accessible and editable in the UI. A cropped screenshot of the error was captured during inspection.

**Impact.** Sections are central to page changes. A nontechnical user hits an incomprehensible implementation error at precisely the moment the product should feel safest. The presence of an “Unset value” escape hatch raises fear of losing content; its exact behaviour was deliberately not tested.

**Recommendation.** Investigate the client-mode Sections rendering path (without assuming a code cause from the message). Fix schema/component compatibility and error handling; provide a safe recovery control that does not suggest content removal. Add automated regression coverage for both page shapes, existing nested sections, role modes, and re-entry after navigation.

**Acceptance criteria.** (1) Client mode opens Home and Links Sections without an exception; (2) existing sections can be inspected and traversed; (3) no raw React text or destructive-looking fallback is exposed; (4) agency mode remains unaffected; (5) a controlled test of edit → preview → publish permissions succeeds in staging under explicit authority; (6) test cases cover empty/nonempty sections and navigation away/back.

## UX-002 — Presentation preview warns that the visible route has no main document

| Attribute           | Assessment                                                                     |
| ------------------- | ------------------------------------------------------------------------------ |
| Area                | Presentation / visual editing, route association                               |
| Severity / priority | **High / P1**                                                                  |
| Audience            | Clients and designers                                                          |
| Confidence          | **Partially verified**: warning observed, overall visual editing partly worked |
| Effort              | **Medium (preliminary)**                                                       |

**Observation / evidence.** Presentation rendered the actual site, but the side panel initially reported **“Missing a main document for /api/draft-mode/enable.”** After refreshing preview, it reported **“Missing a main document for /”** while content remained visible. Selecting the “Living Prana” region populated **Documents on this page** with the Links document. A temporary `/` → `/links` redirect also appeared in Advanced → Redirects. These facts suggest a routing or selection-state mismatch to investigate, **not** proof that visual editing is wholly broken.

**Impact.** Preview is where clients seek reassurance. A scary document-mapping warning beside a rendered page makes it unclear which page is editable and whether preview matches the published route.

**Recommendation.** Resolve default page association across `/`, `/links`, and draft-preview enable routes; present a deliberate explanatory empty state if a route truly has no linked document. Ensure route/selection refreshes preserve the correct document context.

**Acceptance criteria.** Load Presentation directly and via page editor; test `/` redirect and `/links`, refresh, visual selection, desktop/mobile switch, and return navigation. Correct document appears without misleading warning; unassociated routes show actionable non-error copy. Add route-mapping regression tests.

## UX-003 — Appearance overrides are powerful but cognitively expensive

| Attribute           | Assessment                                                        |
| ------------------- | ----------------------------------------------------------------- |
| Area                | Links → Link List section → Design; nested link card → Appearance |
| Severity / priority | **High / P1**                                                     |
| Audience            | Designers principally; clients if exposed                         |
| Confidence          | **Observed interface; impact inferred from breadth/depth**        |
| Effort              | **Large (preliminary)**                                           |

**Observation / evidence.** The section design surface spans Profile, Service categories, Cards, Arrows/icons, Social icons, Dividers, Depth/glow, Background, photos, overlay/gradient, animation, edge shape, and advanced layout. Individual cards then offer inherited-versus-custom styling across Card, Text, Icon, Arrow and many per-property states. The controls are grouped, and “Use the Link list design” already exists, but the effective configuration is difficult to summarise at a glance. Deep nested editing adds context switches.

**Impact.** Designers can spend disproportionate time understanding which layer owns a visual property, and clients can fear accidental global changes. Override proliferation also increases consistency and regression cost.

**Recommendation.** Treat the layout preset as the primary mental model: show an at-a-glance **preset + inherited/custom summary**; only reveal _changed_ properties initially; add explicit “Reset this card to Link List design,” “Show inherited values,” and per-group reset. Standardise property labels and inheritance indicators in a shared UI primitive. Keep full advanced groups accessible to agency users.

**Acceptance criteria.** A designer can answer which preset is active, which properties are overridden, and whether an edit affects card/list/site without expanding every group. Reset restores inherited value without touching siblings; previews reflect effective styling; keyboard/undo paths work. Test on Link List and one other section before rolling out widely.

## UX-004 — Current custom combinations show accessibility-risk contrast warnings

| Attribute           | Assessment                                                          |
| ------------------- | ------------------------------------------------------------------- |
| Area                | Link List card Appearance and section Design                        |
| Severity / priority | **High / P1**                                                       |
| Audience            | Site visitors, designers, QA                                        |
| Confidence          | **Observed product diagnostics**; not independent WCAG verification |
| Effort              | **Medium (preliminary)**                                            |

**Observation / evidence.** The UI flagged a custom colour `#015f64` at **“AA fail 1.0:1”**, a highlight border at **“Low contrast 2.7:1”**, and an icon at **“Low contrast 1.9:1.”** A section-level text-gradient/photo combination warned of contrast dropping as low as **1.1:1**. These are warnings visible _inside the editor_; they establish a problem with those specific combinations or calculated previews, not the accessibility of every public component.

**Impact.** High visual expressiveness can produce unreadable text and low-visibility controls. Users may ignore warnings if remediation requires finding the exact responsible setting.

**Recommendation.** Keep inline badges but pair each warning with “what is affected / why / fix it” and a one-click **suggested accessible value** or return-to-inherited option. Validate representative states over actual imagery and component variants. Design quality gates should help, not silently override intentional choices.

**Acceptance criteria.** Each failure highlights the relevant property and foreground/background context; remediation improves computed contrast, explains any compromise, and is reversible. Manual accessibility checks confirm high-use card styles on both responsive layouts. Do not claim WCAG conformance from the picker alone.

## UX-005 — Generic empty states lack a task and context

| Attribute           | Assessment                                                               |
| ------------------- | ------------------------------------------------------------------------ |
| Area                | Reusable content (Shared sections, Forms, Panels), Enquiries, AI context |
| Severity / priority | **Medium / P2**                                                          |
| Audience            | Clients, designers, administrators                                       |
| Confidence          | **Observed**                                                             |
| Effort              | **Small–Medium (preliminary)**                                           |

**Observation / evidence.** Several visibly different areas display the identical list message **“No documents of this type.”** Empty Reusable content collections remain visible to clients but do not explain when they are useful. Enquiries shows search and CSV affordances against an empty list.

**Impact.** Clients cannot tell whether something is broken, unavailable, or simply unused; new designers must learn document concepts before taking action.

**Recommendation.** Provide collection-specific language: purpose, example, who uses it, and a safe next step. Hide or group unused advanced collection entries in client mode when they offer no task. Only show a create CTA where creation is actually permitted and appropriate.

**Acceptance criteria.** Empty Forms, Panels, Shared sections, Enquiries, and AI context have differentiated instructions; role-aware actions match permissions; empty screens do not imply missing content is an error.

## UX-006 — Client navigation exposes an upgrade-only Releases destination

| Attribute           | Assessment                            |
| ------------------- | ------------------------------------- |
| Area                | Top navigation → Releases, both views |
| Severity / priority | **Medium / P2**                       |
| Audience            | Clients and agencies                  |
| Confidence          | **Observed**                          |
| Effort              | **Small (preliminary)**               |

**Observation / evidence.** Releases is visible in top navigation even while its content is an upgrade-to-unlock screen with a disabled-looking calendar. This is distinct from standard version management, which has its own control in the editor.

**Impact.** It can make the workspace feel like a product trial or confuse clients about whether scheduling publication is required.

**Recommendation.** Decide deliberately whether Releases belongs in client view; ideally hide it or label it as an optional advanced capability until entitled. Avoid mixing version/history needs with paid release scheduling in navigation copy.

**Acceptance criteria.** Client navigation presents only usable tasks or clearly explained optional features; release scheduling and document version history are distinguishable in usability testing.

## UX-007 — “Untitled” entries erode trust in the activity feed

| Attribute           | Assessment                         |
| ------------------- | ---------------------------------- |
| Area                | Client Start here → Recent changes |
| Severity / priority | **Medium / P2**                    |
| Audience            | Clients and project owners         |
| Confidence          | **Observed**                       |
| Effort              | **Small–Medium (preliminary)**     |

**Observation / evidence.** Recent changes includes labels like **“Untitled business info,” “Untitled navigation,”** and **“Untitled announcement.”** Elsewhere, these documents have meaningful, human-readable section names.

**Impact.** The activity feed looks unfinished and does not help the client understand what changed.

**Recommendation.** Derive stable display labels from singleton type plus relevant section or site name, and retain a fallback only when truly unknown. Surface readable actor/time/status where allowed; never expose private metadata unnecessarily.

**Acceptance criteria.** Recent changes uses human task names for singleton documents and actual page titles for pages; sample feed tests show no spurious “Untitled” on known singleton types.

## UX-008 — Help ends in an ambiguous support handoff

| Attribute           | Assessment               |
| ------------------- | ------------------------ |
| Area                | Client Start here → Help |
| Severity / priority | **Medium / P2**          |
| Audience            | Nontechnical clients     |
| Confidence          | **Observed**             |
| Effort              | **Small (preliminary)**  |

**Observation / evidence.** Help has thoughtful editorial and publishing topics, but its escalation guidance effectively says to **ask a Currawong contact** rather than exposing an obvious support route.

**Impact.** A client who is stuck on the editor crash or a publishing question is forced to recall their account contact or move to another channel.

**Recommendation.** Provide a configured **Contact your studio** affordance with the appropriate project-specific email/help URL, plus a concise “include page name and screenshot” hint. Avoid revealing staff contact details broadly without business approval.

**Acceptance criteria.** A user can reach the correct support channel from Help and error states in one click, using configured, permission-appropriate contact data.

## UX-009 — An existing oversized image-frame SVG is invalid despite good validation

| Attribute           | Assessment                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Area                | Design → Image frames → Compass Frame                                                        |
| Severity / priority | **Medium / P2** for site/design asset readiness; not classified as a platform validation bug |
| Audience            | Designers, QA                                                                                |
| Confidence          | **Observed**                                                                                 |
| Effort              | **Small–Medium (preliminary)**                                                               |

**Observation / evidence.** The UI states that frame SVGs should have a `viewBox` and be **under 50 KB**. The existing asset displayed about **640 KB**, and an explicit validation warning stated it was about **641 KB** and must be simplified/re-exported.

**Impact.** The asset may be unusable or expensive to render; importantly, the editor caught it. The defect to track is the _asset/data readiness_ and whether invalid states are visible at list/launch level.

**Recommendation.** Replace/optimise the asset through the authorised design workflow after validating its intended shape. Show collection-level invalid badges and optionally surface them in launch/content health checks. Do not loosen a sensible limit merely to silence this one warning.

**Acceptance criteria.** The asset complies with documented constraints, previews in target components, and collection overview exposes future violations before a designer enters an individual record.

## UX-010 — Section selection offers breadth but limited grouping

| Attribute           | Assessment                                                |
| ------------------- | --------------------------------------------------------- |
| Area                | Home → Sections → Add item                                |
| Severity / priority | **Medium / P2**                                           |
| Audience            | Designers, client editors authorised to add sections      |
| Confidence          | **Observed list; discoverability impact is a hypothesis** |
| Effort              | **Medium (preliminary)**                                  |

**Observation / evidence.** The visual picker offers roughly **21** section types, including Hero, Image + text, Features, Logo strip, Testimonials, FAQ, CTA, Form, Pricing, Newsletter, Stats, Gallery, Location, Team, Video, Process, Embed, Link List, Events, Shared section, and Rich text. It already has search and useful preview thumbnails; do **not** replace it with a plain text list.

**Impact.** The grid gives choice, but a novice may not know whether to select Feature grid, Image + text, or CTA for a common goal. This is likely to worsen as the catalogue grows.

**Recommendation.** Test light grouping by goal (Introduce, Explain, Build trust, Convert, Utility) and recently used/favourites, without obscuring the full list. Label each option with a one-sentence outcome and optional template-level visual example.

**Acceptance criteria.** Existing search and illustrated cards remain; a first-time designer identifies a suitable section for three common goals in brief task-based testing without more navigation steps.

## UX-011 — Nested editing needs persistent scope and escape cues

| Attribute           | Assessment                                                               |
| ------------------- | ------------------------------------------------------------------------ |
| Area                | Pages → Sections → Link List → Link card; Content/Design/Appearance tabs |
| Severity / priority | **Medium / P2**                                                          |
| Audience            | Designers and clients                                                    |
| Confidence          | **Observed multi-level hierarchy; improvement opportunity**              |
| Effort              | **Medium (preliminary)**                                                 |

**Observation / evidence.** Breadcrumbs correctly show a three-level hierarchy. However, deep panels have independent tabs, long settings groups, a close X, and multiple contexts for page-level, section-level and card-level appearance. Users may have to navigate back to check a parent style or see the visual result.

**Impact.** Scope ambiguity increases time and risk of editing the wrong level.

**Recommendation.** Keep a sticky breadcrumb/level indicator; label affected scope in group headings (“This card only” vs “All cards in this list”); add direct jump-to-parent and a persistent preview affordance. Avoid adding yet another modal layer.

**Acceptance criteria.** In a three-level edit, users can identify their scope and return to the parent in one action, without losing unsaved input or mistaken resets. Validate with agency and client-mode paths after UX-001.

## UX-012 — Editor help, status and technical language need a common content pattern

| Attribute           | Assessment                                                         |
| ------------------- | ------------------------------------------------------------------ |
| Area                | Editor field groups, Start here, version controls, settings        |
| Severity / priority | **Medium / P2**                                                    |
| Audience            | Mainly clients; also designers                                     |
| Confidence          | **Observed language variation; systematic impact partly inferred** |
| Effort              | **Medium (preliminary)**                                           |

**Observation / evidence.** Some explanatory text is excellent (“leave empty…” context, design guidance), while client surfaces still expose **Drafts**, **All users (Default)**, **Variants**, and nested terminology that may not map to client tasks. Long groups include frequent instructional text, creating density. Technical launch instructions are properly segregated in agency mode and should stay so.

**Impact.** Uneven guidance can make the interface feel over-explained in simple fields and under-explained at consequential state changes.

**Recommendation.** Establish a product copy taxonomy: field label = action/object; helper = when/why; status = consequence; advanced detail = expandable; error = recovery. Test “Draft changes / Published website” language where appropriate, without changing the underlying Sanity model. Consolidate repetitive explanations into contextual help, not global walls of text.

**Acceptance criteria.** Critical publishing and inheritance concepts are consistently labelled across Start here, Pages, Presentation and settings; common fields fit compact scanning; users can correctly answer what is live and what is a draft.

## UX-013 — Site-specific prelaunch content is visibly unfinished

| Attribute           | Assessment                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| Area                | Pages, Name/logo/icon, Content health, Launch & visibility              |
| Severity / priority | **Medium / P2** for the example site; **not** a general Nocturne defect |
| Audience            | Site owner, SEO/editorial QA                                            |
| Confidence          | **Observed**                                                            |
| Effort              | **Small–Medium (preliminary)**                                          |

**Observation / evidence.** The Home test page showed placeholder-like hero text, the default description contained explicit “replace this…” guidance, Content health showed **2 pages missing meta descriptions** and **2 orphan pages**, and the agency launch checklist was **5/8** complete. These counters are valuable; they indicate outstanding project content/launch tasks, not necessarily CMS bugs.

**Impact.** If mistaken for a finished client site, low-quality sample text and SEO metadata reduce perceived polish. If the environment is deliberately staging, this is normal.

**Recommendation.** Keep content/launch readiness distinct from product engineering backlog. Create a project launch checklist item for editorial copy, metadata, routing/orphan review, and final approval. Consider “example/test content” badges in nonproduction workspaces.

**Acceptance criteria.** The site owner confirms expected test pages; ready-to-launch pages have purposeful copy and metadata; Content health and launch checklist are reviewed with documented exceptions. No live edit without approval.

## UX-014 — Icon-only and compact custom controls merit targeted accessibility verification

| Attribute           | Assessment                                                         |
| ------------------- | ------------------------------------------------------------------ |
| Area                | Document toolbar, small row actions, modal close/advanced controls |
| Severity / priority | **Medium / P2** pending confirmation                               |
| Audience            | Keyboard and assistive-technology users                            |
| Confidence          | **Hypothesis / limited accessibility-tree observation**            |
| Effort              | **Medium (preliminary)**                                           |

**Observation / evidence.** Several compact toolbar and row controls appeared as icons with little or no adjacent visible action text; some browser accessibility-tree entries did not expose meaningful names in the snapshot. No keyboard-only or screen-reader verification was performed. This is **a test target**, not a blanket finding of inaccessible buttons.

**Impact.** The dense appearance and document toolbars may be difficult to identify or operate if focus treatment, accessible names, and hit areas are inconsistent.

**Recommendation.** Audit actionable icons for computed accessible names, tooltips, 44×44-equivalent comfortable targets where practical, consistent focus ring, logical focus order, and escape/back behaviour. Use native controls where possible.

**Acceptance criteria.** An automated name/role/value check plus a manual keyboard and screen-reader sample passes across document toolbars, preset cards, colour controls, nested dialogs and publish/version controls.

## UX-015 — Preview and publishing confidence needs a demonstrated safe loop

| Attribute           | Assessment                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| Area                | Start here, Pages, Presentation, versions/publishing                             |
| Severity / priority | **Medium / P2**                                                                  |
| Audience            | Clients, account managers                                                        |
| Confidence          | **Partially verified**; read-only audit could not complete an edit/publish cycle |
| Effort              | **Medium (preliminary)**                                                         |

**Observation / evidence.** The editor communicates that changes save as drafts and are not live until Publish; the footer showed a last-published timestamp and Publish disabled with no edits. A Manage versions overlay exposed “Published” and a variant selector. The end-to-end semantics of modification, preview, compare, revert, and publish **were not tested** because doing so would persist data.

**Impact.** This is the trust-critical workflow for clients. Without staged user testing, the design team cannot assume users correctly understand autosave and publication.

**Recommendation.** In an authorised staging fixture, test a reversible copy edit through unsaved/auto-saved, draft preview, publish-ready state, published result, version restore, and concurrent update warning. Add a small task-oriented “What happens when I publish?” guide rather than proliferating controls.

**Acceptance criteria.** Participants can predict whether a change is live at each step; users understand the scope of Publish and can recover a prior version. Status and button states match real persisted behaviour; no unexpected live changes.

## UX-016 — Validation is strong inside controls but not always visible at overview level

| Attribute           | Assessment                                                      |
| ------------------- | --------------------------------------------------------------- |
| Area                | Design → Image frames; custom Link List colours; Content health |
| Severity / priority | **Medium / P2**                                                 |
| Audience            | Designers, QA, agencies managing many sites                     |
| Confidence          | **Observed isolated validation; overview gap is hypothesis**    |
| Effort              | **Medium (preliminary)**                                        |

**Observation / evidence.** Individual colour settings and the Compass Frame record surface specific problems. Content health also aggregates several checks. It was not established that all frame-size or custom-design failures roll up into a reliable cross-site overview.

**Impact.** Problems can be forgotten inside advanced records until visible on site or raised at launch.

**Recommendation.** Catalogue existing checks and expose a small consistent “Needs attention” roll-up at list level or Content health, with a deep link to exact field and the correct severity. Avoid treating visual suggestions as hard release blockers without policy.

**Acceptance criteria.** Known invalid frame assets and failing tested contrast combinations can be discovered from an overview and navigated to in one or two steps, with no duplicate contradictory warnings.

## UX-017 — Test responsive behaviour beyond the Studio's mobile toggle

| Attribute           | Assessment                                        |
| ------------------- | ------------------------------------------------- |
| Area                | Presentation, editor shells, complex layouts      |
| Severity / priority | **Medium / P2 test work**, not a confirmed defect |
| Audience            | Clients and designers on smaller devices          |
| Confidence          | **Not fully assessed / hypothesis**               |
| Effort              | **Medium (preliminary)**                          |

**Observation / evidence.** The Presentation viewport toggle switched into a mobile-oriented layout and URL state, but we did not verify actual breakpoint geometry, touch interactions, horizontal overflow, device keyboard behaviour, modal fitting, or the public site's responsive appearance.

**Impact.** Complex nested editors and wide colour/preset panels are common sources of mobile friction; lack of evidence should not be mistaken for passing QA.

**Recommendation.** Establish representative viewport tests at narrow phone, large phone, tablet and desktop for client Start here, page editing, nested Link List, preset picker, colour controls and Presentation. Test touch targets, scrolling containment, focus/keyboard and content visibility.

**Acceptance criteria.** Documented responsive QA matrix passes on actual browser dimensions/devices with no clipped controls, trapped dialogs or hidden primary actions. Record measured failures as new bugs rather than presuming them now.

## UX-018 — Perceived performance and state transitions need instrumentation

| Attribute           | Assessment                                      |
| ------------------- | ----------------------------------------------- |
| Area                | Cross-Studio navigation and editor transitions  |
| Severity / priority | **Low / P3 investigation**                      |
| Audience            | All                                             |
| Confidence          | **Not fully assessed**                          |
| Effort              | **Small investigation; implementation unknown** |

**Observation / evidence.** Navigation sometimes displayed loading transitions, but no reliable timings or representative network conditions were measured. The raw client Sections error is covered under UX-001 and should not be conflated with speed.

**Impact.** A premium tool benefits from predictable, legible state changes, yet subjective browsing cannot establish a speed problem.

**Recommendation.** Add basic route/editor-open measurements, skeleton/error state review, and field-interaction profiling before proposing animation or caching changes.

**Acceptance criteria.** A small baseline exists for repeated key journeys (desktop and modest-network/mobile), with thresholds and real evidence for any optimisation backlog task.

---

# Part E — Premium UI design recommendations

These recommendations aim for **calm competence** rather than cosmetic decoration.

1. **Define three information layers.** The first viewport should answer “where am I, what can I do, what happens next?”; the second shows normal preset controls; advanced groups stay discoverable but collapsed. For a Link List, lead with selected layout, preview, profile content, card list and visibility—not every glow/arrow/divider option.
2. **Standardise field rhythm.** Use one spacing and typography scale for section heading, control label, concise helper, status, and validation. Inline help should explain a decision once. Long explanatory paragraphs belong in expandable “Why this matters” help rather than repeating after related controls.
3. **Make inheritance visible.** A compact badge like “Inherits: Glass rows” beside scope, and a “3 overrides” summary, communicate more than a wall of toggle rows. Every override gets a reversible reset and a clear scope.
4. **Use previews as decision aids.** Preserve the illustrated six-card Link List picker and live brand-colour mock-up. Expose contextual sample images/typography; only promise a live site preview when it accurately reflects selected drafts. Do not make gallery thumbnails solely decorative.
5. **Create shared custom-control standards.** Preset tile = consistent selected state, full-card hit area, keyboard activation, visual + text label. Colour control = swatch, token/hex, computed effective value, contrast result and safe remediation. Accordion = consistent affordance, collapsed summary, retained scroll position. Dialog = clear close/back and correct focus restoration.
6. **Unify status grammar.** Use one visual vocabulary for default/inherited, customised, draft, published, invalid, needs attention, and unavailable. Reserve red for genuine errors/risks, not ordinary destructive-looking exit affordances.
7. **Prioritise recovery quality.** Replace raw framework errors with a humane message, non-destructive retry, optional error reference for support, and preserved work. The current Sections fallback is the clearest violation of product trust.
8. **Respect the existing identity.** Keep muted surfaces, purple selections, illustrative cards and purposeful negative space. Tighten edge cases, not overall ornament; avoid increasing controls just to fill a perceived feature gap.

# Part F — Client usability recommendations

**Client home should be a launchpad, not a navigation dump.** Keep the strong Start here cards and link them to direct tasks: edit key page, update hours, review draft, contact support. Make labels match the destination document and replace “Untitled” activity rows with useful names.

**Protect clients from complexity by default.** Preserve current hiding of agency Design/Advanced/Vision/technical launch operations. Review whether zero-content Reusable collections, paid Releases, and variants/version terminology are appropriate for each client permission tier. Do not hide controls users genuinely need simply because they are complex; provide a guided mode with an escape hatch to power tools where authorised.

**Teach the safety model at the point of action.** Client-facing status should answer: “Are my changes saved as a draft? Is the public site affected? How do I preview? How do I undo?” A staging-verified one-minute sample journey would help more than lengthy general documentation.

**Fix errors before onboarding real users.** UX-001 is a release gate for any workflow involving page sections. The friendly onboarding experience makes the failure more jarring, not less.

**Make help actionable.** Give project-specific studio contact or help path, contextual error links, and concise examples. Use plain editorial vocabulary where possible (page, section, card, link) and introduce CMS terms only where they add value.

# Part G — Designer workflow recommendations

1. **Shorten the path to a high-quality default.** Choose section type → choose illustrated preset → fill core content → preview. Only enter bespoke styling if preset is insufficient.
2. **Make presets real, inspectable sources of truth.** Display active preset and deviations at all levels; encourage deliberate overrides rather than silent drift. Verify preset changes respect intentional exceptions.
3. **Reduce repetitive design work.** Explore shared property-group components and semantic style tokens before copying Link List design controls across all sections. Avoid premature global controls if local context is essential.
4. **Allow fast experimentation and reversal.** Clear “revert to inherited,” per-group reset, and safe navigation back. Verify history/undo with actual persistent staging tests before promising behaviours.
5. **Keep powerful nested editors navigable.** Sticky scopes, breadcrumbs, parent jumps, and preview context. Avoid adding modal depth for design variants.
6. **Treat diagnostics as creative guidance.** Contrast and image validators should link directly to problematic settings and provide choice, not override artistic intent without explanation.
7. **Make preview route association dependable.** A designer should select the rendered section and land in exactly its controlling document; mapping warnings need grounded recovery.

---

# Part H — Prioritised improvement backlog

**Priority rules:** P0 = serious core workflow/access/data-safety blocker; P1 = high-impact near-term; P2 = important polish/efficiency/test work; P3 = investigate or future enhancement. Dependencies are suggestions to verify against repository architecture. These are candidate roadmap entries, **not statements about existing task status**.

| ID                               | Proposed task                                                                               | Area                     | Impact                           | Preliminary effort | Priority | Dependencies                                                   | Suggested phase                   |
| -------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------- | ------------------ | -------- | -------------------------------------------------------------- | --------------------------------- |
| UX-001                           | Repair and regression-test client Sections rendering/error recovery                         | Page editor / roles      | Critical                         | M                  | **P0**   | Client-mode configuration and section components               | **Stabilisation gate**            |
| UX-002                           | Resolve Presentation main-document mapping on root/redirected routes                        | Preview routing          | High                             | M                  | **P1**   | Route conventions; preview resolver                            | Stabilisation                     |
| UX-003                           | Standardise inheritance/override summaries and reset controls                               | Design control system    | High                             | L                  | **P1**   | Component/property model; UX-004 guidance                      | Usability + shared design         |
| UX-004                           | Remediate diagnosed contrast combinations and improve guidance                              | Link List/accessibility  | High                             | M                  | **P1**   | Colour/contrast functions; test fixtures                       | Design/accessibility              |
| UX-005                           | Create role-aware, contextual empty states                                                  | Collections              | Medium                           | S–M                | P2       | Role definitions                                               | Client polish                     |
| UX-006                           | Revisit Releases visibility and upgrade framing for clients                                 | Top navigation           | Medium                           | S                  | P2       | Entitlement/product decision                                   | Client polish                     |
| UX-007                           | Humanise recent-change names for singleton records                                          | Start here               | Medium                           | S–M                | P2       | Activity title derivation                                      | Client polish                     |
| UX-008                           | Add configured support route to client Help                                                 | Start here/help          | Medium                           | S                  | P2       | Support ownership/contact configuration                        | Client polish                     |
| UX-009                           | Replace invalid frame asset; consider overview validation badge                             | Image frames / site data | Medium                           | S–M                | P2       | Asset owner approval; validator                                | Project QA + design               |
| UX-010                           | User-test and lightly group section picker by intent                                        | Section catalogue        | Medium                           | M                  | P2       | Catalogue taxonomy                                             | Editing efficiency                |
| UX-011                           | Add persistent scope and parent navigation to nested editor                                 | Nested fields            | Medium                           | M                  | P2       | Shared panel shell; UX-003                                     | Editing efficiency                |
| UX-012                           | Standardise helper/status vocabulary and compact guidance                                   | Product copy/UI system   | Medium                           | M                  | P2       | Product language model; UX-015 testing                         | Client polish                     |
| UX-013                           | Resolve example-site placeholder copy/metadata/orphans                                      | Site launch content      | Medium, site-specific            | S–M                | P2       | Client approval; launch process                                | Project readiness                 |
| UX-014                           | Audit keyboard, names, focus and compact-action usability                                   | Accessibility QA         | Medium                           | M                  | P2       | Test devices/assistive tech                                    | Verification                      |
| UX-015                           | Stage and test edit→draft→preview→publish→revert understanding                              | Publishing journey       | Medium/high confidence building  | M                  | P2       | Authorised staging fixture                                     | Verification before wider rollout |
| UX-016                           | Test and design an overview roll-up for important validation issues                         | Content health / Design  | Medium                           | M                  | P2       | Existing diagnostic inventory                                  | Quality infrastructure            |
| UX-017                           | Responsive matrix for key client and designer editor journeys                               | Responsive QA            | Medium                           | M                  | P2       | Device/viewport fixtures                                       | Verification                      |
| UX-018                           | Baseline perceived/editor-open performance before optimising                                | Performance QA           | Low until measured               | S discovery        | P3       | Instrumentation                                                | Later evidence-gathering          |
| VD-001                           | Verify actual Nocturne artwork and add surface-aware horizontal wordmark to Studio shell    | Product branding         | High visual identity             | M                  | **P1**   | Approved assets; supported navbar API; client/agency hierarchy | Visual foundation                 |
| VD-002 / VD-012                  | Establish semantically themed light/dark colours, type, spacing, radii, elevation and focus | Design tokens            | High, system-wide                | M–L                | **P1**   | Installed Sanity/React/theming version verification            | Visual foundation                 |
| VD-004–006 / VD-008 / VD-010–011 | Standardise shared button, field, picker, card, panel, dialog and icon treatments           | Component system         | High, broad consistency          | L                  | P2       | Token foundation; preserve native Sanity semantics             | Shared UI polish                  |
| VD-003                           | Add selective glass toolbar/popup surface recipes with opaque fallbacks                     | Surface design           | Medium, high aesthetic coherence | M                  | P2       | Semantic tokens, accessibility/performance checks              | Shared UI polish                  |
| VD-007 / VD-009                  | Clarify inherited values, resets, navigation scope and adaptive editor layout               | Designer workflow        | High efficiency                  | L                  | P2       | UX-001, UX-003, UX-011; shared UI                              | Workflow clarity                  |
| VD-013                           | Unify editorial empty/loading/draft/error/publish feedback                                  | Cross-Studio states      | High trust                       | M–L                | P2       | UX-001/002/005/015; role and state semantics                   | Workflow clarity                  |

**Do first:** UX-001. Pair its regression suite with selected parts of UX-014/017. Investigate UX-002 next. **Do not parallelise wholesale design-system restructuring with fixing the runtime exception unless dependency evidence supports it.** UX-013 is a separate site/project readiness track, not an excuse to delay cross-platform defects.

# Part I — Quick wins

Small changes with good upside, conditional on repo validation:

- **Readable Recent changes titles (UX-007):** a stable mapping for singleton types could immediately remove “Untitled” noise. Low behavioural risk if backed by snapshots and fallback tests.
- **Help contact CTA (UX-008):** one configured, role-appropriate support link will help when something goes wrong. Confirm contact ownership and avoid hardcoded personal information.
- **Empty-state text (UX-005):** tailored explanations and only valid actions require little interaction redesign but improve perceived completeness.
- **Releases client visibility (UX-006):** a navigation/entitlement decision can reduce top-level clutter; ensure contractual/product considerations are met.
- **Invalid asset fix (UX-009):** simplify and re-export the oversized Compass Frame after checking intended visual fidelity; this is primarily content/asset QA.
- **Error copy/recovery (part of UX-001):** a safer “Try again / Contact support” fallback improves trust, but **cannot substitute for fixing the crash itself**.
- **Scope labels and collapsed override count (starter of UX-003/011):** introduce small explanatory summaries in Link List first, then test before system-wide rollout.

# Part J — Larger cross-cutting improvements

**J1 — Shared appearance/inheritance framework (UX-003, UX-011, UX-012).** This may touch schemas, component props, effective token evaluation, preset definitions and migration behaviour. Inventory the current Link List implementation before creating a reusable abstraction. Migration must preserve existing card-specific styles, authored presets, and public rendering. Add tests for override precedence, reset, fallbacks and visual regressions.

**J2 — Preview/document association and publication confidence (UX-002, UX-015).** Inspect Next.js/Sanity preview routes, canonical page IDs, redirects, and role-specific link resolution. Build staging route fixtures and an explicit unsaved/draft/published state test. Do not conflate a preview warning with proof of data loss.

**J3 — Product validation/a11y infrastructure (UX-004, UX-014, UX-016, UX-017).** Centralise diagnostics, field deep-links, testable contrast calculations and manual keyboard/responsive QA. Separate _advisory_ visual warnings from _blocking_ invalid assets and crashes; otherwise the product risks noisy dashboards.

**J4 — Role-aware UI language and lifecycle (UX-005–008, UX-012).** Common permission-aware navigation/empty-state/help primitives need to preserve the strong existing client/agency split. Product and account stakeholders should review client needs before hiding genuinely useful functions.

---

# Diagnostic scorecard

These are **reasoned impressions from one read-only desktop audit**, not laboratory scores or a claim of accessibility compliance.

| Dimension                             |              Score /10 | Why                                                                                                                   |
| ------------------------------------- | ---------------------: | --------------------------------------------------------------------------------------------------------------------- |
| First-time usability                  |                **6.0** | Excellent task-oriented Start here and contextual labels, but sections fail in the very client flow a beginner needs. |
| Navigation & information architecture |                **7.5** | Useful Structure categorisation and real role separation; some empty and paid destinations dilute focus.              |
| Visual polish                         |                **7.5** | Purposeful branding, visual cards and colour previews; exceptions and error states feel less finished.                |
| Premium product feel                  |                **7.0** | Distinctive and thoughtful in core surfaces; raw framework error and some taxonomy/overrides break confidence.        |
| Editing efficiency                    |                **6.5** | Good nested breadcrumbs and contextual fields; depth and abundance of fine-grained options cost time.                 |
| Design customisation                  |                **7.5** | Impressive control and six illustrated Link List presets; inheritance and reset discoverability need work.            |
| Consistency                           |                **7.0** | Shared visual language and strong field patterns; activity labels, empty states and advanced controls are uneven.     |
| Accessibility                         | **Not fully assessed** | Contrast diagnostics are a positive signal; specific failures are flagged; no keyboard/AT/full WCAG test.             |
| Feedback & system states              |                **6.0** | Helpful validation/publishing states, undermined by technical preview message and raw error/recovery.                 |
| Overall client readiness              |                **5.5** | Attractive guided start, but the reproduced Sections failure is a practical release blocker.                          |

**Perceived performance:** not scored; insufficient timing evidence. **Responsive design:** not scored; only Presentation simulation explored.

---

# Roadmap and development-plan guidance (for Claude Code to validate)

The existing repository roadmap was **not available during this UI audit**. No task IDs, version numbers, completion statuses or historical release facts should be invented. The companion handoff gives an explicit read/compare/update procedure.

## Suggested planning structure to evaluate—not impose

- **Stabilisation / current release gate:** confirmed functional blockers such as UX-001; route preview reliability if release-critical; regression coverage.
- **Client editing clarity:** role-aware navigation, help, empty states, publishing guidance and reliable client journeys.
- **Studio design-system consistency:** inheritance, reset, custom-control primitives, colour guidance and visual testing.
- **Broader component adoption:** only after auditing what Link List already implements and what other sections actually share.
- **Future/advanced enhancements:** intent grouping, quality roll-ups, workflow optimisations and performance work justified by data.

Actual version names and cutlines must come from existing roadmap conventions and repository history.

## Task-hygiene checklist

1. Search by symptoms and component, **not just this audit's UX IDs**, to identify duplicates and already-fixed work.
2. For every candidate, compare source, tests, UI behaviour and existing tasks. Mark **Implemented/verified**, **Implemented/needing verification**, **In progress**, **Planned**, **Deferred**, **Superseded**, or **New** with evidence.
3. Separate **confirmed bugs** (UX-001), **observed high-impact UI states** (UX-002/004), **design recommendations** (UX-003/005–012/016), **project content QA** (UX-009/013), and **verification/hypotheses** (UX-014/015/017/018).
4. Keep one canonical task per root issue. Add this audit's evidence as notes or linked subtasks where relevant, rather than cloning issues.
5. Split overbroad implementation entries along deliverable and verification boundaries; connect dependencies and sensible order.
6. Preserve original task IDs, status, completion, dates and decisions. If archival is appropriate, prefer an additive index/mapping and reversible process.
7. Put a testable outcome and regression check on each active task. Use this report's acceptance criteria as drafts to adapt after code inspection.
8. Identify existing Link List capabilities before creating “roll out to all components” work. Avoid counting existing presets/colour validation as missing features.
9. Keep completed work discoverable in a history/archive section, separate from an actionable current queue.
10. Propose any substantial structural migration for approval before executing it; planning updates should not quietly rewrite historical truth.

## Recommended decision gate

Before broad client onboarding, verify **UX-001 fully resolved**, check **UX-002** in representative routes, run the **UX-015** staged publishing-confidence journey, and sample **UX-014/017** accessibility/responsiveness. More visual polish cannot compensate for uncertainty about editing and publishing safety.

---

# Evidence index and traceability

| Evidence | Observed path / workflow                                                                                                       | Supports                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| E01      | Client view → Pages → Links/Home → Sections: raw React error panel with Dismiss / Unset value; agency equivalent worked        | UX-001                  |
| E02      | Design → Brand colours: live preview and contrast badges beside Light/Dark/Primary/Secondary/Highlight                         | C5, E recommendations   |
| E03      | Links → Link List → Choose link list presets: six illustrated tiles with Glass rows selected                                   | C3, UX-003/010 patterns |
| E04      | Presentation: visible site alongside “Missing a main document” root/draft route warnings; click-through later associated Links | UX-002                  |
| E05      | Link card → Appearance: several explicit AA-fail/low-contrast badges                                                           | UX-004                  |
| E06      | Design → Image frames → Compass Frame: size limit vs 640–641 KB existing asset                                                 | UX-009                  |
| E07      | Client Start here/Help/Recent changes: task cards, help content, untitled singleton entries, support instruction               | C2, UX-007/008          |
| E08      | Client/agency toggle: differences in navigation, Cookie banner/Launch settings and technical checklist                         | C1, UX-006/012          |
| E09      | Structure empty reusable lists, Enquiries and AI context                                                                       | UX-005                  |
| E10      | Home → Add item: search plus ~21 illustrated section types                                                                     | C3, UX-010              |

E01–E03 were cropped screenshot captures made during the browser session, but file synchronisation did not make them available for attachment. Their content is described here; no image file is asserted to exist alongside this report. E04–E10 are navigation observations, not independent screenshots. The UI evidence should be rechecked in a stable staging environment when tasks are implemented.

## Final assessment

**Protect the parts that already feel designed:** genuinely client-shaped navigation, contextual editorial help, guided visual presets, live brand feedback, explicit inheritance, and strong validation. **Resolve the reliability gap first.** Then invest in a coherent design-control grammar and a demonstrated safe draft→preview→publish journey. That sequence makes Nocturne feel premium where it matters most: users can predict what will happen, achieve a polished result quickly, and recover confidently when they make a mistake.

---

# Nocturne Studio — Premium Visual Redesign & Design System Proposal

_Substantial visual-design addendum to Parts A–J. For full token values, component state specifications, before/after decision cards, visual mockups, and feasibility research, see the separate [Premium Visual Redesign Proposal](Nocturne_Studio_Premium_Visual_Redesign_Proposal.md). All designs below are **proposed**, not current screenshots or implementation changes._

## V-A — Current visual identity assessment

The Studio already has a coherent warm-neutral/violet direction, good whitespace in several global settings, tasteful illustrated section tiles, and a strong live Brand colours preview. It can look like a custom-designed tool. The visual identity becomes less convincing where the top shell displays a very small mark alongside the workspace name, where custom control density escalates, and where raw errors or generic system copy appear. **A brand redraw will not make an unstable editor usable**, so UX-001 remains the functional release gate.

The top-left mark's actual asset and whether it represents Nocturne, the agency workspace or a plugin were not established from browser inspection. The need is to **introduce and verify a real product wordmark**, while preserving a distinct workspace/client-site identity.

## V-B — Overall creative direction

**Quietly architectural:** bright ivory, muted lilac and amethyst in light mode; layered plum/ink and lavender in dark mode. Use crisp typographic hierarchy, simple 4 px spacing rhythm, limited radii, small calibrated shadows, and glass only for transient layers. Maintain opaque high-contrast content surfaces. Functional UI uses a readable system/Sanity-compatible sans; an editorial display face can be explored only in welcome headlines after brand approval.

The conceptual visual direction is shown in four reviewed vector/PNG boards:

| Concepts  | Depicted visual system                                                         | Files                                                                                                           |
| --------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **A + F** | Full Studio shell with dark/light theme and horizontal wordmark placeholder    | [PNG](Nocturne_Concept_01_Studio_Shell_Light_Dark.png) · [SVG](Nocturne_Concept_01_Studio_Shell_Light_Dark.svg) |
| **B**     | Page editor with explicit draft state, clearer forms and adjacent preview      | [PNG](Nocturne_Concept_02_Page_Editor.png) · [SVG](Nocturne_Concept_02_Page_Editor.svg)                         |
| **C**     | Brand/design palette with preview, colour swatches and surface recipes         | [PNG](Nocturne_Concept_03_Design_Controls.png) · [SVG](Nocturne_Concept_03_Design_Controls.svg)                 |
| **D + E** | Nested appearance editor, scope/inheritance summary and floating glass toolbar | [PNG](Nocturne_Concept_04_Nested_Glass_Editor.png) · [SVG](Nocturne_Concept_04_Nested_Glass_Editor.svg)         |

The `NOCTURNE` type artwork in these boards is a **concept placeholder**, not a verified product logo. No design has been applied to the live Studio.

## V-C — Wordmark and branding specification (VD-001)

- Inventory actual approved wordmark-on-light, wordmark-on-dark, standalone icon and favicon exports in the repository. Do **not** infer a file exists from its name in the brief.
- Select artwork according to **the local surface immediately behind it**, not merely the OS theme. Inspect file pixels/naming rather than trusting `on-light`/`on-dark` conventions.
- Desktop: horizontal artwork ~**154–178 px wide × 24–30 px high** within a 60–64 px header, at least 12 px visual clear space and crisp natural aspect. Tablet: ~122–150 px if room permits. Collapsed/mobile: approved 24–28 px icon with semantic product name/tooltip.
- Keep Nocturne brand, Currawong workspace switcher and Living Prana website preview as **three distinct identities**. The browser favicon remains the standalone mark.
- Do not inflate a favicon or replace a trusted Sanity workspace icon hook with a deprecated logo override. Investigate supported navbar extension and `renderDefault` compatibility.
- Acceptance: real artwork verified, correct variants on dark/light/glass plate, no stretched raster or layout shift, keyboard/AT naming and responsive fit.

## V-D — Light/dark design and core tokens (VD-002, VD-012)

| Role                    | Proposed light           | Proposed dark           |
| ----------------------- | ------------------------ | ----------------------- |
| Canvas                  | `#F7F4FA`                | `#17151F`               |
| Navigation              | `#F5F2F8`                | `#1D1A27`               |
| Primary editable sheet  | `#FFFEFF`                | `#25212F`               |
| Text                    | `#1F1A29`                | `#F6F3FA`               |
| Muted/helper            | `#635B70`                | `#B9B1C9`               |
| Accent / call to action | `#6D47C8` with white ink | `#C4A9F6` with dark ink |
| Selected navigation     | `#ECE2FA`                | `#46345F`               |
| Borders                 | `#DED8E8`                | `#4B415A`               |
| Focus ring              | `#7651DC`                | `#D2B6FF`               |

These are **candidate values**, not measured current Studio tokens. Use semantic mapping, test actual per-component contrast and keep client's website brand colours confined to site settings/preview, not Nocturne's global chrome. On simple solid samples, proposed white text on `#6D47C8` is about 6.2:1; this does **not** validate every blended, gradient, disabled or glass state.

Typography: body/input **14/21**, labels **13/19**, helpers **12–13/18–19**, group headings **16/24**, document title **28–32/36–40**. Spacing: **4/8/12/16/20/24/32/40/48 px**. Radii: field **10**, button **11–12**, nav/preset **12**, card **16**, dialog **20**, status pill **999**. Limit shadows to flat, subtle, floating and modal tiers.

## V-E — Glass surface treatment (VD-003)

The goal is **restrained, meaningful depth**, not shiny glass on every content block. Keep opacity/blur **separate** from semantic text and colour tokens.

| Surface        | Proposed treatment                             | Appropriate area                                            |
| -------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Opaque         | Alpha 1.0, no blur                             | Every content form, list and long reading surface (default) |
| Subtle glass   | ~0.88–0.90 alpha, 8–10 px blur, 1 px border    | Small sticky header or toolbar over controlled backdrop     |
| Elevated glass | ~0.93–0.94 alpha, 12–16 px blur, quiet shadow  | Short popover/picker with no dense content                  |
| Floating glass | ~0.82–0.88 alpha, 16–18 px blur, stronger edge | Preview toolbar or temporary compact inspector              |

Fallback is an **opaque matching surface** for unsupported backdrop filters, accessibility transparency preferences, forced-colours or degraded performance. Avoid large composited scrolling regions; sample text contrast against the _worst_ image behind a glass surface. The actual Link List site's glass-card design is a **client website appearance** and must not automatically become Studio global styling.

## V-F — Component design specifications (VD-004–011)

| Component family      | Target visual + behaviour                                                                                                                          | Scope / risks                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Buttons               | Primary 40–44 px × 16 px inset, radius 11–12; quiet outline secondary; 36–40 ghost; explicit danger; icon buttons 40 visual / ≥44 practical target | Shared Sanity + custom, with focus/loading/disabled/destructive states; do not replace native actions indiscriminately |
| Inputs & forms        | 44 px field, radius 10, 1 px border, 6 px label gap, 16–20 px between fields, 2 px focus ring with offset; readable helper/error                   | Page metadata, URLs, colours, Business info, media and complex inputs                                                  |
| Select/preset picker  | Native select for simple nonvisual choices; illustrated card ≥136 × 100 px for meaningful layouts; search maintained                               | Preserve Link List's existing six illustrated presets and section catalogue thumbnails                                 |
| Switch/checkbox/radio | Switch 40 × 24, checkbox/radio 18–20, rows ≥40; state has text, not colour alone                                                                   | Clear enabled vs disabled vs off; radio keyboard pattern                                                               |
| Sliders               | 6 px track, 18–20 thumb, adjacent 66–84 px numeric value with unit and reset                                                                       | Advanced appearance, opacity, spacing, border; show inherited source                                                   |
| Cards/panels          | Card radius 14–16, 20–24 px padding, quiet border; panel 16–18 radius; accordion 44–48 row                                                         | Same visual rhythm across Start here, page editors, collections and custom tools                                       |
| Navigation/tabs       | 60–64 px shell, 224–248 px rail, 40–44 nav row, one strong selected state and contextual breadcrumbs                                               | Agency/client tool filtering, deep hierarchy and responsive/compact layout                                             |
| Dialog/popover        | Popover radius 14, modal radius 20 / 24 px padding, narrow confirmation 420–480 px, rich picker up to ~800–920 px                                  | Correct focus/escape/return; avoid needless nested modal depth                                                         |
| Icons                 | 16/18/20/24 px scale, consistent stroke/icon family, aligned in 40 px buttons                                                                      | Names/tooltips/keyboard focus audited; do not claim universal a11y defect from prior limited AX sampling               |
| States                | Purposeful empty/loading/saving/saved/error/warning/success/disabled/active/focus/selected grammar                                                 | Fix UX-001 crash, UX-002 mapping, UX-005 empty state and UX-007 activity labels as actual functionality/copy           |

## V-G — Layout, nested editors, typography and hierarchy

Treat each deep editor as three questions: **Where am I? What scope is affected? How do I get back?** Keep a persistent breadcrumb and scope label (`This card only` / `All cards in this list` / `Site-wide`), the current preset, number of overrides and a direct return action. For broad desktops, favour a **640–800 px** main form with an optional **340–460 px** side Preview. On tablet, the Preview becomes a switchable pane. Do not pack multiple independent scrollbars into a narrow window.

The page editor concept demonstrates a simple field rhythm and adjacent draft preview; the nested concept demonstrates inherited/custom chooser, reset count, scoped controls, warning and a temporary glass Preview toolbar. Actual draft state, save, reset, preview routing and data-write effects need staged functional tests, not assumptions from the illustration.

## V-H — Accessibility, responsive and performance constraints

- Test keyboard-only traversal, focus restoration, full control names and roles, screen readers, error recovery, zoom/large text, and touch on real narrow layouts.
- Test light/dark/hover/focus/disabled text and boundaries against **actual blended surfaces**, with explicit remediation on contrast warnings (UX-004).
- Respect reduced motion; avoid excessive hover movement. 120–160 ms feedback and ≤180 ms modest dialogs are proposals, not measured requirements.
- Keep blur local and bounded, with solid fallback for reduced transparency, unsupported filters and slow devices.
- Test ≥1440, 1024–1439, 768–1023 and 360–767 px representative widths, but calibrate final breakpoints against actual responsive code and devices.
- Don't use transparent forms or client brand colours in the Studio shell. No accessibility conformance score can be inferred from the mockups alone.

## V-I — Phases, acceptance and technical feasibility

1. **Stabilise (P0 first):** UX-001 Sections crash; investigate UX-002 preview/document mapping.
2. **Foundation (P1 visual):** verify authentic wordmark and correct background variants (VD-001); semantic light/dark theme, typography, spacing, radius, focus (VD-002/012).
3. **Shared controls (P2):** cohesive buttons/forms/selectors/panels/dialogs/icons/states and restrained glass (VD-003–006, VD-008/010/011/013).
4. **Workflow depth (P1/P2):** inheritance summary/reset and scoped nested navigation, safe preview/publishing guidance (UX-003/011/015, VD-007/009).
5. **Component adoption and later ideas:** audit existing Link List strengths, then extend shared primitives to Hero, Brand colours, media, settings and tools, with documented verification, not automatic feature cloning.

**Feasibility must be checked in the repository.** Official [Sanity theming](https://www.sanity.io/docs/studio/theming) describes current `@sanity/themer` integration but its latest package requires **Studio 6+ / React 19**; [Studio components reference](https://www.sanity.io/docs/studio/studio-components-reference) describes supported navbar/toolMenu/layout overrides and `renderDefault`. The old `logo` component route is deprecated. The installed Nocturne versions/assets were not inspected. Prefer supported theme slots and Sanity UI composables over fragile DOM selectors or blanket native component replacements.

### Visual acceptance checklist

- [ ] Real approved Nocturne wordmark confirmed and legible on each _actual_ local background, compact icon fallback tested.
- [ ] One coherent light/dark token family passes contrast, focus, empty/error and disabled-state checks.
- [ ] Buttons/fields/cards/pickers/dialogs follow a shared scale, with no broken Sanity interactions.
- [ ] Glass improves toolbar depth but never compromises content readability, accessibility or performance.
- [ ] A designer knows active preset, inherited source, override count and reset scope at each level.
- [ ] A client can edit Sections and preview/publish safely in an authorised staging exercise.
- [ ] At least Studio shell, Pages, Link List, Brand colours, Website settings and Presentation pass responsive/keyboard snapshots.
- [ ] Actual roadmap mapping preserves task IDs and history and does not silently duplicate finished work.

**Visual proposal outcome:** Keep the excellent bones—client-focused Start here, semantic colour previews, illustrated presets and expressive editing. Make the shell unmistakably Nocturne, refine the shared visual vocabulary, and let shallow-to-deep controls feel designed rather than accumulated. The companion redesign proposal contains full tokens, before/after task cards and the four illustrated concepts.
