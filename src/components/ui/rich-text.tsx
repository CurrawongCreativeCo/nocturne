import { PortableText, type PortableTextComponents, type PortableTextProps } from 'next-sanity'
import type { CSSProperties } from 'react'

import { DecorativeDivider } from '@/components/ui/decorative-divider'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink, type LinkData } from '@/components/ui/sanity-link'
import type { TextRole } from '@/lib/design/capabilities'
import { resolveDivider } from '@/lib/sanity/divider-options'
import type { SanityImageData } from '@/types/sanity'

/**
 * Renders `blockContent` (queried with `portableTextFields`). Styles live here rather
 * than in a typography plugin so each block type is easy to find and change.
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="my-4 leading-relaxed">{children}</p>,
    h2: ({ children }) => <h2 className="mt-10 mb-4 text-h2 font-semibold">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-8 mb-3 text-h3 font-semibold">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-6 mb-2 text-lead font-semibold">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-accent pl-4 text-lead text-ink-muted italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>,
    number: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>,
  },
  marks: {
    code: ({ children }) => (
      <code className="rounded-sm bg-surface-alt px-1.5 py-0.5 font-mono text-small">
        {children}
      </code>
    ),
    link: ({ value, children }) => (
      <SanityLink
        link={value as LinkData}
        className="font-medium text-accent-text underline underline-offset-2"
      >
        {children}
      </SanityLink>
    ),
  },
  types: {
    image: ({ value }) => (
      <figure className="my-8">
        <SanityImage
          image={value as SanityImageData}
          width={1200}
          sizes="(min-width: 768px) 768px, 100vw"
          className="rounded-control"
        />
        {(value as { caption?: string }).caption && (
          <figcaption className="mt-2 text-small text-ink-muted">
            {(value as { caption?: string }).caption}
          </figcaption>
        )}
      </figure>
    ),
  },
}

/**
 * A divider block in the body (task 151: the Rich text section's `richTextBody`). It owns 24px above and
 * below (`my-6`), so the block on each side gives up its own margin on that side whatever it is (a paragraph's
 * `my-4`, a heading's `mt-10`, a figure's `my-8`): the block after it loses its top margin and the block
 * before it its bottom margin. Every margin beside the divider is then 0 or the divider's 24px, so the gap
 * is the same whether or not margins collapse. Added only when a divider draws, so a body with none is
 * unchanged. Full class names, so Tailwind's scanner sees them.
 */
const AROUND_DIVIDER =
  '[&>[data-decorative-divider]+*]:mt-0! [&>*:has(+[data-decorative-divider])]:mb-0!'

interface BodyBlock {
  _type?: string
}
const drawnDivider = (block: BodyBlock) =>
  block._type === 'decorativeDivider' &&
  resolveDivider(block as Parameters<typeof resolveDivider>[0])

export function RichText({
  value,
  className,
  style,
  textRole,
  dividerBlock = '',
}: {
  value: PortableTextProps['value'] | null | undefined
  className?: string
  style?: CSSProperties
  /** The text role this body draws (lib/design/capabilities.ts). */
  textRole?: TextRole
  /** From `sectionTraits`: `mx-auto` in a centred section, so a divider block is centred with it. */
  dividerBlock?: string
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  // PortableText takes one block as well as a list, so detection reads the body as a list. Only detection:
  // `value` itself, the caller's own, is what PortableText is given, as it always was.
  const blocks = (Array.isArray(value) ? value : [value]) as BodyBlock[]
  const hasDivider = blocks.some(drawnDivider)
  return (
    <div
      className={hasDivider ? [className, AROUND_DIVIDER].filter(Boolean).join(' ') : className}
      style={style}
      data-text-role={textRole}
    >
      <PortableText
        value={value}
        components={{
          ...components,
          types: {
            ...components.types,
            decorativeDivider: ({ value: block }) => {
              const divider = resolveDivider(block as Parameters<typeof resolveDivider>[0])
              return divider ? <DecorativeDivider divider={divider} block={dividerBlock} /> : null
            },
          },
        }}
      />
    </div>
  )
}
