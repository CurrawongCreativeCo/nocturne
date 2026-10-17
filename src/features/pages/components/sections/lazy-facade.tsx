'use client'

import dynamic from 'next/dynamic'

/**
 * The Video Play facade and the Embed card, downloaded only by pages that have one of those sections
 * (the same reason as `LazySlider`: a client component a server component imports directly joins every
 * page that renders sections, and the home page is held to a JavaScript budget). One wrapper serves
 * both because each wrapper is itself shared JavaScript on every page. The server still renders the
 * poster, the card and their buttons.
 */
export const LazyFacade = dynamic(() => import('./facade'))
