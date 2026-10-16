import { stegaClean } from 'next-sanity'

import { SanityImage } from '@/components/ui/sanity-image'
import { NewTabNotice } from '@/components/ui/sanity-link'

import type { SectionProps } from '../../../types'

export type Logo = SectionProps<'logoCloud'>['data']['logos'][number]

/** Greyscale logos return to colour on hover and focus; `colour` keeps them in colour throughout. */
const IMAGE_CLASSES = {
  grey: 'opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0',
  colour: '',
} as const

interface Props {
  logo: Logo
  colour?: keyof typeof IMAGE_CLASSES
  /** The marquee's copy of the list: hidden from assistive technology and out of the tab order. */
  copy?: boolean
}

/** One logo, linked when it has an address. Shared by the layouts. */
export function LogoItem({ logo, colour = 'grey', copy = false }: Props) {
  const img = (
    <SanityImage
      image={logo.image}
      alt={copy ? '' : logo.name}
      height={40}
      className={`h-10 w-auto object-contain ${IMAGE_CLASSES[colour]}`}
    />
  )
  if (!logo.url) return <div className="group">{img}</div>
  return (
    <a
      href={stegaClean(logo.url)}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={copy ? -1 : undefined}
      className="group block"
    >
      {img}
      {!copy && <NewTabNotice />}
    </a>
  )
}
