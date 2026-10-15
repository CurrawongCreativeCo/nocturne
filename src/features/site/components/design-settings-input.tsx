'use client'

import { Card, Stack, Text } from '@sanity/ui'
import { useFormValue, type ObjectInputProps } from 'sanity'

import { resolveDesignTokens, type DesignOverrides } from '../utils/resolve-design-tokens'

/**
 * A small mock-up of the site in the colours being edited, above the form. It reads the same
 * resolveDesignTokens the site does, so it is a faithful (if simplified) preview; the Presentation
 * tool shows the real pages. The colours are the editor's, so they are inline on purpose.
 */
export function DesignSettingsInput(props: ObjectInputProps) {
  const document = useFormValue([]) as DesignOverrides | undefined
  const { colours, vars } = resolveDesignTokens(document)
  const gradients = Object.entries(vars).filter(([name]) => name.startsWith('--gradient-'))

  const band = (background: string, color: string, label: string, muted?: string) => (
    <div style={{ background, color, padding: '12px 16px' }}>
      <strong style={{ display: 'block', fontSize: 14 }}>{label}</strong>
      <span style={{ fontSize: 12, color: muted ?? color }}>
        Supporting text on this background
      </span>
    </div>
  )

  return (
    <Stack gap={5}>
      <Card padding={3} radius={2} border>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Preview
          </Text>
          <div
            role="img"
            aria-label="A mock-up of the site in the chosen colours: a page with a heading, body text, a button, a highlight, then alternate, inverse and primary sections"
            style={{
              border: `1px solid ${colours.line}`,
              borderRadius: 8,
              overflow: 'hidden',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div style={{ background: colours.surface, color: colours.ink, padding: 16 }}>
              <div
                style={{
                  color: colours.accentText,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 1,
                }}
              >
                EYEBROW
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>A heading</div>
              <div style={{ color: colours.inkMuted, fontSize: 14 }}>
                Body text in the muted ink, with a{' '}
                <span
                  style={{
                    background: colours.highlight,
                    color: colours.highlightInk,
                    padding: '0 4px',
                  }}
                >
                  highlight
                </span>{' '}
                and a{' '}
                <span
                  style={{
                    background: colours.accent2,
                    color: colours.accent2Ink,
                    padding: '0 4px',
                  }}
                >
                  secondary
                </span>{' '}
                tag.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <span
                  style={{
                    background: colours.cta,
                    color: colours.ctaInk,
                    borderRadius: 999,
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Primary button
                </span>
                <span
                  style={{
                    border: `1px solid ${colours.line}`,
                    color: colours.ink,
                    borderRadius: 999,
                    padding: '6px 16px',
                    fontSize: 13,
                  }}
                >
                  Secondary button
                </span>
              </div>
            </div>
            {band(colours.surfaceAlt, colours.ink, 'Alternate background', colours.inkMuted)}
            {band(
              colours.surfaceInverse,
              colours.inkInverse,
              'Inverse section',
              colours.inkInverseMuted,
            )}
            {band(colours.accent, colours.accentInk, 'Primary section')}
            {gradients.map(([name, value]) => (
              <div key={name} style={{ background: value, height: 20 }} title={name.slice(2)} />
            ))}
          </div>
        </Stack>
      </Card>
      {props.renderDefault(props)}
    </Stack>
  )
}
