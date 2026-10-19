import type { ComponentType } from 'react'

import type { PresetThumbnailProps } from '@/lib/sanity/schema/preset-field'
import {
  PrelaunchBoldThumbnail,
  PrelaunchDarkThumbnail,
  PrelaunchEditorialThumbnail,
  PrelaunchImageThumbnail,
  PrelaunchMinimalThumbnail,
  PrelaunchSoftThumbnail,
} from '@/lib/sanity/schema/thumbnails/prelaunch-look-thumbnails'

import { LINK_LIST_PRESETS } from '../schemas/sections/link-list'

/** A section as the templates build it: a type, a key and its fields. */
export interface TemplateSection {
  _key: string
  _type: string
  style?: Record<string, unknown>
  [field: string]: unknown
}

type LinkListPresetValue = (typeof LINK_LIST_PRESETS)[number]['value']

/**
 * The six one-click looks for the pre-launch pages (README, "Pre-launch looks"). A look is a recipe
 * over values that already exist, applied when a page is created from a template, so it adds no
 * stored field: the tone, the Link list preset, the hero layout and, for the atmospheric one, a
 * full-screen photo slot. The page is a normal page afterwards, and every section keeps its own preset
 * bar and Design tab. The first is the plain default.
 */
export interface PrelaunchLook {
  value: string
  title: string
  description: string
  thumbnail: ComponentType<PresetThumbnailProps>
  /** `style.tone` of every section, so the page reads as one. */
  tone: 'surface' | 'alt' | 'inverse' | 'accent'
  /** The Link list preset (`LINK_LIST_PRESETS`) for a list that has links. */
  linkPreset: LinkListPresetValue
  /** The hero's layout (`HERO_VARIANTS`) on the Coming soon page. */
  heroVariant: 'overlay' | 'editorial' | 'split'
  /** The page is built to sit over one full-screen photo: the main section fills the screen, with the wash set for it. */
  photo?: boolean
  /** Glass strength for Glass rows. */
  glassStrength?: 'light' | 'medium' | 'strong'
}

export const PRELAUNCH_LOOKS: readonly PrelaunchLook[] = [
  {
    value: 'minimal',
    title: 'Minimal and elegant',
    description: 'Plain page colour and quiet buttons. Lots of space.',
    thumbnail: PrelaunchMinimalThumbnail,
    tone: 'surface',
    linkPreset: 'minimal',
    heroVariant: 'overlay',
  },
  {
    value: 'dark',
    title: 'Dark and atmospheric',
    description: 'A dark page over a full-screen photo, with frosted-glass rows. Add the photo.',
    thumbnail: PrelaunchDarkThumbnail,
    tone: 'inverse',
    linkPreset: 'glass-rows',
    heroVariant: 'overlay',
    photo: true,
    glassStrength: 'medium',
  },
  {
    value: 'editorial',
    title: 'Editorial',
    description: 'Large type on the left, links as a ruled list.',
    thumbnail: PrelaunchEditorialThumbnail,
    tone: 'surface',
    linkPreset: 'editorial',
    heroVariant: 'editorial',
  },
  {
    value: 'bold',
    title: 'Bold and colourful',
    description: 'The whole page in the Primary brand colour.',
    thumbnail: PrelaunchBoldThumbnail,
    tone: 'accent',
    linkPreset: 'minimal',
    heroVariant: 'overlay',
  },
  {
    value: 'image-led',
    title: 'Image-led',
    description: 'Big pictures lead each link. Add a picture to every link.',
    thumbnail: PrelaunchImageThumbnail,
    tone: 'surface',
    linkPreset: 'image-focused',
    heroVariant: 'split',
  },
  {
    value: 'soft',
    title: 'Soft and refined',
    description: 'A gently tinted page and links in rounded cards.',
    thumbnail: PrelaunchSoftThumbnail,
    tone: 'alt',
    linkPreset: 'cards',
    heroVariant: 'overlay',
  },
]

/** Sets `path` ('style.align') inside `target`, creating the object on the way. */
function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const [head = '', ...rest] = path.split('.')
  if (rest.length === 0) {
    target[head] = value
    return
  }
  const next = { ...(target[head] as Record<string, unknown> | undefined) }
  setPath(next, rest.join('.'), value)
  target[head] = next
}

/**
 * The page-builder sections of a pre-launch template with a look applied. Returns new sections and
 * leaves the input alone. Only the values a look names change; content, keys and everything else
 * stay as the template made them.
 */
export function applyPrelaunchLook(
  look: PrelaunchLook,
  sections: readonly TemplateSection[],
): TemplateSection[] {
  const preset = LINK_LIST_PRESETS.find(({ value }) => value === look.linkPreset)
  const presetSet: Record<string, unknown> = preset?.set ?? {}
  const align = presetSet['style.align']
  // The photo goes behind the hero when the page has one, else behind the links.
  const photoType = sections.some(({ _type }) => _type === 'hero') ? 'hero' : 'linkList'

  return sections.map((section) => {
    const next: TemplateSection = { ...section, style: { ...section.style, tone: look.tone } }

    if (section._type === 'hero') {
      next.variant = look.heroVariant
    } else if (align) {
      next.style = { ...next.style, align }
    }

    // A list with no links (the Coming soon page's social icons) stays Compact.
    if (section._type === 'linkList' && Array.isArray(section.links) && section.links.length > 0) {
      for (const [path, value] of Object.entries(presetSet)) setPath(next, path, value)
      if (look.glassStrength && presetSet.rowStyle === 'glass') {
        next.glassStrength = look.glassStrength
      }
    }

    if (look.photo && section._type === photoType) {
      // Fill the screen so there is a photo's worth of page; a light dark wash keeps the photo
      // showing (Glass rows read best with the overlay on None or Light).
      next.style = { ...next.style, fillScreen: true, overlay: 'light', overlayColor: 'dark' }
      // Behind a list of links the photo covers the window, not the list, so a long list on a phone
      // doesn't blow it up (README, "Section height").
      if (section._type === 'linkList') next.style.imageSize = 'screen'
    }
    return next
  })
}
