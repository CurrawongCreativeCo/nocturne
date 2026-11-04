import { LinkIcon } from '@sanity/icons/Link'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { MAX_SUB_LINKS } from '../utils/header-nav'

interface NavItemValue {
  _key?: string
  link?: unknown
  children?: unknown
}

const hasSubLinks = (item: NavItemValue | undefined) =>
  Array.isArray(item?.children) && item.children.length > 0

/** A menu link needs somewhere to go, unless it opens a dropdown of sub-links instead. */
export const checkNavLink = (link: unknown, parent: unknown): true | string =>
  link || hasSubLinks(parent as NavItemValue | undefined)
    ? true
    : 'Add a link, or add sub-links so this opens a dropdown'

/** Sub-links are one level deep: a sub-link with its own sub-links (pasted or imported) is rejected. */
export const checkSubLinks = (children: unknown): true | string =>
  Array.isArray(children) && children.some((child) => hasSubLinks(child as NavItemValue))
    ? 'Sub-links can’t have their own sub-links. Move them up a level.'
    : true

/** Footer links are a flat list: the footer never shows sub-links. */
export const checkFooterNav = (items: unknown): true | string =>
  Array.isArray(items) && items.some((item) => hasSubLinks(item as NavItemValue))
    ? 'Footer links can’t have sub-links. Remove them, or move the link to the header menu.'
    : true

/** The `children` field is offered only on header menu links. */
export const isHeaderItem = (document: unknown, parent: unknown) => {
  const key = (parent as NavItemValue | undefined)?._key
  const header = (document as { headerNav?: unknown } | undefined)?.headerNav
  return Array.isArray(header) && header.some((item) => (item as NavItemValue | null)?._key === key)
}

/** A link in a header dropdown. It has no sub-links field, so dropdowns can't nest. */
export const navSubItem = defineType({
  name: 'navSubItem',
  title: 'Sub-link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      description: 'The words in the dropdown.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'link', type: 'link', validation: (rule) => rule.required() }),
  ],
  preview: { select: { title: 'label' } },
})

export const navItem = defineType({
  name: 'navItem',
  title: 'Menu link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      description: 'The words in the menu. One or two words read best.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'link',
      description: 'Optional when the link has sub-links: the label then just opens the dropdown.',
      type: 'link',
      validation: (rule) => rule.custom((value, { parent }) => checkNavLink(value, parent)),
    }),
    defineField({
      name: 'children',
      title: 'Sub-links',
      description: `Optional. Up to ${MAX_SUB_LINKS} links in a dropdown under this one.`,
      type: 'array',
      of: [defineArrayMember({ type: 'navSubItem' })],
      hidden: ({ document, parent, value }) => !value && !isHeaderItem(document, parent),
      validation: (rule) => rule.max(MAX_SUB_LINKS).custom(checkSubLinks),
    }),
  ],
  preview: {
    select: { title: 'label', children: 'children' },
    prepare: ({ title, children }: { title?: string; children?: unknown[] }) => ({
      title,
      subtitle:
        Array.isArray(children) && children.length > 0
          ? `Dropdown: ${children.length} sub-links`
          : undefined,
    }),
  },
})
