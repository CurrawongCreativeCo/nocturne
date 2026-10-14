import { stegaClean } from 'next-sanity'

import { SanityImage } from '@/components/ui/sanity-image'
import { NewTabNotice } from '@/components/ui/sanity-link'

import type { SectionProps } from '../../types'

export function LogoCloud({ data }: SectionProps<'logoCloud'>) {
  const { title, logos } = data

  return (
    <section className="mx-auto max-w-content px-gutter py-section-compact">
      {title && <h2 className="text-center text-small font-semibold text-ink-muted">{title}</h2>}
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
        {logos.map((logo) => {
          const img = (
            <SanityImage
              image={logo.image}
              alt={logo.name}
              height={40}
              className="h-10 w-auto object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0"
            />
          )
          return (
            <li key={logo._key}>
              {logo.url ? (
                <a
                  href={stegaClean(logo.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  {img}
                  <NewTabNotice />
                </a>
              ) : (
                <div className="group">{img}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
