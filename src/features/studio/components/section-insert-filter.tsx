import { type ComponentType, useMemo } from 'react'
import {
  ArrayOfObjectsFunctions,
  type ArrayInputFunctionsProps,
  type ArrayOfObjectsInputProps,
  type ArraySchemaType,
  type InputProps,
  isArrayOfObjectsInputProps,
  useCurrentUser,
} from 'sanity'

import { siteProfile } from '@/config/profile'
import { isClientView } from '@/lib/sanity/roles'

import { filterInsertableTypes, resolveClientSections } from '../roles'

type FunctionsProps = ArrayInputFunctionsProps<{ _key: string }, ArraySchemaType>

/** The site profile's list (site.profile.ts), else the defaults. */
const allowed = resolveClientSections(siteProfile.clientSections)

/**
 * Array `of` is fixed in the schema and cannot vary per user, so the insert menu is filtered here:
 * the array input keeps the full schema type (existing sections still render and edit), and only
 * its "Add item" component sees a copy whose `of` lists the sections a client may add.
 */
function SectionInsertFilter(props: ArrayOfObjectsInputProps) {
  const user = useCurrentUser()
  const restricted = isClientView(user)
  // Sanity leaves `arrayFunctions` undefined unless an override sets it (the array inputs fall back
  // to ArrayOfObjectsFunctions themselves), so wrapping the prop alone would render nothing.
  const DefaultFunctions = (props.arrayFunctions ??
    ArrayOfObjectsFunctions) as ComponentType<FunctionsProps>
  const FilteredFunctions = useMemo(
    () =>
      function FilteredFunctions(functionsProps: FunctionsProps) {
        const { schemaType } = functionsProps
        // Object.create keeps the inherited schema properties that a spread would drop.
        const filtered = Object.create(schemaType, {
          of: { value: filterInsertableTypes(schemaType.of, allowed), enumerable: true },
        }) as ArraySchemaType
        return <DefaultFunctions {...functionsProps} schemaType={filtered} />
      },
    [DefaultFunctions],
  )

  return props.renderDefault({
    ...props,
    arrayFunctions: restricted ? FilteredFunctions : props.arrayFunctions,
  })
}

/**
 * Studio-wide input override (`form.components.input`) that applies the filter above to every
 * array of page-builder sections, found by the section type names passed in.
 */
export function createRoleAwareInput(sectionTypeNames: ReadonlySet<string>) {
  return function RoleAwareInput(props: InputProps) {
    if (
      isArrayOfObjectsInputProps(props) &&
      props.schemaType.of.some((type) => sectionTypeNames.has(type.name))
    ) {
      return <SectionInsertFilter {...props} />
    }
    return props.renderDefault(props)
  }
}
