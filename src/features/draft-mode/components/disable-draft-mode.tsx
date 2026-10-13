'use client'

import { usePathname } from 'next/navigation'
import { useIsPresentationTool } from 'next-sanity/hooks'

/** Exit button for draft mode, hidden inside the Presentation tool (which manages it). */
export function DisableDraftMode() {
  const isPresentationTool = useIsPresentationTool()
  const pathname = usePathname()
  if (isPresentationTool !== false) return null

  return (
    // Plain <a>: <Link> would prefetch the route handler and could exit draft mode on hover.

    <aside aria-label="Draft mode">
      <a
        href={`/api/draft-mode/disable?redirect=${encodeURIComponent(pathname)}`}
        className="fixed right-4 bottom-4 z-50 rounded-full bg-gray-950 px-4 py-2 text-sm text-white shadow-lg focus-visible:outline-white"
      >
        Exit preview
      </a>
    </aside>
  )
}
