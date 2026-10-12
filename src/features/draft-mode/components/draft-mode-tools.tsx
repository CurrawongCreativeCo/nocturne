'use client'

import dynamic from 'next/dynamic'

/**
 * Visual Editing overlays plus the "Exit preview" button. Both are lazy-loaded so their
 * dependencies (~200 KB gzipped of Studio messaging code) download only when draft mode
 * renders this component; a static import would ship them to every visitor.
 */
const VisualEditing = dynamic(() => import('next-sanity/visual-editing').then((m) => m.VisualEditing), { ssr: false })
const DisableDraftMode = dynamic(() => import('./disable-draft-mode').then((m) => m.DisableDraftMode), { ssr: false })

export function DraftModeTools() {
  return (
    <>
      <VisualEditing />
      <DisableDraftMode />
    </>
  )
}
