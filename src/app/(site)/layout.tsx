import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity/visual-editing'

import { DisableDraftMode } from '@/features/draft-mode/components/disable-draft-mode'
import { SanityLive } from '@/lib/sanity/live'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <>
      <main>{children}</main>
      {/* Subscribes to Content Lake changes and expires matching cache tags. */}
      <SanityLive includeDrafts={isDraftMode} />
      {isDraftMode && (
        <>
          <VisualEditing />
          <DisableDraftMode />
        </>
      )}
    </>
  )
}
