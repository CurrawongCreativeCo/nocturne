import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { Suspense, type ComponentProps } from 'react'

import { segmentsToSlug } from '@/config/paths'
import { MembersOnly } from '@/features/auth/components/members-only'
import { FormView } from '@/features/forms/components/form-view'
import { NewsletterView } from '@/features/forms/components/newsletter-view'
import { getPageMetadata, getPageStaticParams } from '@/features/pages/api/get-page'
import { DraftPageView, PageView } from '@/features/pages/components/page-view'
import { ReturningVisitor } from '@/features/personalization/components/returning-visitor'
import { CheckoutButton } from '@/features/pricing/components/checkout-button'
import { getLocationBusiness } from '@/features/site/api/get-location-business'
import { getDraftFetchMode, PUBLISHED } from '@/lib/sanity/live'

/** Forms are their own feature; this route is where the page builder meets them. */
const renderForm: ComponentProps<typeof PageView>['renderForm'] = (form, headingId) => (
  <FormView form={form} headingId={headingId} />
)

/** The newsletter signup is a forms feature too. */
const renderNewsletter: ComponentProps<typeof PageView>['renderNewsletter'] = (request) => (
  <NewsletterView {...request} />
)

/** Payments are their own feature too: each pricing table plan gets its checkout button from it. */
const renderCheckout: ComponentProps<typeof PageView>['renderCheckout'] = (request) => (
  <CheckoutButton {...request} />
)

/**
 * Panels are their own feature too: the page hands over the panels its buttons open, and a panel's
 * form comes from the forms feature.
 */
/**
 * Imported on demand, so the overlay's client code is referenced only by pages that render panels:
 * a static import here puts it in every page's scripts (the home page's JavaScript budget).
 */
async function PanelsView({
  panels,
}: {
  panels: Parameters<NonNullable<ComponentProps<typeof PageView>['renderPanels']>>[0]
}) {
  const { PanelHost } = await import('@/features/panels/components/panel-host')
  return <PanelHost panels={panels} renderForm={(form) => <FormView form={form} />} />
}

const renderPanels: ComponentProps<typeof PageView>['renderPanels'] = (panels) => (
  <PanelsView panels={panels} />
)

/** Auth is its own feature too: members-only pages and sections check the session through it. */
const renderMembersGate: ComponentProps<typeof PageView>['renderMembersGate'] = (props) => (
  <MembersOnly {...props} />
)

/**
 * Optional catch-all (`[[...slug]]`) so one route serves "/" and every nested path.
 *
 * Rendering paths:
 *  - Published: fully cached, prerendered at build for known slugs, rendered once
 *    on first request for new ones. <SanityLive /> expires entries on publish.
 *  - Draft mode: request-time options (perspective, stega) are read inside
 *    <Suspense> and passed into the same cached fetch as cache-key arguments.
 */
type Props = PageProps<'/[[...slug]]'>

export const generateStaticParams = getPageStaticParams

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return getPageMetadata(segmentsToSlug((await params).slug), await parent)
}

export default async function Page({ params }: Props) {
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DraftPage params={params} />
      </Suspense>
    )
  }

  return (
    <PageView
      slug={segmentsToSlug((await params).slug)}
      greeting={<ReturningVisitor />}
      renderForm={renderForm}
      renderCheckout={renderCheckout}
      renderNewsletter={renderNewsletter}
      renderPanels={renderPanels}
      // Location sections show Business info; it is the settings entry the footer already fetched.
      business={await getLocationBusiness(PUBLISHED)}
      renderMembersGate={renderMembersGate}
      {...PUBLISHED}
    />
  )
}

async function DraftPage({ params }: Pick<Props, 'params'>) {
  const business = await getLocationBusiness(await getDraftFetchMode())
  return (
    <DraftPageView
      slug={segmentsToSlug((await params).slug)}
      greeting={<ReturningVisitor />}
      renderForm={renderForm}
      renderCheckout={renderCheckout}
      renderNewsletter={renderNewsletter}
      renderPanels={renderPanels}
      business={business}
      renderMembersGate={renderMembersGate}
    />
  )
}
