// EquipmentDiagram.tsx — 3D isometric box of equipment with CG, Fp, and Wp vectors
// Used in PropertiesTab to visualize equipment dimensions and force application

const COLORS = {
  bg: '#1e293b',
  border: '#475569',
  accent: '#f97316',
  text: '#e2e8f0',
  muted: '#94a3b8',
  green: '#22c55e',
  red: '#ef4444',
};

// Isometric projection helpers (30-degree isometric)
const ISO_ANGLE = Math.PI / 6; // 30 degrees
const cosA = Math.cos(ISO_ANGLE);
const sinA = Math.sin(ISO_ANGLE);

function isoProject(
  x3d: number,
  y3d: number,
  z3d: number,
  originX: number,
  originY: number,
  scale: number,
): [number, number] {
  // x3d = length (right), y3d = width (left), z3d = height (up)
  const px = originX + scale * (x3d * cosA - y3d * cosA);
  const py = originY - scale * z3d + scale * (x3d * sinA + y3d * sinA);
  return [px, py];
}

interface EquipmentDiagramProps {
  length: number;
  width: number;
  height: number;
  cgHeight: number;
}

export function EquipmentDiagram({ length, width, height, cgHeight }: EquipmentDiagramProps) {
  if (length === 0 && width === 0 && height === 0) {
    return (
      <svg viewBox="0 0 350 350" className="w-full max-w-sm">
        <rect width="350" height="350" fill={COLORS.bg} rx="8" />
        <text
          x="175"
          y="175"
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize="14"
          fontFamily="sans-serif"
        >
          Enter equipment dimensions
        </text>
      </svg>
    );
  }

  // Normalize dimensions so the box fits nicely
  const maxDim = Math.max(length, width, height, 1);
  const nL = length / maxDim;
  const nW = width / maxDim;
  const nH = height / maxDim;
  const nCG = Math.min(cgHeight, height) / maxDim;

  const originX = 175;
  const originY = 280;
  const scale = 110;

  // 8 corners of the box: (l, w, h)
  const p = (l: number, w: number, h: number): [number, number] =>
    isoProject(l, w, h, originX, originY, scale);

  // Bottom face corners
  const b0 = p(0, 0, 0);
  const b1 = p(nL, 0, 0);
  const b2 = p(nL, nW, 0);
  const b3 = p(0, nW, 0);

  // Top face corners
  const t0 = p(0, 0, nH);
  const t1 = p(nL, 0, nH);
  const t2 = p(nL, nW, nH);
  const t3 = p(0, nW, nH);

  // CG point (center of bottom face, at cgHeight)
  const cgPt = p(nL / 2, nW / 2, nCG);

  // For dimension arrows — extended points
  // L dimension (along right bottom edge, offset outward)
  const dL0 = p(0, -0.15, 0);
  const dL1 = p(nL, -0.15, 0);

  // W dimension (along left bottom edge, offset outward)
  const dW0 = p(-0.15, 0, 0);
  const dW1 = p(-0.15, nW, 0);

  // H dimension (along left vertical edge, offset outward)
  const dH0 = p(-0.15, nW + 0.1, 0);
  const dH1 = p(-0.15, nW + 0.1, nH);

  // Fp arrow: horizontal from CG rightward (isometric right)
  const fpEnd = p(nL / 2 + 0.45, nW / 2, nCG);

  // Wp arrow: downward from CG
  const wpEnd = p(nL / 2, nW / 2, nCG - 0.4);

  // CG dashed line from base center to CG
  const cgBase = p(nL / 2, nW / 2, 0);

  return (
    <svg viewBox="0 0 350 350" className="w-full max-w-sm">
      {/* Background */}
      <rect width="350" height="350" fill={COLORS.bg} rx="8" />

      {/* --- 3D Box --- */}
      {/* Bottom face (partially visible) */}
      <polygon
        points={`${b0[0]},${b0[1]} ${b1[0]},${b1[1]} ${b2[0]},${b2[1]} ${b3[0]},${b3[1]}`}
        fill="none"
        stroke={COLORS.border}
        strokeWidth="1"
        strokeDasharray="4 3"
      />

      {/* Right face */}
      <polygon
        points={`${b1[0]},${b1[1]} ${b2[0]},${b2[1]} ${t2[0]},${t2[1]} ${t1[0]},${t1[1]}`}
        fill="rgba(71, 85, 105, 0.12)"
        stroke={COLORS.border}
        strokeWidth="1.5"
      />

      {/* Left face */}
      <polygon
        points={`${b2[0]},${b2[1]} ${b3[0]},${b3[1]} ${t3[0]},${t3[1]} ${t2[0]},${t2[1]}`}
        fill="rgba(71, 85, 105, 0.08)"
        stroke={COLORS.border}
        strokeWidth="1.5"
      />

      {/* Top face */}
      <polygon
        points={`${t0[0]},${t0[1]} ${t1[0]},${t1[1]} ${t2[0]},${t2[1]} ${t3[0]},${t3[1]}`}
        fill="rgba(71, 85, 105, 0.18)"
        stroke={COLORS.border}
        strokeWidth="1.5"
      />

      {/* Front face */}
      <polygon
        points={`${b0[0]},${b0[1]} ${b1[0]},${b1[1]} ${t1[0]},${t1[1]} ${t0[0]},${t0[1]}`}
        fill="rgba(71, 85, 105, 0.05)"
        stroke={COLORS.border}
        strokeWidth="1.5"
      />

      {/* Left rear edge */}
      <line
        x1={b3[0]} y1={b3[1]} x2={t3[0]} y2={t3[1]}
        stroke={COLORS.border} strokeWidth="1.5"
      />

      {/* Front left vertical */}
      <line
        x1={b0[0]} y1={b0[1]} x2={t0[0]} y2={t0[1]}
        stroke={COLORS.border} strokeWidth="1.5"
      />

      {/* --- CG dashed vertical line --- */}
      <line
        x1={cgBase[0]} y1={cgBase[1]}
        x2={cgPt[0]} y2={cgPt[1]}
        stroke={COLORS.red}
        strokeWidth="1"
        strokeDasharray="4 3"
      />

      {/* CG dot */}
      <circle cx={cgPt[0]} cy={cgPt[1]} r="5" fill={COLORS.red} />
      <text
        x={cgPt[0] - 18}
        y={cgPt[1] - 10}
        fill={COLORS.red}
        fontSize="10"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        CG
      </text>

      {/* --- Fp arrow (horizontal at CG) --- */}
      <line
        x1={cgPt[0]} y1={cgPt[1]}
        x2={fpEnd[0]} y2={fpEnd[1]}
        stroke={COLORS.accent}
        strokeWidth="2"
      />
      <ArrowHead
        x={fpEnd[0]} y={fpEnd[1]}
        dx={fpEnd[0] - cgPt[0]} dy={fpEnd[1] - cgPt[1]}
        color={COLORS.accent}
        size={6}
      />
      <text
        x={fpEnd[0] + 8}
        y={fpEnd[1] + 4}
        fill={COLORS.accent}
        fontSize="12"
        fontFamily="sans-serif"
        fontWeight="700"
      >
        Fp
      </text>

      {/* --- Wp arrow (downward from CG) --- */}
      <line
        x1={cgPt[0]} y1={cgPt[1]}
        x2={wpEnd[0]} y2={wpEnd[1]}
        stroke={COLORS.green}
        strokeWidth="2"
      />
      <ArrowHead
        x={wpEnd[0]} y={wpEnd[1]}
        dx={wpEnd[0] - cgPt[0]} dy={wpEnd[1] - cgPt[1]}
        color={COLORS.green}
        size={6}
      />
      <text
        x={wpEnd[0] + 8}
        y={wpEnd[1] + 4}
        fill={COLORS.green}
        fontSize="12"
        fontFamily="sans-serif"
        fontWeight="700"
      >
        Wp
      </text>

      {/* --- Dimension arrows --- */}
      {/* L dimension */}
      <DimArrowIso
        x1={dL0[0]} y1={dL0[1]}
        x2={dL1[0]} y2={dL1[1]}
        label="L"
        color={COLORS.text}
        offsetY={14}
      />

      {/* W dimension */}
      <DimArrowIso
        x1={dW0[0]} y1={dW0[1]}
        x2={dW1[0]} y2={dW1[1]}
        label="W"
        color={COLORS.text}
        offsetY={14}
      />

      {/* H dimension */}
      <DimArrowIso
        x1={dH0[0]} y1={dH0[1]}
        x2={dH1[0]} y2={dH1[1]}
        label="H"
        color={COLORS.text}
        offsetY={0}
        offsetX={-14}
      />

      {/* Legend */}
      <text
        x={175}
        y={22}
        textAnchor="middle"
        fill={COLORS.muted}
        fontSize="10"
        fontFamily="sans-serif"
      >
        {length}&quot; x {width}&quot; x {height}&quot;
        {cgHeight > 0 ? ` | CG @ ${cgHeight}"` : ''}
      </text>
    </svg>
  );
}

