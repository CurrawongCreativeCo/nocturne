import { signOutAction } from '../api/actions'

export function SignOutView() {
  return (
    <div className="mx-auto max-w-md px-gutter py-section-compact">
      <h1 className="text-h1 font-semibold text-balance">Sign out</h1>
      <p className="mt-4 text-ink-muted">
        You will need to sign in again to see members-only content.
      </p>
      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-button bg-cta px-6 py-3 text-small font-semibold text-cta-ink transition-colors hover:bg-cta/85"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
