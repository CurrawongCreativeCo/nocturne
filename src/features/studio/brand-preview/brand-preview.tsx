'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Inline,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Text,
  TextInput,
  ThemeProvider,
} from '@sanity/ui'
import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'

import type { Scheme } from '@/config/studio-brand/types'

import { brandPreviewCases, sampleAssets, type BrandPreviewCase } from './cases'
import { LaunchExample } from './launch-example'
import { PickerExamples } from './picker-examples'
import { ThumbnailGallery, type SectionPreview } from './thumbnail-gallery'
import { StudioLogoView } from '../components/studio-logo'
import { buildStudioTheme } from '../theme'
import { toUiTheme } from '../utils/ui-theme'

const SCHEMES: Scheme[] = ['light', 'dark']
const BADGE_TONES = ['default', 'primary', 'positive', 'caution', 'critical'] as const
const COLOUR_ROLES = ['accentFill', 'onAccent', 'accentText', 'focus'] as const

const noopSubscribe = () => () => undefined

/**
 * Sanity UI draws with styled-components, whose styles Next.js doesn't collect on the server (Studio
 * itself is client-only). Rendering the kit after hydration keeps the server HTML and the client's
 * identical, and `data-ready` tells tests when it is there.
 */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

/** A stand-in for Studio's navbar: the logo, a few tools and a search field. */
function MockNavbar({ item, scheme }: { item: BrandPreviewCase; scheme: Scheme }) {
  return (
    <Card as="nav" aria-label={`${item.label}, ${scheme} navbar`} padding={3} border radius={2}>
      <Flex align="center" gap={4}>
        <StudioLogoView brand={item.brand} scheme={scheme} assets={sampleAssets} />
        <Inline gap={1}>
          <Button text="Structure" mode="bleed" selected />
          <Button text="Vision" mode="bleed" />
        </Inline>
      </Flex>
    </Card>
  )
}

function ComponentKit({ item, scheme }: { item: BrandPreviewCase; scheme: Scheme }) {
  const key = `${item.id}-${scheme}`
  const [tab, setTab] = useState<'content' | 'settings'>('content')

  return (
    <Stack gap={5}>
      <MockNavbar item={item} scheme={scheme} />

      <Inline gap={2} data-kit="buttons">
        <Button text="Default" />
        <Button text="Primary" tone="primary" data-kit-button="primary" />
        <Button text="Ghost" mode="ghost" />
        <Button text="Disabled" disabled />
      </Inline>

      <Box style={{ maxWidth: 320 }}>
        <TextInput
          aria-label={`Title, ${item.label}, ${scheme}`}
          placeholder="Focus me"
          data-kit-input=""
        />
      </Box>

      <Stack gap={3}>
        <TabList gap={1}>
          <Tab
            id={`tab-content-${key}`}
            aria-controls={`panel-content-${key}`}
            label="Content"
            selected={tab === 'content'}
            onClick={() => {
              setTab('content')
            }}
          />
          <Tab
            id={`tab-settings-${key}`}
            aria-controls={`panel-settings-${key}`}
            label="Settings"
            selected={tab === 'settings'}
            onClick={() => {
              setTab('settings')
            }}
          />
        </TabList>
        <TabPanel
          id={`panel-content-${key}`}
          aria-labelledby={`tab-content-${key}`}
          hidden={tab !== 'content'}
        >
          <Text size={1}>Content tab panel</Text>
        </TabPanel>
        <TabPanel
          id={`panel-settings-${key}`}
          aria-labelledby={`tab-settings-${key}`}
          hidden={tab !== 'settings'}
        >
          <Text size={1}>Settings tab panel</Text>
        </TabPanel>
      </Stack>

      <Card selected padding={3} border radius={2} data-kit="selected-card">
        <Text size={1}>A selected card</Text>
      </Card>

      <Inline gap={2} data-kit="badges">
        {BADGE_TONES.map((tone) => (
          <Badge key={tone} tone={tone}>
            {tone}
          </Badge>
        ))}
      </Inline>

      {/* Dialog-style, but in the flow: a real Dialog portals to the body and covers the page. */}
      <Card role="group" aria-label="Dialog example" padding={4} radius={3} shadow={3} border>
        <Stack gap={4}>
          <Heading as="h4" size={1}>
            Publish this page?
          </Heading>
          <Text size={1} muted>
            Editors will see the change straight away.
          </Text>
          <Inline gap={2}>
            <Button text="Cancel" mode="bleed" />
            <Button text="Publish" tone="primary" />
          </Inline>
        </Stack>
      </Card>
    </Stack>
  )
}

