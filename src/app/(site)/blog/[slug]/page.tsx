import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { Suspense } from 'react'

import { getPostMetadata, getPostStaticParams } from '@/features/blog/api/get-posts'
import { DraftPostView, PostView } from '@/features/blog/components/post-view'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * A blog post. Rendered like CMS pages (see app/(site)/[[...slug]]/page.tsx): published posts are
 * cached and prerendered at build; draft mode reads its options inside <Suspense>.
 */
type Props = PageProps<'/blog/[slug]'>

export const generateStaticParams = getPostStaticParams

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return getPostMetadata((await params).slug, await parent)
}

export default async function PostPage({ params }: Props) {
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DraftPost params={params} />
      </Suspense>
    )
  }

  return <PostView slug={(await params).slug} {...PUBLISHED} />
}

async function DraftPost({ params }: Pick<Props, 'params'>) {
  return <DraftPostView slug={(await params).slug} />
}
