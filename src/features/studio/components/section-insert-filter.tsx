import { type ComponentType, useEffect, useMemo, useState } from 'react'
import {
  type ArrayInputFunctionsProps,
  type ArrayOfObjectsInputProps,
  type ArraySchemaType,
  type InputProps,
  isArrayOfObjectsInputProps,
  useClient,
  useCurrentUser,
} from 'sanity'

import { apiVersion } from '@/config/env'
import { isClientView } from '@/lib/sanity/roles'

import { CLIENT_SECTIONS_QUERY, filterInsertableTypes, resolveClientSections } from '../roles'

type FunctionsProps = ArrayInputFunctionsProps<{ _key: string }, ArraySchemaType>

/**
 * Array `of` is fixed in the schema and cannot vary per user, so the insert menu is filtered here:
 * the array input keeps the full schema type (existing sections still render and edit), and only
 * its "Add item" component sees a copy whose `of` lists the sections a client may add.
 */
function SectionInsertFilter(props: ArrayOfObjectsInputProps) {
  const user = useCurrentUser()
  const client = useClient({ apiVersion })
  const restricted = isClientView(user)
  const [profileSections, setProfileSections] = useState<readonly unknown[] | null>(null)

  useEffect(() => {
    if (!restricted) return
    let cancelled = false
    client
      .fetch<string[] | null>(CLIENT_SECTIONS_QUERY)
      .then((names) => {
        if (!cancelled) setProfileSections(names)
      })
      // No profile document or no read access: the default list applies.
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [client, restricted])

  const allowed = useMemo(() => resolveClientSections(profileSections), [profileSections])
  const DefaultFunctions = props.arrayFunctions as ComponentType<FunctionsProps>
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
    [DefaultFunctions, allowed],
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
