'use client'

import dynamic from 'next/dynamic'

/**
 * Parallax, downloaded only by pages that render one. Server components import this, not
 * parallax.tsx: a client component a server component imports directly is added to every page that
 * imports that server component (every page, for SectionFrame), and Motion's scroll code is about
 * 7 KB gzipped of the home page's JavaScript budget. `dynamic` must sit in a client file to split.
 * The server still renders it, so the HTML is complete before the chunk arrives.
 */
export const LazyParallax = dynamic(() => import('./parallax').then((mod) => mod.Parallax))
