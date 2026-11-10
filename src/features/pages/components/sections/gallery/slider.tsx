import { SectionFrame } from '@/components/ui/section-frame'
import { LazySlider } from '@/components/ui/slider-lazy'
import { resolvePictureDepth } from '@/lib/sanity/depth-options'

import { LightboxProvider } from './lightbox-provider'
import {
  columnCount,
  columnSizes,
  DEFAULTS,
  galleryLabel,
  GalleryHeader,
  Thumbnail,
} from './shared'
import type { SectionProps } from '../../../types'

/**
 * How far a tile's shadow may reach beyond the slides (px), measured in a browser (task 147). The sides take the
 * most the 24px page gutter and slide gap allow (22: wider would scroll the page or show the next slide's edge),
 * so a Floating shadow with a Strong glow still leaves a faint tail at the first and last slide's outer edge
 * there. The top and bottom cost nothing (the viewport is pulled back by what it grows by, the controls draw over
 * it), and 36px above and 72px below take the fade down to under 3/255: with less, a faint pale rectangle shows.
 */
const SHADOW_BLEED = { x: 22, top: 36, bottom: 72 } as const

export function GallerySlider({ data, isFirst }: SectionProps<'gallery'>) {
  const { images } = data
  const columns = columnCount(data)
  const label = galleryLabel(data)
  const depth = resolvePictureDepth(data.pictureDepthDesign)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <GalleryHeader data={data} />
      <LightboxProvider images={images} label={label}>
        <LazySlider
          label={label}
          perView={{ base: 1, sm: 2, lg: columns }}
          gap
          // A tile's shadow reaches past the slider's own 12px; only a slider that has one asks for the room.
          bleed={depth ? SHADOW_BLEED : false}
        >
          {images.map((image, i) => (
            <Thumbnail
              key={image._key}
              image={image}
              index={i}
              total={images.length}
              fill
              eager={isFirst && i < columns}
              sizes={columnSizes(columns)}
              design={data.imageDesign}
              depth={depth}
              className="group relative block w-full"
            />
          ))}
        </LazySlider>
      </LightboxProvider>
    </SectionFrame>
  )
}
