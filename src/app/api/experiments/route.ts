import { NextResponse } from 'next/server'

import { getActiveExperiment } from '@/features/experiments/api/get-experiment'

/**
 * The running experiment (variant ids and traffic split, nothing secret), or null. proxy.ts reads
 * it to assign visitors. Served from the same cache entry as the variant pages, so publishing
 * or stopping an experiment reaches it through the usual tag expiry.
 */
export async function GET() {
  return NextResponse.json(await getActiveExperiment())
}
