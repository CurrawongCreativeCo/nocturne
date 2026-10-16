'use client'

import dynamic from 'next/dynamic'

/**
 * The scroll-linked line, downloaded only by pages that render a Process section. Server
 * components import this, not process-timeline.tsx, so Motion's scroll code stays out of every
 * other page's JavaScript budget (see LazyParallax). The server still renders it, so the HTML is
 * complete, with the line fully drawn, before the chunk arrives.
 */
export const LazyProcessTimeline = dynamic(() =>
  import('./process-timeline').then((mod) => mod.ProcessTimeline),
)
