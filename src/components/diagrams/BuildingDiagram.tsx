// BuildingDiagram.tsx — Building elevation view showing equipment at height z
// Used in SiteTab to visualize z/h ratio for ASCE 7-22 Hf factor

const COLORS = {
  bg: '#e2e8f0',
  border: '#94a3b8',
  accent: '#2563eb',
  text: '#1e293b',
  muted: '#64748b',
};

interface BuildingDiagramProps {
  h: number;
  z: number;
}

export function BuildingDiagram({ h, z }: BuildingDiagramProps) {
  if (h === 0) {
    return (
      <svg viewBox="0 0 300 400" className="w-full max-w-sm">
        <rect width="300" height="400" fill={COLORS.bg} rx="8" />
        <text
          x="150"
          y="200"
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize="14"
          fontFamily="sans-serif"
        >
          Enter building height
        </text>
      </svg>
    );
  }

  // Layout constants
  const padTop = 40;
  const padBot = 70;
  const padLeft = 60;
  const padRight = 60;
  const bldgLeft = padLeft + 20;
  const bldgRight = 300 - padRight - 20;
  const bldgWidth = bldgRight - bldgLeft;
  const groundY = 400 - padBot;
  const roofY = padTop;
  const bldgDrawH = groundY - roofY;

  // Clamp z to [0, h]
  const zClamped = Math.max(0, Math.min(z, h));
  const ratio = h > 0 ? zClamped / h : 0;

  // Equipment position (from ground up)
  const equipY = groundY - ratio * bldgDrawH;
  const equipW = 30;
  const equipH = 14;
  const equipX = bldgLeft + bldgWidth / 2 - equipW / 2;

  // Floor lines — show ~5 evenly spaced floors
  const numFloors = Math.min(Math.max(Math.round(h / 12), 2), 8);
  const floorSpacing = bldgDrawH / numFloors;

  return (
    <svg viewBox="0 0 300 400" className="w-full max-w-sm">
      {/* Background */}
      <rect width="300" height="400" fill={COLORS.bg} rx="8" />

      {/* Ground hatching */}
      <line x1={bldgLeft - 20} y1={groundY} x2={bldgRight + 20} y2={groundY} stroke={COLORS.border} strokeWidth="2" />
      {Array.from({ length: 10 }, (_, i) => {
        const x0 = bldgLeft - 20 + i * 16;
        return (
          <line
            key={`hatch-${i}`}
            x1={x0}
            y1={groundY}
            x2={x0 - 8}
            y2={groundY + 10}
            stroke={COLORS.border}
            strokeWidth="1"
          />
        );
      })}

      {/* Building outline */}
      <rect
        x={bldgLeft}
        y={roofY}
        width={bldgWidth}
        height={bldgDrawH}
        fill="none"
        stroke={COLORS.border}
        strokeWidth="1.5"
      />

      {/* Floor lines */}
      {Array.from({ length: numFloors - 1 }, (_, i) => {
        const fy = groundY - (i + 1) * floorSpacing;
        return (
          <line
            key={`floor-${i}`}
            x1={bldgLeft}
            y1={fy}
            x2={bldgRight}
            y2={fy}
            stroke={COLORS.border}
            strokeWidth="0.5"
            strokeDasharray="4 3"
          />
        );
      })}

      {/* Roof label */}
      <text
        x={bldgLeft + bldgWidth / 2}
        y={roofY - 8}
        textAnchor="middle"
        fill={COLORS.muted}
        fontSize="10"
        fontFamily="sans-serif"
      >
        Roof
      </text>

      {/* Equipment at height z */}
      <rect
        x={equipX}
        y={equipY - equipH / 2}
        width={equipW}
        height={equipH}
        fill={COLORS.accent}
        rx="2"
        opacity="0.9"
      />
      {/* Equipment label */}
      <text
        x={equipX + equipW + 6}
        y={equipY + 4}
        fill={COLORS.accent}
        fontSize="10"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        Equip.
      </text>

      {/* Dashed horizontal line at equipment level */}
      <line
        x1={bldgLeft}
        y1={equipY}
        x2={bldgLeft - 15}
        y2={equipY}
        stroke={COLORS.accent}
        strokeWidth="1"
        strokeDasharray="3 2"
      />

      {/* --- Dimension arrow for h (total height) --- */}
      {/* Left side */}
      <DimArrowV
        x={bldgLeft - 28}
        y1={groundY}
        y2={roofY}
        label={`h = ${h} ft`}
        color={COLORS.text}
      />

      {/* --- Dimension arrow for z (attachment height) --- */}
      {/* Right side */}
      <DimArrowV
        x={bldgRight + 28}
        y1={groundY}
        y2={equipY}
        label={`z = ${zClamped} ft`}
        color={COLORS.accent}
      />

      {/* z/h ratio badge */}
      <rect
        x={180}
        y={groundY + 18}
        width={80}
        height={24}
        rx="4"
        fill={COLORS.accent}
        opacity="0.15"
        stroke={COLORS.accent}
        strokeWidth="1"
      />
      <text
        x={220}
        y={groundY + 34}
        textAnchor="middle"
        fill={COLORS.accent}
        fontSize="11"
        fontFamily="monospace"
        fontWeight="700"
      >
        z/h = {ratio.toFixed(2)}
      </text>

      {/* Code reference label */}
      <text
        x={150}
        y={395}
        textAnchor="middle"
        fill={COLORS.muted}
        fontSize="9"
        fontFamily="sans-serif"
        fontStyle="italic"
      >
        ASCE 7-22 {'\u00A7'}13.3.1.1
      </text>
    </svg>
  );
}

// --- Vertical dimension arrow helper ---

function DimArrowV({
  x,
  y1,
  y2,
  label,
  color,
}: {
  x: number;
  y1: number; // bottom
  y2: number; // top
  label: string;
  color: string;
}) {
  const arrowSize = 4;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      {/* Vertical line */}
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="1" />
      {/* Bottom arrowhead */}
      <polygon
        points={`${x},${y1} ${x - arrowSize},${y1 - arrowSize * 1.5} ${x + arrowSize},${y1 - arrowSize * 1.5}`}
        fill={color}
      />
      {/* Top arrowhead */}
      <polygon
        points={`${x},${y2} ${x - arrowSize},${y2 + arrowSize * 1.5} ${x + arrowSize},${y2 + arrowSize * 1.5}`}
        fill={color}
      />
      {/* Label */}
      <text
        x={x}
        y={midY}
        textAnchor="middle"
        fill={color}
        fontSize="10"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        <tspan x={x} dy="-4">{label}</tspan>
      </text>
    </g>
  );
}
