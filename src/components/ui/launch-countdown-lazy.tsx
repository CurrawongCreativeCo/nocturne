'use client'

import dynamic from 'next/dynamic'

/**
 * The countdown, downloaded only by a page that turns it on. Server components import this, not
 * launch-countdown.tsx, for the reason LazyCountUp exists (components/motion/count-up-lazy.tsx): a
 * client component imported directly is added to every page that imports the server component.
 * `dynamic` must sit in a client file to split. `ssr: false` because the clock is the visitor's: the
 * server draws the static date line, and an empty box of the same height for this to fill.
 */
export const LazyLaunchCountdown = dynamic(() => import('./launch-countdown'), { ssr: false })
