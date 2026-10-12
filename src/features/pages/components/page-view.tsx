import { notFound, permanentRedirect, redirect } from 'next/navigation'

import { slugToPath } from '@/config/paths'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { SectionRenderer } from './section-renderer'
import { getPage, getRedirect } from '../api/get-page'

export async function PageView({ slug, ...mode }: { slug: string } & FetchMode) {
  const page = await getPage({ slug, ...mode })
  if (!page) {
    // Old URLs from a previous site: redirects are managed in Studio.
    const match = await getRedirect(slugToPath(slug))
    if (match) (match.permanent ? permanentRedirect : redirect)(match.destination)
    notFound()
  }

  return (
    <SectionRenderer
      documentId={page._id}
      documentType={page._type}
      sections={page.pageBuilder}
      editable={mode.stega}
    />
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftPageView({ slug }: { slug: string }) {
  const mode = await getDraftFetchMode()
  return <PageView slug={slug} {...mode} />
}
