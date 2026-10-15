'use client'

import dynamic from 'next/dynamic'

/**
 * Slider, downloaded only by pages that render one. Server components import this, not slider.tsx:
 * a client component a server component imports directly is added to every page that imports that
 * server component, and the slider's spring (Motion's `animate`) is about 20 KB gzipped of the
 * home page's JavaScript budget. `dynamic` must sit in a client file to split. The server still
 * renders it, so the HTML (the scroll-snap list) is complete before the chunk arrives.
 */
export const LazySlider = dynamic(() => import('./slider').then((mod) => mod.Slider))
