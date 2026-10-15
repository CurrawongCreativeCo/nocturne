'use client'

import dynamic from 'next/dynamic'

/**
 * CountUp, downloaded only by pages that animate a statistic. Server components import this, not
 * count-up.tsx, for the reason LazyParallax exists (parallax-lazy.tsx): a client component imported
 * directly is added to every page that imports the server component, and Motion's spring and
 * in-view code would count against the home page's JavaScript budget on pages with no statistics.
 * `dynamic` must sit in a client file to split. The server still renders the finished figure.
 */
export const LazyCountUp = dynamic(() => import('./count-up').then((mod) => mod.CountUp))
