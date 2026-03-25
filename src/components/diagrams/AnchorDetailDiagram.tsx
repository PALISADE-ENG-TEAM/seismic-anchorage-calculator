// AnchorDetailDiagram.tsx — Enhanced plan-view anchor layout with engineering detail
// Shows anchor pattern, edge distances, spacing, force indicators, and governing info
//
// Color convention (PESE load arrow palette):
//   gravity=#000000  demand=#dc2626  tension=#16a34a
//   compression=#2563eb  reaction=#b45309  moment=#9333ea

import { LOAD_ARROW_COLORS, DRAWING_COLORS } from '@/lib/svg/types'
import { fmtForce } from '@/lib/svg/format-helpers'
import type { AnchorForceResult } from '@/lib/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnchorDetailDiagramProps {
  nLong: number
  nTrans: number
  sx: number             // Longitudinal spacing (in)
  sy: number             // Transverse spacing (in)
  ca1: number            // Edge distance (in)
  equipLength: number
  equipWidth: number
  anchorDiameter: number
  Tu: number             // Tension per anchor (lbs)
  Vu: number             // Shear per anchor (lbs)
  governingDirection: 'longitudinal' | 'transverse'
  upliftOccurs: boolean
  // Rigid bolt group support
  anchorForces?: AnchorForceResult[]
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
  equipBlue: '#2563eb',
  bg: '#f8fafc',
  concrete: '#e5e7eb',
  slab: '#d4d4d8',
} as const

const SVG_W = 450
const SVG_H = 380

const PAD = { top: 30, right: 45, bottom: 80, left: 45 }
const DRAW_W = SVG_W - PAD.left - PAD.right
const DRAW_H = SVG_H - PAD.top - PAD.bottom

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Small arrowhead for force indicators */
function SmallArrow({
  x,
  y,
  dir,
  color,
  size = 4,
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
      pts = `${x},${y} ${x - s},${y + s * 1.5} ${x + s},${y + s * 1.5}`
      break
    case 'down':
      pts = `${x},${y} ${x - s},${y - s * 1.5} ${x + s},${y - s * 1.5}`
      break
    case 'left':
      pts = `${x},${y} ${x + s * 1.5},${y - s} ${x + s * 1.5},${y + s}`
      break
    case 'right':
      pts = `${x},${y} ${x - s * 1.5},${y - s} ${x - s * 1.5},${y + s}`
      break
  }
  return <polygon points={pts} fill={color} />
}

/** Dimension line with extension lines and arrow ticks */
function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  orientation,
  extensionLength = 8,
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
  const arrowSize = 2.5

  if (orientation === 'horizontal') {
    const midX = (x1 + x2) / 2
    const ext = extensionLength
    return (
      <g>
        {/* Extension lines */}
        <line x1={x1} y1={y1 - ext * 0.3} x2={x1} y2={y1 + ext} stroke={color} strokeWidth="0.5" />
        <line x1={x2} y1={y2 - ext * 0.3} x2={x2} y2={y2 + ext} stroke={color} strokeWidth="0.5" />
        {/* Main line */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.6" />
        {/* Left tick */}
        <polygon
          points={`${x1},${y1} ${x1 + arrowSize * 2},${y1 - arrowSize} ${x1 + arrowSize * 2},${y1 + arrowSize}`}
          fill={color}
        />
        {/* Right tick */}
        <polygon
          points={`${x2},${y2} ${x2 - arrowSize * 2},${y2 - arrowSize} ${x2 - arrowSize * 2},${y2 + arrowSize}`}
          fill={color}
        />
        {/* Label */}
        <text
          x={midX} y={y1 - 4}
          textAnchor="middle"
          fill={color}
          fontSize="8.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          {label}
        </text>
      </g>
    )
  }

  // Vertical
  const midY = (y1 + y2) / 2
  const ext = extensionLength
  return (
    <g>
      {/* Extension lines */}
      <line x1={x1 - ext} y1={y1} x2={x1 + ext * 0.3} y2={y1} stroke={color} strokeWidth="0.5" />
      <line x1={x2 - ext} y1={y2} x2={x2 + ext * 0.3} y2={y2} stroke={color} strokeWidth="0.5" />
      {/* Main line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.6" />
      {/* Top tick */}
      <polygon
        points={`${x1},${Math.min(y1, y2)} ${x1 - arrowSize},${Math.min(y1, y2) + arrowSize * 2} ${x1 + arrowSize},${Math.min(y1, y2) + arrowSize * 2}`}
        fill={color}
      />
      {/* Bottom tick */}
      <polygon
        points={`${x1},${Math.max(y1, y2)} ${x1 - arrowSize},${Math.max(y1, y2) - arrowSize * 2} ${x1 + arrowSize},${Math.max(y1, y2) - arrowSize * 2}`}
        fill={color}
      />
      {/* Label (rotated) */}
      <text
        x={x1 - 6} y={midY + 3}
        textAnchor="end"
        fill={color}
        fontSize="8.5"
        fontFamily="sans-serif"
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  )
}

