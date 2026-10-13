import { Card, Container, Flex, Heading, Stack, Switch, Text } from '@sanity/ui'
import { useState } from 'react'

import { getAutoAltText, setAutoAltText } from '@/lib/sanity/schema/auto-alt-text'

/** Per-editor preferences for AI Assist. Everything defaults to off, because every run costs credits. */
export function AiSettingsTool() {
  const [autoAlt, setAutoAlt] = useState(getAutoAltText)

  return (
    <Card height="fill" overflow="auto" padding={4}>
      <Container width={1}>
        <Stack gap={5}>
          <Heading as="h1" size={2}>
            AI settings
          </Heading>
          <Card border padding={4} radius={2}>
            <Flex align="flex-start" gap={4}>
              <Switch
                id="auto-alt-text"
                checked={autoAlt}
                onChange={(event) => {
                  setAutoAltText(event.currentTarget.checked)
                  setAutoAlt(event.currentTarget.checked)
                }}
              />
              <Stack gap={3}>
                <Text as="label" htmlFor="auto-alt-text" weight="semibold">
                  Write alt text automatically when an image is added
                </Text>
                <Text muted size={1}>
                  Off by default. When on, AI Assist fills in the alternative text of every image
                  you upload or replace, and each one uses AI credits. When off, run &quot;Generate
                  image description&quot; from the alt text field&apos;s AI Assist menu instead.
                  This applies to this browser only.
                </Text>
              </Stack>
            </Flex>
          </Card>
        </Stack>
      </Container>
    </Card>
  )
}
