// EquipmentFBD.tsx — Free Body Diagram: side elevation of equipment on anchors
// Shows all applied forces, reactions, and overturning moment per ASCE 7-22 Ch 13
//
// Color convention (PESE load arrow palette):
//   gravity=#000000  demand=#dc2626  tension=#16a34a
//   compression=#2563eb  reaction=#b45309  moment=#9333ea

import { LOAD_ARROW_COLORS, DRAWING_COLORS } from '@/lib/svg/types'
import { fmtForce } from '@/lib/svg/format-helpers'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentFBDProps {
  length: number        // Equipment L (in)
  width: number         // Equipment W (in)
  height: number        // Equipment H (in)
  cgHeight: number      // CG height above base (in)
  Fp: number            // Design seismic force (lbs)
  Wp: number            // Equipment weight (lbs)
  Tu: number            // Tension per anchor (lbs)
  Vu: number            // Shear per anchor (lbs)
  governingDirection: 'longitudinal' | 'transverse'
  upliftOccurs: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const C = {
  gravity: LOAD_ARROW_COLORS.gravity,
  demand: LOAD_ARROW_COLORS.demand,
  tension: LOAD_ARROW_COLORS.tension,
  compression: LOAD_ARROW_COLORS.compression,
  reaction: LOAD_ARROW_COLORS.reaction,
  moment: LOAD_ARROW_COLORS.moment,
  dim: DRAWING_COLORS.dimension,
  object: DRAWING_COLORS.object,
  hidden: DRAWING_COLORS.hidden,
  bg: '#f8fafc',
  concrete: '#d4d4d8',
} as const

const SVG_W = 500
const SVG_H = 400

// Drawing region (equipment + reactions)
const PAD = { top: 35, right: 50, bottom: 75, left: 80 }
const DRAW_W = SVG_W - PAD.left - PAD.right
const DRAW_H = SVG_H - PAD.top - PAD.bottom

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format number with commas */
function commaFmt(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString('en-US')
}

/** Arrowhead polygon pointing in a cardinal direction */
function Arrowhead({
  x,
  y,
  dir,
  color,
  size = 5,
}: {
  x: number
  y: number
  dir: 'up' | 'down' | 'left' | 'right'
  color: string
  size?: number
}) {
  const s = size
  let pts: string
  switch (dir) {
    case 'up':
      pts = `${x},${y} ${x - s},${y + s * 1.6} ${x + s},${y + s * 1.6}`
      break
    case 'down':
      pts = `${x},${y} ${x - s},${y - s * 1.6} ${x + s},${y - s * 1.6}`
      break
    case 'left':
      pts = `${x},${y} ${x + s * 1.6},${y - s} ${x + s * 1.6},${y + s}`
      break
    case 'right':
      pts = `${x},${y} ${x - s * 1.6},${y - s} ${x - s * 1.6},${y + s}`
      break
  }
  return <polygon points={pts} fill={color} />
}

/** Force arrow — a line with arrowhead and label */
function ForceArrow({
  x1,
  y1,
  x2,
  y2,
  dir,
  color,
  label,
  labelSide = 'right',
  labelOffset = 6,
  strokeWidth = 2,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  dir: 'up' | 'down' | 'left' | 'right'
  color: string
  label: string
  labelSide?: 'left' | 'right' | 'top' | 'bottom'
  labelOffset?: number
  strokeWidth?: number
}) {
  // Label position
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  let tx = mx
  let ty = my
  let anchor: 'start' | 'middle' | 'end' = 'start'

  switch (labelSide) {
    case 'right':
      tx = Math.max(x1, x2) + labelOffset
      ty = my + 4
      anchor = 'start'
      break
    case 'left':
      tx = Math.min(x1, x2) - labelOffset
      ty = my + 4
      anchor = 'end'
      break
    case 'top':
      tx = mx
      ty = Math.min(y1, y2) - labelOffset
      anchor = 'middle'
      break
    case 'bottom':
      tx = mx
      ty = Math.max(y1, y2) + labelOffset + 10
      anchor = 'middle'
      break
  }

  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={strokeWidth}
      />
      <Arrowhead x={x2} y={y2} dir={dir} color={color} />
      <text
        x={tx} y={ty}
        textAnchor={anchor}
        fill={color}
        fontSize="10"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  )
}

