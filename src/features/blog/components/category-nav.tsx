import Link from 'next/link'
import { stegaClean } from 'next-sanity'

import { BLOG_PATH, categoryPath } from '@/config/paths'

interface Props {
  categories: { title: string; slug: string }[]
  /** Slug of the category being viewed; null on the main blog page. */
  current: string | null
}

const pill = 'rounded-pill border px-4 py-1.5 text-small font-medium'
const idle = 'border-line text-ink hover:bg-surface-alt'
const active = 'border-ink bg-surface-inverse text-ink-inverse'

/** Filter links: "All" plus each category that has a post. Renders nothing when there are none. */
export function CategoryNav({ categories, current }: Props) {
  if (categories.length === 0) return null

  return (
    <nav aria-label="Blog categories" className="mt-8">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={BLOG_PATH}
            aria-current={current === null ? 'page' : undefined}
            className={`${pill} ${current === null ? active : idle}`}
          >
            All
          </Link>
        </li>
        {categories.map(({ title, slug }) => {
          const isCurrent = stegaClean(slug) === current
          return (
            <li key={slug}>
              <Link
                href={categoryPath(stegaClean(slug))}
                aria-current={isCurrent ? 'page' : undefined}
                className={`${pill} ${isCurrent ? active : idle}`}
              >
                {title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
