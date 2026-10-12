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

  // Every page needs exactly one <h1>. A leading hero provides it; otherwise use the page title,
  // visually hidden so the design is unchanged.
  const startsWithHero = page.pageBuilder?.[0]?._type === 'hero'

  return (
    <>
      {!startsWithHero && <h1 className="sr-only">{page.title}</h1>}
      <SectionRenderer
        documentId={page._id}
        documentType={page._type}
        sections={page.pageBuilder}
        editable={mode.stega}
      />
    </>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftPageView({ slug }: { slug: string }) {
  const mode = await getDraftFetchMode()
  return <PageView slug={slug} {...mode} />
}
