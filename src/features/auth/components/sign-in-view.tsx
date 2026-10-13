import { signInWithProvider, signInWithTestAccount } from '../api/actions'
import { signInErrorMessage } from '../utils/messages'
import { enabledProviders, PROVIDER_NAMES } from '../utils/providers'
import { safePath } from '../utils/safe-path'

interface Props {
  callbackUrl: string | undefined
  error: string | undefined
}

const button =
  'inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800'
const input = 'mt-1 block w-full rounded-md border border-gray-400 px-3 py-2 text-gray-950'

export function SignInView({ callbackUrl: rawCallbackUrl, error }: Props) {
  const callbackUrl = safePath(rawCallbackUrl)
  const providers = enabledProviders(process.env)
  const message = signInErrorMessage(error)

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-balance">Sign in</h1>
      {message && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-700 bg-red-50 p-3 text-red-900"
        >
          {message}
        </p>
      )}
      {providers.length === 0 && (
        <p className="mt-6 text-gray-700">
          Sign-in is not set up yet. Add a provider to the environment (see the README,
          “Members-only content”).
        </p>
      )}
      <div className="mt-8 flex flex-col gap-4">
        {providers
          .filter((id) => id !== 'test')
          .map((id) => (
            <form key={id} action={signInWithProvider}>
              <input type="hidden" name="provider" value={id} />
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <button type="submit" className={`${button} w-full`}>
                Continue with {PROVIDER_NAMES[id]}
              </button>
            </form>
          ))}
        {providers.includes('test') && (
          <form action={signInWithTestAccount} className="flex flex-col gap-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <label className="block font-medium text-gray-950">
              Email
              <input name="email" type="email" autoComplete="email" required className={input} />
            </label>
            <label className="block font-medium text-gray-950">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={input}
              />
            </label>
            <button type="submit" className={button}>
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
