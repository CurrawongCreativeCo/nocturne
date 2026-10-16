import { SectionFrame } from '@/components/ui/section-frame'
import { LazySlider } from '@/components/ui/slider-lazy'

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

export function GallerySlider({ data, isFirst }: SectionProps<'gallery'>) {
  const { images } = data
  const columns = columnCount(data)
  const label = galleryLabel(data)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <GalleryHeader data={data} />
      <LightboxProvider images={images} label={label}>
        <LazySlider label={label} perView={{ base: 1, sm: 2, lg: columns }} gap>
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
              className="group relative block w-full"
            />
          ))}
        </LazySlider>
      </LightboxProvider>
    </SectionFrame>
  )
}
