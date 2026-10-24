import { useEffect, useRef } from 'react'
import { useColorSchemeValue } from 'sanity'

import { brandAssets } from '@/config/studio-brand/assets.generated'
import { studioBrand } from '@/config/studio-brand/client'

import { BrandMonogram } from './brand-monogram'
import { resolveBrandImage } from '../utils/brand-image'
import { iconLinkLabel } from '../utils/icon-link-label'

/**
 * The workspace icon (the mark), which Studio shows on the sign-in screen, in the workspace menu
 * and as the navbar's home link. Sized in `em` because Studio sizes icons by font size. Decorative
 * where a title sits beside it. Sanity gives the icon no props and wraps it in the home link with
 * no name, so the icon looks at its own link after mounting and names it when the icon is all the
 * link holds.
 */
export function StudioIcon() {
  const scheme = useColorSchemeValue()
  const asset = studioBrand.mark[scheme]
  const anchor = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const link = anchor.current?.closest('a')
    if (!link || !iconLinkLabel(link, anchor.current)) return
    link.setAttribute('aria-label', `${studioBrand.name} home`)
    return () => {
      link.removeAttribute('aria-label')
    }
  }, [scheme])

  let mark = null
  if (asset.kind === 'monogram') {
    mark = <BrandMonogram monogram={asset} size="1em" />
  } else {
    const image = resolveBrandImage(brandAssets, asset.src)
    if (image) {
      mark = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.src}
          alt=""
          decoding="async"
          style={{ display: 'block', width: '1em', height: '1em', objectFit: 'contain' }}
        />
      )
    }
  }
  if (!mark) return null
  return (
    <span ref={anchor} style={{ display: 'contents' }}>
      {mark}
    </span>
  )
}
