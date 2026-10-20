import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

import tokens from '@/styles/tokens.json'

export const ICON_PADDINGS = ['none', 'small', 'medium'] as const
export const ICON_BACKGROUNDS = ['transparent', 'light', 'dark', 'brand'] as const

export type IconPadding = (typeof ICON_PADDINGS)[number]
export type IconBackground = (typeof ICON_BACKGROUNDS)[number]

/** The icon sizes browsers and phones ask for: tab, high-density tab and Android/Google, iOS home screen. */
export const ICON_SIZES = { tab: 32, large: 192, android: 512, apple: 180 } as const

/** Share of the icon, per side, left empty by each padding preset. */
const PADDING_SHARE: Record<IconPadding, number> = { none: 0, small: 0.08, medium: 0.16 }

/** Backgrounds follow the design tokens; transparent keeps the PNG's own transparency. */
const BACKGROUND_HEX: Record<Exclude<IconBackground, 'transparent'>, string> = {
  light: tokens.color.surface.hex,
  dark: tokens.color['surface-inverse'].hex,
  brand: tokens.color.accent.hex,
}

/** Plain strings: query results are typed as strings, and an unknown value means no padding or background. */
export interface BrowserIconOptions {
  padding?: string | null
  background?: string | null
}

interface IconBuilderConfig {
  projectId: string
  dataset: string
}

/** Pixels of empty border on each side of an icon of `size`. */
export function paddingPixels(size: number, padding: string | null | undefined) {
  return Math.round(size * ((PADDING_SHARE[padding as IconPadding] as number | undefined) ?? 0))
}

/** `bg` takes a hex colour without the leading #; transparent sends none. */
export function backgroundParam(background: string | null | undefined) {
  const hex = BACKGROUND_HEX[background as Exclude<IconBackground, 'transparent'>] as
    string | undefined
  return hex?.replace('#', '')
}

/**
 * A Sanity CDN URL that serves the editor's icon as a square PNG of `size` pixels. Always a PNG
 * from the CDN (SVG uploads are rasterised there), so uploaded markup never reaches the page.
 * The crop and hotspot the editor set are applied by the builder. `pad` adds the empty border
 * around the artwork, so the artwork is requested smaller to keep the finished icon at `size`.
 */
export function browserIconUrl(
  image: SanityImageSource,
  size: number,
  { padding, background }: BrowserIconOptions,
  config: IconBuilderConfig,
) {
  const pad = paddingPixels(size, padding)
  const inner = size - pad * 2
  let url = createImageUrlBuilder(config).image(image).width(inner).height(inner).fit('fill')
  url = url.format('png')
  if (pad > 0) url = url.pad(pad)
  const bg = backgroundParam(background)
  if (bg) url = url.bg(bg)
  return url.url()
}

interface IconLink {
  url: string
  sizes: string
  type: 'image/png'
}

/** What Next.js turns into `<link rel="icon">` and `<link rel="apple-touch-icon">` tags. */
export function browserIconLinks(
  image: SanityImageSource,
  options: BrowserIconOptions,
  config: IconBuilderConfig,
): { icon: IconLink[]; apple: IconLink[] } {
  const link = (size: number): IconLink => ({
    url: browserIconUrl(image, size, options, config),
    sizes: `${size}x${size}`,
    type: 'image/png',
  })
  return {
    icon: [ICON_SIZES.tab, ICON_SIZES.large, ICON_SIZES.android].map(link),
    apple: [link(ICON_SIZES.apple)],
  }
}
