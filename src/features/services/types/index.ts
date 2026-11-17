import type { StegaBranded } from 'next-sanity'

import type { SERVICE_QUERY_RESULT } from '@/types/sanity.types'

/**
 * Frontend-facing types derived from TypeGen output. Never hand-write a shape
 * that a query already describes — derive it here so schema changes propagate.
 */
type ServiceResult = StegaBranded<NonNullable<SERVICE_QUERY_RESULT>>

/** A service as its page shows it: `getService` guarantees the slug and a (possibly empty) list of locations. */
export type ServiceData = ServiceResult & {
  slug: string
  locations: NonNullable<ServiceResult['locations']>
}
