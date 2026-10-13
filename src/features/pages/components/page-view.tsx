import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'

import { slugToPath } from '@/config/paths'
import { isMembersOnly } from '@/lib/sanity/access'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { Breadcrumbs } from './breadcrumbs'
import { SectionRenderer } from './section-renderer'
import { getBreadcrumbs, getPage, getRedirect } from '../api/get-page'
import type {
  PageSection,
  RenderMembersGate,
  SectionGate,
  SectionProps,
  SectionType,
} from '../types'
import { hasContent } from '../utils/section-content'

interface ViewProps {
  slug: string
  /** Request-time content for sections (see `SectionProps.greeting`). */
  greeting?: ReactNode
  /** Draws forms in form sections (see `SectionProps.renderForm`). */
  renderForm?: SectionProps<SectionType>['renderForm']
  /** Draws the checkout buttons in pricing tables (see `SectionProps.renderCheckout`). */
  renderCheckout?: SectionProps<SectionType>['renderCheckout']
  renderNewsletter?: SectionProps<SectionType>['renderNewsletter']
  /**
   * Guards members-only pages and sections with the visitor's session. Required, so a route can't
   * forget it: without one, members-only content would have nothing to check against.
   */
  renderMembersGate: RenderMembersGate
}

export async function PageView({
  slug,
  greeting,
  renderForm,
  renderCheckout,
  renderNewsletter,
  renderMembersGate,
  ...mode
}: ViewProps & FetchMode) {
  // Draft mode is only reachable by editors signed in to Studio, who preview members-only content too.
  const preview = mode.stega
  const page = await getPage({ slug, members: preview, ...mode })
  if (!page) {
    // Old URLs from a previous site: redirects are managed in Studio.
    const match = await getRedirect(slugToPath(slug))
    if (match) (match.permanent ? permanentRedirect : redirect)(match.destination)
    notFound()
  }

  const callbackUrl = slugToPath(slug)
  const breadcrumbs = <Breadcrumbs items={await getBreadcrumbs(slug)} />

  // A members-only page has no content here (see PAGE_QUERY): it is fetched once the session is checked.
  if (isMembersOnly(page.access) && !preview) {
    return (
      <>
        {breadcrumbs}
        <Suspense fallback={null}>
          {renderMembersGate({
            callbackUrl,
            headingLevel: 1,
            content: async () => {
              const full = await getPage({ slug, members: true, ...mode })
              if (!full) return null
              return (
                <PageContent
                  title={full.title}
                  documentId={full._id}
                  documentType={full._type}
                  sections={full.pageBuilder ?? []}
                  editable={false}
                  greeting={greeting}
                  renderForm={renderForm}
                  renderCheckout={renderCheckout}
                  renderNewsletter={renderNewsletter}
                />
              )
            },
          })}
        </Suspense>
      </>
    )
  }

  return (
    <>
      {breadcrumbs}
      <PageContent
        title={page.title}
        documentId={page._id}
        documentType={page._type}
        sections={page.pageBuilder ?? []}
        editable={mode.stega}
        greeting={greeting}
        renderForm={renderForm}
        renderCheckout={renderCheckout}
        renderNewsletter={renderNewsletter}
        // Members-only sections stay stubs here and are filled in behind the gate, one by one.
        gate={
          preview
            ? undefined
            : {
                callbackUrl,
                render: renderMembersGate,
                load: async (key) => {
                  const full = await getPage({ slug, members: true, ...mode })
                  const section = full?.pageBuilder?.find((candidate) => candidate._key === key)
                  return section && hasContent(section) ? section : undefined
                },
              }
        }
      />
    </>
  )
}

interface ContentProps {
  title: string
  documentId: string
  documentType: string
  sections: PageSection[]
  editable: boolean
  greeting?: ReactNode
  renderForm?: ViewProps['renderForm']
  renderCheckout?: ViewProps['renderCheckout']
  renderNewsletter?: ViewProps['renderNewsletter']
  gate?: SectionGate
}

function PageContent({ title, sections, gate, ...rest }: ContentProps) {
  // Every page needs exactly one <h1>. A leading public hero provides it; otherwise use the page
  // title, visually hidden so the design is unchanged. A members-only hero may be locked, so it
  // doesn't count (it is rendered as a plain section, see SectionRenderer).
  const first = sections[0]
  const startsWithHero = first?._type === 'hero' && !(gate && isMembersOnly(first.access))

  return (
    <>
      {!startsWithHero && <h1 className="sr-only">{title}</h1>}
      <SectionRenderer sections={sections} gate={gate} {...rest} />
    </>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftPageView({
  slug,
  greeting,
  renderForm,
  renderCheckout,
  renderNewsletter,
  renderMembersGate,
}: ViewProps) {
  const mode = await getDraftFetchMode()
  return (
    <PageView
      slug={slug}
      greeting={greeting}
      renderForm={renderForm}
      renderCheckout={renderCheckout}
      renderNewsletter={renderNewsletter}
      renderMembersGate={renderMembersGate}
      {...mode}
    />
  )
}
