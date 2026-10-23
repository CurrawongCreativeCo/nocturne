import { buttonFeedback } from '@/components/ui/cta-link'
import { SanityLink } from '@/components/ui/sanity-link'
import { ringSurfaceLook } from '@/lib/sanity/surface-options'
import { textLook } from '@/lib/sanity/text-style-options'

import { LinkIcon, LinkItem, linkShadow } from './link-design'
import { LinkListView } from './link-list-parts'
import { type LinkListLayout } from './link-list-types'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep `align` equal to the Compact preset's.
const DEFAULTS = { container: 'max-w-measure-narrow', spacing: 'compact', align: 'start' } as const

const PILL = `inline-flex min-h-10 items-center gap-2 rounded-pill px-4 text-ink ${buttonFeedback}`
const SURFACE = {
  background: 'bg-surface hover:bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
}
// Pills have no eyebrow or description: only the label's look applies.
const LABEL = { size: 'text-small', weight: 'medium' } as const
const ICON = { shape: 'plain', background: '', border: '' } as const

const layout: LinkListLayout = {
  defaults: DEFAULTS,
  profile: {
    picture: {
      box: { small: 'size-12', medium: 'size-16', large: 'size-24' },
      height: { small: 'h-12', medium: 'h-16', large: 'h-24' },
    },
    name: 'text-h4',
  },
  // Wraps; the section's alignment decides whether the pills sit left or centred.
  listClassName: 'flex flex-wrap gap-2 [text-align:inherit]',
  renderLink: (link, context) => {
    const { design } = context
    const depth = linkShadow(context, 'none')
    const look = ringSurfaceLook(design.surface, SURFACE)
    const label = textLook(design.label, LABEL)
    return (
      <LinkItem link={link} style={[depth.style, look.style, label.style]}>
        <SanityLink
          link={link.link}
          className={`${PILL} ${label.className} ${look.className} ${depth.className}`}
        >
          <LinkIcon
            link={link}
            design={design.icon}
            own={ICON}
            box="-ml-2 size-7"
            iconClass="size-4"
          />
          {link.label}
        </SanityLink>
      </LinkItem>
    )
  },
}

/** Compact: small pills that wrap, for tucking into another page. Descriptions and large links aren't shown. */
export function LinkListCompact(props: SectionProps<'linkList'>) {
  return <LinkListView {...props} layout={layout} />
}
