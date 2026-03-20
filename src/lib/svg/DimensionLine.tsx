import type { Point2D } from './types'
import { DRAWING_COLORS } from './types'

export interface DimensionLineProps {
  /** First anchor point on the object being dimensioned */
  start: Point2D
  /** Second anchor point */
  end: Point2D
  /** Perpendicular offset (px) from the object to the dimension line */
  offset: number
  /** Text label (already formatted by the caller) */
  label: string
  /** Which side of the line connecting start→end the dimension sits on */
  side: 'above' | 'below' | 'left' | 'right'
  style?: {
    tickLength?: number
    fontSize?: number
    color?: string
  }
}

/**
 * A standard engineering dimension line with extension lines,
 * tick marks, and a centered label.
 *
 * Automatically detects horizontal vs vertical from start/end and
 * rotates the label for vertical dimensions.
 */
export function DimensionLine({
  start,
  end,
  offset,
  label,
  side,
  style,
}: DimensionLineProps): React.JSX.Element {
  const tickLen = style?.tickLength ?? 4
  const fontSize = style?.fontSize ?? 11
  const color = style?.color ?? DRAWING_COLORS.dimension

  // Determine orientation from the two points
  const dx = Math.abs(end.x - start.x)
  const dy = Math.abs(end.y - start.y)
  const isHorizontal = dx >= dy

  // Compute the four key points:
  //   ext1Start / ext1End  — first extension line (from start toward dim line)
  //   ext2Start / ext2End  — second extension line (from end toward dim line)
  //   dimStart / dimEnd    — the dimension line itself
  let dimStart: Point2D
  let dimEnd: Point2D
  let ext1Start: Point2D
  let ext1End: Point2D
  let ext2Start: Point2D
  let ext2End: Point2D
  let labelX: number
  let labelY: number
  let textRotation: number
  let textAnchor: 'start' | 'middle' | 'end'
  let dominantBaseline: 'auto' | 'hanging' | 'middle'

  if (isHorizontal) {
    // Side = above / below controls the Y direction of the offset
    const sign = side === 'above' || side === 'left' ? -1 : 1
    const oY = sign * offset

    dimStart = { x: start.x, y: start.y + oY }
    dimEnd = { x: end.x, y: end.y + oY }

    ext1Start = { x: start.x, y: start.y }
    ext1End = { x: start.x, y: start.y + oY }
    ext2Start = { x: end.x, y: end.y }
    ext2End = { x: end.x, y: end.y + oY }

    labelX = (dimStart.x + dimEnd.x) / 2
    labelY = dimStart.y + (sign === -1 ? -5 : fontSize + 2)
    textRotation = 0
    textAnchor = 'middle'
    dominantBaseline = sign === -1 ? 'auto' : 'hanging'
  } else {
    // Vertical dimension — side = left / right
    const sign = side === 'left' || side === 'above' ? -1 : 1
    const oX = sign * offset

    dimStart = { x: start.x + oX, y: start.y }
    dimEnd = { x: end.x + oX, y: end.y }

    ext1Start = { x: start.x, y: start.y }
    ext1End = { x: start.x + oX, y: start.y }
    ext2Start = { x: end.x, y: end.y }
    ext2End = { x: end.x + oX, y: end.y }

    labelX = dimStart.x + (sign === -1 ? -5 : 5)
    labelY = (dimStart.y + dimEnd.y) / 2
    textRotation = -90
    textAnchor = 'middle'
    dominantBaseline = sign === -1 ? 'auto' : 'hanging'
  }

  // Tick marks — short perpendicular lines at each end of the dim line
  const tickLines = isHorizontal
    ? [
        // Vertical ticks on a horizontal dim line
        { x1: dimStart.x, y1: dimStart.y - tickLen, x2: dimStart.x, y2: dimStart.y + tickLen },
        { x1: dimEnd.x, y1: dimEnd.y - tickLen, x2: dimEnd.x, y2: dimEnd.y + tickLen },
      ]
    : [
        // Horizontal ticks on a vertical dim line
        { x1: dimStart.x - tickLen, y1: dimStart.y, x2: dimStart.x + tickLen, y2: dimStart.y },
        { x1: dimEnd.x - tickLen, y1: dimEnd.y, x2: dimEnd.x + tickLen, y2: dimEnd.y },
      ]

  return (
    <g className="dimension-line">
      {/* Extension lines (dashed) */}
      <line
        x1={ext1Start.x}
        y1={ext1Start.y}
        x2={ext1End.x}
        y2={ext1End.y}
        stroke={color}
        strokeWidth={0.5}
        strokeDasharray="2 2"
      />
      <line
        x1={ext2Start.x}
        y1={ext2Start.y}
        x2={ext2End.x}
        y2={ext2End.y}
        stroke={color}
        strokeWidth={0.5}
        strokeDasharray="2 2"
      />

      {/* Dimension line (solid) */}
      <line
        x1={dimStart.x}
        y1={dimStart.y}
        x2={dimEnd.x}
        y2={dimEnd.y}
        stroke={color}
        strokeWidth={0.75}
      />

      {/* Tick marks */}
      {tickLines.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={color}
          strokeWidth={1}
        />
      ))}

      {/* Label */}
      <text
        x={labelX}
        y={labelY}
        fill={color}
        fontSize={fontSize}
        fontFamily="system-ui, sans-serif"
        textAnchor={textAnchor}
        dominantBaseline={dominantBaseline}
        transform={
          textRotation !== 0
            ? `rotate(${textRotation}, ${labelX}, ${labelY})`
            : undefined
        }
      >
        {label}
      </text>
    </g>
  )
}
