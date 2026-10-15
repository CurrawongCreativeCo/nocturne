import { LazyFloat } from '@/components/motion/float-lazy'
import { ParallaxImage } from '@/components/motion/parallax-image'
import type { MotionPlan } from '@/components/motion/presets'
import { SanityImage } from '@/components/ui/sanity-image'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import type { SanityImageData } from '@/types/sanity'

/**
 * The picture behind a hero's text, moved by the section's animation when it has Parallax or Float
 * (the plan from `sectionMotion` with `placement: 'background'`). The section must clip it
 * (`overflow-hidden`). A floating picture is drawn a little larger than its frame so the drift
 * never shows an edge.
 */
export function HeroBackground({
  image,
  plan,
  isFirst,
  className,
}: {
  image: SanityImageData | null | undefined
  plan: MotionPlan
  isFirst: boolean
  /** Classes for the <img>, e.g. `object-cover opacity-40`. */
  className: string
}) {
  if (plan.kind === 'parallax') {
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
      className={`${plan.kind === 'float' ? '' : '-z-10'}${className}`}
      style={{ objectPosition: hotspotObjectPosition(image) }}
    />
  )
  return plan.kind === 'float' ? (
    <LazyFloat
      distancePx={plan.distancePx}
      durationMs={plan.durationMs}
      className="absolute -inset-5 -z-10"
    >
      {picture}
    </LazyFloat>
  ) : (
    picture
  )
}
