// AnchorDiagram.tsx — Plan view (top-down) of anchor layout with equipment footprint
// Supports both grid-based and arbitrary anchor positions (rigid bolt group)

import type { AnchorPosition } from '@/lib/types.ts';
import { useCallback } from 'react';

const COLORS = {
  bg: '#e2e8f0',
  border: '#94a3b8',
  accent: '#2563eb',
  text: '#1e293b',
  muted: '#64748b',
  equipOutline: '#2563eb',
  critical: '#dc2626',
  cgMarker: '#16a34a',
  centroidMarker: '#9333ea',
};

interface AnchorDiagramProps {
  nLong: number;
  nTrans: number;
  sx: number;
  sy: number;
  equipLength: number;
  equipWidth: number;
  // Rigid bolt group support
  anchors?: AnchorPosition[];
  cgOffset?: { x: number; y: number };
  criticalAnchorId?: string;
  interactive?: boolean;
  onAnchorClick?: (x: number, y: number) => void;
}

export function AnchorDiagram({
  nLong,
  nTrans,
  sx,
  sy,
  equipLength,
  equipWidth,
  anchors: explicitAnchors,
  cgOffset,
  criticalAnchorId,
  interactive,
  onAnchorClick,
}: AnchorDiagramProps) {
  const hasExplicitAnchors = explicitAnchors && explicitAnchors.length > 0;
  const totalAnchors = hasExplicitAnchors ? explicitAnchors.length : nLong * nTrans;

  if (!hasExplicitAnchors && (nLong <= 0 || nTrans <= 0)) {
    return (
      <svg viewBox="0 0 350 300" className="w-full max-w-sm">
        <rect width="350" height="300" fill={COLORS.bg} rx="8" />
        <text
          x="175"
          y="150"
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize="14"
          fontFamily="sans-serif"
        >
          Configure anchor layout
        </text>
      </svg>
    );
  }

  // Drawing area
  const svgW = 350;
  const svgH = 300;
  const padX = 55;
  const padTop = 45;
  const padBot = 50;
  const drawW = svgW - 2 * padX;
  const drawH = svgH - padTop - padBot;

  // Center of drawing
  const cx = svgW / 2;
  const cy = (padTop + svgH - padBot) / 2;

  // Determine engineering bounds for scaling
  let effectiveL: number;
  let effectiveW: number;
  let engineeringCenterX: number;
  let engineeringCenterY: number;

  if (hasExplicitAnchors) {
    const xs = explicitAnchors.map(a => a.x);
    const ys = explicitAnchors.map(a => a.y);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, equipLength || 0);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, equipWidth || 0);
    effectiveL = Math.max(maxX - minX, 1);
    effectiveW = Math.max(maxY - minY, 1);
    engineeringCenterX = (minX + maxX) / 2;
    engineeringCenterY = (minY + maxY) / 2;
  } else {
    const totalSx = (nLong - 1) * sx || 1;
    const totalSy = (nTrans - 1) * sy || 1;
    effectiveL = Math.max(totalSx, equipLength || 0, 1);
    effectiveW = Math.max(totalSy, equipWidth || 0, 1);
    engineeringCenterX = (equipLength || totalSx) / 2;
    engineeringCenterY = (equipWidth || totalSy) / 2;
  }

  // Scale to fit
  const scaleX = drawW / effectiveL;
  const scaleY = drawH / effectiveW;
  const scale = Math.min(scaleX, scaleY) * 0.8;

  // Convert engineering coords to SVG coords
  const toSvgX = (engX: number) => cx + (engX - engineeringCenterX) * scale;
  const toSvgY = (engY: number) => cy + (engY - engineeringCenterY) * scale;

  // Convert SVG coords back to engineering coords (for click)
  const toEngX = (svgX: number) => (svgX - cx) / scale + engineeringCenterX;
  const toEngY = (svgY: number) => (svgY - cy) / scale + engineeringCenterY;

  // Build anchor list (either explicit or generated from grid)
  type AnchorViz = { x: number; y: number; id: string; svgX: number; svgY: number };
  let anchorViz: AnchorViz[];

  if (hasExplicitAnchors) {
    anchorViz = explicitAnchors.map(a => ({
      x: a.x,
      y: a.y,
      id: a.id,
      svgX: toSvgX(a.x),
      svgY: toSvgY(a.y),
    }));
  } else {
    anchorViz = [];
    const totalSx = (nLong - 1) * sx;
    const totalSy = (nTrans - 1) * sy;
    const startX = ((equipLength || totalSx) - totalSx) / 2;
    const startY = ((equipWidth || totalSy) - totalSy) / 2;
    for (let i = 0; i < nLong; i++) {
      for (let j = 0; j < nTrans; j++) {
        const engX = startX + i * sx;
        const engY = startY + j * sy;
        anchorViz.push({
          x: engX,
          y: engY,
          id: `a-${i}-${j}`,
          svgX: toSvgX(engX),
          svgY: toSvgY(engY),
        });
      }
    }
  }

  // Equipment footprint in SVG
  const eqL = equipLength || effectiveL;
  const eqW = equipWidth || effectiveW;
  const eqSvgX = toSvgX(0);
  const eqSvgY = toSvgY(0);
  const eqSvgW = eqL * scale;
  const eqSvgH = eqW * scale;

  // Bolt group centroid
  const centroidX = anchorViz.reduce((s, a) => s + a.x, 0) / (anchorViz.length || 1);
  const centroidY = anchorViz.reduce((s, a) => s + a.y, 0) / (anchorViz.length || 1);
  const centroidSvgX = toSvgX(centroidX);
  const centroidSvgY = toSvgY(centroidY);

  // CG position
  const hasCgOffset = cgOffset && (cgOffset.x !== 0 || cgOffset.y !== 0);
  const cgX = eqL / 2 + (cgOffset?.x ?? 0);
  const cgY = eqW / 2 + (cgOffset?.y ?? 0);
  const cgSvgX = toSvgX(cgX);
  const cgSvgY = toSvgY(cgY);

  // Dimension lines for grid mode
  const totalSxGrid = (nLong - 1) * sx;
  const totalSyGrid = (nTrans - 1) * sy;

  // sx dimension (first bay)
  const leftAnchor = anchorViz.length > 0 ? anchorViz.reduce((min, a) => a.svgX < min.svgX ? a : min) : null;
  const bottomAnchor = anchorViz.length > 0 ? anchorViz.reduce((max, a) => a.svgY > max.svgY ? a : max) : null;

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onAnchorClick) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const engX = toEngX(svgPt.x);
    const engY = toEngY(svgPt.y);
    onAnchorClick(engX, engY);
  }, [interactive, onAnchorClick, toEngX, toEngY]);

  const titleText = hasExplicitAnchors
    ? `Plan View — ${totalAnchors} anchors (custom)`
    : `Plan View — ${nLong}x${nTrans} Pattern (${totalAnchors} anchors)`;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className={`w-full max-w-sm ${interactive ? 'cursor-crosshair' : ''}`}
      onClick={handleSvgClick}
    >
      {/* Background */}
      <rect width={svgW} height={svgH} fill={COLORS.bg} rx="8" />

      {/* Title */}
      <text
        x={cx}
        y={20}
        textAnchor="middle"
        fill={COLORS.muted}
        fontSize="10"
        fontFamily="sans-serif"
      >
        {titleText}
      </text>

      {/* Equipment footprint (blue dashed rectangle) */}
      {(equipLength > 0 || equipWidth > 0) && (
        <g>
          <rect
            x={eqSvgX}
            y={eqSvgY}
            width={eqSvgW}
            height={eqSvgH}
            fill="none"
            stroke={COLORS.equipOutline}
            strokeWidth="1.5"
            strokeDasharray="6 3"
            rx="2"
            opacity="0.6"
          />
          <text
            x={eqSvgX + eqSvgW / 2}
            y={eqSvgY - 6}
            textAnchor="middle"
            fill={COLORS.equipOutline}
            fontSize="9"
            fontFamily="sans-serif"
            opacity="0.7"
          >
            Equipment Footprint
          </text>
        </g>
      )}

      {/* Bolt group centroid marker (purple +) — only in RBG mode */}
      {hasExplicitAnchors && (
        <g>
          <line x1={centroidSvgX - 6} y1={centroidSvgY} x2={centroidSvgX + 6} y2={centroidSvgY} stroke={COLORS.centroidMarker} strokeWidth="1.5" />
          <line x1={centroidSvgX} y1={centroidSvgY - 6} x2={centroidSvgX} y2={centroidSvgY + 6} stroke={COLORS.centroidMarker} strokeWidth="1.5" />
          <text
            x={centroidSvgX + 9}
            y={centroidSvgY - 4}
            fill={COLORS.centroidMarker}
            fontSize="8"
            fontFamily="sans-serif"
            fontWeight="600"
          >
            CG_bolt
          </text>
        </g>
      )}

      {/* CG marker (green crosshair) — when offset is non-zero */}
      {hasCgOffset && (
        <g>
          <line x1={cgSvgX - 8} y1={cgSvgY} x2={cgSvgX + 8} y2={cgSvgY} stroke={COLORS.cgMarker} strokeWidth="2" />
          <line x1={cgSvgX} y1={cgSvgY - 8} x2={cgSvgX} y2={cgSvgY + 8} stroke={COLORS.cgMarker} strokeWidth="2" />
          <circle cx={cgSvgX} cy={cgSvgY} r="4" fill="none" stroke={COLORS.cgMarker} strokeWidth="1.5" />
          <text
            x={cgSvgX + 10}
            y={cgSvgY + 4}
            fill={COLORS.cgMarker}
            fontSize="9"
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            CG
          </text>
        </g>
      )}

      {/* Anchor circles */}
      {anchorViz.map((a) => {
        const isCritical = criticalAnchorId === a.id;
        return (
          <circle
            key={a.id}
            cx={a.svgX}
            cy={a.svgY}
            r={isCritical ? 6 : 5}
            fill={isCritical ? COLORS.critical : COLORS.accent}
            stroke={isCritical ? COLORS.critical : COLORS.bg}
            strokeWidth={isCritical ? 2 : 1.5}
          />
        );
      })}

      {/* sx dimension arrow (horizontal, below anchors) — grid mode only */}
      {!hasExplicitAnchors && nLong > 1 && sx > 0 && leftAnchor && bottomAnchor && (() => {
        const leftX = leftAnchor.svgX;
        const sxPxEnd = leftX + sx * scale;
        const dimY = bottomAnchor.svgY + 24;
        return (
          <DimArrowH
            x1={leftX}
            x2={sxPxEnd}
            y={dimY}
            label={`sx = ${sx}"`}
            color={COLORS.text}
            tickY1={bottomAnchor.svgY + 4}
            tickY2={dimY + 4}
          />
        );
      })()}

      {/* sy dimension arrow (vertical, right of anchors) — grid mode only */}
      {!hasExplicitAnchors && nTrans > 1 && sy > 0 && (() => {
        const rightAnchor = anchorViz.reduce((max, a) => a.svgX > max.svgX ? a : max);
        const topAnchor = anchorViz.reduce((min, a) => a.svgY < min.svgY ? a : min);
        const syPxEnd = topAnchor.svgY + sy * scale;
        return (
          <DimArrowVert
            y1={topAnchor.svgY}
            y2={syPxEnd}
            x={rightAnchor.svgX + 24}
            label={`sy = ${sy}"`}
            color={COLORS.text}
            tickX1={rightAnchor.svgX + 4}
            tickX2={rightAnchor.svgX + 28}
          />
        );
      })()}

      {/* Overall span summary */}
      <text
        x={cx}
        y={svgH - 10}
        textAnchor="middle"
        fill={COLORS.muted}
        fontSize="9"
        fontFamily="monospace"
      >
        {hasExplicitAnchors
          ? `${totalAnchors} anchors | Centroid: (${centroidX.toFixed(1)}", ${centroidY.toFixed(1)}")`
          : `Long. span: ${totalSxGrid.toFixed(1)}" | Trans. span: ${totalSyGrid.toFixed(1)}"`
        }
      </text>

      {/* Axis labels */}
      <text
        x={svgW - 14}
        y={cy + 4}
        fill={COLORS.muted}
        fontSize="9"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        L
      </text>
      <text
        x={cx}
        y={svgH - padBot + 40}
        fill={COLORS.muted}
        fontSize="9"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        W
      </text>

      {/* Interactive hint */}
      {interactive && (
        <text
          x={cx}
          y={svgH - 25}
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize="8"
          fontFamily="sans-serif"
          fontStyle="italic"
        >
          Click to place anchors (0.5" snap)
        </text>
      )}
    </svg>
  );
}

