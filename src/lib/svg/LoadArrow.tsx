import { LOAD_ARROW_COLORS } from './types'
import type { LoadColor, Point2D } from './types'
import { arrowMarker } from './SharedMarkerDefs'

export interface LoadArrowProps {
  /** Point load = single arrow; distributed = row of arrows with connecting line */
  type: 'point' | 'distributed'
  /** Arrow tip (point) or first arrow position (distributed) */
  start: Point2D
  /** Last arrow position — required for distributed loads */
  end?: Point2D
  /** Length of each arrow shaft in px (default 40) */
  arrowLength?: number
  /** Text label placed alongside the arrow */
  label?: string
  /** PESE load color key */
  color: LoadColor
  /** Which side of the arrow line the label appears on */
  labelSide?: 'above' | 'below' | 'left' | 'right'
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Infer arrow direction from start, end, or arrowLength sign. */
function inferDirection(
  start: Point2D,
  end: Point2D | undefined,
): 'up' | 'down' | 'left' | 'right' {
  if (!end) return 'down' // sensible default for point loads (gravity)
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left'
  }
  return dy >= 0 ? 'down' : 'up'
}

function labelOffset(
  side: 'above' | 'below' | 'left' | 'right',
  fontSize: number,
): { dx: number; dy: number; anchor: 'start' | 'middle' | 'end'; baseline: 'auto' | 'hanging' | 'middle' } {
  switch (side) {
    case 'above':
      return { dx: 0, dy: -fontSize * 0.6, anchor: 'middle', baseline: 'auto' }
    case 'below':
      return { dx: 0, dy: fontSize * 1.2, anchor: 'middle', baseline: 'hanging' }
    case 'left':
      return { dx: -6, dy: 0, anchor: 'end', baseline: 'middle' }
    case 'right':
      return { dx: 6, dy: 0, anchor: 'start', baseline: 'middle' }
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Renders a point or distributed load arrow using the PESE color scheme.
 *
 * Requires `<SharedMarkerDefs />` to be present in the parent `<svg>`.
 */
export function LoadArrow({
  type,
  start,
  end,
  arrowLength = 40,
  label,
  color,
  labelSide = 'above',
}: LoadArrowProps): React.JSX.Element {
  const hex = LOAD_ARROW_COLORS[color]
  const fontSize = 11

  if (type === 'point') {
    return <PointArrow {...{ start, arrowLength, label, color, hex, labelSide, fontSize }} />
  }

  return (
    <DistributedArrow
      {...{ start, end: end ?? start, arrowLength, label, color, hex, labelSide, fontSize }}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Point arrow                                                        */
/* ------------------------------------------------------------------ */

function PointArrow({
  start,
  arrowLength,
  label,
  color,
  hex,
  labelSide,
  fontSize,
}: {
  start: Point2D
  arrowLength: number
  label?: string
  color: LoadColor
  hex: string
  labelSide: 'above' | 'below' | 'left' | 'right'
  fontSize: number
}): React.JSX.Element {
  // Default direction: downward (gravity)
  const dir = 'down' as const
  const isVert = dir === 'down' || dir === 'up'
  const sign = dir === 'down' || dir === 'right' ? 1 : -1

  const tailX = isVert ? start.x : start.x - sign * arrowLength
  const tailY = isVert ? start.y - sign * arrowLength : start.y

  const markerProp =
    dir === 'down' || dir === 'right' ? 'markerEnd' : 'markerStart'

  const lo = label ? labelOffset(labelSide, fontSize) : null

  return (
    <g className="load-arrow load-arrow--point">
      <line
        x1={tailX}
        y1={tailY}
        x2={start.x}
        y2={start.y}
        stroke={hex}
        strokeWidth={1.5}
        {...{ [markerProp]: arrowMarker(color, dir) }}
      />
      {label && lo && (
        <text
          x={(tailX + start.x) / 2 + lo.dx}
          y={(tailY + start.y) / 2 + lo.dy}
          fill={hex}
          fontSize={fontSize}
          fontFamily="system-ui, sans-serif"
          textAnchor={lo.anchor}
          dominantBaseline={lo.baseline}
        >
          {label}
        </text>
      )}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/*  Distributed arrow                                                  */
/* ------------------------------------------------------------------ */

function DistributedArrow({
  start,
  end,
  arrowLength,
  label,
  color,
  hex,
  labelSide,
  fontSize,
}: {
  start: Point2D
  end: Point2D
  arrowLength: number
  label?: string
  color: LoadColor
  hex: string
  labelSide: 'above' | 'below' | 'left' | 'right'
  fontSize: number
}): React.JSX.Element {
  const dir = inferDirection(start, end)
  const isHoriz = dir === 'left' || dir === 'right'

  // Spacing: ~1 arrow per 30 px along the span
  const span = isHoriz
    ? Math.abs(end.x - start.x)
    : Math.abs(end.y - start.y)

  const count = Math.max(2, Math.round(span / 30) + 1)

  // Generate evenly-spaced base points along start→end
  const bases: Point2D[] = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1)
    bases.push({
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    })
  }

  // Tail points: offset each base by arrowLength perpendicular to the span
  // For a horizontal span, arrows point down; for vertical span, arrows point right.
  const perpDir = isHoriz ? 'down' : 'right'
  const tails: Point2D[] = bases.map((b) => ({
    x: perpDir === 'right' ? b.x - arrowLength : b.x,
    y: perpDir === 'down' ? b.y - arrowLength : b.y,
  }))

  const arrowDir = perpDir
  const markerKey = 'markerEnd'

  // Connecting line between all tail points
  const connLineStart = tails[0]
  const connLineEnd = tails[tails.length - 1]

  const lo = label ? labelOffset(labelSide, fontSize) : null
  const midBase = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }

  return (
    <g className="load-arrow load-arrow--distributed">
      {/* Connecting line at the tails */}
      {connLineStart && connLineEnd && (
        <line
          x1={connLineStart.x}
          y1={connLineStart.y}
          x2={connLineEnd.x}
          y2={connLineEnd.y}
          stroke={hex}
          strokeWidth={1}
        />
      )}

      {/* Individual arrows */}
      {bases.map((base, i) => {
        const tail = tails[i]
        return (
          <line
            key={i}
            x1={tail.x}
            y1={tail.y}
            x2={base.x}
            y2={base.y}
            stroke={hex}
            strokeWidth={1.5}
            {...{ [markerKey]: arrowMarker(color, arrowDir) }}
          />
        )
      })}

      {/* Label */}
      {label && lo && (
        <text
          x={midBase.x + lo.dx}
          y={midBase.y - arrowLength / 2 + lo.dy}
          fill={hex}
          fontSize={fontSize}
          fontFamily="system-ui, sans-serif"
          textAnchor={lo.anchor}
          dominantBaseline={lo.baseline}
        >
          {label}
        </text>
      )}
    </g>
  )
}
