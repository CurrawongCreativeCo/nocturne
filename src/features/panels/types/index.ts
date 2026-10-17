import type { StegaBranded } from 'next-sanity'

import type { PAGE_QUERY_RESULT } from '@/types/sanity.types'

/** A panel as PAGE_QUERY returns it (drafts carry edit markers). */
export type PanelData = StegaBranded<NonNullable<NonNullable<PAGE_QUERY_RESULT>['panels']>[number]>

/** One block of a panel's content. */
export type PanelBlock = NonNullable<PanelData['content']>[number]

/** A form inside a panel: what `renderForm` draws. */
export type PanelFormData = NonNullable<Extract<PanelBlock, { _type: 'panelForm' }>['form']>
