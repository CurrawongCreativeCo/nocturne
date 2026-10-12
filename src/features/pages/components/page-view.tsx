import { notFound } from 'next/navigation'

import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { getPage } from '../api/get-page'
import { SectionRenderer } from './section-renderer'

export async function PageView({ slug, ...mode }: { slug: string } & FetchMode) {
  const page = await getPage({ slug, ...mode })
  if (!page) notFound()

  return <SectionRenderer documentId={page._id} documentType={page._type} sections={page.pageBuilder} />
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftPageView({ slug }: { slug: string }) {
  const mode = await getDraftFetchMode()
  return <PageView slug={slug} {...mode} />
}
