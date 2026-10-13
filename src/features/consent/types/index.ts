import type { SETTINGS_QUERY_RESULT } from '@/types/sanity.types'

/** The editable banner text from Site settings → Cookie banner. Every field is optional; the banner has defaults. */
export type ConsentCopy = NonNullable<NonNullable<SETTINGS_QUERY_RESULT>['consent']>