/** Dimension line with extension lines and tick marks */
function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  orientation,
  extensionLength = 10,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  orientation: 'horizontal' | 'vertical'
  extensionLength?: number
}) {
  const color = C.dim
  const mid = orientation === 'vertical'
    ? { x: x1, y: (y1 + y2) / 2 }
    : { x: (x1 + x2) / 2, y: y1 }
  const arrowSize = 3

  if (orientation === 'vertical') {
    // Vertical dimension line
    const ext = extensionLength
    return (
      <g>
        {/* Extension lines */}
        <line x1={x1 - ext} y1={y1} x2={x1 + ext * 0.3} y2={y1} stroke={color} strokeWidth="0.5" />
        <line x1={x1 - ext} y1={y2} x2={x1 + ext * 0.3} y2={y2} stroke={color} strokeWidth="0.5" />
        {/* Main line */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.75" />
        {/* Tick at top */}
        <polygon
          points={`${x1},${Math.min(y1, y2)} ${x1 - arrowSize},${Math.min(y1, y2) + arrowSize * 2} ${x1 + arrowSize},${Math.min(y1, y2) + arrowSize * 2}`}
          fill={color}
        />
        {/* Tick at bottom */}
        <polygon
          points={`${x1},${Math.max(y1, y2)} ${x1 - arrowSize},${Math.max(y1, y2) - arrowSize * 2} ${x1 + arrowSize},${Math.max(y1, y2) - arrowSize * 2}`}
          fill={color}
        />
        {/* Label */}
        <text
          x={mid.x - 4}
          y={mid.y + 3}
          textAnchor="end"
          fill={color}
          fontSize="9"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          {label}
        </text>
      </g>
    )
  }

  // Horizontal dimension line
  const ext = extensionLength
  return (
    <g>
      {/* Extension lines */}
      <line x1={x1} y1={y1 - ext * 0.3} x2={x1} y2={y1 + ext} stroke={color} strokeWidth="0.5" />
      <line x1={x2} y1={y2 - ext * 0.3} x2={x2} y2={y2 + ext} stroke={color} strokeWidth="0.5" />
      {/* Main line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.75" />
      {/* Tick at left */}
      <polygon
        points={`${Math.min(x1, x2)},${y1} ${Math.min(x1, x2) + arrowSize * 2},${y1 - arrowSize} ${Math.min(x1, x2) + arrowSize * 2},${y1 + arrowSize}`}
        fill={color}
      />
      {/* Tick at right */}
      <polygon
        points={`${Math.max(x1, x2)},${y1} ${Math.max(x1, x2) - arrowSize * 2},${y1 - arrowSize} ${Math.max(x1, x2) - arrowSize * 2},${y1 + arrowSize}`}
        fill={color}
      />
      {/* Label */}
      <text
        x={mid.x}
        y={mid.y - 5}
        textAnchor="middle"
        fill={color}
        fontSize="9"
        fontFamily="sans-serif"
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  )
}

/** Ground hatching pattern — diagonal lines below anchor line */
function GroundHatch({
  x,
  y,
  width,
  height,
}: {
  x: number
  y: number
  width: number
  height: number
}) {
  const spacing = 6
  const lines: React.JSX.Element[] = []
  const count = Math.ceil((width + height) / spacing)

  for (let i = 0; i < count; i++) {
    const startX = x + i * spacing
    // Diagonal hatch lines clipped to the rectangle
    const lx1 = Math.max(x, Math.min(x + width, startX))
    const ly1 = y
    const lx2 = Math.max(x, Math.min(x + width, startX - height))
    const ly2 = Math.min(y + height, ly1 + Math.min(height, lx1 - x))

    if (lx1 >= x && lx2 <= x + width) {
      lines.push(
        <line
          key={`gh-${i}`}
          x1={lx1}
          y1={ly1}
          x2={lx2}
          y2={ly2}
          stroke={C.dim}
          strokeWidth="0.6"
        />,
      )
    }
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={C.concrete} fillOpacity="0.3" />
      {lines}
      <line x1={x} y1={y} x2={x + width} y2={y} stroke={C.object} strokeWidth="1.5" />
    </g>
  )
}

/** Curved moment arc arrow */
function MomentArc({
  cx,
  cy,
  radius,
  startAngle,
  endAngle,
  color,
  label,
  clockwise = true,
}: {
  cx: number
  cy: number
  radius: number
  startAngle: number  // degrees
  endAngle: number    // degrees
  color: string
  label: string
  clockwise?: boolean
}) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const sx = cx + radius * Math.cos(toRad(startAngle))
  const sy = cy + radius * Math.sin(toRad(startAngle))
  const ex = cx + radius * Math.cos(toRad(endAngle))
  const ey = cy + radius * Math.sin(toRad(endAngle))

  const sweepFlag = clockwise ? 1 : 0
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0

  const d = `M ${sx},${sy} A ${radius},${radius} 0 ${largeArc},${sweepFlag} ${ex},${ey}`

  // Arrowhead at the end of the arc
  const tangentAngle = clockwise
    ? toRad(endAngle) + Math.PI / 2
    : toRad(endAngle) - Math.PI / 2
  const as = 5
  const ax1 = ex + as * 1.6 * Math.cos(tangentAngle - 0.4)
  const ay1 = ey + as * 1.6 * Math.sin(tangentAngle - 0.4)
  const ax2 = ex + as * 1.6 * Math.cos(tangentAngle + 0.4)
  const ay2 = ey + as * 1.6 * Math.sin(tangentAngle + 0.4)

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
      <polygon points={`${ex},${ey} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
      <text
        x={cx + (radius + 14) * Math.cos(toRad((startAngle + endAngle) / 2))}
        y={cy + (radius + 14) * Math.sin(toRad((startAngle + endAngle) / 2)) + 3}
        textAnchor="middle"
        fill={color}
        fontSize="9"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  )
}

/** Small anchor bolt circle at base */
function AnchorBolt({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="4" fill="none" stroke={C.object} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="1.2" fill={C.object} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function EquipmentFBD({
  length,
  width,
  height,
  cgHeight,
  Fp,
  Wp,
  Tu,
  Vu,
  governingDirection,
  upliftOccurs,
}: EquipmentFBDProps) {
  // Placeholder state
  if (Fp === 0 || (length === 0 && width === 0 && height === 0)) {
    return (
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
        <rect width={SVG_W} height={SVG_H} fill={C.bg} rx="6" />
        <text
          x={SVG_W / 2} y={SVG_H / 2}
          textAnchor="middle"
          fill={C.dim}
          fontSize="14"
          fontFamily="sans-serif"
        >
          Complete equipment properties and run calculation
        </text>
        <text
          x={SVG_W / 2} y={SVG_H / 2 + 20}
          textAnchor="middle"
          fill={C.dim}
          fontSize="11"
          fontFamily="sans-serif"
        >
          to generate free body diagram
        </text>
      </svg>
    )
  }

  // The "base dimension" is the equipment span in the governing direction
  const baseSpan = governingDirection === 'longitudinal' ? length : width
  const clampedCG = Math.min(cgHeight, height)

  // --- Layout geometry ---
  // Ground line
  const groundY = SVG_H - PAD.bottom
  // Equipment rectangle position (centered horizontally in drawing area)
  const eqMaxH = DRAW_H * 0.7            // max drawing height for equipment
  const eqMaxW = DRAW_W * 0.5            // max drawing width for equipment

  // Scale so equipment fits within drawing region
  const scaleH = height > 0 ? eqMaxH / height : 1
  const scaleW = baseSpan > 0 ? eqMaxW / baseSpan : 1
  const scale = Math.min(scaleH, scaleW, 3)  // cap scale for very small equipment

  const eqDrawH = height * scale
  const eqDrawW = baseSpan * scale
  const cgDrawH = clampedCG * scale

  // Equipment rectangle bounds
  const eqCenterX = PAD.left + DRAW_W * 0.45
  const eqLeft = eqCenterX - eqDrawW / 2
  const eqRight = eqCenterX + eqDrawW / 2
  const eqTop = groundY - eqDrawH

  // CG position
  const cgX = eqCenterX
  const cgY = groundY - cgDrawH

  // Anchor bolt positions (at base, inset slightly from equipment edges)
  const anchorInset = Math.min(eqDrawW * 0.1, 12)
  const anchorLeftX = eqLeft + anchorInset
  const anchorRightX = eqRight - anchorInset
  const anchorY = groundY

  // Arrow lengths
  const fpArrowLen = Math.max(40, eqDrawW * 0.35)
  const wpArrowLen = Math.max(30, eqDrawH * 0.25)
  const tuArrowLen = Math.max(28, eqDrawH * 0.2)
  const vuArrowLen = Math.max(28, eqDrawW * 0.18)
  const compArrowLen = Math.max(22, eqDrawH * 0.15)

  // Fp direction: always points right in the FBD (seismic force)
  // Overturning: clockwise moment about near-side (right) anchor
  // Tension side: far-side (left) anchors
  // Compression side: near-side (right) anchors

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      {/* Background */}
      <rect width={SVG_W} height={SVG_H} fill={C.bg} rx="6" />

      {/* Title */}
      <text
        x={SVG_W / 2} y={18}
        textAnchor="middle"
        fill={C.object}
        fontSize="11"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        Free Body Diagram — {governingDirection === 'longitudinal' ? 'Longitudinal' : 'Transverse'} Direction
      </text>

      {/* ---- Ground / Concrete ---- */}
      <GroundHatch
        x={eqLeft - 30}
        y={groundY}
        width={eqDrawW + 60}
        height={18}
      />

      {/* ---- Equipment Rectangle ---- */}
      <rect
        x={eqLeft}
        y={eqTop}
        width={eqDrawW}
        height={eqDrawH}
        fill="rgba(148, 163, 184, 0.12)"
        stroke={C.object}
        strokeWidth="1.5"
      />

      {/* Equipment label */}
      <text
        x={eqCenterX} y={eqTop + eqDrawH / 2 + 3}
        textAnchor="middle"
        fill={C.hidden}
        fontSize="10"
        fontFamily="sans-serif"
        fontStyle="italic"
      >
        Equipment
      </text>

      {/* ---- CG dot and dashed line ---- */}
      <line
        x1={eqLeft - 8} y1={cgY}
        x2={eqRight + 8} y2={cgY}
        stroke={C.demand}
        strokeWidth="0.8"
        strokeDasharray="4 3"
      />
      <circle cx={cgX} cy={cgY} r="4.5" fill={C.demand} />
      <text
        x={cgX} y={cgY - 8}
        textAnchor="middle"
        fill={C.demand}
        fontSize="9"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        CG
      </text>

      {/* ---- Wp Arrow (gravity, downward at CG) ---- */}
      <ForceArrow
        x1={cgX} y1={cgY + 6}
        x2={cgX} y2={cgY + 6 + wpArrowLen}
        dir="down"
        color={C.gravity}
        label={`Wp = ${fmtForce(Wp)}`}
        labelSide="right"
        labelOffset={8}
      />

      {/* ---- Fp Arrow (seismic demand, horizontal at CG) ---- */}
      <ForceArrow
        x1={cgX - fpArrowLen} y1={cgY}
        x2={cgX - 6} y2={cgY}
        dir="right"
        color={C.demand}
        label={`Fp = ${fmtForce(Fp)}`}
        labelSide="top"
        labelOffset={4}
      />

      {/* ---- Overturning Moment Arc ---- */}
      <MomentArc
        cx={anchorRightX}
        cy={anchorY - 10}
        radius={Math.min(28, eqDrawH * 0.2)}
        startAngle={-140}
        endAngle={-30}
        color={C.moment}
        label="M_ot"
        clockwise={true}
      />

      {/* ---- Anchor Bolts ---- */}
      <AnchorBolt cx={anchorLeftX} cy={anchorY} />
      <AnchorBolt cx={anchorRightX} cy={anchorY} />

      {/* ---- Tension Reaction (far-side = left, if uplift) ---- */}
      {upliftOccurs && Tu > 0 && (
        <ForceArrow
          x1={anchorLeftX} y1={anchorY - 8}
          x2={anchorLeftX} y2={anchorY - 8 - tuArrowLen}
          dir="up"
          color={C.tension}
          label={`Tu = ${fmtForce(Tu)}`}
          labelSide="left"
          labelOffset={6}
        />
      )}

      {/* ---- Compression Reaction (near-side = right) ---- */}
      <ForceArrow
        x1={anchorRightX} y1={anchorY + 20}
        x2={anchorRightX} y2={anchorY + 20 + compArrowLen}
        dir="down"
        color={C.compression}
        label={upliftOccurs ? 'C' : `C (no uplift)`}
        labelSide="right"
        labelOffset={6}
      />

      {/* ---- Shear Reaction (all anchors, horizontal) ---- */}
      {/* Left anchor shear */}
      <ForceArrow
        x1={anchorLeftX - vuArrowLen} y1={anchorY + 10}
        x2={anchorLeftX - 6} y2={anchorY + 10}
        dir="right"
        color={C.reaction}
        label={`Vu = ${fmtForce(Vu)}`}
        labelSide="bottom"
        labelOffset={2}
        strokeWidth={1.5}
      />
      {/* Right anchor shear */}
      <ForceArrow
        x1={anchorRightX - vuArrowLen} y1={anchorY + 10}
        x2={anchorRightX - 6} y2={anchorY + 10}
        dir="right"
        color={C.reaction}
        label=""
        labelSide="bottom"
        strokeWidth={1.5}
      />

      {/* ---- Dimension Lines ---- */}
      {/* Equipment height */}
      <DimLine
        x1={eqLeft - 22} y1={groundY}
        x2={eqLeft - 22} y2={eqTop}
        label={`H = ${commaFmt(height)}"`}
        orientation="vertical"
      />

      {/* CG height */}
      <DimLine
        x1={eqLeft - 50} y1={groundY}
        x2={eqLeft - 50} y2={cgY}
        label={`hcg = ${commaFmt(cgHeight)}"`}
        orientation="vertical"
      />

      {/* Base span (anchor spacing) */}
      <DimLine
        x1={anchorLeftX} y1={groundY + 28}
        x2={anchorRightX} y2={groundY + 28}
        label={`${governingDirection === 'longitudinal' ? 'L' : 'W'} = ${commaFmt(baseSpan)}"`}
        orientation="horizontal"
      />

      {/* ---- Legend ---- */}
      <g transform={`translate(${SVG_W - 160}, ${SVG_H - 68})`}>
        <rect x={0} y={0} width={150} height={62} rx="3"
          fill="white" fillOpacity="0.85" stroke={C.dim} strokeWidth="0.5" />
        <LegendItem x={8} y={12} color={C.gravity} label="Gravity (Wp)" />
        <LegendItem x={8} y={23} color={C.demand} label="Seismic demand (Fp)" />
        <LegendItem x={8} y={34} color={C.tension} label="Tension reaction (Tu)" />
        <LegendItem x={8} y={45} color={C.compression} label="Compression (C)" />
        <LegendItem x={8} y={56} color={C.reaction} label="Shear reaction (Vu)" />
      </g>

      {/* ---- Status note ---- */}
      <text
        x={PAD.left} y={SVG_H - 6}
        fill={C.dim}
        fontSize="8.5"
        fontFamily="sans-serif"
        fontStyle="italic"
      >
        {upliftOccurs
          ? 'Uplift occurs — tension anchors engaged'
          : 'No net uplift — equipment remains in compression'}
      </text>
    </svg>
  )
}

/** Small legend swatch + label */
function LegendItem({
  x,
  y,
  color,
  label,
}: {
  x: number
  y: number
  color: string
  label: string
}) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + 14} y2={y} stroke={color} strokeWidth="2" />
      <text
        x={x + 18} y={y + 3}
        fill={C.object}
        fontSize="8"
        fontFamily="sans-serif"
      >
        {label}
      </text>
    </g>
  )
}
