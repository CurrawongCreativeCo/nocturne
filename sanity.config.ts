'use client'

/**
 * Studio config, mounted at /studio by app/studio/[[...tool]]/page.tsx.
 * `'use client'` because the embedded Studio is a client-only React app.
 *
 * Like `src/app`, this is a composition root: it may import from any feature,
 * which is how each feature's schema types get registered.
 */
import { assist } from '@sanity/assist'
import { visionTool } from '@sanity/vision'
import { createElement } from 'react'
import { defineConfig, isStringInputProps, type InputProps } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { structureTool } from 'sanity/structure'

import { apiVersion, dataset, projectId, studioUrl } from './src/config/env'
import { studioBrand } from './src/config/studio-brand/client'
import { blogSchemaTypes } from './src/features/blog/schemas'
import { eventsSchemaTypes } from './src/features/events/schemas'
import { experimentSchemaTypes } from './src/features/experiments/schemas'
import { formSchemaTypes } from './src/features/forms/schemas'
import { hideEnquiriesFromNewMenu, withoutEnquiryDuplicate } from './src/features/forms/studio'
import { framesSchemaTypes } from './src/features/frames/schemas'
import { pageSchemaTypes } from './src/features/pages/schemas'
import { sectionTypes } from './src/features/pages/schemas/sections'
import { AGENCY_ONLY_TEMPLATE_IDS, pageTemplates } from './src/features/pages/schemas/templates'
import { panelsSchemaTypes } from './src/features/panels/schemas'
import { pricingSchemaTypes } from './src/features/pricing/schemas'
import { hidePricesFromNewMenu } from './src/features/pricing/studio'
import { ColourInput } from './src/features/site/components/colour-input'
import { siteSchemaTypes } from './src/features/site/schemas'
import { confirmDeletePageActions } from './src/features/studio/actions/confirm-delete-page'
import { confirmPublishActions } from './src/features/studio/actions/confirm-publish'
import { pageLinkActions } from './src/features/studio/actions/page-link-actions'
import { aiSettings } from './src/features/studio/ai-settings/plugin'
import { assistPresets } from './src/features/studio/assist-presets'
import { FramelessAwareField } from './src/features/studio/components/frameless-field'
import { withPresetPicker } from './src/features/studio/components/preset-picker/with-preset-picker'
import { RoleNavbar } from './src/features/studio/components/role-navbar'
import { createRoleAwareInput } from './src/features/studio/components/section-insert-filter'
import { StudioIcon } from './src/features/studio/components/studio-icon'
import { StudioLogo } from './src/features/studio/components/studio-logo'
import { ThemeColourPickerInput } from './src/features/studio/components/theme-colour-picker/theme-colour-picker-input'
import { contentHealth } from './src/features/studio/content-health/plugin'
import { resolve } from './src/features/studio/presentation'
import { currentAudience } from './src/features/studio/roles'
import {
  hideSingletonsFromNewMenu,
  SINGLETON_TYPES,
  singletonDocumentActions,
  withoutSingletonTemplates,
} from './src/features/studio/singletons'
import { startHere } from './src/features/studio/start-here/plugin'
import { structure } from './src/features/studio/structure'
import { buildStudioTheme } from './src/features/studio/theme'
import {
  CLIENT_PROTECTED_TYPES,
  filterDocumentActions,
  filterNewDocumentOptions,
} from './src/features/studio/utils/document-access'
import { hideDisabledFromNewMenu } from './src/features/studio/utils/feature-visibility'
import { filterTools } from './src/features/studio/utils/tool-access'
import { teamSchemaTypes } from './src/features/team/schemas'
import { sharedSchemaTypes } from './src/lib/sanity/schema'
// new-registry:import

