import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { LazyParallax } from '@/components/motion/parallax-lazy'
import type { ElementDepth } from '@/lib/sanity/depth-options'
import {
  aspectValue,
  reserveStyle,
  resolveImageDesign,
  type ImageDesignContext,
  type ImageDesignInput,
} from '@/lib/sanity/image-design-options'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import { appearanceCorner, type FrameCorner } from '@/lib/sanity/image-frame-geometry'
import { isFramed } from '@/lib/sanity/image-framing'
import type { SanityImageData } from '@/types/sanity'

import { ImageFrame, ShapeOutline } from './image-frames'
import { SanityImage } from './sanity-image'

/** Full class names, so Tailwind's scanner sees them, for the corner each shape is cut with (`appearanceCorner`). */
const CORNER_CLASS: Record<FrameCorner, string> = {
  none: '',
  card: 'rounded-card',
  control: 'rounded-control',
  rounded: 'rounded-3xl',
  circle: 'rounded-full',
  arch: 'rounded-t-full',
}

const ASPECT_CLASS = {
  '1/1': 'aspect-square',
  '4/5': 'aspect-[4/5]',
  '3/4': 'aspect-[3/4]',
  '2/3': 'aspect-[2/3]',
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
   * The picture's ratio. A circle (1:1) and an arch (4:5, or its chosen ratio) force their own.
   * Unset, a plain picture keeps the shape of its upload and a framed or moving one is 4:3.
   */
  aspect?: Aspect
  /**
   * Serve what "Adjust picture" shows (task 177): when the image stores a crop or hotspot, the CDN
   * is asked for exactly that area at the box's ratio (`visibleArea`, as SanityImage's `placement`),
   * so the page and the editor agree. A picture with neither keeps today's URL and centred cut.
   */
  framing?: boolean
  /** Its place in the layout (width, max width, `justify-self`), on the outer box. */
  className?: string
  /** Classes for the <img>, e.g. a hover zoom. */
  imageClassName?: string
  /** Always draw the box and its clip, even for a plain picture (a hover zoom must not spill out of its shape). */
  clip?: boolean
  /**
   * Picture depth (task 147, `resolvePictureDepth`): a drop-shadow filter and glow. It goes on the
   * still outer box, never the picture that moves inside it, so the shadow follows the whole visible
   * picture (its shape and frame) and stays put under Parallax. A plain picture, which has no box,
   * takes it on the <img>. Undefined adds nothing: the markup is exactly what it was.
   */
  depth?: ElementDepth | undefined
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
  depth,
  framing = false,
}: Props) {
  const resolved = resolveImageDesign(stegaClean(design), { ...context, aspect: aspect ?? '4/3' })
  const { shape, motion, frame, outline, reach } = resolved
  const ratio = resolved.ratio ?? aspect
  const shapeClass = CORNER_CLASS[appearanceCorner(shape)]
  // The editor's area, served at the drawn ratio: the CDN cuts it, so nothing is left to position.
  const boxRatio = ratio ?? (motion || frame || clip ? '4/3' : undefined)
  const placement =
    framing && boxRatio && isFramed(stegaClean(image))
      ? { aspect: aspectValue(boxRatio) }
      : undefined
  const style = {
    objectPosition: placement ? undefined : hotspotObjectPosition(image),
    ...depth?.style,
  }

  if (!motion && !frame && !clip) {
    return (
      <SanityImage
        image={image}
        alt={alt}
        width={width}
        height={height}
        placement={placement}
        sizes={sizes}
        preload={preload}
        loading={loading}
        className={`w-full object-cover ${ratio ? ASPECT_CLASS[ratio] : ''} ${shapeClass} ${className} ${imageClassName} ${depth?.className ?? ''}`
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
      placement={placement}
      sizes={sizes}
      preload={preload}
      loading={loading}
      className={`object-cover ${imageClassName}`.trim()}
      style={{ objectPosition: style.objectPosition }}
    />
  )

  // A Simple, Double or Offset frame follows Rounded, Circle and Arch; the offset one sits under the picture.
  const shaped = frame?.kind === 'preset' && outline === 'shape' ? frame : null
  const under = shaped?.preset === 'offset-border'
  const frameLayer = shaped ? (
    <ShapeOutline frame={shaped} shape={shape} />
  ) : frame ? (
    <ImageFrame frame={frame} />
  ) : null

  const box = (
    <div
      data-framed-image={shape}
      className={`relative ${ASPECT_CLASS[ratio ?? '4/3']} ${reach ? '' : className} ${depth?.className ?? ''}`
        .replace(/\s+/g, ' ')
        .trim()}
      style={reach ? { ...depth?.style, ...reserveStyle(reach) } : depth?.style}
    >
      {under ? frameLayer : null}
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
      {under ? null : frameLayer}
    </div>
  )

  // A frame that reaches past the picture gets that room inside the space the layout gives it, so it
  // never runs into a neighbour (task 177). The wrapper takes the layout's classes and holds the margins.
  if (!reach) return box
  return (
    <div data-frame-room="" className={`flow-root ${className}`.trim()}>
      {box}
    </div>
  )
}
