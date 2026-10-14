import type { BrandImage } from '@/config/studio-brand/assets.generated'
import { currawongBrand } from '@/config/studio-brand/currawong'
import { resolveStudioBrand } from '@/config/studio-brand/resolve'
import type { StudioBrand, StudioBrandFile } from '@/config/studio-brand/types'

/** Sample client logo paths, as a studio-brand.json would name them. They only exist in this preview's asset map. */
const LOGO_ON_LIGHT = 'src/assets/brand/client/sample-on-light.svg'
const LOGO_ON_DARK = 'src/assets/brand/client/sample-on-dark.svg'

/** A leaf and two bars, drawn in `ink` on a transparent background. Shapes only, so no font changes a screenshot. */
const sampleLogo = (ink: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="24" viewBox="0 0 96 24">` +
      `<path d="M2 22C2 10 10 2 22 2c0 12-8 20-20 20Z" fill="${ink}"/>` +
      `<rect x="30" y="6" width="64" height="4" rx="2" fill="${ink}"/>` +
      `<rect x="30" y="14" width="42" height="4" rx="2" fill="${ink}"/></svg>`,
  )}`

export const sampleAssets: Record<string, BrandImage> = {
  [LOGO_ON_LIGHT]: sampleLogo('#2f5d3a'),
  [LOGO_ON_DARK]: sampleLogo('#f3ebdd'),
}

export interface BrandPreviewCase {
  id: string
  label: string
  /** What studio-brand.json would hold for this case. */
  file: StudioBrandFile
  brand: StudioBrand
}

const define = (id: string, label: string, file: StudioBrandFile): BrandPreviewCase => ({
  id,
  label,
  file,
  brand: resolveStudioBrand(file, currawongBrand),
})

/** The four brands the preview shows; each is rendered in light and dark. */
export const brandPreviewCases: BrandPreviewCase[] = [
  define('currawong', 'Currawong default', {}),
  define('green-cream', 'Green and cream client', {
    name: 'Greenleaf',
    logo: { onLight: LOGO_ON_LIGHT, onDark: LOGO_ON_DARK },
    colors: { primary: '#2F5D3A', secondary: '#F3EBDD' },
  }),
  define('partial', 'Partial client (logo and primary only)', {
    name: 'Fernhill',
    logo: { onLight: LOGO_ON_LIGHT },
    colors: { primary: '#2F5D3A' },
  }),
  define('low-contrast', 'Low-contrast client (yellow primary)', {
    name: 'Sunnyside',
    colors: { primary: '#FFD400' },
  }),
]