/** Concrete slab crosshatch pattern definition */
function ConcreteHatchDefs() {
  return (
    <defs>
      <pattern
        id="concrete-hatch"
        patternUnits="userSpaceOnUse"
        width="12"
        height="12"
        patternTransform="rotate(45)"
      >
        <line x1={0} y1={0} x2={0} y2={12} stroke={C.slab} strokeWidth="0.4" />
        <line x1={6} y1={0} x2={6} y2={12} stroke={C.slab} strokeWidth="0.3" strokeDasharray="1 3" />
      </pattern>
      <pattern
        id="concrete-dots"
        patternUnits="userSpaceOnUse"
        width="16"
        height="16"
      >
        <circle cx={4} cy={4} r="0.6" fill={C.slab} />
        <circle cx={12} cy={12} r="0.6" fill={C.slab} />
      </pattern>
    </defs>
  )
}

// ---------------------------------------------------------------------------
// Anchor position helper: determines which anchors are tension-side
// ---------------------------------------------------------------------------

function isTensionAnchor(
  col: number,
  row: number,
  governingDirection: 'longitudinal' | 'transverse',
): boolean {
  // Seismic force acts in governing direction.
  // Tension (uplift) occurs on the far side from the applied force.
  // Convention: force acts in +x (longitudinal) or +y (transverse).
  // Far side = col 0 for longitudinal, row 0 for transverse.
  if (governingDirection === 'longitudinal') {
    return col === 0
  }
  return row === 0
}

