'use client'

import dynamic from 'next/dynamic'

/**
 * Float, downloaded only by pages that render one (the same reason as LazyParallax: a client
 * component a server component imports directly joins every page that imports that server component,
 * and SectionFrame is on every page). The server still renders it, so the HTML is complete first.
 */
export const LazyFloat = dynamic(() => import('./float').then((mod) => mod.Float))
