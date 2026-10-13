import { defineField } from 'sanity'

import { ACCESS_MEMBERS, ACCESS_PUBLIC } from '../access'

/**
 * Who may see a page or a page-builder section. A document without the field counts as public, so
 * existing content needs no migration. Members-only content is withheld from the cached public
 * queries and loaded only for a signed-in visitor (see README, "Members-only content").
 */

export const accessField = defineField({
  name: 'access',
  title: 'Who can see this',
  type: 'string',
  options: {
    layout: 'radio',
    list: [
      { title: 'Everyone', value: ACCESS_PUBLIC },
      { title: 'Members only (signed in)', value: ACCESS_MEMBERS },
    ],
  },
  initialValue: ACCESS_PUBLIC,
})
