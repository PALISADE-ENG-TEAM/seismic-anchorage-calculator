import { LOAD_ARROW_COLORS } from './types'
import type { LoadColor } from './types'

/* ------------------------------------------------------------------ */
/*  Marker ID helpers — call these from consuming components to get    */
/*  the correct `url(#…)` reference for marker-start / marker-end.    */
/* ------------------------------------------------------------------ */

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const
type ArrowDirection = (typeof DIRECTIONS)[number]

/** Returns `url(#dp-arrow-{color}-{direction})` */
export function arrowMarker(color: LoadColor, dir: ArrowDirection): string {
  return `url(#dp-arrow-${color}-${dir})`
}

/** Returns `url(#dp-tick-{color})` */
export function tickMarker(color: LoadColor): string {
  return `url(#dp-tick-${color})`
}

/* ------------------------------------------------------------------ */
/*  Internal: build a single <marker> for an arrow or tick.           */
/* ------------------------------------------------------------------ */

function arrowMarkerElement(
  color: LoadColor,
  hex: string,
  dir: ArrowDirection,
): React.JSX.Element {
  const id = `dp-arrow-${color}-${dir}`

  // Horizontal arrows: 6 wide × 4 tall
  // Vertical arrows:   4 wide × 6 tall
  const isHoriz = dir === 'left' || dir === 'right'
  const w = isHoriz ? 6 : 4
  const h = isHoriz ? 4 : 6

  let points: string
  let refX: number
  let refY: number

  switch (dir) {
    case 'right':
      points = `0,0 6,2 0,4`
      refX = 6
      refY = 2
      break
    case 'left':
      points = `6,0 0,2 6,4`
      refX = 0
      refY = 2
      break
    case 'down':
      points = `0,0 2,6 4,0`
      refX = 2
      refY = 6
      break
    case 'up':
      points = `0,6 2,0 4,6`
      refX = 2
      refY = 0
      break
  }

  return (
    <marker
      key={id}
      id={id}
      markerWidth={w}
      markerHeight={h}
      refX={refX}
      refY={refY}
      orient="auto"
      markerUnits="strokeWidth"
    >
      <polygon points={points} fill={hex} />
    </marker>
  )
}

function tickMarkerElement(
  color: LoadColor,
  hex: string,
): React.JSX.Element {
  const id = `dp-tick-${color}`
  return (
    <marker
      key={id}
      id={id}
      markerWidth={1}
      markerHeight={8}
      refX={0.5}
      refY={4}
      orient="auto"
      markerUnits="strokeWidth"
    >
      <line x1={0.5} y1={0} x2={0.5} y2={8} stroke={hex} strokeWidth={1} />
    </marker>
  )
}

/* ------------------------------------------------------------------ */
/*  Public component                                                   */
/* ------------------------------------------------------------------ */

/**
 * Drop this once inside the root `<svg>` of any drawing that uses
 * load arrows or dimension lines. It renders 24 arrow markers
 * (6 colors x 4 directions) + 6 tick markers inside a `<defs>` block.
 */
export function SharedMarkerDefs(): React.JSX.Element {
  const entries = Object.entries(LOAD_ARROW_COLORS) as [LoadColor, string][]

  return (
    <defs>
      {entries.flatMap(([color, hex]) =>
        DIRECTIONS.map((dir) => arrowMarkerElement(color, hex, dir)),
      )}
      {entries.map(([color, hex]) => tickMarkerElement(color, hex))}
    </defs>
  )
}
