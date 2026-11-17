import { CaseIcon } from '@sanity/icons/Case'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { parseAuPhone } from '@/lib/au-phone'
import { hiddenFromClients } from '@/lib/sanity/roles'
import {
  addressField,
  geoField,
  openingHoursField,
  specialHoursField,
  timeZoneField,
} from '@/lib/sanity/schema/business-fields'
import { SOCIAL_PLATFORMS, socialPlatformTitle } from '@/lib/social-platforms'

import { AbnInput } from '../components/abn-input'
import { formatAbn, isValidAbn } from '../utils/abn'

/** schema.org types a business can pick without knowing schema.org. "Other" lets the agency name any other. */
export const BUSINESS_TYPES = [
  { value: 'LocalBusiness', title: 'Local business (general)' },
  { value: 'ProfessionalService', title: 'Professional service' },
  { value: 'MedicalBusiness', title: 'Medical business' },
  { value: 'Dentist', title: 'Dentist' },
  { value: 'LegalService', title: 'Legal service' },
  { value: 'Restaurant', title: 'Restaurant' },
  { value: 'Store', title: 'Store' },
  { value: 'HomeAndConstructionBusiness', title: 'Home and construction' },
  { value: 'HealthAndBeautyBusiness', title: 'Health and beauty' },
  { value: 'Other', title: 'Other (name a schema.org type)' },
] as const

/** A singleton: the one document has `_id === 'businessInfo'` (see SINGLETON_TYPES and the desk structure). */
export const businessInfo = defineType({
  name: 'businessInfo',
  title: 'Business info',
  type: 'document',
  icon: CaseIcon,
  description:
    'Your business details, written once and used in the footer, on contact details and in the information search engines show about you (name, address, phone, opening hours). Leave anything you do not want to publish empty.',
  fieldsets: [
    { name: 'contact', title: 'Contact' },
    { name: 'address', title: 'Address' },
    {
      name: 'advanced',
      title: 'Advanced',
      options: { collapsible: true, collapsed: true },
      hidden: hiddenFromClients,
    },
  ],
  fields: [
    defineField({
      name: 'tradingName',
      title: 'Trading name',
      type: 'string',
      description: 'The name customers know you by.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'legalName',
      title: 'Legal name',
      type: 'string',
      description:
        'Optional. The registered name if it differs, for example "Smith Holdings Pty Ltd".',
    }),
    defineField({
      name: 'abn',
      title: 'ABN',
      type: 'string',
      description: 'Optional. 11 digits; shown in the footer as "12 345 678 901".',
      components: { input: AbnInput },
      validation: (rule) =>
        rule.custom((value) =>
          !value || isValidAbn(value)
            ? true
            : 'That is not a valid ABN. Check the 11 digits against abr.business.gov.au.',
        ),
    }),
    defineField({
      name: 'phone',
      type: 'string',
      fieldset: 'contact',
      description: 'Australian number, for example (02) 9876 5432, 0412 345 678 or 1300 123 456.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || parseAuPhone(value)
            ? true
            : 'Enter an Australian phone number, area code first',
        ),
    }),
    defineField({
      name: 'publicEmail',
      title: 'Public email',
      type: 'string',
      fieldset: 'contact',
      description: 'Shown on the site, so use an address you are happy to receive enquiries on.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Enter a valid email address',
        ),
    }),
    addressField({ fieldset: 'address' }),
    timeZoneField({ fieldset: 'address' }),
    openingHoursField(),
    specialHoursField(),
    defineField({
      name: 'serviceAreas',
      title: 'Service areas',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      description: 'Suburbs or regions you travel to, for example "Inner West" or "Newcastle".',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social profiles',
      type: 'array',
      description: 'Search engines use these to connect your website with your profiles.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({
              name: 'platform',
              type: 'string',
              options: {
                list: SOCIAL_PLATFORMS.map(({ value, title }) => ({ value, title })),
                layout: 'dropdown',
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Link',
              type: 'url',
              validation: (rule) =>
                rule
                  .required()
                  .uri({ scheme: ['https'] })
                  .error('Use a full https:// link'),
            }),
          ],
          preview: {
            select: { platform: 'platform', url: 'url' },
            prepare: ({ platform, url }: { platform?: string; url?: string }) => ({
              title: socialPlatformTitle(platform),
              subtitle: url,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'businessType',
      title: 'Business type',
      type: 'string',
      fieldset: 'advanced',
      description:
        'How search engines classify the business. Pick the closest; "Local business" is always safe.',
      initialValue: 'LocalBusiness',
      options: {
        list: BUSINESS_TYPES.map(({ value, title }) => ({ value, title })),
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'businessTypeOther',
      title: 'Other business type',
      type: 'string',
      fieldset: 'advanced',
      description:
        'A schema.org type name, written exactly, for example Optician, Physiotherapy or AutoRepair (see schema.org/LocalBusiness for the list).',
      hidden: ({ parent }) =>
        (parent as { businessType?: string } | undefined)?.businessType !== 'Other',
      validation: (rule) =>
        rule.custom((value, { parent }) => {
          if ((parent as { businessType?: string } | undefined)?.businessType !== 'Other')
            return true
          return value && /^[A-Z][A-Za-z]+$/.test(value)
            ? true
            : 'Enter one schema.org type name, capitalised, with no spaces (for example Optician)'
        }),
    }),
    geoField({ fieldset: 'advanced' }),
    defineField({
      name: 'priceRange',
      title: 'Price range',
      type: 'string',
      fieldset: 'advanced',
      description: 'Optional. A rough guide for search results.',
      options: {
        list: [
          { value: '$', title: '$ (budget)' },
          { value: '$$', title: '$$ (moderate)' },
          { value: '$$$', title: '$$$ (upmarket)' },
          { value: '$$$$', title: '$$$$ (premium)' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
  ],
  preview: {
    select: { name: 'tradingName', abn: 'abn' },
    prepare: ({ name, abn }: { name?: string; abn?: string }) => ({
      title: name || 'Business info',
      subtitle: abn ? `ABN ${formatAbn(abn)}` : undefined,
    }),
  },
})
