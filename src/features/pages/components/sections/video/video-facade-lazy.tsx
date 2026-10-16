'use client'

import dynamic from 'next/dynamic'

/**
 * The Play facade, downloaded only by pages that have an embed (the same reason as `LazySlider`:
 * a client component a server component imports directly joins every page that renders sections,
 * and the home page is held to a JavaScript budget). The server still renders the poster and button.
 */
export const LazyVideoFacade = dynamic(() =>
  import('./video-facade').then((mod) => mod.VideoFacade),
)
