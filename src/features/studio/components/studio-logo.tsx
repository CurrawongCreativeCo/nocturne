import { Flex, Text } from '@sanity/ui'
import { useColorSchemeValue } from 'sanity'

import { brandAssets, type BrandImage } from '@/config/studio-brand/assets.generated'
import { studioBrand } from '@/config/studio-brand/client'
import type { LogoAsset, Scheme, StudioBrand } from '@/config/studio-brand/types'

import { BrandMonogram } from './brand-monogram'
import { fittedWidth, resolveBrandImage } from '../utils/brand-image'

const LOGO_HEIGHT = 24
const LOGO_MAX_WIDTH = 160
/** Room for the paper-coloured backing's padding when a lone logo is shown on the other scheme. */
const BACKING_PADDING = 2

/** An image or monogram from the brand, at `height`; the monogram stands in when the image is missing. */
function BrandAsset({
  asset,
  height,
  alt,
  assets,
}: {
  asset: LogoAsset
  height: number
  alt: string
  assets: Record<string, BrandImage>
}) {
  if (asset.kind === 'monogram') return <BrandMonogram monogram={asset} size={height} />
  const image = resolveBrandImage(assets, asset.src)
  if (!image) return null
  return (
    // A plain <img>: Studio is a client-only app and these are small static brand files.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt={alt}
      decoding="async"
      style={{
        display: 'block',
        height,
        width: fittedWidth(image, height, LOGO_MAX_WIDTH) ?? 'auto',
        maxWidth: LOGO_MAX_WIDTH,
        objectFit: 'contain',
      }}
    />
  )
}

/**
 * The Studio's navbar logo, in a fixed 24px-high box (up to 160px wide) so it never shifts the navbar.
 * - A client logo file: the file alone, light or dark variant to match the Studio's colour scheme.
 *   A lone file is never recoloured; shown on the other scheme it sits on a small background in the
 *   colour it was drawn for.
 * - Otherwise a mark (the client's monogram, or Currawong's mark) beside the name.
 * The brand name is the accessible label either way.
 */
export function StudioLogo() {
  return <StudioLogoView brand={studioBrand} scheme={useColorSchemeValue()} />
}

/**
 * The logo for a given brand and scheme, with no Studio context needed. StudioLogo is this site's
 * brand in the active scheme; the brand preview page (/studio-brand-preview) renders other brands
 * (and their own `assets`) side by side.
 */
export function StudioLogoView({
  brand,
  scheme,
  assets = brandAssets,
}: {
  brand: StudioBrand
  scheme: Scheme
  assets?: Record<string, BrandImage>
}) {
  const { name, logo, mark, logoSource, logoDrawnFor } = brand

  if (logoSource === 'client' && logo[scheme].kind === 'image') {
    const backing =
      logoDrawnFor && logoDrawnFor !== scheme ? brand[logoDrawnFor].background : undefined
    return (
      <Flex align="center" style={{ height: LOGO_HEIGHT, maxWidth: LOGO_MAX_WIDTH }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            height: LOGO_HEIGHT,
            maxWidth: '100%',
            padding: backing ? BACKING_PADDING : 0,
            borderRadius: backing ? 4 : 0,
            background: backing,
          }}
        >
          <BrandAsset
            asset={logo[scheme]}
            height={backing ? LOGO_HEIGHT - BACKING_PADDING * 2 : LOGO_HEIGHT}
            alt={name}
            assets={assets}
          />
        </span>
      </Flex>
    )
  }

  return (
    <Flex align="center" gap={2} style={{ height: LOGO_HEIGHT }}>
      <BrandAsset asset={mark[scheme]} height={LOGO_HEIGHT} alt="" assets={assets} />
      <Text weight="semibold" style={{ whiteSpace: 'nowrap' }}>
        {name}
      </Text>
    </Flex>
  )
}
