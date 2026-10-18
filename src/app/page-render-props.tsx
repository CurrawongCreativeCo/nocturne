import type { ComponentProps } from 'react'

import { MembersOnly } from '@/features/auth/components/members-only'
import { FormView } from '@/features/forms/components/form-view'
import { NewsletterView } from '@/features/forms/components/newsletter-view'
import type { PageView } from '@/features/pages/components/page-view'
import { CheckoutButton } from '@/features/pricing/components/checkout-button'

/**
 * Where the page builder meets the features it can't import itself (forms, payments, panels, auth):
 * `src/app` composes them and hands them to `PageView` as render props. The pre-launch view uses
 * this one set; the main page route and the A/B route still carry their own identical copies.
 */

type Props = ComponentProps<typeof PageView>

const renderForm: Props['renderForm'] = (form, headingId) => (
  <FormView form={form} headingId={headingId} />
)

/** The newsletter signup is a forms feature too. */
const renderNewsletter: Props['renderNewsletter'] = (request) => <NewsletterView {...request} />

/** Payments are their own feature too: each pricing table plan gets its checkout button from it. */
const renderCheckout: Props['renderCheckout'] = (request) => <CheckoutButton {...request} />

/**
 * Panels are their own feature too. Imported on demand, so the overlay's client code is referenced
 * only by pages that render panels (the home page's JavaScript budget).
 */
async function PanelsView({
  panels,
}: {
  panels: Parameters<NonNullable<Props['renderPanels']>>[0]
}) {
  const { PanelHost } = await import('@/features/panels/components/panel-host')
  return <PanelHost panels={panels} renderForm={(form) => <FormView form={form} />} />
}

const renderPanels: Props['renderPanels'] = (panels) => <PanelsView panels={panels} />

/** Auth is its own feature too: members-only pages and sections check the session through it. */
const renderMembersGate: Props['renderMembersGate'] = (props) => <MembersOnly {...props} />

export const pageRenderProps = {
  renderForm,
  renderCheckout,
  renderNewsletter,
  renderPanels,
  renderMembersGate,
} satisfies Partial<Props>
