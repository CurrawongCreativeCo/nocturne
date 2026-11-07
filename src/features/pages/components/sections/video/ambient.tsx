import { stegaClean } from 'next-sanity'

import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import { LazyAmbientPlayer } from './ambient-player-lazy'
import type { SectionProps } from '../../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

// Like the hero's Full background layout: words over a dimmed picture on the dark tone.
const DEFAULTS: SectionDefaults = {
  tone: 'inverse',
  spacing: 'spacious',
  container: 'max-w-4xl',
  align: 'center',
}

/** Words over a silent looping video (the poster under reduced motion or without JavaScript), with a Pause button. */
export function VideoAmbient({ data, isFirst }: SectionProps<'video'>) {
  const { heading, text, poster } = data
  const title = sectionTitle(data)
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
      <SectionHeader
        as={null}
        eyebrow={data.eyebrow}
        title={title}
        heading={heading}
        intro={text}
        design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
      />
    </SectionFrame>
  )
}
