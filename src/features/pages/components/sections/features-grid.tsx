import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../types'

// Full class names so Tailwind's scanner sees them.
const columnClasses = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const

export function FeaturesGrid({ data }: SectionProps<'featuresGrid'>) {
  const { title, intro, columns, items } = data

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      {(title || intro) && (
        <header className="mx-auto mb-16 max-w-2xl text-center">
          {title && (
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h2>
          )}
          {intro && <p className="mt-4 text-lg text-pretty text-gray-600">{intro}</p>}
        </header>
      )}
      <ul className={`grid grid-cols-1 gap-x-8 gap-y-12 ${columnClasses[columns]}`}>
        {items.map((item) => (
          <li key={item._key}>
            <SanityImage
              image={item.icon}
              width={48}
              height={48}
              className="mb-4 size-12 object-contain"
            />
            <h3 className="text-lg font-semibold">{item.title}</h3>
            {item.text && <p className="mt-2 text-gray-600">{item.text}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
