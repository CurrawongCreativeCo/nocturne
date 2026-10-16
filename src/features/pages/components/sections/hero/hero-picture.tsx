import { travelForSpeed } from '@/components/motion/image-travel'
import { MotionDiv } from '@/components/motion/motion-elements'
import { partEnterProps, type PartPlan } from '@/components/motion/part-motion'
import { FramedImage } from '@/components/ui/framed-image'
import type { ImageAppearance, ImageDesignInput } from '@/lib/sanity/image-design-options'
import type { SanityImageData } from '@/types/sanity'

interface Props {
  image: SanityImageData | null | undefined
  /** The hero's `image` part (`resolveHeroParts`). */
  plan: PartPlan | undefined
  /** The hero's `imageDesign`: shape, motion inside the frame and decorative frame. */
  design: ImageDesignInput | null | undefined
  /** The shape while the design names none: the hero's older "Image shape". */
  fallbackShape: ImageAppearance
  isFirst: boolean
  /** The picture's ratio (a circle and an arch force their own). */
  aspect: '4/3' | '1/1'
  width: number
  sizes: string
  /** The picture's box when it does not animate: its place in the layout and its size limits. */
  className: string
  /** Animated, the same classes are split: where the picture sits (on its frame)... */
  frameClassName: string
  /** ...and how big it may get (on the picture's own box). */
  imageClassName: string
}

/**
 * The picture beside a hero's text (Split, Editorial's small one), as its `image` part says. Its shape,
 * motion and decorative frame are the shared FramedImage's, so there is one implementation for every
 * picture. Still, it is exactly the plain <img>. An entrance animates a wrapper around it, so the
 * picture's own shape (corners, crop) is untouched. Parallax, whether the part's or the design's own
 * Motion, drifts the picture inside its still frame.
 */
export function HeroPicture({
  image,
  plan,
  design,
  fallbackShape,
  isFirst,
  aspect,
  width,
  sizes,
  className,
  frameClassName,
  imageClassName,
}: Props) {
  const picture = (classes: string) => (
    <FramedImage
      image={image}
      design={design}
      context={{
        fallbackShape,
        isFirst,
        sectionTravel: plan?.kind === 'parallax' ? travelForSpeed(plan.speed) : undefined,
      }}
      width={width}
      sizes={sizes}
      preload={isFirst}
      // A fixed ratio reserves the space before the picture arrives, whatever the upload's shape;
      // the hotspot decides which part of the picture the crop keeps.
      aspect={aspect}
      className={classes}
    />
  )

  if (plan?.kind === 'enter') {
    return (
      <MotionDiv {...partEnterProps(plan)} className={frameClassName}>
        {picture(imageClassName)}
      </MotionDiv>
    )
  }
  return picture(className)
}
