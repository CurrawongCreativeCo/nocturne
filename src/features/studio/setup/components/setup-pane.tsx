import { Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useMemo, useState } from 'react'
import { useCurrentUser } from 'sanity'

import type { FeatureConfig } from '@/config/feature-config'

import { SetupDetail, SetupList, withCode } from './setup-screen'
import { currentAudience } from '../../roles'
import { useSetupStatus } from '../api/use-setup-status'
import { buildFeatureDetail, buildSetupView } from '../utils/setup-view'
import { AGENCY_ONLY, COULDNT_LOAD, NO_FEATURE_LIST, SETUP_FOOTER } from '../utils/setup-wording'

interface Props {
  /** `{ features }`: the registry text, composed in sanity.config.ts. Names and words, never a value. */
  options?: Record<string, unknown>
}

/**
 * The desk's Website settings → Features & setup (README, "Features & setup"): read-only, for agency
 * staff. The explanations come from the registry text bundled with Studio; what is set up comes from
 * `GET /api/setup-status`, which the server answers only after Sanity has confirmed the caller is
 * agency staff. If it can't or won't answer, every feature still shows its explanation, with no
 * status. Hiding this from clients is for relevance: the route is the boundary.
 */
export function SetupPane({ options }: Props) {
  const user = useCurrentUser()
  const agency = currentAudience(user) === 'agency'
  const { state, reload } = useSetupStatus(agency)
  const [openId, setOpenId] = useState<string | null>(null)
  const [returned, setReturned] = useState(false)
  const features = useMemo(() => (options?.features ?? []) as readonly FeatureConfig[], [options])

  const answer = state.status === 'done' ? state.answer : null
  const status = answer?.kind === 'status' ? answer.status : null
  const view = useMemo(
    () =>
      answer && answer.kind !== 'error'
        ? buildSetupView({
            features,
            status,
            noStatusReason: answer.kind === 'explanations' ? answer.reason : 'refused',
          })
        : null,
    [answer, features, status],
  )
  const openFeature = openId ? features.find((feature) => feature.id === openId) : undefined

  if (!agency) {
    return (
      <Box padding={4}>
        <Card tone="default" padding={4} radius={2} border>
          <Text size={1}>{AGENCY_ONLY}</Text>
        </Card>
      </Box>
    )
  }
  if (features.length === 0) {
    return (
      <Box padding={4}>
        <Card tone="caution" padding={4} radius={2} border role="note">
          <Text size={1}>{withCode(NO_FEATURE_LIST)}</Text>
        </Card>
      </Box>
    )
  }
  if (answer?.kind === 'error') {
    return (
      <Box padding={4}>
        <Card tone="caution" padding={4} radius={2} border role="alert">
          <Stack gap={3}>
            <Text size={1}>{COULDNT_LOAD}</Text>
            <Flex>
              <Button text="Try again" mode="ghost" fontSize={1} onClick={reload} />
            </Flex>
          </Stack>
        </Card>
      </Box>
    )
  }
  if (!view) {
    return (
      <Flex align="center" gap={3} padding={4} role="status">
        <Spinner muted />
        <Text muted size={1}>
          Loading…
        </Text>
      </Flex>
    )
  }
  if (openFeature) {
    return (
      <SetupDetail
        detail={buildFeatureDetail(openFeature, status)}
        footer={SETUP_FOOTER}
        onBack={() => {
          setReturned(true)
          setOpenId(null)
        }}
      />
    )
  }
  return <SetupList view={view} onOpen={setOpenId} returned={returned} />
}
