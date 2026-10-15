import { Button, Card, Stack, Text } from '@sanity/ui'
import { set, useFormValue, type ObjectInputProps } from 'sanity'

type Logo = { asset?: { _ref?: string } } | undefined

/**
 * The icon image, with a "Use site logo" button when that choice is picked. It copies the logo's
 * file into this field (a fresh image with no crop), so the editor frames it with Sanity's own
 * crop tool. Nothing is linked: changing the logo later does not change the icon.
 */
export function BrowserIconImageInput(props: ObjectInputProps) {
  const choice = useFormValue(['browserIcon', 'choice']) as string | undefined
  const logoRef = (useFormValue(['logo']) as Logo)?.asset?._ref

  return (
    <Stack gap={3}>
      {choice === 'logo' && (
        <Card padding={3} border radius={2}>
          <Stack gap={3}>
            <Text size={1} muted>
              {logoRef
                ? 'Copies the site logo here. Then crop it square with the crop tool.'
                : 'Add the site logo (above, in General) first, then come back to copy it.'}
            </Text>
            <Button
              text="Use site logo"
              tone="primary"
              disabled={!logoRef || props.readOnly}
              onClick={() => {
                props.onChange(
                  set({ _type: 'image', asset: { _type: 'reference', _ref: logoRef } }),
                )
              }}
            />
          </Stack>
        </Card>
      )}
      {props.renderDefault(props)}
    </Stack>
  )
}
