import { notFound } from 'next/navigation'

import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { TeamMemberPage } from './team-member-page'
import { getTeamMember } from '../api/team-member'

export async function TeamMemberView({ slug, ...mode }: { slug: string } & FetchMode) {
  const member = await getTeamMember({ slug, ...mode })
  if (!member) notFound()
  return <TeamMemberPage member={member} />
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftTeamMemberView({ slug }: { slug: string }) {
  return <TeamMemberView slug={slug} {...await getDraftFetchMode()} />
}
