import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { hasTeamProfiles } from '@/config/profile'
import { getTeamMemberMetadata, getTeamStaticParams } from '@/features/team/api/team-member'
import { DraftTeamMemberView, TeamMemberView } from '@/features/team/components/team-member-view'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * A team member's own page. Rendered like blog posts (see app/(site)/blog/[slug]/page.tsx):
 * published members are cached and prerendered at build; draft mode reads its options inside
 * <Suspense>. Answers 404 when the site profile has no team profiles, and for an unknown slug.
 */
type Props = PageProps<'/team/[slug]'>

export const generateStaticParams = getTeamStaticParams

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  if (!hasTeamProfiles()) notFound()
  return getTeamMemberMetadata((await params).slug, await parent)
}

export default async function TeamMemberPage({ params }: Props) {
  if (!hasTeamProfiles()) notFound()
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DraftMember params={params} />
      </Suspense>
    )
  }

  return <TeamMemberView slug={(await params).slug} {...PUBLISHED} />
}

async function DraftMember({ params }: Pick<Props, 'params'>) {
  return <DraftTeamMemberView slug={(await params).slug} />
}
