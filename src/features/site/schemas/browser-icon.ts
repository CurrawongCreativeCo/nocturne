import { defineField } from 'sanity'

import { imageField, imageOptions } from '@/lib/sanity/schema/image-field'

import { BrowserIconImageInput } from '../components/browser-icon-image-input'
import { BrowserIconInput } from '../components/browser-icon-input'

type IconValue = { choice?: string } | undefined

/** Padding and background only matter once the site has its own icon. */
const hasOwnIcon = ({ parent }: { parent?: unknown }) =>
  ((parent as IconValue)?.choice ?? 'default') === 'default'

/**
 * The icon in browser tabs, bookmarks and phone home screens. Default: Currawong's (src/app/icon.png).
 * "Upload an icon" and "Use the site logo" both store the picture in `image`, so the editor can crop
 * it in Sanity's normal crop tool; the logo choice only adds a button that copies the logo across.
 */
export const browserIconField = defineField({
  name: 'browserIcon',
  title: 'Browser icon',
  type: 'object',
  description:
    'The small picture in browser tabs, bookmarks and on phone home screens. Leave it on the default until the site has its own.',
  options: { collapsible: false },
  components: { input: BrowserIconInput },
  fields: [
    defineField({
      name: 'choice',
      title: 'Icon',
      type: 'string',
      initialValue: 'default',
      options: {
        layout: 'radio',
        list: [
          { title: "Currawong's default", value: 'default' },
          { title: 'Upload an icon', value: 'upload' },
          { title: 'Use the site logo', value: 'logo' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    imageField({
      name: 'image',
      title: 'Icon image',
      requireAlt: false,
      description:
        'A square PNG or SVG. Use the crop tool to frame it; the icon is shown very small, so keep it simple.',
      aspect: '1:1',
      minWidth: 512,
      options: { ...imageOptions, accept: 'image/png,image/svg+xml' },
      components: { input: BrowserIconImageInput },
      hidden: hasOwnIcon,
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          (parent as IconValue)?.choice !== 'default' &&
          !(value as { asset?: unknown } | undefined)?.asset
            ? 'Upload an icon, or choose "Use the site logo" and press the button'
            : true,
        ),
    }),
    defineField({
      name: 'padding',
      type: 'string',
      initialValue: 'none',
      description: 'Empty space around the picture. Small suits most logos.',
      options: {
        layout: 'radio',
        direction: 'horizontal',
        list: [
          { title: 'None', value: 'none' },
          { title: 'Small', value: 'small' },
          { title: 'Medium', value: 'medium' },
        ],
      },
      hidden: hasOwnIcon,
    }),
    defineField({
      name: 'background',
      type: 'string',
      initialValue: 'transparent',
      description: 'Behind the picture. Transparent shows the browser tab through it.',
      options: {
        layout: 'radio',
        direction: 'horizontal',
        list: [
          { title: 'Transparent', value: 'transparent' },
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
          { title: 'Brand', value: 'brand' },
        ],
      },
      hidden: hasOwnIcon,
    }),
  ],
})
