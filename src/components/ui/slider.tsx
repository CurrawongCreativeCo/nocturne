'use client'

import {
  animate,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type PanInfo,
} from 'motion/react'
import * as m from 'motion/react-m'
import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'

import { snapIndex, stopCount, trackOffset } from './slider-snap'

type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl'
/** Slides in view at each Tailwind breakpoint; a missing one keeps the smaller one's count. */
export type SliderPerView = Partial<Record<Breakpoint, number>>

interface Props {
  /** Names the carousel for screen readers, e.g. "Customer testimonials". */
  label: string
  perView?: SliderPerView
  /** Space between slides. */
  gap?: boolean
  /**
   * Milliseconds between automatic slides. Off by default. It pauses on hover and focus, has a
   * visible Pause button, and never runs for visitors who ask for less motion.
   */
  autoplay?: number
  className?: string
  /** One child per slide. */
  children: ReactNode
}

const BREAKPOINTS: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl']
const DEFAULT_PER_VIEW: SliderPerView = { base: 1 }

/** A drag shorter than this (px) is still a click on the slide's content. */
const CLICK_SLOP = 5
const SPRING = { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 } as const

interface Metrics {
  /** Distance between slide starts (px), gap included. */
  step: number
  /** How far the track can travel (px). */
  maxScroll: number
  /** Resting positions. */
  stops: number
  /** Slides visible at once. */
  perView: number
}

const sameMetrics = (a: Metrics | null, b: Metrics) =>
  a !== null &&
  a.stops === b.stops &&
  a.perView === b.perView &&
  Math.abs(a.step - b.step) < 0.5 &&
  Math.abs(a.maxScroll - b.maxScroll) < 0.5

/** CSS variables for each breakpoint's count, filled forward so every one is defined. */
function perViewVars(perView: SliderPerView, gap: boolean): CSSProperties {
  const vars: Record<string, string | number> = { '--slider-gap': gap ? '1.5rem' : '0px' }
  let current = Math.max(1, Math.floor(perView.base ?? 1))
  for (const breakpoint of BREAKPOINTS) {
    const value = perView[breakpoint]
    if (value) current = Math.max(1, Math.floor(value))
    vars[`--sv-${breakpoint}`] = current
  }
  return vars
}

// Full class names so Tailwind's scanner sees them. The slide's width is its share of the row
// after the gaps: the same in the server HTML, the scroll fallback and the dragged track, so
// nothing moves when the script takes over.
const TRACK_CLASS =
  'flex gap-x-(--slider-gap) [--per-view:var(--sv-base)] sm:[--per-view:var(--sv-sm)] md:[--per-view:var(--sv-md)] lg:[--per-view:var(--sv-lg)] xl:[--per-view:var(--sv-xl)]'
const SLIDE_CLASS =
  'flex flex-none basis-[calc((100%_-_(var(--per-view)_-_1)_*_var(--slider-gap))_/_var(--per-view))] snap-start'

const buttonClass =
  'grid size-11 place-items-center rounded-pill text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-alt disabled:opacity-40 disabled:hover:bg-transparent'

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="size-5 fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'left' ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'} />
    </svg>
  )
}

/**
 * A touch slider (carousel) on Motion's drag. Without JavaScript the slides are a horizontal
 * scroll-snap list, so every one is reachable; once hydrated the track takes over (drag, buttons,
 * arrow keys), with the same widths so nothing shifts. Slides out of view are `inert`, so Tab never
 * lands on hidden content. See README, "Slider".
 */
