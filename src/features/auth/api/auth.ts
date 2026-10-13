import 'server-only'

import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'

import { SIGN_IN_PATH } from '@/config/paths'

import { isAllowedMember, parseAllowList } from '../utils/allowed-members'
import { enabledProviders } from '../utils/providers'

/**
 * Auth.js (next-auth v5) with stateless JWT sessions: no database, so a member is whoever the
 * provider vouches for and `AUTH_ALLOWED_EMAILS` admits. Built per request so a missing secret
 * only breaks sign-in, never a site that has no members-only content.
 */
function config(): NextAuthConfig {
  const enabled = enabledProviders(process.env)
  const allowList = parseAllowList(process.env.AUTH_ALLOWED_EMAILS)

  return {
    providers: [
      ...(enabled.includes('github') ? [GitHub] : []),
      ...(enabled.includes('google') ? [Google] : []),
      ...(enabled.includes('test')
        ? [
            Credentials({
              id: 'test',
              name: 'Test account',
              credentials: { email: {}, password: {} },
              authorize: ({ email, password }) =>
                typeof email === 'string' && email && password === process.env.AUTH_TEST_PASSWORD
                  ? { id: email, email, name: 'Test member' }
                  : null,
            }),
          ]
        : []),
    ],
    session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
    pages: { signIn: SIGN_IN_PATH, error: SIGN_IN_PATH },
    callbacks: {
      signIn: ({ user, account, profile }) => {
        // Google says when it has not verified the address; an allow-list can't trust one.
        if (account?.provider === 'google' && profile?.email_verified !== true) return false
        return isAllowedMember(user.email, allowList)
      },
    },
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