/** Shear arrow direction based on governing direction */
function shearArrowDir(
  governingDirection: 'longitudinal' | 'transverse',
): 'right' | 'down' {
  return governingDirection === 'longitudinal' ? 'right' : 'down'
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AnchorDetailDiagram({
  nLong,
  nTrans,
  sx,
  sy,
  ca1,
  equipLength,
  equipWidth,
  anchorDiameter,
  Tu,
  Vu,
  governingDirection,
  upliftOccurs,
  anchorForces,
}: AnchorDetailDiagramProps) {
  const hasRBG = anchorForces && anchorForces.length > 0
  // Placeholder state
  if (nLong <= 0 || nTrans <= 0) {
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
          Configure anchor layout to generate detail
        </text>
      </svg>
    )
  }

  // --- Compute geometry ---
  const totalSx = (nLong - 1) * sx
  const totalSy = (nTrans - 1) * sy

  // Include edge distance for concrete slab sizing
  const slabPadding = Math.max(ca1 * 2, 6) // padding beyond anchor group
  const slabExtentX = totalSx + slabPadding * 2
  const slabExtentY = totalSy + slabPadding * 2

  // Determine the largest extent to scale against
  const effectiveX = Math.max(slabExtentX, equipLength || 0, 1)
  const effectiveY = Math.max(slabExtentY, equipWidth || 0, 1)

  // Scale to fit drawing area with margin for dimensions
  const dimMarginX = 50
  const dimMarginY = 30
  const availW = DRAW_W - dimMarginX * 2
  const availH = DRAW_H - dimMarginY * 2

  const scaleX = availW / effectiveX
  const scaleY = availH / effectiveY
  const scale = Math.min(scaleX, scaleY, 4) // cap for small configs

  // Center point
  const cx = SVG_W / 2
  const cy = PAD.top + DRAW_H / 2

  // Anchor group in SVG coords
  const grpW = totalSx * scale
  const grpH = totalSy * scale

  // Equipment footprint in SVG coords
  const eqW = (equipLength || totalSx + 4) * scale
  const eqH = (equipWidth || totalSy + 4) * scale

  // Concrete slab in SVG coords
  const slabW = slabExtentX * scale
  const slabH = slabExtentY * scale

  // Anchor bolt radius (proportional to diameter, with min/max)
  const boltR = Math.max(3, Math.min(8, anchorDiameter * scale * 0.5))

  // --- Generate anchor positions ---
  const anchors: Array<{ x: number; y: number; col: number; row: number }> = []
  for (let i = 0; i < nLong; i++) {
    for (let j = 0; j < nTrans; j++) {
      anchors.push({
        x: cx - grpW / 2 + (nLong > 1 ? i * (grpW / (nLong - 1)) : 0),
        y: cy - grpH / 2 + (nTrans > 1 ? j * (grpH / (nTrans - 1)) : 0),
        col: i,
        row: j,
      })
    }
  }

  // Key positions
  const grpLeft = cx - grpW / 2
  const grpRight = cx + grpW / 2
  const grpTop = cy - grpH / 2
  const grpBottom = cy + grpH / 2

  // sx dimension: first bay along bottom
  const sxBayEnd = nLong > 1 ? grpLeft + grpW / (nLong - 1) : grpLeft

  // sy dimension: first bay along right
  const syBayEnd = nTrans > 1 ? grpTop + grpH / (nTrans - 1) : grpTop

  // Shear arrow direction
  const shearDir = shearArrowDir(governingDirection)
  const shearLen = 14

  const totalAnchors = nLong * nTrans

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      <ConcreteHatchDefs />

      {/* Background */}
      <rect width={SVG_W} height={SVG_H} fill={C.bg} rx="6" />

      {/* Title */}
      <text
        x={SVG_W / 2} y={16}
        textAnchor="middle"
        fill={C.object}
        fontSize="11"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        Anchor Layout — Plan View — {nLong}x{nTrans} ({totalAnchors} anchors)
      </text>

      {/* ---- Concrete Slab ---- */}
      <rect
        x={cx - slabW / 2}
        y={cy - slabH / 2}
        width={slabW}
        height={slabH}
        fill={C.concrete}
        fillOpacity="0.2"
        stroke={C.dim}
        strokeWidth="1"
      />
      {/* Crosshatch overlay */}
      <rect
        x={cx - slabW / 2}
        y={cy - slabH / 2}
        width={slabW}
        height={slabH}
        fill="url(#concrete-hatch)"
        opacity="0.5"
      />
      {/* Dot overlay */}
      <rect
        x={cx - slabW / 2}
        y={cy - slabH / 2}
        width={slabW}
        height={slabH}
        fill="url(#concrete-dots)"
        opacity="0.4"
      />

      {/* ---- Equipment Footprint (dashed blue) ---- */}
      {(equipLength > 0 || equipWidth > 0) && (
        <g>
          <rect
            x={cx - eqW / 2}
            y={cy - eqH / 2}
            width={eqW}
            height={eqH}
            fill="none"
            stroke={C.equipBlue}
            strokeWidth="1.2"
            strokeDasharray="6 3"
            rx="2"
            opacity="0.65"
          />
          <text
            x={cx}
            y={cy - eqH / 2 - 5}
            textAnchor="middle"
            fill={C.equipBlue}
            fontSize="8.5"
            fontFamily="sans-serif"
            fontWeight="500"
            opacity="0.7"
          >
            Equipment Footprint
          </text>
        </g>
      )}

      {/* ---- Anchor Bolts with Force Indicators ---- */}
      {anchors.map((a, i) => {
        const isTension = upliftOccurs && isTensionAnchor(a.col, a.row, governingDirection)

        // Find matching RBG anchor force (by index, since grid is generated in same order)
        const af = hasRBG ? anchorForces[i] : undefined

        // Determine max forces for scaling arrows (RBG mode)
        const maxV = hasRBG ? Math.max(...anchorForces.map(f => f.vCombined), 1) : 1
        const maxT = hasRBG ? Math.max(...anchorForces.map(f => f.tCombined), 1) : 1

        return (
          <g key={`anchor-${i}`}>
            {/* Bolt circle — red outline for critical anchor in RBG mode */}
            <circle
              cx={a.x} cy={a.y} r={boltR}
              fill={af?.isCritical ? C.demand : C.object}
              stroke={af?.isCritical ? C.demand : C.bg}
              strokeWidth={af?.isCritical ? 2 : 1}
            />
            {/* Inner cross for bolt detail */}
            <line
              x1={a.x - boltR * 0.5} y1={a.y}
              x2={a.x + boltR * 0.5} y2={a.y}
              stroke={C.bg} strokeWidth="0.8"
            />
            <line
              x1={a.x} y1={a.y - boltR * 0.5}
              x2={a.x} y2={a.y + boltR * 0.5}
              stroke={C.bg} strokeWidth="0.8"
            />

            {/* === RBG Mode: Per-anchor force vectors === */}
            {af ? (
              <g>
                {/* Shear vector — red arrow proportional to vCombined */}
                {af.vCombined > 0 && (() => {
                  const vScale = Math.min(20, 8 + 12 * (af.vCombined / maxV))
                  // Direction from combined X/Y components
                  const totalVx = af.vDirectX + af.vTorsionX
                  const totalVy = af.vDirectY + af.vTorsionY
                  const vMag = Math.sqrt(totalVx * totalVx + totalVy * totalVy)
                  if (vMag <= 0) return null
                  const nx = totalVx / vMag
                  const ny = totalVy / vMag
                  const endX = a.x + nx * (boltR + 2 + vScale)
                  const endY = a.y + ny * (boltR + 2 + vScale)
                  // Determine closest cardinal direction for arrowhead
                  const dir: 'up' | 'down' | 'left' | 'right' =
                    Math.abs(nx) > Math.abs(ny)
                      ? (nx > 0 ? 'right' : 'left')
                      : (ny > 0 ? 'down' : 'up')
                  return (
                    <g>
                      <line
                        x1={a.x + nx * (boltR + 2)} y1={a.y + ny * (boltR + 2)}
                        x2={endX} y2={endY}
                        stroke={C.demand} strokeWidth="1.2"
                      />
                      <SmallArrow x={endX} y={endY} dir={dir} color={C.demand} size={3} />
                    </g>
                  )
                })()}

                {/* Torsional shear component — lighter tangential arrow */}
                {(Math.abs(af.vTorsionX) > 0.1 || Math.abs(af.vTorsionY) > 0.1) && (() => {
                  const tMag = Math.sqrt(af.vTorsionX ** 2 + af.vTorsionY ** 2)
                  const tScale = Math.min(14, 5 + 9 * (tMag / maxV))
                  const tnx = af.vTorsionX / tMag
                  const tny = af.vTorsionY / tMag
                  const endX = a.x + tnx * (boltR + 2 + tScale)
                  const endY = a.y + tny * (boltR + 2 + tScale)
                  return (
                    <line
                      x1={a.x + tnx * (boltR + 2)} y1={a.y + tny * (boltR + 2)}
                      x2={endX} y2={endY}
                      stroke={C.demand} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.5"
                    />
                  )
                })()}

                {/* Tension indicator — green upward triangle, sized by tCombined */}
                {af.tCombined > 0 && (() => {
                  const tSize = Math.min(6, 3 + 3 * (af.tCombined / maxT))
                  return (
                    <SmallArrow
                      x={a.x}
                      y={a.y - boltR - 4 - tSize}
                      dir="up"
                      color={C.tension}
                      size={tSize}
                    />
                  )
                })()}

                {/* Critical anchor label */}
                {af.isCritical && (
                  <text
                    x={a.x} y={a.y + boltR + 12}
                    textAnchor="middle"
                    fill={C.demand}
                    fontSize="7"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    CRIT
                  </text>
                )}
              </g>
            ) : (
              /* === Simple Mode: Original force indicators === */
              <g>
                {/* Tension indicator: green upward triangle */}
                {isTension && (
                  <SmallArrow
                    x={a.x}
                    y={a.y - boltR - 6}
                    dir="up"
                    color={C.tension}
                    size={4}
                  />
                )}

                {/* Shear indicator: small red arrow in governing direction */}
                {Vu > 0 && (
                  <g>
                    <line
                      x1={a.x + (shearDir === 'right' ? boltR + 2 : 0)}
                      y1={a.y + (shearDir === 'down' ? boltR + 2 : 0)}
                      x2={a.x + (shearDir === 'right' ? boltR + 2 + shearLen : 0)}
                      y2={a.y + (shearDir === 'down' ? boltR + 2 + shearLen : 0)}
                      stroke={C.demand}
                      strokeWidth="1.2"
                    />
                    <SmallArrow
                      x={a.x + (shearDir === 'right' ? boltR + 2 + shearLen : 0)}
                      y={a.y + (shearDir === 'down' ? boltR + 2 + shearLen : 0)}
                      dir={shearDir}
                      color={C.demand}
                      size={3}
                    />
                  </g>
                )}
              </g>
            )}
          </g>
        )
      })}

      {/* ---- Spacing Dimension: sx (horizontal, below anchors) ---- */}
      {nLong > 1 && sx > 0 && (
        <DimLine
          x1={grpLeft}
          y1={grpBottom + 20}
          x2={sxBayEnd}
          y2={grpBottom + 20}
          label={`sx = ${sx}"`}
          orientation="horizontal"
        />
      )}

      {/* ---- Spacing Dimension: sy (vertical, right of anchors) ---- */}
      {nTrans > 1 && sy > 0 && (
        <DimLine
          x1={grpRight + 20}
          y1={grpTop}
          x2={grpRight + 20}
          y2={syBayEnd}
          label={`sy = ${sy}"`}
          orientation="vertical"
        />
      )}

      {/* ---- Edge Distance Dimension (ca1) ---- */}
      {ca1 > 0 && (
        <g>
          {/* Show ca1 from top-left anchor to slab edge (top) */}
          <DimLine
            x1={grpLeft}
            y1={cy - slabH / 2}
            x2={grpLeft}
            y2={grpTop}
            label={`ca1 = ${ca1}"`}
            orientation="vertical"
            extensionLength={6}
          />
        </g>
      )}

      {/* ---- Overall span dimensions (outside slab) ---- */}
      {nLong > 1 && (
        <DimLine
          x1={grpLeft}
          y1={grpBottom + (nLong > 1 && sx > 0 ? 38 : 20)}
          x2={grpRight}
          y2={grpBottom + (nLong > 1 && sx > 0 ? 38 : 20)}
          label={`${totalSx.toFixed(1)}" total`}
          orientation="horizontal"
        />
      )}
      {nTrans > 1 && (
        <DimLine
          x1={grpRight + (nTrans > 1 && sy > 0 ? 38 : 20)}
          y1={grpTop}
          x2={grpRight + (nTrans > 1 && sy > 0 ? 38 : 20)}
          y2={grpBottom}
          label={`${totalSy.toFixed(1)}" total`}
          orientation="vertical"
        />
      )}

      {/* ---- Axis Labels ---- */}
      {/* Longitudinal axis (horizontal) */}
      <g>
        <line
          x1={cx - slabW / 2 - 6} y1={cy + slabH / 2 + 16}
          x2={cx + slabW / 2 + 6} y2={cy + slabH / 2 + 16}
          stroke={C.hidden}
          strokeWidth="0.6"
          strokeDasharray="3 2"
        />
        <SmallArrow
          x={cx + slabW / 2 + 6}
          y={cy + slabH / 2 + 16}
          dir="right"
          color={C.hidden}
          size={3}
        />
        <text
          x={cx + slabW / 2 + 12}
          y={cy + slabH / 2 + 19}
          fill={C.hidden}
          fontSize="8"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          Long.
        </text>
      </g>
      {/* Transverse axis (vertical) */}
      <g>
        <line
          x1={cx - slabW / 2 - 16} y1={cy + slabH / 2 + 6}
          x2={cx - slabW / 2 - 16} y2={cy - slabH / 2 - 6}
          stroke={C.hidden}
          strokeWidth="0.6"
          strokeDasharray="3 2"
        />
        <SmallArrow
          x={cx - slabW / 2 - 16}
          y={cy - slabH / 2 - 6}
          dir="up"
          color={C.hidden}
          size={3}
        />
        <text
          x={cx - slabW / 2 - 16}
          y={cy - slabH / 2 - 10}
          textAnchor="middle"
          fill={C.hidden}
          fontSize="8"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          Trans.
        </text>
      </g>

      {/* ---- Governing Direction Note ---- */}
      <text
        x={SVG_W / 2} y={SVG_H - 64}
        textAnchor="middle"
        fill={C.demand}
        fontSize="9"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        Governing direction: {governingDirection}
      </text>

      {/* ---- Force summary ---- */}
      <text
        x={SVG_W / 2} y={SVG_H - 50}
        textAnchor="middle"
        fill={C.object}
        fontSize="9"
        fontFamily="monospace"
      >
        {hasRBG ? (
          <>Critical anchor: Tu = {fmtForce(anchorForces.find(a => a.isCritical)?.tCombined ?? 0)} | Vu = {fmtForce(anchorForces.find(a => a.isCritical)?.vCombined ?? 0)}</>
        ) : (
          <>Tu = {upliftOccurs ? fmtForce(Tu) : '0 (no uplift)'}{'   |   '}Vu = {fmtForce(Vu)} per anchor</>
        )}
      </text>

      {/* ---- Legend ---- */}
      <g transform={`translate(${PAD.left}, ${SVG_H - 38})`}>
        <rect x={-4} y={-10} width={SVG_W - PAD.left - PAD.right + 8} height={30} rx="3"
          fill="white" fillOpacity="0.8" stroke={C.dim} strokeWidth="0.4" />

        {/* Bolt */}
        <circle cx={8} cy={2} r="3.5" fill={C.object} />
        <text x={16} y={5} fill={C.object} fontSize="8" fontFamily="sans-serif">
          Anchor bolt
        </text>

        {/* Tension */}
        <SmallArrow x={86} y={-2} dir="up" color={C.tension} size={3.5} />
        <text x={93} y={5} fill={C.object} fontSize="8" fontFamily="sans-serif">
          Tension
        </text>

        {/* Shear */}
        <line x1={140} y1={2} x2={152} y2={2} stroke={C.demand} strokeWidth="1.2" />
        <SmallArrow x={152} y={2} dir="right" color={C.demand} size={3} />
        <text x={158} y={5} fill={C.object} fontSize="8" fontFamily="sans-serif">
          Shear
        </text>

        {/* Equipment */}
        <line x1={206} y1={2} x2={220} y2={2} stroke={C.equipBlue} strokeWidth="1.2" strokeDasharray="4 2" />
        <text x={226} y={5} fill={C.object} fontSize="8" fontFamily="sans-serif">
          Equip. footprint
        </text>

        {/* Concrete */}
        <rect x={310} y={-3} width={12} height={10} fill={C.concrete} fillOpacity="0.4" stroke={C.dim} strokeWidth="0.4" />
        <text x={326} y={5} fill={C.object} fontSize="8" fontFamily="sans-serif">
          Concrete
        </text>
      </g>
    </svg>
  )
}