export function Slider({
  label,
  perView = DEFAULT_PER_VIEW,
  gap = false,
  autoplay,
  className = '',
  children,
}: Props) {
  const slides = Children.toArray(children)
  const count = slides.length

  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const previousRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  // The slide to slide spring is a standalone animation, so the buttons and arrow keys also work in
  // the moments before LazyMotion has downloaded its features (which drag needs).
  const animation = useRef<AnimationPlaybackControls>(null)

  // Null until the first client measurement: the server HTML and the hydration render are the scroll fallback.
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [index, setIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [playing, setPlaying] = useState(true)

  const indexRef = useRef(0)
  const metricsRef = useRef<Metrics | null>(null)
  const draggedRef = useRef(false)
  const draggingRef = useRef(false)

  const ready = metrics !== null
  const stops = metrics?.stops ?? 1

  const moveTo = useCallback(
    (target: number, announce: boolean) => {
      const current = metricsRef.current
      if (!current) return
      const next = Math.min(Math.max(target, 0), current.stops - 1)
      const offset = trackOffset(next, current.step, current.maxScroll)
      indexRef.current = next
      setIndex(next)
      if (announce) setAnnouncement(`Slide ${next + 1} of ${count}`)

      // A zero-length animation rather than `jump`: after a drag, Motion's own release (which for
      // visitors who ask for less motion is applied a frame late) must not land after ours.
      animation.current = animate(x, offset, reduceMotion ? { duration: 0 } : SPRING)

      // A disabled button drops focus; hand it to the other one so keyboard users keep their place.
      const active = document.activeElement
      if (next === 0 && active === previousRef.current) nextRef.current?.focus()
      if (next === current.stops - 1 && active === nextRef.current) previousRef.current?.focus()
    },
    [count, reduceMotion, x],
  )

  // Measures the viewport and track, now and whenever either changes size.
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    const first = track?.firstElementChild
    if (!viewport || !track || !first) return

    const measure = () => {
      const columnGap = parseFloat(getComputedStyle(track).columnGap) || 0
      const slideWidth = first.getBoundingClientRect().width
      const step = slideWidth + columnGap
      if (step <= 0) return
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
      const next: Metrics = {
        step,
        maxScroll,
        stops: stopCount(maxScroll, step),
        perView: Math.max(1, Math.round((track.clientWidth + columnGap) / step)),
      }

      // First measurement: carry over wherever the scroll fallback was scrolled to.
      if (metricsRef.current === null) {
        const start = Math.min(Math.round(viewport.scrollLeft / step), next.stops - 1)
        viewport.scrollLeft = 0
        indexRef.current = start
        setIndex(start)
      }
      if (sameMetrics(metricsRef.current, next)) return
      metricsRef.current = next
      setMetrics(next)

      // Resized: stay on the same slide, in its new place, without animating there.
      const kept = Math.min(indexRef.current, next.stops - 1)
      indexRef.current = kept
      setIndex(kept)
      x.jump(trackOffset(kept, next.step, next.maxScroll))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(track)
    return () => {
      observer.disconnect()
    }
  }, [x, count])

  useEffect(
    () => () => {
      animation.current?.stop()
    },
    [],
  )

  // Automatic sliding: one timer per resting slide, so any move (a button, a drag) restarts the wait.
  const paused = hovered || focused || !playing
  useEffect(() => {
    if (!autoplay || reduceMotion || paused || !ready || stops < 2) return
    const timer = setTimeout(() => {
      if (draggingRef.current) return
      moveTo(indexRef.current >= stops - 1 ? 0 : indexRef.current + 1, false)
    }, autoplay)
    return () => {
      clearTimeout(timer)
    }
  }, [autoplay, reduceMotion, paused, ready, stops, index, moveTo])

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    draggingRef.current = false
    const current = metricsRef.current
    if (!current) return
    moveTo(
      snapIndex({
        offset: info.offset.x,
        velocity: info.velocity.x,
        slideWidth: current.step,
        index: indexRef.current,
        count: current.stops,
      }),
      false,
    )
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!ready || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === 'ArrowLeft') moveTo(indexRef.current - 1, true)
    else if (event.key === 'ArrowRight') moveTo(indexRef.current + 1, true)
    else return
    event.preventDefault()
  }

  // A drag past the slop must not also click a link or button inside a slide.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!draggedRef.current) return
    draggedRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const firstVisible = metrics ? Math.min(index, count - metrics.perView) : 0
  const showControls = ready && stops > 1
  const showPause = Boolean(autoplay) && !reduceMotion && showControls

  return (
    // The arrow keys act on whichever control or slide has focus inside; the section itself isn't a widget.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={className}
      style={perViewVars(perView, gap)}
      onKeyDown={onKeyDown}
      onMouseEnter={() => {
        setHovered(true)
      }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      onFocus={() => {
        setFocused(true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      {/*
        Before hydration (and without JavaScript) this scrolls and snaps; once measured it clips and
        the track is dragged. The padding gives slide shadows room, the negative margin takes it back.
        The scrollbar is hidden in both so its height never changes the layout.
      */}
      <div
        ref={viewportRef}
        role={ready ? undefined : 'group'}
        aria-label={ready ? undefined : label}
        tabIndex={ready ? undefined : 0}
        className={`-m-3 [scrollbar-width:none] p-3 [&::-webkit-scrollbar]:hidden ${
          ready ? 'overflow-hidden' : 'snap-x snap-mandatory scroll-px-3 overflow-x-auto'
        }`}
      >
        <m.div
          ref={trackRef}
          className={`${TRACK_CLASS} [&_img]:[-webkit-user-drag:none] ${ready ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{ x, touchAction: ready ? 'pan-y' : undefined }}
          drag={ready && stops > 1 ? 'x' : false}
          dragConstraints={{ left: -(metrics?.maxScroll ?? 0), right: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onPointerDownCapture={() => {
            draggedRef.current = false
          }}
          onDragStart={() => {
            draggingRef.current = true
          }}
          onDrag={(_event, info) => {
            if (Math.abs(info.offset.x) > CLICK_SLOP) draggedRef.current = true
          }}
          onDragEnd={onDragEnd}
          onClickCapture={onClickCapture}
        >
          {slides.map((slide, i) => (
            <div
              // Slides are positional: "n of N" is their label.
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              inert={ready && (i < firstVisible || i >= firstVisible + metrics.perView)}
              className={SLIDE_CLASS}
            >
              {slide}
            </div>
          ))}
        </m.div>
      </div>

      {/* Space is reserved on the server, so the controls appearing after hydration move nothing. */}
      <div className="mt-6 flex min-h-11 flex-wrap items-center justify-center gap-4">
        {showControls && (
          <>
            <button
              ref={previousRef}
              type="button"
              aria-label="Previous slide"
              disabled={index === 0}
              className={buttonClass}
              onClick={() => {
                moveTo(indexRef.current - 1, true)
              }}
            >
              <Chevron direction="left" />
            </button>
            <div className="flex items-center">
              {Array.from({ length: stops }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  className="grid size-6 place-items-center"
                  onClick={() => {
                    moveTo(i, true)
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={`size-2.5 rounded-pill ring-1 ring-ink ${i === index ? 'bg-ink' : ''}`}
                  />
                </button>
              ))}
            </div>
            <button
              ref={nextRef}
              type="button"
              aria-label="Next slide"
              disabled={index === stops - 1}
              className={buttonClass}
              onClick={() => {
                moveTo(indexRef.current + 1, true)
              }}
            >
              <Chevron direction="right" />
            </button>
            {showPause && (
              <button
                type="button"
                className="min-h-11 rounded-pill px-4 text-small font-medium text-ink ring-1 ring-line-strong hover:bg-surface-alt"
                onClick={() => {
                  setPlaying((value) => !value)
                }}
              >
                {playing ? 'Pause' : 'Play'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Spoken after a button or key, never while dragging or sliding by itself. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  )
}
