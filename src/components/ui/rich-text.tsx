import { PortableText, type PortableTextComponents, type PortableTextProps } from 'next-sanity'

import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink, type LinkData } from '@/components/ui/sanity-link'
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
        className="font-medium text-accent underline underline-offset-2"
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

export function RichText({
  value,
  className,
}: {
  value: PortableTextProps['value'] | null | undefined
  className?: string
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div className={className}>
      <PortableText value={value} components={components} />
    </div>
  )
}
