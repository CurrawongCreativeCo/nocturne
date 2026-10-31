import { stegaClean } from 'next-sanity'

import { travelForSpeed } from '@/components/motion/image-travel'
import type { ParallaxPlan } from '@/components/motion/presets'
import { CtaGroup } from '@/components/ui/cta-link'
import { FramedImage } from '@/components/ui/framed-image'
import { RichHeading } from '@/components/ui/rich-heading'
import { RichText } from '@/components/ui/rich-text'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { chooseMedia, drawnSplitLayout, videoHasSource } from '@/features/pages/utils/split-layout'
import { sectionTitle } from '@/lib/sanity/section-title'

import { renderSlot } from '../../slots/render-slot'
import type { SectionProps } from '../../types'
import { HeroBackground } from './hero/hero-background'

export function MediaText({ data, isFirst = false }: SectionProps<'mediaText'>) {
  const { eyebrow, heading, body, ctas, imagePosition } = data
  const title = sectionTitle(data)
  const imageFirst = stegaClean(imagePosition) === 'left'

  // The media slot first; a picture saved before the slot existed (`image`) when the block is empty,
  // invalid or unknown (from a later release), so it is never lost. Never both.
  const block = data.media?.[0]
  const blockType = block ? stegaClean(block._type) : undefined
  const blockImage =
    block && blockType === 'slotImage'
      ? (block as Extract<typeof block, { _type: 'slotImage' }>).image
      : undefined
  const blockVideo =
    block && blockType === 'slotVideo'
      ? (block as Extract<typeof block, { _type: 'slotVideo' }>)
      : undefined
  const choice = chooseMedia(
    {
      type: blockType,
      hasPicture: Boolean(blockImage?.asset),
      hasVideoSource: blockVideo
        ? videoHasSource({
            source: stegaClean(blockVideo.source),
            url: blockVideo.url,
            fileUrl: blockVideo.fileUrl,
          })
        : false,
    },
    Boolean(data.image?.asset),
  )
  const video = choice === 'block-video' ? blockVideo : undefined
  const image =
    choice === 'block-image' ? blockImage : choice === 'legacy-image' ? data.image : undefined
  const hasPicture = choice === 'block-image' || choice === 'legacy-image'
  const hasMedia = choice !== null
  const supporting = renderSlot({ item: data.supporting?.[0], centred: false, animate: false })

  const layout = drawnSplitLayout(
    stegaClean(data.variant),
    hasPicture ? 'image' : video ? 'video' : null,
  )
  const overlay = layout === 'overlay'
  const stacked = layout === 'stacked'

  // Without media, a two-column grid would squeeze the text into one half.
  const defaults: SectionDefaults = overlay
    ? { tone: 'inverse', spacing: 'spacious', container: 'max-w-content', align: 'start' }
    : {
        container: hasMedia && !stacked ? 'max-w-content' : 'max-w-measure',
        align: stacked ? 'center' : 'start',
      }
  const { tone, text, justify } = sectionTraits(data.style, defaults)

  const copy = (
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
      {overlay && supporting && <div className="mt-8">{supporting}</div>}
    </div>
  )

  // Text over media: the picture is the section's background, under the text and its panel.
  if (overlay) {
    return (
      <SectionFrame
        style={data.style}
        defaults={defaults}
        isFirst={isFirst}
        className="overflow-hidden"
        background={
          <HeroBackground
            image={image}
            plan={undefined}
            isFirst={isFirst}
            className="object-cover opacity-40"
          />
        }
      >
        {copy}
      </SectionFrame>
    )
  }

  const picture = (parallax: ParallaxPlan | undefined) =>
    video ? (
      renderSlot({ item: video, centred: stacked, animate: false })
    ) : (
      // The picture moves inside its still frame, so the frame is not wrapped in the section's Parallax:
      // the section's own preset is passed down and used while the picture's Motion is None.
      <FramedImage
        image={image}
        design={data.imageDesign}
        context={{
          isFirst,
          sectionTravel: parallax ? travelForSpeed(parallax.speed) : undefined,
        }}
        width={1200}
        sizes={stacked ? '(min-width: 1024px) 1100px, 100vw' : '(min-width: 1024px) 50vw, 100vw'}
        aspect={stacked ? '16/9' : '4/3'}
      />
    )

  return (
    <SectionFrame
      style={data.style}
      defaults={defaults}
      isFirst={isFirst}
      // Swap the columns on wide screens by order, so the text stays first in the reading order.
      // Stacked puts the media above the text the same way. The supporting block sits under the media.
      media={(parallax) =>
        supporting ? (
          <div className="space-y-8">
            {picture(parallax)}
            {supporting}
          </div>
        ) : (
          picture(parallax)
        )
      }
      containerClassName={
        stacked
          ? 'flex flex-col gap-12 lg:gap-16 [&>:last-child]:order-first'
          : `grid items-center gap-12 lg:gap-16 ${hasMedia || supporting ? 'lg:grid-cols-2' : ''} ${imageFirst ? 'lg:[&>:first-child]:order-2 lg:[&>:last-child]:order-1' : ''}`
      }
    >
      {copy}
    </SectionFrame>
  )
}
