import { SanityImage } from '@/components/ui/sanity-image'
import type { SanityImageData } from '@/types/sanity'

import { LazyParallax } from './parallax-lazy'

interface Props {
  image: SanityImageData | null | undefined
  /** Required, as for any `fill` image: the width it is drawn at. */
  sizes: string
  /** Set on the page's first image (LCP): it is requested at once and never lazy. */
  preload?: boolean
  alt?: string
  /** See Parallax. */
  speed?: number
  from?: 'viewport' | 'top'
  /** Classes for the <img>, e.g. `object-cover opacity-40`. */
  className?: string
}

/**
 * A picture that fills its positioned parent and moves behind it as the page scrolls. The frame
 * clips it; the picture is scaled by exactly twice the range it travels (from Parallax's CSS
 * variables), so an edge never shows. Scaling is CSS and only under `prefers-reduced-motion:
 * no-preference`, so the server HTML already matches what every visitor ends up seeing: a
 * plain filled picture for reduced motion and no JavaScript, a slightly larger one otherwise.
 */
export function ParallaxImage({
  image,
  sizes,
  preload,
  alt,
  speed = 0.25,
  from,
  className = '',
}: Props) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <LazyParallax speed={speed} from={from} className="absolute inset-0">
        <div className="absolute inset-0 motion-safe:scale-[calc(1+2*var(--parallax-amount)*var(--parallax-factor))]">
          <SanityImage
            image={image}
            alt={alt}
            fill
            preload={preload}
            sizes={sizes}
            className={className}
          />
        </div>
      </LazyParallax>
    </div>
  )
}
