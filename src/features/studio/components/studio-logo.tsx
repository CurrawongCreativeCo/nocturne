import { Flex, Text } from '@sanity/ui'
import { useColorSchemeValue } from 'sanity'

import { brandAssets } from '@/config/studio-brand/assets.generated'
import { studioBrand } from '@/config/studio-brand/client'
import type { LogoAsset } from '@/config/studio-brand/types'

import { BrandMonogram } from './brand-monogram'
import { fittedWidth, resolveBrandImage } from '../utils/brand-image'

const LOGO_HEIGHT = 24
const LOGO_MAX_WIDTH = 160
/** Room for the paper-coloured backing's padding when a lone logo is shown on the other scheme. */
const BACKING_PADDING = 2

/** An image or monogram from the brand, at `height`; the monogram stands in when the image is missing. */
function BrandAsset({ asset, height, alt }: { asset: LogoAsset; height: number; alt: string }) {
  if (asset.kind === 'monogram') return <BrandMonogram monogram={asset} size={height} />
  const image = resolveBrandImage(brandAssets, asset.src)
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
  const scheme = useColorSchemeValue()
  const { name, logo, mark, logoSource, logoDrawnFor } = studioBrand

  if (logoSource === 'client' && logo[scheme].kind === 'image') {
    const backing =
      logoDrawnFor && logoDrawnFor !== scheme ? studioBrand[logoDrawnFor].background : undefined
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
          />
        </span>
      </Flex>
    )
  }

  return (
    <Flex align="center" gap={2} style={{ height: LOGO_HEIGHT }}>
      <BrandAsset asset={mark[scheme]} height={LOGO_HEIGHT} alt="" />
      <Text weight="semibold" style={{ whiteSpace: 'nowrap' }}>
        {name}
      </Text>
    </Flex>
  )
}
