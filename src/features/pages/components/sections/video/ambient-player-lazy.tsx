'use client'

import dynamic from 'next/dynamic'

/** The Ambient video and its Pause button, downloaded only by pages that have one (see `LazyVideoFacade`). */
export const LazyAmbientPlayer = dynamic(() =>
  import('./ambient-player').then((mod) => mod.AmbientPlayer),
)
