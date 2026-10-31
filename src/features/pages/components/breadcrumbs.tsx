import Link from 'next/link'

import { JsonLd } from '@/components/ui/json-ld'
import { siteUrl } from '@/config/site-url'
import { graph } from '@/lib/structured-data/graph'
import { buildBreadcrumb } from '@/lib/structured-data/nodes/breadcrumb'

import type { Breadcrumb } from '../utils/breadcrumbs'

/** Visible breadcrumb trail plus its schema.org BreadcrumbList. */
export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (items.length === 0) return null

  return (
    <>
      <JsonLd
        data={graph(
          buildBreadcrumb({
            url: new URL(items[items.length - 1]?.path ?? '/', siteUrl).toString(),
            items: items.map(({ name, path }) => ({
              name,
              url: new URL(path, siteUrl).toString(),
            })),
          }),
        )}
      />
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-5xl px-gutter pt-6 text-small text-ink-muted"
      >
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {items.map(({ name, path }, i) => {
            const isLast = i === items.length - 1
            return (
              <li key={path} className="flex items-center gap-x-2">
                {isLast ? (
                  <span aria-current="page" className="font-medium text-ink">
                    {name}
                  </span>
                ) : (
                  <>
                    <Link href={path} className="underline underline-offset-2 hover:text-ink">
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
