import type { StegaBranded } from 'next-sanity'
import type { ReactNode } from 'react'

import type { PAGE_QUERY_RESULT } from '@/types/sanity.types'

/**
 * Frontend-facing types derived from TypeGen output. Never hand-write a shape
 * that a query already describes — derive it here so schema changes propagate.
 */
export type PageData = StegaBranded<NonNullable<PAGE_QUERY_RESULT>>

/** Discriminated union of every page-builder section, keyed on `_type`. */
export type PageSection = NonNullable<PageData['pageBuilder']>[number]
export type SectionType = PageSection['_type']
export type SectionOf<T extends SectionType> = Extract<PageSection, { _type: T }>

/** A form a `formSection` references. */
export type SectionForm = NonNullable<SectionOf<'formSection'>['form']>

/** Props contract every section component implements. */
export interface SectionProps<T extends SectionType> {
  data: SectionOf<T>
  /**
   * First section on the page: the place for the page's <h1> and its above-the-fold image
   * (preloaded for LCP). Sections further down use <h2> and lazy images.
   */
  isFirst?: boolean
  /**
   * Request-time content a route passes in (a feature can't import another feature). Render it
   * inside <Suspense>: it may read cookies, which would otherwise make the page dynamic.
   */
  greeting?: ReactNode
  /**
   * Draws a form. Forms are another feature, which this one can't import, so the route supplies
   * the renderer. Give `headingId` the id of the section's heading to name the form.
   */
  renderForm?: (form: SectionForm, headingId?: string) => ReactNode
}
