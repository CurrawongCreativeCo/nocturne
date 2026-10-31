import { stegaClean } from 'next-sanity'
import type { ComponentProps, ReactNode } from 'react'

import { SanityImage } from '@/components/ui/sanity-image'
import {
  PROVIDER_NAMES,
  aspectClass,
  embedUrl,
  parseVideoUrl,
  watchUrl,
} from '@/features/pages/utils/video-source'
import { urlFor } from '@/lib/sanity/image'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'

import { LazyFacade } from '../lazy-facade'

/** Chrome for the frame, whatever it holds. */
const FRAME = 'relative overflow-hidden rounded-card bg-surface-alt'

interface Props {
  /** `youtube`, `vimeo` or `upload`; unset is YouTube, as the schema's default. */
  source?: string | null
  /** The pasted YouTube or Vimeo address. */
  url?: string | null
  /** The uploaded MP4's address and, optionally, its WebVTT captions. */
  fileUrl?: string | null
  captionsUrl?: string | null
  /** Optional in the generated types of a block whose poster is not yet chosen; the schema requires one. */
  poster: ComponentProps<typeof SanityImage>['image']
  /** Names the Play button and the native player for screen readers. */
  title?: string
  aspectRatio?: string | null
  /** The poster is the page's first picture: preload it (LCP). */
  preload?: boolean
  sizes: string
}

/**
 * The Video section's player, shared with the `slotVideo` block: a poster with a Play button that loads
 * YouTube or Vimeo only on the click (the facade), or an uploaded MP4 in a native `<video>` with a
 * captions track that fetches nothing until played. Without JavaScript a link to the video's own page
 * stands in for the button. Renders the frame, then that link, so the caller owns the spacing.
 */
export function VideoFrame({
  source: storedSource,
  url,
  fileUrl,
  captionsUrl,
  poster,
  title,
  aspectRatio,
  preload,
  sizes,
}: Props) {
  const source = stegaClean(storedSource) ?? 'youtube'
  const frameClass = `${FRAME} ${aspectClass(stegaClean(aspectRatio))}`
  const image = (
    <SanityImage
      image={poster}
      fill
      preload={preload}
      sizes={sizes}
      className="object-cover"
      style={{ objectPosition: hotspotObjectPosition(poster) }}
    />
  )

  let frame: ReactNode = <div className={frameClass}>{image}</div>
  let fallback: ReactNode = null

  if (source === 'upload') {
    const src = stegaClean(fileUrl)
    const captions = stegaClean(captionsUrl)
    const posterUrl = poster?.asset
      ? urlFor({
          asset: { _ref: stegaClean(poster.asset._id) },
          crop: poster.crop ?? undefined,
          hotspot: poster.hotspot ?? undefined,
        })
          .width(1600)
          .url()
      : undefined
    if (src) {
      frame = (
        <div className={frameClass}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the captions file is optional; the track is rendered whenever the editor uploads one */}
          <video
            controls
            preload="none"
            playsInline
            poster={posterUrl}
            title={title}
            className="size-full bg-surface-inverse object-contain"
          >
            <source src={src} type="video/mp4" />
            {captions && (
              <track kind="captions" src={captions} srcLang="en" label="English" default />
            )}
          </video>
        </div>
      )
    }
  } else {
    const video = parseVideoUrl(stegaClean(url))
    if (video) {
      const provider = PROVIDER_NAMES[video.provider]
      frame = (
        <div className={frameClass}>
          <LazyFacade video={{ src: embedUrl(video), title: title ?? 'Video', provider }}>
            {image}
          </LazyFacade>
        </div>
      )
      // Without JavaScript the button does nothing; a link to the video's own page still works.
      fallback = (
        <noscript>
          <a href={watchUrl(video)} className="mt-3 inline-block text-small underline">
            Watch “{title}” on {provider}
          </a>
        </noscript>
      )
    }
  }

  return (
    <>
      {frame}
      {fallback}
    </>
  )
}