// --- Horizontal dimension arrow ---

function DimArrowH({
  x1,
  x2,
  y,
  label,
  color,
  tickY1,
  tickY2,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  color: string;
  tickY1: number;
  tickY2: number;
}) {
  const arrowSize = 4;
  const midX = (x1 + x2) / 2;

  return (
    <g>
      {/* Extension lines */}
      <line x1={x1} y1={tickY1} x2={x1} y2={tickY2} stroke={color} strokeWidth="0.5" strokeDasharray="2 2" />
      <line x1={x2} y1={tickY1} x2={x2} y2={tickY2} stroke={color} strokeWidth="0.5" strokeDasharray="2 2" />
      {/* Main line */}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1" />
      {/* Arrowhead left */}
      <polygon
        points={`${x1},${y} ${x1 + arrowSize * 2},${y - arrowSize} ${x1 + arrowSize * 2},${y + arrowSize}`}
        fill={color}
      />
      {/* Arrowhead right */}
      <polygon
        points={`${x2},${y} ${x2 - arrowSize * 2},${y - arrowSize} ${x2 - arrowSize * 2},${y + arrowSize}`}
        fill={color}
      />
      {/* Label */}
      <text
        x={midX}
        y={y - 5}
        textAnchor="middle"
        fill={color}
        fontSize="10"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  );
}

