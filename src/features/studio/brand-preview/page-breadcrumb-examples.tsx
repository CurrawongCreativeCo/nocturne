import { Stack, Text } from '@sanity/ui'

import { PageBreadcrumb, type BreadcrumbLink } from '../components/page-breadcrumb'
import type { BreadcrumbSegment } from '../utils/page-breadcrumb'

const Link: BreadcrumbLink = ({ id, children }) => <a href={`#${id}`}>{children}</a>

const EXAMPLES: { id: string; label: string; width: number; segments: BreadcrumbSegment[] }[] = [
  {
    id: 'nested',
    label: 'Nested page',
    width: 560,
    segments: [
      { label: 'services', id: 'services' },
      { label: 'web', id: 'services-web' },
      { label: 'web-design', current: true },
    ],
  },
  {
    id: 'missing',
    label: 'Missing ancestor',
    width: 560,
    segments: [{ label: 'services' }, { label: 'web-design', current: true }],
  },
  {
    id: 'narrow',
    label: 'Narrow pane',
    width: 300,
    segments: [
      { label: 'services', id: 'services' },
      { label: 'web', id: 'services-web' },
      { label: 'web-design', current: true },
    ],
  },
]

/** The page breadcrumb as an editor sees it: wide, with a missing ancestor, and in a narrow pane. */
export function PageBreadcrumbExamples() {
  return (
    <Stack gap={4}>
      {EXAMPLES.map(({ id, label, width, segments }) => (
        <Stack key={id} gap={2} data-breadcrumb-example={id} style={{ maxWidth: width }}>
          <Text size={1} muted>
            {label}
          </Text>
          <PageBreadcrumb segments={segments} Link={Link} />
        </Stack>
      ))}
    </Stack>
  )
}
