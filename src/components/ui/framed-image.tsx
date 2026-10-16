import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { LazyParallax } from '@/components/motion/parallax-lazy'
import {
  forcedAspect,
  resolveImageDesign,
  type ImageAppearance,
  type ImageDesignContext,
  type ImageDesignInput,
} from '@/lib/sanity/image-design-options'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import type { SanityImageData } from '@/types/sanity'

import { ImageFrame } from './image-frames'
import { SanityImage } from './sanity-image'

/** Full class names, so Tailwind's scanner sees them. `standard` is the site's card corner. */
const SHAPE_CLASS: Record<ImageAppearance, string> = {
  standard: 'rounded-card',
  rounded: 'rounded-3xl',
  square: '',
  circle: 'rounded-full',
  arch: 'rounded-t-full',
  framed: 'rounded-card',
}

const ASPECT_CLASS = {
  '1/1': 'aspect-square',
  '4/5': 'aspect-[4/5]',
  '4/3': 'aspect-[4/3]',
  '3/2': 'aspect-[3/2]',
  '16/9': 'aspect-video',
} as const
type Aspect = keyof typeof ASPECT_CLASS

interface Props {
  image: SanityImageData | null | undefined
  /** The section's `imageDesign`, as the query returns it. Empty is a plain picture. */
  design?: ImageDesignInput | null
  /** What `design` means beside it: an older shape, a section's own Parallax, a first section. */
  context?: ImageDesignContext
  /** Required: the width the picture is drawn at. */
  sizes: string
  /** Set on the page's first image (LCP): it is requested at once and never lazy. */
  preload?: boolean
  loading?: 'lazy' | 'eager'
  /** The width requested from the image CDN (the picture's intrinsic ratio gives the height). */
  width?: number
  height?: number
  /** Overrides the editor-supplied alt text. */
  alt?: string
  /**
   * The picture's ratio. A circle (1:1) and an arch (4:5) force their own. Unset, a plain picture
   * keeps the shape of its upload and a framed or moving one is 4:3.
   */
  aspect?: Aspect
  /** Its place in the layout (width, max width, `justify-self`), on the outer box. */
  className?: string
  /** Classes for the <img>, e.g. a hover zoom. */
  imageClassName?: string
  /** Always draw the box and its clip, even for a plain picture (a hover zoom must not spill out of its shape). */
  clip?: boolean
}

/**
 * The one picture treatment: a still frame and a picture that moves gently inside it.
 *
 *   box          the ratio and place in the layout (and the corners of a plain picture)
 *     clip       the shape; clips whatever is inside it
 *       picture  scaled up a little, and moved by Parallax: the only thing that moves
 *     frame      a decorative SVG over it, still, ignoring the pointer, hidden from assistive technology
 *
 * With no motion and no frame it is exactly a plain <img> with its shape, so a default picture looks
 * as it always did. The picture keeps its alt text, `sizes`, hotspot and preload. It is scaled by
 * twice its travel (components/motion/image-travel.ts), only for visitors who allow motion and have
 * JavaScript on, so reduced motion and no JavaScript get the still, unscaled picture and its frame.
 */
export function FramedImage({
  image,
  design,
  context,
  sizes,
  preload,
  loading,
  width,
  height,
  alt,
  aspect,
  className = '',
  imageClassName = '',
  clip = false,
}: Props) {
  const { shape, motion, frame } = resolveImageDesign(stegaClean(design), context)
  const ratio = forcedAspect(shape) ?? aspect
  const shapeClass = SHAPE_CLASS[shape]
  const style = { objectPosition: hotspotObjectPosition(image) }

  if (!motion && !frame && !clip) {
    return (
      <SanityImage
        image={image}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        preload={preload}
        loading={loading}
        className={`w-full object-cover ${ratio ? ASPECT_CLASS[ratio] : ''} ${shapeClass} ${className} ${imageClassName}`
          .replace(/\s+/g, ' ')
          .trim()}
        style={style}
      />
    )
  }

  const picture = (
    <SanityImage
      image={image}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      loading={loading}
      className={`object-cover ${imageClassName}`.trim()}
      style={style}
    />
  )

  return (
    <div
      data-framed-image={shape}
      className={`relative ${ASPECT_CLASS[ratio ?? '4/3']} ${className}`.trim()}
    >
      {/* `isolate` keeps a rounded clip honest in Safari while the picture inside is transformed. */}
      <div className={`absolute inset-0 isolate overflow-hidden bg-surface-alt ${shapeClass}`}>
        {motion ? (
          <LazyParallax speed={motion.speed} from={motion.from} className="absolute inset-0">
            <div
              data-framed-image-picture=""
              style={
                {
                  '--framed-scale': motion.scalePhone,
                  '--framed-scale-md': motion.scale,
                } as CSSProperties
              }
              // `scripting: enabled` is false without JavaScript, so that visitor gets the unscaled picture.
              className="absolute inset-0 motion-safe:[@media(scripting:enabled)]:scale-(--framed-scale) md:motion-safe:[@media(scripting:enabled)]:scale-(--framed-scale-md)"
            >
              {picture}
            </div>
          </LazyParallax>
        ) : (
          picture
        )}
      </div>
      {frame ? <ImageFrame frame={frame} /> : null}
    </div>
  )
}
