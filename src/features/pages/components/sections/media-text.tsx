import { stegaClean } from 'next-sanity'

import { travelForSpeed } from '@/components/motion/image-travel'
import { CtaGroup } from '@/components/ui/cta-link'
import { FramedImage } from '@/components/ui/framed-image'
import { RichHeading } from '@/components/ui/rich-heading'
import { RichText } from '@/components/ui/rich-text'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import type { SectionProps } from '../../types'

export function MediaText({ data, isFirst }: SectionProps<'mediaText'>) {
  const { eyebrow, heading, body, ctas, image, imagePosition } = data
  const title = sectionTitle(data)
  const imageFirst = stegaClean(imagePosition) === 'left'
  // Without an image, a two-column grid would squeeze the text into one half.
  const hasImage = Boolean(image?.asset)
  const defaults: SectionDefaults = {
    container: hasImage ? 'max-w-content' : 'max-w-measure',
    align: 'start',
  }
  const { tone, text, justify } = sectionTraits(data.style, defaults)

  return (
    <SectionFrame
      style={data.style}
      defaults={defaults}
      isFirst={isFirst}
      // Swap the columns on wide screens by order, so the text stays first in the reading order.
      // The picture moves inside its still frame, so the frame is not wrapped in the section's Parallax:
      // the section's own preset is passed down and used while the picture's Motion is None.
      media={(parallax) => (
        <FramedImage
          image={image}
          design={data.imageDesign}
          context={{
            isFirst,
            sectionTravel: parallax ? travelForSpeed(parallax.speed) : undefined,
          }}
          width={1200}
          sizes="(min-width: 1024px) 50vw, 100vw"
          aspect="4/3"
        />
      )}
      containerClassName={`grid items-center gap-12 lg:gap-16 ${hasImage ? 'lg:grid-cols-2' : ''} ${imageFirst ? 'lg:[&>:first-child]:order-2 lg:[&>:last-child]:order-1' : ''}`}
    >
      <div className={text}>
        {eyebrow && (
          <p className="text-small font-semibold tracking-wide text-accent-text uppercase">
            {eyebrow}
          </p>
        )}
        <RichHeading
          as="h2"
          blocks={heading}
          fallback={title}
          className="mt-2 text-h2 font-semibold text-balance"
        />
        <RichText value={body} className="mt-4 text-lead text-ink-muted" />
        <CtaGroup ctas={ctas} surface={ctaSurfaceFor(tone)} className={`mt-8 ${justify}`} />
      </div>
    </SectionFrame>
  )
}
