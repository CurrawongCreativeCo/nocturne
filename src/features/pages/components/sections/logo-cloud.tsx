import { stegaClean } from 'next-sanity'

import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../types'

export function LogoCloud({ data }: SectionProps<'logoCloud'>) {
  const { title, logos } = data

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      {title && <h2 className="text-center text-sm font-semibold text-gray-600">{title}</h2>}
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
        {logos.map((logo) => {
          const img = (
            <SanityImage
              image={logo.image}
              alt={logo.name}
              height={40}
              className="h-10 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
            />
          )
          return (
            <li key={logo._key}>
              {logo.url ? (
                <a href={stegaClean(logo.url)} target="_blank" rel="noopener noreferrer">
                  {img}
                </a>
              ) : (
                img
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
