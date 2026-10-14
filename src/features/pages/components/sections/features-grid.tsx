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
    <section className="mx-auto max-w-content px-gutter py-section">
      {(title || intro) && (
        <header className="mx-auto mb-16 max-w-measure-narrow text-center">
          {title && <h2 className="text-h2 font-semibold text-balance">{title}</h2>}
          {intro && <p className="mt-4 text-lead text-pretty text-ink-muted">{intro}</p>}
        </header>
      )}
      <ul className={`grid grid-cols-1 gap-x-8 gap-y-12 ${columnClasses[columns]}`}>
        {items.map((item) => (
          <li key={item._key}>
            <SanityImage
              image={item.icon}
              alt=""
              width={48}
              height={48}
              className="mb-4 size-12 object-contain"
            />
            <h3 className="text-lead font-semibold">{item.title}</h3>
            {item.text && <p className="mt-2 text-ink-muted">{item.text}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
