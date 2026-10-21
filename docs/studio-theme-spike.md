# Studio theme API and agreed scope — 21 October 2026

**Proceed with UI 4 scope.** Following the spike, the owner approved applying the new palette and
fonts to components that consume the workspace theme. UI 5 alpha components retain Sanity's own
styling and CDN-hosted Inter. No CSS overrides or experimental Themer preview tool are used.
Nothing has been merged, published or written to a live Content Lake.

## Evidence inspected

- [Sanity's theming guide](https://www.sanity.io/docs/studio/theming).
- [`@sanity/themer` README](https://github.com/sanity-io/plugins/tree/main/plugins/%40sanity/themer#readme)
  and published `dist/index.d.ts`, version **0.10.4**.
- Installed Sanity **6.19.0**, React **19.3.1**, `@sanity/ui` **4.4.9** and
  `ui5` (**`@sanity/ui@5.0.0-alpha.14`**, an alias in Sanity's dependencies).
- Installed `@sanity/ui/dist/theme.d.ts`: public `RootTheme_v2`, font and colour types.
- Sanity's `lib/types-elUTbqPO.js`: `StudioThemeProvider` / `getThemeValues` and imports from both UI
  versions. The document-header code also reads compatibility font fields.
- `node_modules/ui5/README.md`, Setup; that package's `src/css/global/font-face.css` and
  `src/css/classes/system/font-family.css`.
- Installed Next **16.4.2** font optimisation and font component guides under
  `node_modules/next/dist/docs/01-app/`.

The UI 5 README states: “v5 has no `ThemeProvider`, and it does not read v3's theme.” Its stylesheet
loads Inter from `design-system-static.sanity.io`. This remains an accepted exception; the new
workspace theme does not claim to control UI 5 components.

## Supported implementation

| Requirement                         | Implementation                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime client roles over Currawong | Resolve the existing brand first; client colours replace defaults as a whole set.                                                                                        |
| Independent schemes                 | Themer accepts `{ light: {...}, dark: {...} }`, each with accent, text, background and contrast. Its published README/types supersede the guide's older flat example.    |
| Exact roles and independent focus   | Public `v2.color` fields preserve canvas, text, input surfaces, borders, primary fills/labels and focus. Themer's four inputs alone cannot represent every role exactly. |
| State colours                       | Neutral and primary buttons, tabs and selectable rows use readable brand states. Remaining semantic tones come from Themer.                                              |
| Radius and ring geometry            | Installed defaults are retained. Public `v2.radius`, `v2.button.focusRing`, `v2.card.focusRing` and `v2.input` fields can express them.                                  |
| Font families                       | Public `v2.font.heading`, `text` and `label`. Compatibility `fonts` mirrors `v2.font` because Studio still reads it for document headers. Code remains monospaced.       |
| Appearance                          | Both schemes are present without legacy scheme-lock markers; Studio follows the editor's stored choice.                                                                  |

`src/features/studio/theme.ts` is the only brand-to-theme adapter. It imports the stable generator,
not `buildLegacyTheme`, internal conversion helpers, hosted themes or `@sanity/themer/tool`.
The preview receives that same complete theme. The unit tests use the real generator and cover exact
roles, control-state contrast, both schemes, radius, fonts, client precedence and theme independence.

## Palette and typography

The default `currawongBrand` maps proposal §5 to existing roles. Fixed borders `#8a7c9b` (light) and
`#8b7999` (dark) replace the proposal's weaker structural borders to meet the existing 3:1 boundary
rules against both neighbouring surfaces. Highlight roles retain their previous values. The
proposal's secondary `#9b83b7` is not used as a universal text colour.

`currawongClassicBrand` preserves every previous role. To switch this site's default back, change
the import in `src/config/studio-brand/client.ts` to:

```ts
import { currawongClassicBrand as currawongBrand } from './currawong.ts'
```

The brand preview includes both palettes and the existing client examples, in both schemes.

`src/config/studio-fonts.ts` self-hosts variable normal Inter and Newsreader through
`next/font/google`, with Latin and `display: 'swap'`. Only Studio and its preview import the loader.
`BrandedStudio` applies resolved families through the UI 4 theme, so portals do not depend on
inherited variables and the Sanity schema CLI never imports Next's loader. Inter is for interface
text and inputs; Newsreader is for display headings, including Start here and document titles where
Sanity uses heading tokens. Public-site font tokens are untouched. Client-selectable Studio fonts
remain a separate agency decision; `studio-brand.json` gains no font settings.

The browser inspection of the initial prototype confirmed Newsreader on UI 4 headings, Inter on
inputs and the proposal's primary fills in both schemes. It also observed the UI 5 font request:

```text
https://design-system-static.sanity.io/InterVariable-latin-20260728.woff2
```

No Google Fonts browser request was observed. UI 5's separate font loading and styling remain
explicitly outside this migration; its stylesheet is not reordered or overridden to force parity.

## Download comparison

The original baseline, discarded prototype and final implementation samples are recorded in
[`studio-theme-spike-downloads.json`](studio-theme-spike-downloads.json).

Measurement scope: cold signed-out `/studio`, Chromium **156.0.8078.4**, macOS, the same local
production-server setup; all external browser requests blocked. Counts cover local resources only,
excluding Sanity's CDN font. JavaScript and CSS gzip sizes are recompressed locally, not negotiated
wire bytes; WOFF2 sizes are decoded response-body bytes, already compressed. The public root already
self-hosts Inter, so the additional local font is Newsreader.

| Local resources        | Original baseline | Final implementation | Difference |
| ---------------------- | ----------------: | -------------------: | ---------: |
| JavaScript, gzip bytes |         2,175,597 |            2,163,192 |    −12,405 |
| CSS, gzip bytes        |            45,223 |               46,132 |       +909 |
| Fonts, WOFF2 bytes     |   48,432 (1 file) |    106,584 (2 files) |    +58,152 |

The measured local total rises by **46,656 bytes** (about **45.6 KiB**): Newsreader adds about
56.8 KiB while JavaScript falls about 12.1 KiB. This excludes the accepted Sanity CDN font and does
not measure authenticated desk performance or editing interactions. The separate `tests/studio-perf`
harness needs a disposable project and saved sign-in. The historical prototype sample is retained
as evidence, not substituted for the final implementation result.

## Validation and visual baselines

`npm run check` **passed**: 259 test files and 2,959 tests, plus type checking, lint and formatting.
The production build against the fake Content Lake also passed. A local browser inspection confirmed
Newsreader headings, Inter inputs and exact primary fills in both schemes, with no Google Fonts
browser requests; the accepted UI 5 Inter request was still observed. End-to-end tests remain skipped at the owner's request. Task 88's rendered contrast
assertions and task 106's Appearance coverage are retained, but a fresh e2e pass is not claimed.
Authenticated document headers, Appearance switching and the mixed UI 4/UI 5 appearance need editor
review in both schemes. No schema or query changes, content migration or live Sanity writes are needed.

Refresh these Linux snapshots through **Update visual baselines** (macOS skips image comparisons):

- `studio-brand-{currawong,green-cream,partial,low-contrast}-{light,dark}-desktop-linux.png`.
- New `studio-brand-currawong-classic-{light,dark}-desktop-linux.png`.
- `studio-brand-preset-picker-{light,dark}-desktop-linux.png`.

The plan review's CMS branding rule now records the Newsreader/Inter direction with the approved
UI 5 exception. This records implementation scope, not a claim that the branch has merged.
