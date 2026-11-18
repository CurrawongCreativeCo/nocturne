import { SanityImage } from '@/components/ui/sanity-image'
import type { SanityImageData } from '@/types/sanity'

/**
 * The service page's picture: 16:9, requested from the CDN at 1200 x 675 with the card's corners. A stored crop and
 * hotspot ("Adjust picture", task 177) reach it through the URL builder, which serves exactly the area the editor shows
 * (`servedRect`); nothing stored is the centred cut it always was. Its own component so the design capability evidence
 * draws the element the page draws.
 */
export function ServicePicture({ image }: { image: SanityImageData | null | undefined }) {
  return (
    <SanityImage
      image={image}
      width={1200}
      height={675}
      preload
      sizes="(min-width: 768px) 50vw, 100vw"
      className="aspect-video w-full rounded-card object-cover"
    />
  )
}
