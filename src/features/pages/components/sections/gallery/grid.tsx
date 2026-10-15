import { SectionFrame } from '@/components/ui/section-frame'

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

// Full class names so Tailwind's scanner sees them.
const columnClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
} as const

export function GalleryGrid({ data, isFirst }: SectionProps<'gallery'>) {
  const { images } = data
  const columns = columnCount(data)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <GalleryHeader data={data} />
      <LightboxProvider images={images} label={galleryLabel(data)}>
        <ul className={`grid gap-4 ${columnClasses[columns]}`}>
          {images.map((image, i) => (
            <li key={image._key}>
              <Thumbnail
                image={image}
                index={i}
                total={images.length}
                fill
                eager={isFirst && i < columns}
                sizes={columnSizes(columns)}
                className="group relative block aspect-4/3 w-full overflow-hidden rounded-card bg-surface-alt"
              />
            </li>
          ))}
        </ul>
      </LightboxProvider>
    </SectionFrame>
  )
}
