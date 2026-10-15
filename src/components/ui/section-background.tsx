import { SanityImage } from '@/components/ui/sanity-image'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import { SECTION_OVERLAY_OPACITY } from '@/lib/sanity/section-style-options'

import type { ResolvedSectionStyle, SectionTone } from './section-style'

/** The tone's own background colour, which the overlay lays over the picture (`alt` paints with surface-alt). */
const OVERLAY_CLASS: Record<SectionTone, string> = {
  surface: 'bg-surface',
  alt: 'bg-surface-alt',
  inverse: 'bg-surface',
  accent: 'bg-surface',
}

type Props = Pick<ResolvedSectionStyle, 'tone' | 'gradient' | 'image' | 'overlay'> & {
  /** The first section holds the page's LCP candidates, so its picture loads at once; others are lazy. */
  isFirst: boolean
}

/**
 * The layers behind a section's content, from back to front: the brand gradient, the picture, then
 * the overlay (the tone's colour at the chosen strength, so the tone's text colours keep their
 * contrast). All three are absolutely positioned inside the <section> (which is `relative isolate`),
 * so they take no space and cannot shift the layout. Purely decorative, hence hidden from assistive
 * technology, and the picture has empty alt text. Renders nothing for a section with neither.
 */
export function SectionBackground({ tone, gradient, image, overlay, isFirst }: Props) {
  if (!gradient && !image) return null
  const opacity = SECTION_OVERLAY_OPACITY[overlay]

  return (
    <div
      aria-hidden="true"
      data-section-background=""
      className="absolute inset-0 -z-10 overflow-hidden"
    >
      {gradient ? (
        <div
          data-section-gradient={gradient}
          className="absolute inset-0"
          // An undefined variable (the gradient was removed from Design settings) draws nothing.
          style={{ backgroundImage: `var(--gradient-${gradient})` }}
        />
      ) : null}
      {image ? (
        <>
          <SanityImage
            image={image}
            alt=""
            fill
            preload={isFirst}
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: hotspotObjectPosition(image) }}
          />
          {opacity > 0 ? (
            <div
              data-section-overlay={overlay}
              className={`absolute inset-0 ${OVERLAY_CLASS[tone]}`}
              style={{ opacity }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
