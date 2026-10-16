import { stegaClean } from 'next-sanity'

import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'

import { LazyAmbientPlayer } from './ambient-player-lazy'
import type { SectionProps } from '../../../types'

// Like the hero's Full background layout: words over a dimmed picture on the dark tone.
const DEFAULTS: SectionDefaults = {
  tone: 'inverse',
  spacing: 'spacious',
  container: 'max-w-4xl',
  align: 'center',
}

/** Words over a silent looping video (the poster under reduced motion or without JavaScript), with a Pause button. */
export function VideoAmbient({ data, isFirst }: SectionProps<'video'>) {
  const { title, text, poster } = data
  const src = stegaClean(data.fileUrl)
  const { text: textAlign } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      className="overflow-hidden"
      containerClassName={textAlign}
      background={
        src ? (
          <LazyAmbientPlayer src={src} className="opacity-40">
            <SanityImage
              image={poster}
              fill
              preload={isFirst}
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: hotspotObjectPosition(poster) }}
            />
          </LazyAmbientPlayer>
        ) : undefined
      }
    >
      <h2 className="text-h2 font-semibold text-balance">{title}</h2>
      {text && <p className="mt-4 text-lead text-pretty text-ink-muted">{text}</p>}
    </SectionFrame>
  )
}
