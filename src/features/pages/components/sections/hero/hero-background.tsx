import { LazyFloat } from '@/components/motion/float-lazy'
import { MotionDiv } from '@/components/motion/motion-elements'
import { ParallaxImage } from '@/components/motion/parallax-image'
import { partEnterProps, type PartPlan } from '@/components/motion/part-motion'
import { SanityImage } from '@/components/ui/sanity-image'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import type { SanityImageData } from '@/types/sanity'

import { backgroundImageClass } from './background-class'

/**
 * The picture behind a hero's text, moved by the hero's `background` part (`resolveHeroParts`): the
 * section's Parallax or Float, or the part's own preset (README, "Animating individual parts"). The
 * section must clip it (`overflow-hidden`). A floating picture is drawn a little larger than its frame
 * so the drift never shows an edge.
 */
export function HeroBackground({
  image,
  plan,
  isFirst,
  className,
}: {
  image: SanityImageData | null | undefined
  plan: PartPlan | undefined
  isFirst: boolean
  /** Classes for the <img>, e.g. `object-cover opacity-40`. */
  className: string
}) {
  if (plan?.kind === 'parallax') {
    return (
      <ParallaxImage
        image={image}
        preload={isFirst}
        sizes="100vw"
        speed={plan.speed}
        from={plan.from}
        className={className}
      />
    )
  }

  const picture = (
    <SanityImage
      image={image}
      fill
      preload={isFirst}
      sizes="100vw"
      className={backgroundImageClass(plan?.kind === 'float', className)}
      style={{ objectPosition: hotspotObjectPosition(image) }}
    />
  )
  if (plan?.kind === 'float') {
    return (
      <LazyFloat
        distancePx={plan.distancePx}
        durationMs={plan.durationMs}
        className="absolute -inset-5 -z-10"
      >
        {picture}
      </LazyFloat>
    )
  }
  // The entrance moves a frame, so the picture keeps its own classes (the scrim's opacity among them).
  return plan?.kind === 'enter' ? (
    <MotionDiv {...partEnterProps(plan)} className="absolute inset-0 -z-10">
      <SanityImage
        image={image}
        fill
        preload={isFirst}
        sizes="100vw"
        className={className}
        style={{ objectPosition: hotspotObjectPosition(image) }}
      />
    </MotionDiv>
  ) : (
    picture
  )
}