// --- Arrowhead helper (directional) ---

function ArrowHead({
  x,
  y,
  dx,
  dy,
  color,
  size,
}: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
}) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular
  const px = -uy;
  const py = ux;

  const x1 = x - ux * size * 1.8 + px * size * 0.6;
  const y1 = y - uy * size * 1.8 + py * size * 0.6;
  const x2 = x - ux * size * 1.8 - px * size * 0.6;
  const y2 = y - uy * size * 1.8 - py * size * 0.6;

  return <polygon points={`${x},${y} ${x1},${y1} ${x2},${y2}`} fill={color} />;
}

// --- Isometric dimension arrow ---

function DimArrowIso({
  x1,
  y1,
  x2,
  y2,
  label,
  color,
  offsetY = 0,
  offsetX = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  color: string;
  offsetY?: number;
  offsetX?: number;
}) {
  const midX = (x1 + x2) / 2 + offsetX;
  const midY = (y1 + y2) / 2 + offsetY;
  const arrowSize = 4;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" />
      {/* Arrowhead at start */}
      <polygon
        points={`${x1},${y1} ${x1 + ux * arrowSize * 2 + px * arrowSize},${y1 + uy * arrowSize * 2 + py * arrowSize} ${x1 + ux * arrowSize * 2 - px * arrowSize},${y1 + uy * arrowSize * 2 - py * arrowSize}`}
        fill={color}
      />
      {/* Arrowhead at end */}
      <polygon
        points={`${x2},${y2} ${x2 - ux * arrowSize * 2 + px * arrowSize},${y2 - uy * arrowSize * 2 + py * arrowSize} ${x2 - ux * arrowSize * 2 - px * arrowSize},${y2 - uy * arrowSize * 2 - py * arrowSize}`}
        fill={color}
      />
      {/* Label */}
      <text
        x={midX}
        y={midY}
        textAnchor="middle"
        fill={color}
        fontSize="12"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  );
}
