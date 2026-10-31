import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import { VideoFrame } from './video-frame'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'start' }

/**
 * A poster with a Play button. YouTube and Vimeo load their player only on the click (the facade);
 * an uploaded MP4 is a native <video> that fetches nothing until played (both in `VideoFrame`).
 */
export function VideoEmbed({ data, isFirst }: SectionProps<'video'>) {
  const { heading, text } = data
  const title = sectionTitle(data)
  const { text: textAlign } = sectionTraits(data.style, DEFAULTS)

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
        <PlainText
          text={text}
          className="mt-4 max-w-measure-narrow text-lead text-pretty text-ink-muted"
        />
      )}
      <div className="mt-8 text-left">
        <VideoFrame
          source={data.source}
          url={data.url}
          fileUrl={data.fileUrl}
          captionsUrl={data.captionsUrl}
          poster={data.poster}
          title={title}
          aspectRatio={data.aspectRatio}
          preload={isFirst}
          sizes="(min-width: 1280px) 1200px, 100vw"
        />
      </div>
    </SectionFrame>
  )
}
