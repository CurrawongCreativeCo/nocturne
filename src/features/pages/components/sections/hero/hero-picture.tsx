import { MotionDiv } from '@/components/motion/motion-elements'
import { ParallaxImage } from '@/components/motion/parallax-image'
import { partEnterProps, type PartPlan } from '@/components/motion/part-motion'
import { SanityImage } from '@/components/ui/sanity-image'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import type { SanityImageData } from '@/types/sanity'

interface Props {
  image: SanityImageData | null | undefined
  /** The hero's `image` part (`resolveHeroParts`). */
  plan: PartPlan | undefined
  isFirst: boolean
  width: number
  sizes: string
  /** The <img>'s whole class list when the picture does not animate: its place in the layout and its shape. */
  className: string
  /** Animated, the same classes are split: where the picture sits (on its frame)... */
  frameClassName: string
  /** ...and what it looks like (on the <img>). */
  imageClassName: string
}

/**
 * The picture beside a hero's text (Split, Editorial's small one), as its `image` part says. Still, it
 * is exactly the plain <img>. An entrance animates a frame around it, so the picture's own shape (corners,
 * crop) is untouched, and Parallax drifts it inside a clipped frame of the same shape.
 */
export function HeroPicture({
  image,
  plan,
  isFirst,
  width,
  sizes,
  className,
  frameClassName,
  imageClassName,
}: Props) {
  const style = { objectPosition: hotspotObjectPosition(image) }

  if (plan?.kind === 'parallax') {
    return (
      <div className={`relative isolate overflow-hidden ${className}`}>
        <ParallaxImage
          image={image}
          preload={isFirst}
          sizes={sizes}
          speed={plan.speed}
          from={plan.from}
          className="object-cover"
        />
      </div>
    )
  }
  if (plan?.kind === 'enter') {
    return (
      <MotionDiv {...partEnterProps(plan)} className={frameClassName}>
        <SanityImage
          image={image}
          width={width}
          preload={isFirst}
          sizes={sizes}
          className={imageClassName}
          style={style}
        />
      </MotionDiv>
    )
  }
  return (
    <SanityImage
      image={image}
      width={width}
      preload={isFirst}
      sizes={sizes}
      className={className}
      style={style}
    />
  )
}
