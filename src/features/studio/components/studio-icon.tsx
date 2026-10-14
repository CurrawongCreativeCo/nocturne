import { useColorSchemeValue } from 'sanity'

import { brandAssets } from '@/config/studio-brand/assets.generated'
import { studioBrand } from '@/config/studio-brand/client'

import { BrandMonogram } from './brand-monogram'
import { resolveBrandImage } from '../utils/brand-image'

/**
 * The workspace icon (the mark), which Studio shows on the sign-in screen and in the workspace
 * menu. Sized in `em` because Studio sizes icons by font size. Decorative: the title beside it is
 * the label.
 */
export function StudioIcon() {
  const scheme = useColorSchemeValue()
  const asset = studioBrand.mark[scheme]

  if (asset.kind === 'monogram') return <BrandMonogram monogram={asset} size="1em" />

  const image = resolveBrandImage(brandAssets, asset.src)
  if (!image) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt=""
      decoding="async"
      style={{ display: 'block', width: '1em', height: '1em', objectFit: 'contain' }}
    />
  )
}
