import { Button, Card, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useRef, useState } from 'react'
import { set, unset, type ObjectInputProps } from 'sanity'

import { BADGE_ICONS } from '@/lib/sanity/badge-icons'
import { COMPOSED_EDGE_HEIGHTS } from '@/lib/sanity/composed-edge'
import {
  addLayer,
  cannotAddLayer,
  describeEdge,
  edgeProblems,
  startingEdge,
  type EdgeValue,
} from '@/lib/sanity/composed-edge-editor'

import { CentrePicture, pictureRef } from './centre-picture'
import { ContourEditor } from './contour-editor'
import { ChoiceRow, NATIVE, Group, SelectRow, SliderRow } from './controls'
import { DesignBar } from './design-bar'
import { LayerEditor } from './layer-editor'
import { EdgePreview } from './preview'

const HEIGHT_TITLES = { small: 'Small', medium: 'Medium', large: 'Large' } as const

/** What the centre currently is, for noticing that the selection changed (kind, or which picture). */
const centreChoice = (edge: EdgeValue | undefined) =>
  `${edge?.centre?.kind ?? 'none'}|${pictureRef(edge?.centre) ?? ''}`

/**
 * The one Section edge editor (composable section edges, Task 2). Basic controls come first (what it is, how
 * tall, how wide, the starting design); the contour, layers, centre and shadow follow in labelled groups, and
 * site designs last. Every change is written as one patch to `style.composedEdge`, through the model in
 * lib/sanity/composed-edge-editor.ts, which only produces compositions `resolveComposedEdge` accepts. The
 * preview draws that resolver's own result, so what it shows is what the page draws.
 *
 * While nothing is stored the section keeps its saved shape (the Bottom edge choice above). A stored edge that
 * cannot draw is listed with the control that fixes it, and until it is fixed the page keeps drawing the saved
 * shape; "Remove custom edge" clears it. Undo steps back through this editor's own changes.
 */
