import { signOutAction } from '../api/actions'

export function SignOutView() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-balance">Sign out</h1>
      <p className="mt-4 text-gray-700">
        You will need to sign in again to see members-only content.
      </p>
      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
