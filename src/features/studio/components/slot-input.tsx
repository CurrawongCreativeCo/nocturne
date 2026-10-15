import { type ArrayOfObjectsInputProps, type ArraySchemaType, useCurrentUser } from 'sanity'

import { isClientView } from '@/lib/sanity/roles'
import { slotDisabledActions } from '@/lib/sanity/schema/slot-actions'

/**
 * The input for an array with `options.slot`: one approved item. The default array input, with the
 * actions that would break the "one item, added by the agency" rule switched off. The schema type is
 * copied with Object.create so the inherited properties a spread would drop stay (as in
 * section-insert-filter.tsx); the array functions and each item's menu both read the copy.
 */
export function SlotInput(props: ArrayOfObjectsInputProps) {
  const user = useCurrentUser()
  const disableActions = slotDisabledActions({
    full: (props.value?.length ?? 0) >= 1,
    locked: isClientView(user),
  })
  const schemaType = Object.create(props.schemaType, {
    options: {
      value: { ...props.schemaType.options, disableActions },
      enumerable: true,
    },
  }) as ArraySchemaType

  return props.renderDefault({ ...props, schemaType })
}
