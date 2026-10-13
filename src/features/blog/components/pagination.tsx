import Link from 'next/link'

import { pagePath } from '../utils/pagination'

interface Props {
  /** Path of page 1, e.g. "/blog". Other pages add `?page=N`. */
  basePath: string
  page: number
  totalPages: number
}

const linkClass =
  'rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100'

export function Pagination({ basePath, page, totalPages }: Props) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Pagination" className="mt-16 grid grid-cols-3 items-center gap-4">
      <div>
        {page > 1 && (
          <Link href={pagePath(basePath, page - 1)} rel="prev" className={linkClass}>
            <span aria-hidden>← </span>Previous
          </Link>
        )}
      </div>
      <p className="text-center text-sm text-gray-600">
        Page {page} of {totalPages}
      </p>
      <div className="text-right">
        {page < totalPages && (
          <Link href={pagePath(basePath, page + 1)} rel="next" className={linkClass}>
            Next<span aria-hidden> →</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
