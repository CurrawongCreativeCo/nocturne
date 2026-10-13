import type { ACTIVE_EXPERIMENT_QUERY_RESULT } from '@/types/sanity.types'

/** The running experiment, as ACTIVE_EXPERIMENT_QUERY returns it (and /api/experiments serves it). */
export type Experiment = NonNullable<ACTIVE_EXPERIMENT_QUERY_RESULT>