// --- Vertical dimension arrow ---

function DimArrowVert({
  y1,
  y2,
  x,
  label,
  color,
  tickX1,
  tickX2,
}: {
  y1: number;
  y2: number;
  x: number;
  label: string;
  color: string;
  tickX1: number;
  tickX2: number;
}) {
  const arrowSize = 4;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      {/* Extension lines */}
      <line x1={tickX1} y1={y1} x2={tickX2} y2={y1} stroke={color} strokeWidth="0.5" strokeDasharray="2 2" />
      <line x1={tickX1} y1={y2} x2={tickX2} y2={y2} stroke={color} strokeWidth="0.5" strokeDasharray="2 2" />
      {/* Main line */}
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="1" />
      {/* Arrowhead top */}
      <polygon
        points={`${x},${y1} ${x - arrowSize},${y1 + arrowSize * 2} ${x + arrowSize},${y1 + arrowSize * 2}`}
        fill={color}
      />
      {/* Arrowhead bottom */}
      <polygon
        points={`${x},${y2} ${x - arrowSize},${y2 - arrowSize * 2} ${x + arrowSize},${y2 - arrowSize * 2}`}
        fill={color}
      />
      {/* Label (rotated) */}
      <text
        x={x + 14}
        y={midY + 3}
        textAnchor="middle"
        fill={color}
        fontSize="10"
        fontFamily="sans-serif"
        fontWeight="600"
        transform={`rotate(-90, ${x + 14}, ${midY + 3})`}
      >
        {label}
      </text>
    </g>
  );
}