export function SectionEdgeInput(props: ObjectInputProps) {
  const { value, onChange, readOnly } = props
  const stored = value as EdgeValue | null | undefined
  const hasValue =
    stored !== undefined && stored !== null && Object.keys(stored).some((k) => !k.startsWith('_'))
  const problems = hasValue ? edgeProblems(stored) : []
  const edge = hasValue && problems.length === 0 ? stored : undefined
  const history = useRef<(EdgeValue | undefined)[]>([])
  const [undoable, setUndoable] = useState(0)
  // The newest value, for work that finishes later (a picture upload): its callback was made when the upload
  // started, and must not write back the edge as it was then.
  const latest = useRef({ stored, hasValue, edge })
  useEffect(() => {
    latest.current = { stored, hasValue, edge }
  })
  // Tickets for pending picture uploads. A result counts only while its ticket is the newest, and the number
  // moves on whenever the centre selection is cleared or replaced (another kind, another picture, a removed
  // edge, Undo), so an earlier upload that finishes last cannot take the place of a later choice.
  const tickets = useRef(0)
  // A problem names the control that fixes it. While the stored edge cannot draw, only Reset and Remove are
  // shown, so a control that is not on the page falls back to Reset, which always is.
  const focusTo = (control: string) => {
    const find = (name: string) =>
      document.querySelector<HTMLElement>(`[data-edge-control="${name}"]`)
    const target = find(control) ?? find('reset')
    target?.scrollIntoView({ block: 'center' })
    const focusable = target?.matches('button, input, select, [tabindex]')
      ? target
      : target?.querySelector<HTMLElement>('input, select, [tabindex="0"], button')
    focusable?.focus()
  }

  const write = (next: EdgeValue | undefined) => {
    const now = latest.current
    if (centreChoice(now.edge) !== centreChoice(next)) tickets.current += 1
    history.current.push(now.hasValue ? (now.stored ?? undefined) : undefined)
    setUndoable(history.current.length)
    onChange(next ? set(next) : unset())
  }
  const undo = () => {
    if (!history.current.length) return
    const previous = history.current.pop()
    tickets.current += 1
    setUndoable(history.current.length)
    onChange(previous ? set(previous) : unset())
  }

  const header = (
    <Stack gap={3}>
      <Text size={1} muted>
        Draw this section’s bottom edge yourself: one contour, up to three paint layers, an optional
        centre and a shadow. While a custom edge draws, the Bottom edge choice above is kept but not
        drawn.
      </Text>
      <EdgePreview value={edge} />
      <Flex gap={2} wrap="wrap" align="center">
        {edge ? (
          <Text size={1} data-edge-summary="">
            {describeEdge(edge)}
          </Text>
        ) : (
          <Text size={1} muted>
            {hasValue
              ? 'Not drawn yet: fix the problems below.'
              : 'No custom edge: the section uses its Bottom edge choice.'}
          </Text>
        )}
      </Flex>
    </Stack>
  )

  const toolbar = (
    <Flex gap={2} wrap="wrap">
      {!hasValue && (
        <Button
          type="button"
          tone="primary"
          fontSize={1}
          padding={3}
          text="Start from the starting design"
          disabled={readOnly}
          onClick={() => {
            write(startingEdge())
          }}
        />
      )}
      <Button
        type="button"
        mode="ghost"
        fontSize={1}
        padding={2}
        text="Undo last change"
        disabled={readOnly === true || undoable === 0}
        data-edge-control="undo"
        onClick={undo}
      />
      {hasValue && (
        <>
          <Button
            type="button"
            mode="ghost"
            fontSize={1}
            padding={2}
            text="Reset to the starting design"
            disabled={readOnly}
            data-edge-control="reset"
            onClick={() => {
              write(startingEdge())
            }}
          />
          <Button
            type="button"
            mode="ghost"
            tone="critical"
            fontSize={1}
            padding={2}
            text="Remove custom edge"
            disabled={readOnly}
            onClick={() => {
              write(undefined)
            }}
          />
        </>
      )}
    </Flex>
  )

  if (!edge) {
    return (
      <Stack gap={4} data-section-edge-editor="">
        {header}
        {problems.length > 0 && <Problems problems={problems} onGo={focusTo} />}
        {toolbar}
        {hasValue && (
          <DesignBar
            value={stored}
            problems={problems.length}
            readOnly={readOnly}
            onApply={write}
          />
        )}
        {!hasValue && (
          <DesignBar value={startingEdge()} problems={1} readOnly={readOnly} onApply={write} />
        )}
      </Stack>
    )
  }

  const patch = (change: Partial<EdgeValue>) => {
    write({ ...edge, ...change })
  }
  const centre = edge.centre
  const shadow = edge.shadow
  const shadowOn = Boolean(shadow)
  return (
    <Stack gap={5} data-section-edge-editor="">
      {header}
      {toolbar}
      <Group legend="Basics">
        <ChoiceRow
          legend="What it is"
          control="mode"
          value={edge.mode}
          options={[
            { value: 'transition', label: 'Transition (cuts into the next section)' },
            { value: 'rule', label: 'Rule (a band that stays inside this section)' },
          ]}
          disabled={readOnly}
          onChange={(mode) => {
            patch({ mode })
          }}
        />
        <ChoiceRow
          legend="Height (smaller on phones)"
          control="height"
          value={(edge.height ?? 'medium') as (typeof COMPOSED_EDGE_HEIGHTS)[number]}
          options={COMPOSED_EDGE_HEIGHTS.map((value) => ({ value, label: HEIGHT_TITLES[value] }))}
          disabled={readOnly}
          onChange={(height) => {
            patch({ height })
          }}
        />
        <SliderRow
          label="Width of the artwork"
          control="width"
          value={edge.width ?? 100}
          min={5}
          max={100}
          disabled={readOnly}
          hint="The cut always spans the whole section; this limits where the layers, lines and centre are drawn."
          onChange={(width) => {
            patch({ width })
          }}
        />
        {(edge.width ?? 100) < 100 && (
          <ChoiceRow
            legend="Where the artwork sits"
            control="align"
            value={(edge.align ?? 'center') as 'start' | 'center' | 'end'}
            options={[
              { value: 'start', label: 'Left' },
              { value: 'center', label: 'Centre' },
              { value: 'end', label: 'Right' },
            ]}
            disabled={readOnly}
            onChange={(align) => {
              patch({ align })
            }}
          />
        )}
      </Group>

      <Group
        legend="Contour"
        hint="The cut: a line across the band. Layers follow it unless they have their own."
      >
        <ContourEditor
          contour={edge.contour}
          label="Shared contour"
          control="contour"
          readOnly={readOnly}
          onChange={(contour) => {
            patch({ contour })
          }}
        />
      </Group>

      <Group
        legend="Paint layers"
        hint="Up to three. Later layers are drawn in front of earlier ones in the same placement."
      >
        {(edge.layers ?? []).map((layer, index) => (
          <LayerEditor
            key={layer._key}
            value={edge}
            index={index}
            readOnly={readOnly}
            onChange={write}
          />
        ))}
        {(edge.layers ?? []).length === 0 && (
          <Text size={1} muted>
            No paint layers. The cut and shadow still draw, but a centre needs a layer to open.
          </Text>
        )}
        <Flex gap={3} align="center" wrap="wrap">
          <Button
            type="button"
            mode="ghost"
            fontSize={1}
            padding={2}
            text="Add a paint layer"
            disabled={readOnly === true || Boolean(cannotAddLayer(edge))}
            data-edge-control="layers"
            onClick={() => {
              write(addLayer(edge))
            }}
          />
          {cannotAddLayer(edge) && (
            <Text size={1} muted>
              {cannotAddLayer(edge)}
            </Text>
          )}
        </Flex>
      </Group>

      <Group
        legend="Centre"
        hint="An icon or picture in the middle of the artwork, with the layers opened around it. It is decorative."
      >
        <ChoiceRow
          legend="Centre"
          control="centre-kind"
          value={centre?.kind ?? 'none'}
          options={[
            { value: 'none', label: 'None' },
            { value: 'icon', label: 'Icon' },
            { value: 'image', label: 'Picture' },
          ]}
          disabled={readOnly}
          onChange={(kind) => {
            if (kind === 'none') {
              const { centre: _centre, ...rest } = edge
              write(rest)
            } else patch({ centre: { ...centre, kind, gap: centre?.gap ?? 20 } })
          }}
        />
        {centre?.kind === 'icon' && (
          <SelectRow
            label="Icon"
            control="centre-icon"
            value={centre.icon}
            options={BADGE_ICONS.map((icon) => ({ value: icon.value, label: icon.title }))}
            disabled={readOnly}
            onChange={(icon) => {
              patch({ centre: { ...centre, icon } })
            }}
          />
        )}
        {centre?.kind === 'image' && (
          <CentrePicture
            centre={centre}
            readOnly={readOnly}
            begin={() => (tickets.current += 1)}
            onPick={(ref, ticket) => {
              // Attach to the edge as it is now, unless the selection has since been cleared or replaced.
              const now = latest.current.edge
              if (ticket !== tickets.current || !now || now.centre?.kind !== 'image') return false
              write({
                ...now,
                centre: {
                  ...now.centre,
                  image: { _type: 'image', asset: { _type: 'reference', _ref: ref } },
                },
              })
              return true
            }}
            onClear={() => {
              const { image: _image, ...rest } = centre
              patch({ centre: rest })
            }}
          />
        )}
        {centre?.kind && (
          <SliderRow
            label="Opening width"
            control="centre-gap"
            value={centre.gap ?? 20}
            min={10}
            max={60}
            disabled={readOnly}
            hint="How much of the artwork is opened around the centre."
            onChange={(gap) => {
              patch({ centre: { ...centre, gap } })
            }}
          />
        )}
        {centre?.kind && (
          <Text size={1} muted>
            {centre.kind === 'icon' && !centre.icon
              ? 'Choose an icon, or the artwork draws without a centre.'
              : 'If the picture is missing, the artwork draws without a centre.'}
          </Text>
        )}
      </Group>

      <Group
        legend="Shadow depth"
        hint={
          edge.mode === 'rule'
            ? 'A rule has no shadow.'
            : 'A soft shadow cast onto the next section. It never moves the cut or any layer: use Vertical offset on a layer for that.'
        }
      >
        {edge.mode === 'transition' && (
          <>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                style={NATIVE}
                checked={shadowOn}
                disabled={readOnly}
                data-edge-control="shadow"
                onChange={(event) => {
                  if (event.currentTarget.checked)
                    patch({ shadow: { blur: 6, distance: 8, opacity: 28 } })
                  else {
                    const { shadow: _shadow, ...rest } = edge
                    write(rest)
                  }
                }}
              />
              Cast a shadow
            </label>
            {shadow && (
              <>
                <SliderRow
                  label="Shadow blur"
                  control="shadow-blur"
                  value={shadow.blur ?? 8}
                  min={1}
                  max={23}
                  disabled={readOnly}
                  onChange={(blur) => {
                    patch({ shadow: { ...shadow, blur } })
                  }}
                />
                <SliderRow
                  label="Shadow distance"
                  control="shadow-distance"
                  value={shadow.distance ?? 8}
                  min={0}
                  max={25}
                  disabled={readOnly}
                  onChange={(distance) => {
                    patch({ shadow: { ...shadow, distance } })
                  }}
                />
                <SliderRow
                  label="Shadow strength"
                  control="shadow-opacity"
                  value={shadow.opacity ?? 28}
                  min={0}
                  max={65}
                  disabled={readOnly}
                  onChange={(opacity) => {
                    patch({ shadow: { ...shadow, opacity } })
                  }}
                />
              </>
            )}
          </>
        )}
      </Group>

      <DesignBar value={edge} problems={0} readOnly={readOnly} onApply={write} />
    </Stack>
  )
}

function Problems({
  problems,
  onGo,
}: {
  problems: { control: string; message: string }[]
  onGo: (control: string) => void
}) {
  return (
    <Card padding={3} radius={2} tone="caution" border role="alert" data-edge-problems="">
      <Stack gap={2}>
        <Text size={1} weight="semibold">
          This custom edge cannot be drawn, so the page uses the Bottom edge choice instead:
        </Text>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {problems.map((problem) => (
            <li key={`${problem.control}-${problem.message}`}>
              {problem.message}{' '}
              <button
                type="button"
                onClick={() => {
                  onGo(problem.control)
                }}
                style={{ fontSize: 13 }}
              >
                Go to the fix
              </button>
            </li>
          ))}
        </ul>
        <Text size={1} muted>
          Use Reset to the starting design or Remove custom edge to clear it.
        </Text>
      </Stack>
    </Card>
  )
}
