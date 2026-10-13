'use server'

import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

import { signInPath } from '@/config/paths'

import { signIn, signOut } from './auth'
import { enabledProviders, type ProviderId } from '../utils/providers'
import { safePath } from '../utils/safe-path'

const text = (data: FormData, name: string) => {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

/** Sign-in with an OAuth provider; the visitor comes back to `callbackUrl` afterwards. */
export async function signInWithProvider(data: FormData) {
  const provider = text(data, 'provider')
  const callbackUrl = safePath(text(data, 'callbackUrl'))
  const allowed: ProviderId[] = enabledProviders(process.env).filter((id) => id !== 'test')
  if (!allowed.some((id) => id === provider)) redirect(signInPath(callbackUrl))

  await signIn(provider, { redirectTo: callbackUrl })
}

/** The password form used by end-to-end tests (see `enabledProviders`). */
export async function signInWithTestAccount(data: FormData) {
  const callbackUrl = safePath(text(data, 'callbackUrl'))
  if (!enabledProviders(process.env).includes('test')) redirect(signInPath(callbackUrl))

  try {
    await signIn('test', {
      email: text(data, 'email'),
      password: text(data, 'password'),
      redirectTo: callbackUrl,
    })
  } catch (error) {
    // A wrong password or a refused address throws; success redirects (and also throws, so rethrow).
    if (error instanceof AuthError) {
      redirect(`${signInPath(callbackUrl)}&error=${encodeURIComponent(error.type)}`)
    }
    throw error
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' })
}
