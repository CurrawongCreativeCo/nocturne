import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../types'

export function Testimonials({ data }: SectionProps<'testimonials'>) {
  const { title, items } = data

  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-24">
        {title && (
          <h2 className="mx-auto mb-16 max-w-2xl text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>
        )}
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item._key}>
              <figure className="flex h-full flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
                <blockquote className="flex-1 text-lg text-pretty text-gray-800">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  <SanityImage
                    image={item.avatar}
                    width={48}
                    height={48}
                    className="size-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    {item.role && <div className="text-sm text-gray-600">{item.role}</div>}
                  </div>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
