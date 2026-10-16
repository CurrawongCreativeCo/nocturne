'use client'

import dynamic from 'next/dynamic'

/** The Pause button, downloaded only by pages that have a marquee (a direct import would add it to every page's JavaScript). */
export const LazyMarqueeToggle = dynamic(() =>
  import('./marquee-toggle').then((mod) => mod.MarqueeToggle),
)
