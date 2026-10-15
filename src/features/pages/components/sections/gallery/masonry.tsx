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
  2: 'columns-1 sm:columns-2',
  3: 'columns-1 sm:columns-2 lg:columns-3',
  4: 'columns-1 sm:columns-2 lg:columns-4',
} as const

/**
 * CSS columns, so no script lays it out. They fill top to bottom, then left to right: the tab order
 * (and a screen reader's) is still the editor's order, which the eye reads down each column.
 */
export function GalleryMasonry({ data, isFirst }: SectionProps<'gallery'>) {
  const { images } = data
  const columns = columnCount(data)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <GalleryHeader data={data} />
      <LightboxProvider images={images} label={galleryLabel(data)}>
        <ul className={`gap-4 ${columnClasses[columns]}`}>
          {images.map((image, i) => (
            <li key={image._key} className="mb-4 break-inside-avoid">
              <Thumbnail
                image={image}
                index={i}
                total={images.length}
                eager={isFirst && i < columns}
                sizes={columnSizes(columns)}
                className="group block w-full overflow-hidden rounded-card bg-surface-alt"
              />
            </li>
          ))}
        </ul>
      </LightboxProvider>
    </SectionFrame>
  )
}