/** Templates and types clients may create from "New document": page templates, posts and their authors and categories. */
const CLIENT_NEW_DOCUMENT_IDS = new Set([
  ...pageTemplates.map(({ id }) => id).filter((id) => !AGENCY_ONLY_TEMPLATE_IDS.has(id)),
  'post',
  'author',
  'category',
])
const PROTECTED_TYPES = new Set<string>(CLIENT_PROTECTED_TYPES)
// Role-aware section menus, then the picture picker and preset bar for fields that ask for them.
const PresetAwareInput = withPresetPicker(
  createRoleAwareInput(new Set(sectionTypes.map(({ name }) => name))),
)
// A heading highlight's custom gradient colours reuse the Brand colours input (features/site), which
// a studio or shared module may not import: composed here.
// An element's Custom colour (themeColourField) uses the same input; its colour choice gets swatches.
const StudioInput = (props: InputProps) =>
  isStringInputProps(props) &&
  (props.schemaType.options?.headingStop === true || props.schemaType.options?.themeColourHex)
    ? createElement(ColourInput, props)
    : isStringInputProps(props) && props.schemaType.options?.themeColourPicker
      ? createElement(ThemeColourPickerInput, props)
      : createElement(PresetAwareInput, props)

export default defineConfig({
  basePath: studioUrl,
  // The CMS brand's name (studio-brand.json, else NEXT_PUBLIC_STUDIO_TITLE, else Currawong's): the tab
  // title and the sign-in screen's heading.
  title: studioBrand.name,
  // The mark: shown on the sign-in screen and in the workspace menu.
  icon: StudioIcon,
  // Undefined (Studio's default theme) if a future Sanity major removes the legacy theme builder.
  theme: buildStudioTheme(studioBrand),
  projectId,
  dataset,
  studio: { components: { logo: StudioLogo, navbar: RoleNavbar } },
  // Clients only get the approved sections in the page builder's insert menu; presetPicker fields
  // and objects with presets get the picture picker; frameless objects drop their own box.
  form: { components: { input: StudioInput, field: FramelessAwareField } },
  // Content variants: lets editors create variants of a document, which A/B experiments serve.
  beta: { variants: { enabled: true } },
  schema: {
    types: [
      ...pageSchemaTypes,
      ...blogSchemaTypes,
      ...formSchemaTypes,
      ...pricingSchemaTypes,
      ...experimentSchemaTypes,
      ...siteSchemaTypes,
      ...teamSchemaTypes,
      ...eventsSchemaTypes,
      ...framesSchemaTypes,
      ...panelsSchemaTypes,
      // new-registry:register
      ...sharedSchemaTypes,
    ],
    templates: (defaults) => [...withoutSingletonTemplates(defaults), ...pageTemplates],
  },
  document: {
    actions: (prev, context) =>
      filterDocumentActions(
        pageLinkActions(
          confirmDeletePageActions(
            confirmPublishActions(
              singletonDocumentActions(withoutEnquiryDuplicate(prev, context), context),
              context,
            ),
            context,
          ),
          context,
        ),
        currentAudience(context.currentUser),
        PROTECTED_TYPES.has(context.schemaType) || SINGLETON_TYPES.has(context.schemaType),
      ),
    newDocumentOptions: (prev, context) => {
      const options = hideEnquiriesFromNewMenu(prev, context)
      return context.creationContext.type === 'document'
        ? options
        : filterNewDocumentOptions(
            hidePricesFromNewMenu(
              hideDisabledFromNewMenu(hideSingletonsFromNewMenu(options, context), context),
              context,
            ),
            currentAudience(context.currentUser),
            CLIENT_NEW_DOCUMENT_IDS,
          )
    },
  },
  // Vision, AI settings and Content health are agency-only; clients open on Start here, then Presentation.
  tools: (prev, context) => filterTools(prev, currentAudience(context.currentUser)),
  plugins: [
    structureTool({ structure }),
    presentationTool({
      resolve,
      previewUrl: { previewMode: { enable: '/api/draft-mode/enable' } },
    }),
    visionTool({ defaultApiVersion: apiVersion }),
    startHere(),
    contentHealth(),
    aiSettings(),
    assist({ __presets: assistPresets }),
  ],
})
