import type { NextRequest } from 'next/server'

import { isFeatureEnabled } from '@/config/profile'
import { handlers } from '@/features/auth/api/auth'

/**
 * Auth.js endpoints (OAuth callbacks, session, CSRF). The sign-in and sign-out pages are in (site).
 * With members switched off in the site profile they answer 404.
 */
const notFound = () => new Response('Not found', { status: 404 })

export const GET = (request: NextRequest) =>
  isFeatureEnabled('members') ? handlers.GET(request) : notFound()
export const POST = (request: NextRequest) =>
  isFeatureEnabled('members') ? handlers.POST(request) : notFound()
