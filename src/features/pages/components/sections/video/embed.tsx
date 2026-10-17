import { stegaClean } from 'next-sanity'

import { RichHeading } from '@/components/ui/rich-heading'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import {
  PROVIDER_NAMES,
  aspectClass,
  embedUrl,
  parseVideoUrl,
  watchUrl,
} from '@/features/pages/utils/video-source'
import { urlFor } from '@/lib/sanity/image'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import { sectionTitle } from '@/lib/sanity/section-title'

import type { SectionProps } from '../../../types'
import { LazyFacade } from '../lazy-facade'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'start' }

/** Chrome for the frame, whatever it holds. */
const FRAME = 'relative overflow-hidden rounded-card bg-surface-alt'

/**
 * A poster with a Play button. YouTube and Vimeo load their player only on the click (the facade);
 * an uploaded MP4 is a native <video> that fetches nothing until played.
 */
export function VideoEmbed({ data, isFirst }: SectionProps<'video'>) {
  const { heading, text, poster, fileUrl, captionsUrl } = data
  const title = sectionTitle(data)
  const source = stegaClean(data.source) ?? 'youtube'
  const { text: textAlign } = sectionTraits(data.style, DEFAULTS)
  const frameClass = `${FRAME} ${aspectClass(stegaClean(data.aspectRatio))}`
  const image = (
    <SanityImage
      image={poster}
      fill
      preload={isFirst}
      sizes="(min-width: 1280px) 1200px, 100vw"
      className="object-cover"
      style={{ objectPosition: hotspotObjectPosition(poster) }}
    />
  )

  let frame: React.ReactNode = <div className={frameClass}>{image}</div>
  let fallback: React.ReactNode = null

  if (source === 'upload') {
    const src = stegaClean(fileUrl)
    const captions = stegaClean(captionsUrl)
    const posterUrl = poster.asset
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
    const video = parseVideoUrl(stegaClean(data.url))
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
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      containerClassName={textAlign}
    >
      <RichHeading
        as="h2"
        blocks={heading}
        fallback={title}
        className="text-h2 font-semibold text-balance"
      />
      {text && (
        <p className="mt-4 max-w-measure-narrow text-lead text-pretty text-ink-muted">{text}</p>
      )}
      <div className="mt-8 text-left">
        {frame}
        {fallback}
      </div>
    </SectionFrame>
  )
}
