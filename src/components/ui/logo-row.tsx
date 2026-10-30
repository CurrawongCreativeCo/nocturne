import type { SanityImageData } from '@/types/sanity'

import { SanityImage } from './sanity-image'

interface LogoData {
  _key: string
  name: string
  image: SanityImageData | null
}

interface Props {
  /** One to six logos (the schema's `logoRow`). */
  logos: readonly LogoData[]
  /** Grey and quiet (the default), or in the logos' own colours. */
  greyscale?: boolean
  /** Centre the logos when the hero's text is centred. */
  centred?: boolean
  className?: string
}

/**
 * Up to six logos in a quiet row with no section around it, made to sit inside another section (the
 * hero's supporting slot, README "Adding a slot block"). Each logo is a fixed height so a mixed set
 * lines up, and the row wraps on a narrow screen. Greyscale logos are also dimmed so they sit behind
 * the heading, not beside it. The company's name is the alt text.
 */
export function LogoRow({ logos, greyscale = true, centred = false, className = '' }: Props) {
  if (logos.length === 0) return null

  return (
    <ul
      data-logo-row
      className={`flex flex-wrap items-center gap-x-8 gap-y-5 ${centred ? 'justify-center' : ''} ${className}`.trim()}
    >
      {logos.map((logo) => (
        <li key={logo._key}>
          <SanityImage
            image={logo.image}
            alt={logo.name}
            height={32}
            className={`h-8 w-auto object-contain ${greyscale ? 'opacity-70 grayscale' : ''}`}
          />
        </li>
      ))}
    </ul>
  )
}
