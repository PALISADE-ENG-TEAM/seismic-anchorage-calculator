// AnchorDiagram.tsx — Plan view (top-down) of anchor layout with equipment footprint
// Used in AnchorageTab to visualize bolt pattern relative to equipment

const COLORS = {
  bg: '#1e293b',
  border: '#475569',
  accent: '#f97316',
  text: '#e2e8f0',
  muted: '#94a3b8',
  equipOutline: '#3b82f6',
};

interface AnchorDiagramProps {
  nLong: number;
  nTrans: number;
  sx: number;
  sy: number;
  equipLength: number;
  equipWidth: number;
}

export function AnchorDiagram({
  nLong,
  nTrans,
  sx,
  sy,
  equipLength,
  equipWidth,
}: AnchorDiagramProps) {
  if (nLong <= 0 || nTrans <= 0) {
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

  // Anchor group total footprint
  const totalSx = (nLong - 1) * sx || 1;
  const totalSy = (nTrans - 1) * sy || 1;

  // Include equipment if larger, for scaling
  const effectiveL = Math.max(totalSx, equipLength || 0, 1);
  const effectiveW = Math.max(totalSy, equipWidth || 0, 1);

  // Scale to fit
  const scaleX = drawW / effectiveL;
  const scaleY = drawH / effectiveW;
  const scale = Math.min(scaleX, scaleY) * 0.8;

  // Center of drawing
  const cx = svgW / 2;
  const cy = (padTop + svgH - padBot) / 2;

  // Anchor group dimensions in SVG coords
  const anchorGrpW = totalSx * scale;
  const anchorGrpH = totalSy * scale;

  // Equipment footprint in SVG coords
  const eqDrawL = (equipLength || totalSx) * scale;
  const eqDrawW = (equipWidth || totalSy) * scale;

  // Generate anchor positions (centered on cx, cy)
  const anchors: Array<{ x: number; y: number; col: number; row: number }> = [];
  for (let i = 0; i < nLong; i++) {
    for (let j = 0; j < nTrans; j++) {
      anchors.push({
        x: cx - anchorGrpW / 2 + (nLong > 1 ? i * (anchorGrpW / (nLong - 1)) : 0),
        y: cy - anchorGrpH / 2 + (nTrans > 1 ? j * (anchorGrpH / (nTrans - 1)) : 0),
        col: i,
        row: j,
      });
    }
  }

  // Key positions for dimension arrows
  const leftX = cx - anchorGrpW / 2;
  const rightX = cx + anchorGrpW / 2;
  const topY = cy - anchorGrpH / 2;
  const bottomY = cy + anchorGrpH / 2;

  // sx spacing (one bay, along bottom)
  const sxPxEnd = nLong > 1 ? leftX + anchorGrpW / (nLong - 1) : leftX;

  // sy spacing (one bay, along right)
  const syPxEnd = nTrans > 1 ? topY + anchorGrpH / (nTrans - 1) : topY;

  const totalAnchors = nLong * nTrans;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm">
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
        Plan View &#8212; {nLong}x{nTrans} Pattern ({totalAnchors} anchors)
      </text>

      {/* Equipment footprint (blue dashed rectangle) */}
      {(equipLength > 0 || equipWidth > 0) && (
        <g>
          <rect
            x={cx - eqDrawL / 2}
            y={cy - eqDrawW / 2}
            width={eqDrawL}
            height={eqDrawW}
            fill="none"
            stroke={COLORS.equipOutline}
            strokeWidth="1.5"
            strokeDasharray="6 3"
            rx="2"
            opacity="0.6"
          />
          <text
            x={cx}
            y={cy - eqDrawW / 2 - 6}
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

      {/* Anchor circles */}
      {anchors.map((a, i) => (
        <circle
          key={`anchor-${i}`}
          cx={a.x}
          cy={a.y}
          r="5"
          fill={COLORS.accent}
          stroke={COLORS.bg}
          strokeWidth="1.5"
        />
      ))}

      {/* sx dimension arrow (horizontal, below anchors) */}
      {nLong > 1 && sx > 0 && (
        <DimArrowH
          x1={leftX}
          x2={sxPxEnd}
          y={bottomY + 24}
          label={`sx = ${sx}"`}
          color={COLORS.text}
          tickY1={bottomY + 4}
          tickY2={bottomY + 28}
        />
      )}

      {/* sy dimension arrow (vertical, right of anchors) */}
      {nTrans > 1 && sy > 0 && (
        <DimArrowVert
          y1={topY}
          y2={syPxEnd}
          x={rightX + 24}
          label={`sy = ${sy}"`}
          color={COLORS.text}
          tickX1={rightX + 4}
          tickX2={rightX + 28}
        />
      )}

      {/* Overall span summary */}
      <text
        x={cx}
        y={svgH - 10}
        textAnchor="middle"
        fill={COLORS.muted}
        fontSize="9"
        fontFamily="monospace"
      >
        Long. span: {totalSx.toFixed(1)}&quot; | Trans. span: {totalSy.toFixed(1)}&quot;
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
