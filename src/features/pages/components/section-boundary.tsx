'use client'

import { useRouter } from 'next/navigation'
import { Component, startTransition, type ReactNode } from 'react'

interface Props {
  type: string
  children: ReactNode
}

interface State {
  error: unknown
  hasError: boolean
  /** The children that threw; new ones (the preview refreshed after an edit) get another try. */
  children: ReactNode
}

/** redirect() and notFound() throw errors like these; they're for Next.js, not for this boundary. */
function isNextError(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest
  return typeof digest === 'string' && digest.startsWith('NEXT_')
}

/**
 * Contains one section that fails to render in draft mode, so the rest of the preview stays up and
 * the editor sees which section broke. Server errors already reach Sentry through `onRequestError`
 * (src/instrumentation.ts).
 *
 * Hand-written rather than `catchError` from next/error, which adds about 5 KB gzipped to every
 * page of the route, published ones included, though only draft mode renders this.
 */
export class SectionBoundary extends Component<Props, State> {
  override state: State = { error: null, hasError: false, children: this.props.children }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error, hasError: true }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.children === state.children
      ? null
      : { error: null, hasError: false, children: props.children }
  }

  override render() {
    if (!this.state.hasError) return this.props.children
    if (isNextError(this.state.error)) throw this.state.error
    return <SectionFallback type={this.props.type} />
  }
}

function SectionFallback({ type }: { type: string }) {
  const router = useRouter()
  return (
    <div
      role="alert"
      className="mx-auto my-8 max-w-3xl rounded border border-dashed border-red-500 bg-red-50 p-6 text-center text-red-900"
    >
      The <code>{type}</code> section failed to render.{' '}
      <button
        type="button"
        onClick={() => {
          startTransition(() => {
            router.refresh()
          })
        }}
        className="font-semibold underline"
      >
        Try again
      </button>
    </div>
  )
}
