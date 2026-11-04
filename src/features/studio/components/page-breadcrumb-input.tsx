import { Stack } from '@sanity/ui'
import { useEffect, useState } from 'react'
import { useDocumentStore, useFormValue, type ObjectInputProps } from 'sanity'
import { IntentLink } from 'sanity/router'

import { PageBreadcrumb, type BreadcrumbLink } from './page-breadcrumb'
import { buildBreadcrumb, type BreadcrumbPage } from '../utils/page-breadcrumb'

// Every page's slug in one listener, so typing in the slug field never restarts it: the segments are
// worked out from the current slug on each render.
const QUERY = '*[_type == "page"]{_id, "slug": slug.current}'

const EditLink: BreadcrumbLink = ({ id, children }) => (
  <IntentLink intent="edit" params={{ id, type: 'page' }}>
    {children}
  </IntentLink>
)

/** Root input for `page` documents: the page's place in the site, then the usual form. */
export function PageBreadcrumbInput(props: ObjectInputProps) {
  const documentStore = useDocumentStore()
  const slug = useFormValue(['slug', 'current']) as string | undefined
  const [pages, setPages] = useState<BreadcrumbPage[]>([])

  useEffect(() => {
    const subscription = documentStore.listenQuery(QUERY, {}, {}).subscribe({
      next: (result: BreadcrumbPage[] | null) => {
        setPages(result ?? [])
      },
      // Without the list, ancestors show as plain text; the form itself is unaffected.
      error: () => {
        setPages([])
      },
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [documentStore])

  const segments = buildBreadcrumb(slug, pages)
  if (!segments) return props.renderDefault(props)
  return (
    <Stack>
      <PageBreadcrumb segments={segments} Link={EditLink} />
      {props.renderDefault(props)}
    </Stack>
  )
}
