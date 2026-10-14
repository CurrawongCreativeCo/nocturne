# Client CMS brand files

Empty by default: the Studio uses Currawong Creative's branding (`../currawong/`).

To brand this site's Studio for the client, put their logo files here and list them in `studio-brand.json`
at the repo root:

| File                   | Used for                                                  | Setting in `studio-brand.json` |
| ---------------------- | --------------------------------------------------------- | ------------------------------ |
| Logo for light screens | Studio navbar in light mode (also used for dark if alone) | `logo.onLight`                 |
| Logo for dark screens  | Studio navbar in dark mode (also used for light if alone) | `logo.onDark`                  |
| Square mark            | Workspace icon and sign-in screen; small spaces           | `logo.mark`                    |

- Formats: SVG (best), PNG, WebP, JPEG or AVIF. The navbar box is 24px high and up to 160px wide, so supply
  a wide, short logo. The mark should be square.
- Paths in `studio-brand.json` start with `src/assets/brand/client/`, for example
  `src/assets/brand/client/logo.svg`.
- After adding or renaming a file, run `npm run brand-assets` and commit the generated
  `src/config/studio-brand/assets.generated.ts`, then `npm run check:studio-brand`.

See the README, _CMS branding_, for colours and the full rules.
