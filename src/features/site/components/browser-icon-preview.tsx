'use client'

import { Card, Stack, Text } from '@sanity/ui'

/** Icon URLs at the sizes the preview shows. */
export interface BrowserIconPreviewSources {
  size16: string
  size32: string
  size180: string
}

/**
 * What a browser shows is outside our control, so these are simple mock-ups: the browser chrome
 * colours below are fixed on purpose (a light and a dark tab strip), not Studio theme colours.
 */
const MOCKUPS = [
  { id: 'light', label: 'Light browser', chrome: '#dee1e6', tab: '#ffffff', ink: '#1f1f1f' },
  { id: 'dark', label: 'Dark browser', chrome: '#202124', tab: '#35363a', ink: '#f1f3f4' },
] as const

function Mockup({
  mockup,
  siteName,
  sources,
}: {
  mockup: (typeof MOCKUPS)[number]
  siteName: string
  sources: BrowserIconPreviewSources
}) {
  const { id, label, chrome, tab, ink } = mockup
  return (
    <div
      role="group"
      aria-label={`${label}: the icon at 16, 32 and 180 pixels`}
      style={{ background: chrome, borderRadius: 8, padding: '8px 8px 12px', flex: '1 1 240px' }}
    >
      <div
        style={{
          background: tab,
          color: ink,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: '8px 8px 0 0',
          fontSize: 12,
          maxWidth: 220,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a preview of the CDN image, at its real size */}
        <img src={sources.size16} width={16} height={16} alt={`Icon at 16 pixels, ${id} tab`} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {siteName}
        </span>
      </div>
      <div
        style={{
          background: tab,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          padding: 12,
          borderRadius: '0 8px 8px 8px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a preview of the CDN image, at its real size */}
        <img src={sources.size32} width={32} height={32} alt={`Icon at 32 pixels, ${id} tab`} />
        {/* eslint-disable-next-line @next/next/no-img-element -- a preview of the CDN image, at its real size */}
        <img
          src={sources.size180}
          width={90}
          height={90}
          alt={`Phone home screen icon, ${id} (shown at half of its 180 pixels)`}
          style={{ borderRadius: 20 }}
        />
      </div>
    </div>
  )
}

/**
 * The icon at 16 px (tab), 32 px (bookmarks, high-density tab) and 180 px (phone home screen,
 * drawn at half size here to fit), on a light and a dark browser. The pictures are the CDN's own
 * output, so what the editor sees is what visitors get.
 */
export function BrowserIconPreview({
  siteName,
  sources,
  note,
}: {
  siteName: string
  sources: BrowserIconPreviewSources
  note?: string
}) {
  return (
    <Card padding={3} border radius={2} data-browser-icon-preview>
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          Preview
        </Text>
        {note && (
          <Text size={1} muted>
            {note}
          </Text>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {MOCKUPS.map((mockup) => (
            <Mockup key={mockup.id} mockup={mockup} siteName={siteName} sources={sources} />
          ))}
        </div>
      </Stack>
    </Card>
  )
}
