/**
 * SVG `<pattern>` generators for common structural-drawing hatching.
 *
 * Usage:
 *   <svg>
 *     <HatchPatternDefs />
 *     <rect … fill="url(#dp-concrete)" />
 *   </svg>
 */

/* ------------------------------------------------------------------ */
/*  Pattern factories                                                  */
/* ------------------------------------------------------------------ */

/**
 * Concrete hatching — diagonal crosshatch lines with scattered dots.
 * Standard PESE convention for concrete sections.
 */
export function concretePattern(
  id: string = 'dp-concrete',
): React.JSX.Element {
  const size = 12
  return (
    <pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width={size}
      height={size}
    >
      {/* Background */}
      <rect width={size} height={size} fill="white" />
      {/* Diagonal lines (45°) */}
      <line
        x1={0}
        y1={size}
        x2={size}
        y2={0}
        stroke="#9ca3af"
        strokeWidth={0.5}
      />
      {/* Counter-diagonal lines (135°) */}
      <line
        x1={0}
        y1={0}
        x2={size}
        y2={size}
        stroke="#9ca3af"
        strokeWidth={0.5}
      />
      {/* Scattered dots — concrete aggregate representation */}
      <circle cx={3} cy={3} r={0.7} fill="#9ca3af" />
      <circle cx={9} cy={8} r={0.7} fill="#9ca3af" />
      <circle cx={6} cy={11} r={0.5} fill="#9ca3af" />
      <circle cx={1} cy={9} r={0.5} fill="#9ca3af" />
      <circle cx={10} cy={2} r={0.6} fill="#9ca3af" />
    </pattern>
  )
}

/**
 * Steel hatching — dense 45/135-degree crosshatch (no dots).
 * Standard PESE convention for steel sections.
 */
export function steelPattern(
  id: string = 'dp-steel',
): React.JSX.Element {
  const size = 6
  return (
    <pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width={size}
      height={size}
    >
      {/* Background */}
      <rect width={size} height={size} fill="white" />
      {/* 45° hatch */}
      <line
        x1={0}
        y1={size}
        x2={size}
        y2={0}
        stroke="#374151"
        strokeWidth={0.75}
      />
      {/* 135° hatch */}
      <line
        x1={0}
        y1={0}
        x2={size}
        y2={size}
        stroke="#374151"
        strokeWidth={0.75}
      />
    </pattern>
  )
}

/* ------------------------------------------------------------------ */
/*  Convenience component                                              */
/* ------------------------------------------------------------------ */

/**
 * Drop this inside any `<svg>` that needs concrete or steel hatching.
 * Registers both pattern defs with their default IDs.
 */
export function HatchPatternDefs(): React.JSX.Element {
  return (
    <defs>
      {concretePattern()}
      {steelPattern()}
    </defs>
  )
}
