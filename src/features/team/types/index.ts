import type { StegaBranded } from 'next-sanity'

import type { TEAM_MEMBER_QUERY_RESULT } from '@/types/sanity.types'

/**
 * Frontend-facing types derived from TypeGen output. Never hand-write a shape
 * that a query already describes — derive it here so schema changes propagate.
 */
/** A member as their page shows them: `getTeamMember` guarantees the slug. */
export type TeamMemberData = StegaBranded<NonNullable<TEAM_MEMBER_QUERY_RESULT>> & { slug: string }
