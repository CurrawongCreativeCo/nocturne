import type { StegaBranded } from 'next-sanity'

import type { SERVICE_QUERY_RESULT } from '@/types/sanity.types'

/**
 * Frontend-facing types derived from TypeGen output. Never hand-write a shape
 * that a query already describes — derive it here so schema changes propagate.
 */
/** A service as its page shows it: `getService` guarantees the slug. */
export type ServiceData = StegaBranded<NonNullable<SERVICE_QUERY_RESULT>> & { slug: string }
