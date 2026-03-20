import type { Orientation } from './types'
import { DRAWING_COLORS } from './types'

export interface SupportSymbolProps {
  type: 'pin' | 'roller' | 'fixed'
  /** Center X of the support symbol */
  cx: number
  /** Center Y of the support symbol (tip of the triangle for pin/roller) */
  cy: number
  /** Which way the support "faces" — default 'bottom' (ground below) */
  orientation?: Orientation
  /** Uniform scale factor (default 1) */
  scale?: number
}

/* ------------------------------------------------------------------ */
/*  Rotation map: degrees CW around the anchor point                  */
/* ------------------------------------------------------------------ */

const ROTATION: Record<Orientation, number> = {
  bottom: 0,
  top: 180,
  left: 90,
  right: -90,
}

/* ------------------------------------------------------------------ */
/*  Sub-drawings (all drawn in "bottom" orientation, then rotated)    */
/* ------------------------------------------------------------------ */

const TRIANGLE_H = 14
const TRIANGLE_W = 16
const GROUND_W = 24
const HATCH_COUNT = 5
const HATCH_LEN = 6

/** Diagonal hatching lines below a ground line */
function groundHatching(
  groundY: number,
  groundW: number,
  color: string,
): React.JSX.Element[] {
  const lines: React.JSX.Element[] = []
  const spacing = groundW / HATCH_COUNT
  for (let i = 0; i <= HATCH_COUNT; i++) {
    const x = -groundW / 2 + i * spacing
    lines.push(
      <line
        key={`h-${i}`}
        x1={x}
        y1={groundY}
        x2={x - HATCH_LEN * 0.6}
        y2={groundY + HATCH_LEN}
        stroke={color}
        strokeWidth={0.75}
      />,
    )
  }
  return lines
}

function PinSymbol({ color }: { color: string }): React.JSX.Element {
  const halfW = TRIANGLE_W / 2
  const groundY = TRIANGLE_H + 1
  return (
    <>
      {/* Triangle */}
      <polygon
        points={`0,0 ${-halfW},${TRIANGLE_H} ${halfW},${TRIANGLE_H}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Ground line */}
      <line
        x1={-GROUND_W / 2}
        y1={groundY}
        x2={GROUND_W / 2}
        y2={groundY}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Hatching */}
      {groundHatching(groundY, GROUND_W, color)}
    </>
  )
}

function RollerSymbol({ color }: { color: string }): React.JSX.Element {
  const halfW = TRIANGLE_W / 2
  const circleR = 3
  const circleY = TRIANGLE_H + circleR + 1
  const groundY = circleY + circleR + 1
  return (
    <>
      {/* Triangle */}
      <polygon
        points={`0,0 ${-halfW},${TRIANGLE_H} ${halfW},${TRIANGLE_H}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Roller circle */}
      <circle
        cx={0}
        cy={circleY}
        r={circleR}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
      />
      {/* Ground line */}
      <line
        x1={-GROUND_W / 2}
        y1={groundY}
        x2={GROUND_W / 2}
        y2={groundY}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Hatching */}
      {groundHatching(groundY, GROUND_W, color)}
    </>
  )
}

function FixedSymbol({ color }: { color: string }): React.JSX.Element {
  const wallH = 20
  return (
    <>
      {/* Thick wall line */}
      <line
        x1={-GROUND_W / 2}
        y1={0}
        x2={GROUND_W / 2}
        y2={0}
        stroke={color}
        strokeWidth={2.5}
      />
      {/* Hatching behind the wall */}
      {Array.from({ length: HATCH_COUNT + 1 }, (_, i) => {
        const x = -GROUND_W / 2 + i * (GROUND_W / HATCH_COUNT)
        return (
          <line
            key={`fh-${i}`}
            x1={x}
            y1={0}
            x2={x - HATCH_LEN * 0.6}
            y2={HATCH_LEN}
            stroke={color}
            strokeWidth={0.75}
          />
        )
      })}
      {/* Invisible rect to give the symbol a consistent bounding box */}
      <rect
        x={-GROUND_W / 2}
        y={0}
        width={GROUND_W}
        height={wallH}
        fill="none"
        stroke="none"
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Public component                                                   */
/* ------------------------------------------------------------------ */

/**
 * Standard structural support symbol: pin, roller, or fixed.
 * Drawn at (cx, cy) with optional rotation for orientation and scaling.
 */
export function SupportSymbol({
  type,
  cx,
  cy,
  orientation = 'bottom',
  scale = 1,
}: SupportSymbolProps): React.JSX.Element {
  const color = DRAWING_COLORS.object
  const rotation = ROTATION[orientation]

  const inner = (() => {
    switch (type) {
      case 'pin':
        return <PinSymbol color={color} />
      case 'roller':
        return <RollerSymbol color={color} />
      case 'fixed':
        return <FixedSymbol color={color} />
    }
  })()

  return (
    <g
      className={`support-symbol support-symbol--${type}`}
      transform={`translate(${cx}, ${cy}) rotate(${rotation}) scale(${scale})`}
    >
      {inner}
    </g>
  )
}
