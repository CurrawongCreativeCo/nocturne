import type { Metadata, ResolvingMetadata } from 'next'
import type { ComponentProps } from 'react'

import { segmentsToSlug } from '@/config/paths'
import { MembersOnly } from '@/features/auth/components/members-only'
import {
  getExperimentCodes,
  resolveExperimentCode,
} from '@/features/experiments/api/get-experiment'
import { FormView } from '@/features/forms/components/form-view'
import { NewsletterView } from '@/features/forms/components/newsletter-view'
import { getPageMetadata, getPageStaticParams } from '@/features/pages/api/get-page'
import { PageView } from '@/features/pages/components/page-view'
import { ReturningVisitor } from '@/features/personalization/components/returning-visitor'
import { CheckoutButton } from '@/features/pricing/components/checkout-button'
import { getLocationBusiness } from '@/features/site/api/get-location-business'
import { PUBLISHED } from '@/lib/sanity/live'

const renderForm: ComponentProps<typeof PageView>['renderForm'] = (form, headingId) => (
  <FormView form={form} headingId={headingId} />
)

/** The newsletter signup is a forms feature too. */
const renderNewsletter: ComponentProps<typeof PageView>['renderNewsletter'] = (request) => (
  <NewsletterView {...request} />
)

/** Panels are their own feature too: the page hands over the panels its buttons open. */
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

/** Payments are their own feature too: each pricing table plan gets its checkout button from it. */
const renderCheckout: ComponentProps<typeof PageView>['renderCheckout'] = (request) => (
  <CheckoutButton {...request} />
)

/** Auth is its own feature too: members-only pages and sections check the session through it. */
const renderMembersGate: ComponentProps<typeof PageView>['renderMembersGate'] = (props) => (
  <MembersOnly {...props} />
)

/**
 * A page prerendered for one A/B option. Visitors never type this URL: proxy.ts rewrites
 * "/about" to "/ab/<code>/about" once they're assigned an option, so each option is rendered
 * once and cached like any published page. The variant is part of the cached fetch's key.
 */
type Props = PageProps<'/ab/[code]/[[...slug]]'>

/** Placeholder used when nothing is running: Cache Components fails the build on an empty list. */
const NO_EXPERIMENT_CODE = 'none'

export async function generateStaticParams() {
  const codes = await getExperimentCodes()
  if (codes.length === 0) return [{ code: NO_EXPERIMENT_CODE, slug: [] }]

  const pages = await getPageStaticParams()
  return codes.flatMap((code) => pages.map(({ slug }) => ({ code, slug })))
}

// The SEO data is the same for every option, so this reuses the published page's cache entry.
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return getPageMetadata(segmentsToSlug((await params).slug), await parent)
}

export default async function ExperimentPage({ params }: Props) {
  const { code, slug } = await params
  const resolved = await resolveExperimentCode(code)

  return (
    <PageView
      slug={segmentsToSlug(slug)}
      greeting={<ReturningVisitor />}
      renderForm={renderForm}
      renderCheckout={renderCheckout}
      renderNewsletter={renderNewsletter}
      renderPanels={renderPanels}
      business={await getLocationBusiness(PUBLISHED)}
      renderMembersGate={renderMembersGate}
      variant={resolved?.variant}
      {...PUBLISHED}
    />
  )
}
