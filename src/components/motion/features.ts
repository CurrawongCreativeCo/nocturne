import { domMax } from 'motion/react'

/**
 * The Motion feature bundle, loaded after first render by `motion-provider.tsx`. `domMax` rather
 * than `domAnimation` because drag (drawer, slider) and layout animations need it.
 */
export default domMax