/** The resolved colours and any adjustment made to them, so a reader sees what a case did. */
function ColourNotes({ item, scheme }: { item: BrandPreviewCase; scheme: Scheme }) {
  const roles = item.brand[scheme]
  const warnings = item.brand.warnings.filter((warning) => warning.scheme === scheme)
  return (
    <Stack gap={3} data-colour-notes="">
      <Inline gap={3}>
        {COLOUR_ROLES.map((role) => (
          <Flex key={role} align="center" gap={2}>
            <span
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: '1px solid currentColor',
                background: roles[role],
              }}
            />
            <Text size={0} data-role={role} data-hex={roles[role]}>
              {role} {roles[role]}
            </Text>
          </Flex>
        ))}
      </Inline>
      {warnings.length > 0 ? (
        <Stack as="ul" gap={2} style={{ margin: 0, paddingLeft: 16 }} data-warnings="">
          {warnings.map((warning) => (
            <Text as="li" size={0} key={`${warning.role}-${warning.colour}`}>
              {warning.message}
            </Text>
          ))}
        </Stack>
      ) : null}
    </Stack>
  )
}

function PreviewSection({ item, scheme }: { item: BrandPreviewCase; scheme: Scheme }) {
  const headingId = `heading-${item.id}-${scheme}`
  // One theme per case, as Studio would build it for that studio-brand.json.
  const theme = useMemo(() => {
    const built = buildStudioTheme(item.brand)
    return built ? toUiTheme(built) : undefined
  }, [item.brand])

  if (!theme) {
    return (
      <p>
        buildLegacyTheme is not available in this Sanity version; the Studio uses its default theme.
      </p>
    )
  }

  return (
    <section aria-labelledby={headingId} data-case={item.id} data-scheme={scheme}>
      <ThemeProvider scheme={scheme} theme={theme}>
        <Card padding={4} radius={3} border>
          <Stack gap={5}>
            <Heading as="h3" size={1} id={headingId}>
              {item.label}, {scheme}
            </Heading>
            <ColourNotes item={item} scheme={scheme} />
            <ComponentKit item={item} scheme={scheme} />
          </Stack>
        </Card>
      </ThemeProvider>
    </section>
  )
}

/**
 * Studio inputs from other features, composed by the route (features can't import each other),
 * shown under the first case's light theme so they get the same Sanity UI context as in Studio.
 */
function InputExamples({
  children,
  sections,
}: {
  children: ReactNode
  sections: readonly SectionPreview[]
}) {
  const theme = useMemo(() => {
    const first = brandPreviewCases[0]
    const built = first ? buildStudioTheme(first.brand) : undefined
    return built ? toUiTheme(built) : undefined
  }, [])
  if (!theme) return null
  return (
    <section aria-labelledby="input-examples" className="mt-12">
      <h2 id="input-examples" className="text-h4 font-semibold">
        Studio inputs
      </h2>
      <div className="mt-6">
        <ThemeProvider scheme="light" theme={theme}>
          {children}
        </ThemeProvider>
      </div>
      <h3 className="mt-10 text-base font-semibold">Preset picker</h3>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {SCHEMES.map((scheme) => (
          <div key={scheme} data-picker-scheme={scheme}>
            <ThemeProvider scheme={scheme} theme={theme}>
              <Card padding={4} radius={3} border>
                <PickerExamples />
              </Card>
            </ThemeProvider>
          </div>
        ))}
      </div>
      <h3 className="mt-10 text-base font-semibold">Preset picker thumbnails</h3>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {SCHEMES.map((scheme) => (
          <div key={scheme} data-thumbnail-scheme={scheme}>
            <ThemeProvider scheme={scheme} theme={theme}>
              <Card padding={4} radius={3} border>
                <ThumbnailGallery sections={sections} />
              </Card>
            </ThemeProvider>
          </div>
        ))}
      </div>
      <h3 className="mt-10 text-base font-semibold">Launch &amp; visibility</h3>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {SCHEMES.map((scheme) => (
          <div key={scheme} data-launch-scheme={scheme}>
            <ThemeProvider scheme={scheme} theme={theme}>
              <Card padding={2} radius={3} border>
                <LaunchExample audience="agency" />
              </Card>
              <Card padding={2} radius={3} border marginTop={4}>
                <LaunchExample audience="client" />
              </Card>
            </ThemeProvider>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Every case in light and dark, each under the theme Studio would receive for it. */
export function BrandPreview({
  children,
  sections = [],
}: {
  children?: ReactNode
  /** The section types, for the insert-menu pictures. Composed by the route: features can't import each other. */
  sections?: readonly SectionPreview[]
}) {
  const hydrated = useHydrated()

  return (
    <main className="max-w-measure-wide mx-auto px-gutter py-section" data-ready={hydrated}>
      <h1 className="text-h3 font-semibold">Studio brand preview</h1>
      <p className="mt-4 text-ink-muted">
        Sanity UI under the theme Studio receives for each CMS brand, in light and dark. For tests;
        see “Studio brand preview” in the README.
      </p>
      {hydrated
        ? brandPreviewCases.map((item) => (
            <section key={item.id} aria-labelledby={`case-${item.id}`} className="mt-12">
              <h2 id={`case-${item.id}`} className="text-h4 font-semibold">
                {item.label}
              </h2>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {SCHEMES.map((scheme) => (
                  <PreviewSection key={scheme} item={item} scheme={scheme} />
                ))}
              </div>
            </section>
          ))
        : null}
      {hydrated && children ? <InputExamples sections={sections}>{children}</InputExamples> : null}
    </main>
  )
}
