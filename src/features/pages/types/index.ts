import type { StegaBranded } from 'next-sanity'
import type { ReactNode } from 'react'

import type { PAGE_QUERY_RESULT } from '@/types/sanity.types'

/**
 * Frontend-facing types derived from TypeGen output. Never hand-write a shape
 * that a query already describes — derive it here so schema changes propagate.
 */
export type PageData = StegaBranded<NonNullable<PAGE_QUERY_RESULT>>

/**
 * Every page-builder section as the page query returns it, keyed on `_type`. A members-only section
 * comes back as a bare stub (just its key, type and `access`) until the visitor's session is checked.
 */
export type PageSection = NonNullable<PageData['pageBuilder']>[number]
export type SectionType = PageSection['_type']

/** The fields every section has, content or not. A stub has no others. */
type StubKeys = '_key' | '_type' | 'access' | 'sharedSectionId'
type WithContent<S> = S extends unknown
  ? [Exclude<keyof S, StubKeys>] extends [never]
    ? never
    : S
  : never

/** A section with its content: what a section component renders and `load` returns after the session check. */
export type FullSection = WithContent<PageSection>
export type SectionOf<T extends SectionType> = Extract<FullSection, { _type: T }>

/**
 * What a route supplies to guard members-only content (the auth feature, which this one can't
 * import). Render the result inside <Suspense>: it reads the session. `content` runs only once the
 * visitor is signed in, so it is the one place members-only content may be fetched.
 */
export interface MembersGateProps {
  /** Where sign-in should send the visitor back to: a path on this site. */
  callbackUrl: string
  /** 1 when the gate stands in for a whole page, 2 for a section. */
  headingLevel: 1 | 2
  content: () => Promise<ReactNode>
}
export type RenderMembersGate = (props: MembersGateProps) => ReactNode

/** How SectionRenderer unlocks the members-only sections of a public page. */
export interface SectionGate {
  callbackUrl: string
  render: RenderMembersGate
  /** Fetches one section's content by `_key`. Call it only from a gate's `content`. */
  load: (key: string) => Promise<FullSection | undefined>
}

/** A form a `formSection` references. */
export type SectionForm = NonNullable<SectionOf<'formSection'>['form']>

/** What a pricing table plan asks the route's checkout button to draw. */
export interface CheckoutRequest {
  /** Stripe price id, already cleaned of edit markers: it is submitted as is. */
  priceId: string
  label: string
  /** The plan's name, so each button can tell screen readers which plan it buys. */
  planName: string
  highlighted: boolean
}

/** What a newsletter signup section asks the route's signup form to draw. */
export interface NewsletterRequest {
  submitLabel: string
  /** Shown in place of the form after signing up. */
  successMessage: string
  /** Id of the section's heading, which names the form for screen readers. */
  headingId?: string
}

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
  /** Draws a plan's checkout button. Payments are another feature, so the route supplies it. */
  renderCheckout?: (request: CheckoutRequest) => ReactNode
  /** Draws a newsletter signup form. It belongs to the forms feature, so the route supplies it. */
  renderNewsletter?: (request: NewsletterRequest) => ReactNode
}
