import { Button, Card, Flex, Stack, Text } from '@sanity/ui'

import { COMPOSED_EDGE_ROLES } from '@/lib/sanity/composed-edge'
import {
  moveLayer,
  removeLayer,
  setIndependentContour,
  updateLayer,
  type EdgeLayer,
  type EdgeValue,
} from '@/lib/sanity/composed-edge-editor'

import { ContourEditor } from './contour-editor'
import { ChoiceRow, SelectRow, SliderRow } from './controls'

const ROLE_TITLES: Record<string, string> = {
  accent: 'Primary',
  'accent-2': 'Secondary',
  highlight: 'Highlight',
  ink: 'Text',
  'ink-muted': 'Muted text',
}
const ROLES = COMPOSED_EDGE_ROLES.map((value) => ({ value, label: ROLE_TITLES[value] ?? value }))

const PLACEMENTS = [
  { value: 'above', label: 'Tint above the cut' },
  { value: 'below', label: 'Fill below the cut' },
  { value: 'stroke', label: 'Line' },
] as const

/**
 * One paint layer. Placement, paint (a site colour or a two-colour gradient), strength and the two offsets
 * are always shown; a layer can also follow its own contour instead of the shared one. The vertical offset moves
 * the layer's contour (geometry); it is separate from the edge's shadow depth, which never moves anything.
 */
export function LayerEditor({
  value,
  index,
  readOnly,
  onChange,
}: {
  value: EdgeValue
  index: number
  readOnly?: boolean
  onChange: (next: EdgeValue) => void
}) {
  const layer = value.layers?.[index]
  if (!layer) return null
  const name = `Layer ${String(index + 1)}`
  const change = (patch: Partial<EdgeLayer>) => {
    onChange(updateLayer(value, index, patch))
  }
  const paint = layer.paint ?? { kind: 'solid' as const, colour: 'accent' }
  const count = value.layers?.length ?? 0
  return (
    <Card padding={3} border radius={2} data-edge-control={`layer-${String(index)}`}>
      <Stack gap={4}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
          <Text size={1} weight="semibold" as="h4">
            {name}
          </Text>
          <Flex gap={1}>
            <Button
              type="button"
              mode="bleed"
              fontSize={1}
              padding={2}
              text="Move back"
              aria-label={`Move ${name} behind the layer before it`}
              disabled={readOnly === true || index === 0}
              onClick={() => {
                onChange(moveLayer(value, index, -1))
              }}
            />
            <Button
              type="button"
              mode="bleed"
              fontSize={1}
              padding={2}
              text="Move forward"
              aria-label={`Move ${name} in front of the layer after it`}
              disabled={readOnly === true || index === count - 1}
              onClick={() => {
                onChange(moveLayer(value, index, 1))
              }}
            />
            <Button
              type="button"
              mode="bleed"
              tone="critical"
              fontSize={1}
              padding={2}
              text="Remove"
              aria-label={`Remove ${name}`}
              disabled={readOnly}
              onClick={() => {
                onChange(removeLayer(value, index))
              }}
            />
          </Flex>
        </Flex>
        <ChoiceRow
          legend={`${name} placement`}
          control={`layer-${String(index)}-placement`}
          value={PLACEMENTS.find((item) => item.value === layer.placement)?.value}
          options={PLACEMENTS}
          disabled={readOnly}
          onChange={(placement) => {
            change({ placement })
          }}
        />
        <ChoiceRow
          legend={`${name} paint`}
          control={`layer-${String(index)}-paint`}
          value={paint.kind}
          options={[
            { value: 'solid', label: 'One colour' },
            { value: 'gradient', label: 'Gradient' },
          ]}
          disabled={readOnly}
          onChange={(kind) => {
            change({
              paint:
                kind === 'gradient'
                  ? { kind, from: 'accent', to: 'accent-2', fadeEnds: true }
                  : { kind, colour: paint.from ?? paint.colour ?? 'accent' },
            })
          }}
        />
        {paint.kind === 'gradient' ? (
          <Stack gap={3}>
            <SelectRow
              label={`${name} gradient start`}
              control={`layer-${String(index)}-from`}
              value={paint.from}
              options={ROLES}
              disabled={readOnly}
              onChange={(from) => {
                change({ paint: { ...paint, from } })
              }}
            />
            <SelectRow
              label={`${name} gradient end`}
              control={`layer-${String(index)}-to`}
              value={paint.to}
              options={ROLES}
              disabled={readOnly}
              onChange={(to) => {
                change({ paint: { ...paint, to } })
              }}
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={paint.fadeEnds !== false}
                disabled={readOnly}
                onChange={(event) => {
                  change({ paint: { ...paint, fadeEnds: event.currentTarget.checked } })
                }}
              />
              Fade out at both ends
            </label>
          </Stack>
        ) : (
          <SelectRow
            label={`${name} colour`}
            control={`layer-${String(index)}-colour`}
            value={paint.colour ?? 'accent'}
            options={ROLES}
            disabled={readOnly}
            onChange={(colour) => {
              change({ paint: { ...paint, colour } })
            }}
          />
        )}
        <SliderRow
          label={`${name} strength`}
          control={`layer-${String(index)}-opacity`}
          value={layer.opacity ?? 100}
          min={0}
          max={100}
          disabled={readOnly}
          hint="At 0% the layer is not drawn."
          onChange={(opacity) => {
            change({ opacity })
          }}
        />
        {layer.placement === 'stroke' && (
          <SliderRow
            label={`${name} line width`}
            control={`layer-${String(index)}-width`}
            value={layer.strokeWidth ?? 2}
            min={1}
            max={6}
            unit=" px"
            disabled={readOnly}
            onChange={(strokeWidth) => {
              change({ strokeWidth })
            }}
          />
        )}
        <SliderRow
          label={`${name} vertical offset`}
          control={`layer-${String(index)}-offset-y`}
          value={layer.offsetY ?? 0}
          min={-30}
          max={30}
          disabled={readOnly}
          hint="Moves this layer’s contour up or down. It stops at the band’s top and bottom, and the cut never moves."
          onChange={(offsetY) => {
            change({ offsetY })
          }}
        />
        <SliderRow
          label={`${name} horizontal offset`}
          control={`layer-${String(index)}-offset-x`}
          value={layer.offsetX ?? 0}
          min={-8}
          max={8}
          disabled={readOnly}
          onChange={(offsetX) => {
            change({ offsetX })
          }}
        />
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={Boolean(layer.contour)}
            disabled={readOnly}
            onChange={(event) => {
              onChange(setIndependentContour(value, index, event.currentTarget.checked))
            }}
          />
          Follow its own contour instead of the shared one
        </label>
        {layer.contour && (
          <ContourEditor
            contour={layer.contour}
            label={`${name} contour`}
            control={`layer-${String(index)}-contour`}
            readOnly={readOnly}
            onChange={(contour) => {
              change({ contour })
            }}
          />
        )}
      </Stack>
    </Card>
  )
}
