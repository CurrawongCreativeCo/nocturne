import Link from 'next/link'

import { JsonLd } from '@/components/ui/json-ld'
import { siteUrl } from '@/config/site-url'

import type { Breadcrumb } from '../utils/breadcrumbs'

/** Visible breadcrumb trail plus its schema.org BreadcrumbList. */
export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (items.length === 0) return null

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map(({ name, path }, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name,
            item: new URL(path, siteUrl).toString(),
          })),
        }}
      />
      <nav aria-label="Breadcrumb" className="mx-auto max-w-5xl px-6 pt-6 text-sm text-gray-600">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {items.map(({ name, path }, i) => {
            const isLast = i === items.length - 1
            return (
              <li key={path} className="flex items-center gap-x-2">
                {isLast ? (
                  <span aria-current="page" className="font-medium text-gray-900">
                    {name}
                  </span>
                ) : (
                  <>
                    <Link href={path} className="underline underline-offset-2 hover:text-gray-900">
                      {name}
                    </Link>
                    <span aria-hidden>/</span>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
