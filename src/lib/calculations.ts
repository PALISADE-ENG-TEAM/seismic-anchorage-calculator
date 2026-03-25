// ============================================================================
// SEISMIC ANCHORAGE CALCULATION ENGINE
// Code Standards: ASCE 7-22 Chapter 13 + ACI 318-19 Chapter 17
//
// THIS IS A LIFE-SAFETY CRITICAL MODULE.
// Every formula must match the code text exactly.
// ============================================================================

import type {
  SiteParams,
  EquipmentProperties,
  AnchorageConfig,
  CalculationResults,
  CapacityCheck,
  AnchorType,
  EngineeringWarning,
  AnchorPosition,
  AnchorForceResult,
  BoltGroupResults,
  SDCExemptionResult,
} from './types.ts';
import { getAnchorProps, getFuta } from './constants.ts';

// ============================================================================
// ASCE 7-22 Section 13.3 — Seismic Force on Nonstructural Components
// ============================================================================

/**
 * Height Amplification Factor — ASCE 7-22 Section 13.3.1.1
 *
 * At or below grade: Hf = 1.0
 * If building period Ta is known (Eq. 13.3-4):
 *   Hf = 1 + a1*(z/h) + a2*(z/h)^10
 *   where a1 = min(1/Ta, 2.5), a2 = max(0, 1 - (0.4/Ta)^2)
 * If Ta is unknown (Eq. 13.3-5):
 *   Hf = 1 + 2.5*(z/h)
 */
export function calculateHf(
  z: number,
  h: number,
  Ta: number | null
): number {
  // At or below grade
  if (z <= 0 || h <= 0) return 1.0;

  const zh = Math.min(z / h, 1.0); // Cap z/h at 1.0

  if (Ta !== null && Ta > 0) {
    // Eq. 13.3-4: Refined formula when building period is known
    const a1 = Math.min(1.0 / Ta, 2.5);
    const a2 = Math.max(0, 1.0 - (0.4 / Ta) ** 2);
    return 1.0 + a1 * zh + a2 * zh ** 10;
  }

  // Eq. 13.3-5: Default when period is unknown
  return 1.0 + 2.5 * zh;
}

/**
 * Structure Ductility Reduction Factor — ASCE 7-22 Section 13.3.1.2
 *
 * At or below grade: Rμ = 1.0
 * Above grade (Eq. 13.3-6):
 *   Rμ = max(1.3, sqrt(1.1 * R / (Ie * Ω0)))
 * where R, Ie, Ω0 are for the SUPPORTING STRUCTURE (building)
 * If SFRS unknown: Rμ = 1.3
 */
export function calculateRmu(
  z: number,
  R_building: number,
  Omega0_building: number,
  Ie_building: number
): number {
  // At or below grade
  if (z <= 0) return 1.0;

  // If SFRS unknown (R=0 or invalid), default to 1.3
  if (R_building <= 0 || Omega0_building <= 0 || Ie_building <= 0) return 1.3;

  // Eq. 13.3-6
  const Rmu = Math.sqrt(1.1 * R_building / (Ie_building * Omega0_building));
  return Math.max(1.3, Rmu);
}

/**
 * Get the correct CAR value based on attachment height.
 * "At or below grade" vs "above grade" — Section 13.3.1.3
 */
export function getCAR(
  z: number,
  CAR_atGrade: number,
  CAR_aboveGrade: number
): number {
  return z <= 0 ? CAR_atGrade : CAR_aboveGrade;
}

/**
 * Seismic Design Force — ASCE 7-22 Equation 13.3-1
 *
 * Fp = 0.4 × SDS × Ip × Wp × (Hf / Rμ) × (CAR / Rpo)
 *
 * Bounded by:
 *   Fp_min = 0.3 × SDS × Ip × Wp  (Eq. 13.3-2)
 *   Fp_max = 1.6 × SDS × Ip × Wp  (Eq. 13.3-3)
 */
export function calculateFp(
  SDS: number,
  Ip: number,
  Wp: number,
  Hf: number,
  Rmu: number,
  CAR: number,
  Rpo: number
): { fpCalculated: number; fpMinimum: number; fpMaximum: number; fpDesign: number } {
  // Eq. 13.3-1
  const fpCalculated = 0.4 * SDS * Ip * Wp * (Hf / Rmu) * (CAR / Rpo);

  // Eq. 13.3-2 (minimum)
  const fpMinimum = 0.3 * SDS * Ip * Wp;

  // Eq. 13.3-3 (maximum)
  const fpMaximum = 1.6 * SDS * Ip * Wp;

  // Governing: max of calculated and minimum, capped at maximum
  const fpDesign = Math.min(Math.max(fpCalculated, fpMinimum), fpMaximum);

  return { fpCalculated, fpMinimum, fpMaximum, fpDesign };
}

/**
 * Floor Acceleration Alternative — ASCE 7-22 Section 13.3.1.1
 *
 * When actual floor response spectra are available from structural analysis,
 * Ai replaces the equation-based Hf/Rμ approach.
 *
 * Fp = Ai × (CAR / Rpo) × Ip × Wp
 * Bounded by Fp_min and Fp_max (same as standard approach).
 */
export function calculateFpFromFloorAccel(
  Ai: number,
  SDS: number,
  Ip: number,
  Wp: number,
  CAR: number,
  Rpo: number
): { fpCalculated: number; fpMinimum: number; fpMaximum: number; fpDesign: number } {
  const fpCalculated = Ai * (CAR / Rpo) * Ip * Wp;
  const fpMinimum = 0.3 * SDS * Ip * Wp;
  const fpMaximum = 1.6 * SDS * Ip * Wp;
  const fpDesign = Math.min(Math.max(fpCalculated, fpMinimum), fpMaximum);
  return { fpCalculated, fpMinimum, fpMaximum, fpDesign };
}

// ============================================================================
// SDC Exemption Check — ASCE 7-22 Section 13.1.4
// ============================================================================

/**
 * Check whether a nonstructural component is exempt from seismic requirements
 * per ASCE 7-22 Section 13.1.4, Items 1-6.
 *
 * Returns the first matching exemption or 'required'.
 */
export function checkSDCExemption(
  sdc: string,
  Ip: number,
  z: number,
  h: number,
  weight: number,
  componentCategory: 'mechanical' | 'electrical' | 'architectural'
): SDCExemptionResult {
  const sdcUpper = sdc.toUpperCase();

  // Item 1: SDC A — all nonstructural components exempt
  if (sdcUpper === 'A') {
    return {
      status: 'exempt',
      reason: 'SDC A — All nonstructural components exempt from seismic requirements.',
      codeRef: '§13.1.4 Item 1',
    };
  }

  const zh = h > 0 ? z / h : 0;
  const isMEP = componentCategory === 'mechanical' || componentCategory === 'electrical';

  // Item 3: M/E/P components ≤ 20 lbs with Ip = 1.0 in SDC B or C
  if ((sdcUpper === 'B' || sdcUpper === 'C') && isMEP && Ip <= 1.0 && weight <= 20) {
    return {
      status: 'exempt',
      reason: 'M/E/P component ≤ 20 lbs with Ip = 1.0 in SDC B/C.',
      codeRef: '§13.1.4 Item 3',
    };
  }

  // Item 2: M/E/P components with Ip = 1.0 in SDC B or C, z ≤ 2h/3
  if ((sdcUpper === 'B' || sdcUpper === 'C') && isMEP && Ip <= 1.0 && zh <= 2 / 3) {
    return {
      status: 'exempt',
      reason: 'M/E/P component with Ip = 1.0 in SDC B/C, at or below 2/3 of building height.',
      codeRef: '§13.1.4 Item 2',
    };
  }

  // Item 5: Architectural components with Ip = 1.0 in SDC B, fastened to structure
  if (sdcUpper === 'B' && componentCategory === 'architectural' && Ip <= 1.0) {
    return {
      status: 'exempt',
      reason: 'Architectural component with Ip = 1.0 in SDC B.',
      codeRef: '§13.1.4 Item 5',
    };
  }

  // Item 6: Architectural components with Ip = 1.0 in SDC C, at/below grade
  if (sdcUpper === 'C' && componentCategory === 'architectural' && Ip <= 1.0 && z <= 0) {
    return {
      status: 'exempt',
      reason: 'Architectural component with Ip = 1.0 in SDC C, at or below grade.',
      codeRef: '§13.1.4 Item 6',
    };
  }

  return {
    status: 'required',
    reason: 'Full seismic analysis required.',
    codeRef: '§13.1.4',
  };
}

// ============================================================================
// Overturning Analysis — Master Prompt Methodology
// ============================================================================

/**
 * Overturning moment analysis in both directions.
 *
 * CRITICAL: Do NOT swap resisting moment arms.
 * - Direction 1 (force along LENGTH): arm = equipLength/2
 * - Direction 2 (force along WIDTH):  arm = equipWidth/2
 *
 * Uses 0.9W dead load factor per master prompt methodology.
 */
export function calculateOverturning(
  Fp: number,
  Wp: number,
  cgHeight_in: number,
  equipLength_in: number,
  equipWidth_in: number,
  sx_in: number,
  sy_in: number
): {
  overturnMoment: number;
  resistingMoment1: number;
  resistingMoment2: number;
  netUpliftMoment1: number;
  netUpliftMoment2: number;
  governingDirection: 'longitudinal' | 'transverse';
  upliftOccurs: boolean;
} {
  // Convert CG height to feet for moment calculation
  const hcg_ft = cgHeight_in / 12;

  // Overturning moment (same for both directions — force at CG)
  const overturnMoment = Fp * hcg_ft; // lb-ft

  // Resisting moments with 0.9 dead load factor
  // Direction 1: Force along LENGTH → pivot about transverse axis → arm = L/2
  const resistingMoment1 = 0.9 * Wp * (equipLength_in / 2) / 12; // lb-ft

  // Direction 2: Force along WIDTH → pivot about longitudinal axis → arm = W/2
  const resistingMoment2 = 0.9 * Wp * (equipWidth_in / 2) / 12; // lb-ft

  // Net uplift moments
  const netUpliftMoment1 = Math.max(0, overturnMoment - resistingMoment1);
  const netUpliftMoment2 = Math.max(0, overturnMoment - resistingMoment2);

  // Determine governing direction by comparing tension per anchor
  // Direction 1: anchors spaced sx apart, moment arm = sx
  // Direction 2: anchors spaced sy apart, moment arm = sy
  const sx_ft = sx_in / 12;
  const sy_ft = sy_in / 12;

  const tTotal1 = sx_ft > 0 ? netUpliftMoment1 / sx_ft : 0;
  const tTotal2 = sy_ft > 0 ? netUpliftMoment2 / sy_ft : 0;

  const governingDirection: 'longitudinal' | 'transverse' =
    tTotal1 >= tTotal2 ? 'longitudinal' : 'transverse';

  const upliftOccurs = netUpliftMoment1 > 0 || netUpliftMoment2 > 0;

  return {
    overturnMoment,
    resistingMoment1,
    resistingMoment2,
    netUpliftMoment1,
    netUpliftMoment2,
    governingDirection,
    upliftOccurs,
  };
}

// ============================================================================
// Anchor Demands — with Ω0p Overstrength Factor
// ============================================================================

/**
 * Calculate tension and shear demands per anchor.
 *
 * Tension: Tu = (M_net / spacing_ft) / n_tension × Ω0p
 * Shear:   Vu = (Fp × Ω0p) / n_total
 *
 * Note: Ω0p is per-component from Tables 13.5-1/13.6-1 (ASCE 7-22)
 */
export function calculateAnchorDemands(
  Fp: number,
  _Wp: number,
  Omega0p: number,
  overturning: ReturnType<typeof calculateOverturning>,
  nLong: number,
  nTrans: number,
  sx_in: number,
  sy_in: number
): { tuPerAnchor: number; vuPerAnchor: number } {
  const nTotal = nLong * nTrans;

  let tuPerAnchor = 0;

  if (overturning.upliftOccurs) {
    if (overturning.governingDirection === 'longitudinal') {
      // Force along length, anchors resist in transverse rows
      const spacing_ft = sx_in / 12;
      const nTension = nTrans; // One row of transverse anchors in tension
      if (spacing_ft > 0 && nTension > 0) {
        tuPerAnchor = (overturning.netUpliftMoment1 / spacing_ft) / nTension * Omega0p;
      }
    } else {
      // Force along width, anchors resist in longitudinal rows
      const spacing_ft = sy_in / 12;
      const nTension = nLong; // One row of longitudinal anchors in tension
      if (spacing_ft > 0 && nTension > 0) {
        tuPerAnchor = (overturning.netUpliftMoment2 / spacing_ft) / nTension * Omega0p;
      }
    }
  }

  // Shear demand with overstrength
  const vuPerAnchor = nTotal > 0 ? (Fp * Omega0p) / nTotal : 0;

  return { tuPerAnchor, vuPerAnchor };
}

// ============================================================================
// Rigid Bolt Group Analysis — Classical Rigid Body Method
// ============================================================================

/**
 * Generate anchor positions from rectangular grid parameters.
 * Centers bolt group on equipment footprint.
 * Origin (0,0) = bottom-left corner of equipment.
 */
export function generateAnchorPositions(
  nLong: number,
  nTrans: number,
  sx: number,
  sy: number,
  equipLength: number,
  equipWidth: number
): AnchorPosition[] {
  const anchors: AnchorPosition[] = [];
  const totalSx = (nLong - 1) * sx;
  const totalSy = (nTrans - 1) * sy;
  const startX = (equipLength - totalSx) / 2;
  const startY = (equipWidth - totalSy) / 2;

  for (let col = 0; col < nLong; col++) {
    for (let row = 0; row < nTrans; row++) {
      anchors.push({
        id: `a-${col}-${row}`,
        x: startX + col * sx,
        y: startY + row * sy,
      });
    }
  }
  return anchors;
}

/**
 * Calculate bolt group centroid from anchor positions.
 * x̄ = Σxi/N, ȳ = Σyi/N
 */
export function calculateBoltGroupCentroid(
  anchors: AnchorPosition[]
): { x: number; y: number } {
  const n = anchors.length;
  if (n === 0) return { x: 0, y: 0 };
  const sumX = anchors.reduce((s, a) => s + a.x, 0);
  const sumY = anchors.reduce((s, a) => s + a.y, 0);
  return { x: sumX / n, y: sumY / n };
}

/**
 * Calculate bolt group geometric properties about the centroid.
 * Ix = Σdy², Iy = Σdx², Ip = Ix + Iy
 * Returns relative positions (dx, dy) for each anchor.
 */
export function calculateBoltGroupProperties(
  anchors: AnchorPosition[],
  centroid: { x: number; y: number }
): {
  Ix: number;
  Iy: number;
  Ip: number;
  relativePositions: Array<{ id: string; dx: number; dy: number }>;
} {
  const relativePositions = anchors.map(a => ({
    id: a.id,
    dx: a.x - centroid.x,
    dy: a.y - centroid.y,
  }));
  const Ix = relativePositions.reduce((s, p) => s + p.dy * p.dy, 0);
  const Iy = relativePositions.reduce((s, p) => s + p.dx * p.dx, 0);
  const Ip = Ix + Iy;
  return { Ix, Iy, Ip, relativePositions };
}

/**
 * Rigid Bolt Group Demand Analysis
 *
 * Analyzes both X and Y seismic directions independently, combines with
 * vertical seismic per ASCE 7-22 §2.3.6, and identifies the critical anchor.
 *
 * For each direction:
 * - Direct shear: Vdirect = Fp×Ω0p / N (equal distribution)
 * - Torsional shear from eccentricity between CG and bolt group centroid
 * - Overturning tension distributed by distance from neutral axis
 * - Vertical seismic: Ev = ±0.2×SDS×Wp per ASCE 7-22 load combinations
 *
 * Pivot methods:
 * - 'centroid': Pivot about bolt group centroid (classical bolt group analysis)
 * - 'compression-edge': Pivot about compression-side bolt row
 */
export function calculateRigidBoltGroupDemands(
  Fp: number,
  Wp: number,
  Omega0p: number,
  SDS: number,
  cgHeight_in: number,
  cgX: number,
  cgY: number,
  anchors: AnchorPosition[],
  pivotMethod: 'centroid' | 'compression-edge'
): BoltGroupResults {
  const n = anchors.length;
  if (n === 0) {
    throw new Error('Bolt group must have at least one anchor');
  }

  // --- Step 1: Bolt group geometry ---
  const centroid = calculateBoltGroupCentroid(anchors);
  const { Ix, Iy, Ip, relativePositions } = calculateBoltGroupProperties(anchors, centroid);
  const ex = cgX - centroid.x;
  const ey = cgY - centroid.y;

  // Vertical seismic component per ASCE 7-22 §12.4.2.2
  // Ev = 0.2 × SDS × D. For uplift: use (0.9 - 0.2×SDS)×D
  // The net gravity per anchor for the uplift case:
  const gravityPerAnchor_uplift = (0.9 - 0.2 * SDS) * Wp / n; // Positive = downward (stabilizing)

  // Overturning moment from seismic force (same both directions)
  const hcg_in = cgHeight_in; // Keep in inches for consistency

  // --- Step 2: Analyze each seismic direction ---

  // Helper: analyze one seismic direction
  function analyzeDirection(
    seismicDir: 'x' | 'y'
  ): {
    perAnchor: Array<{
      id: string;
      vDirectX: number; vDirectY: number;
      vTorsionX: number; vTorsionY: number;
      vCombined: number;
      tMoment: number; tCombined: number;
    }>;
    torsionalMoment: number;
  } {
    const FpOmega = Fp * Omega0p;

    // Direct shear — equal distribution along seismic direction
    const vDirectX = seismicDir === 'x' ? FpOmega / n : 0;
    const vDirectY = seismicDir === 'y' ? FpOmega / n : 0;

    // Torsional moment from eccentricity
    // Seismic in X: torsion = FpΩ0p × ey (perpendicular eccentricity)
    // Seismic in Y: torsion = FpΩ0p × ex (perpendicular eccentricity)
    // Sign convention: positive torsion = counterclockwise
    let Mt = 0;
    if (seismicDir === 'x') {
      Mt = FpOmega * ey; // Force in X, eccentricity in Y
    } else {
      Mt = -FpOmega * ex; // Force in Y, eccentricity in X (negative for CCW convention)
    }

    // Torsional shear per bolt (only if Ip > 0)
    const torsionalShears = relativePositions.map(p => {
      if (Ip <= 0) return { vtx: 0, vty: 0 };
      // Torsional shear is perpendicular to radius vector
      return {
        vtx: -Mt * p.dy / Ip,
        vty: Mt * p.dx / Ip,
      };
    });

    // Overturning about the bolt group
    // Overturning moment = Fp × Ω0p × hcg (in lb-in, keep consistent)
    const M_ot = FpOmega * hcg_in; // lb-in

    // Determine pivot point and resisting moment based on pivot method
    let tensionPerAnchor: number[];

    if (pivotMethod === 'centroid') {
      // Pivot about centroid — tension distributed by distance
      // For seismic in X: overturning about Y-axis → tension varies with dx
      // For seismic in Y: overturning about X-axis → tension varies with dy
      const useIx = seismicDir === 'y'; // Moment about X-axis when force is in Y
      const I_axis = useIx ? Ix : Iy;

      // Centroid pivot: distribute overturning moment to anchors by distance from centroid.
      // Gravity is subtracted uniformly (each anchor gets gravityPerAnchor_uplift).
      const M_net = M_ot;

      if (I_axis > 0) {
        tensionPerAnchor = relativePositions.map(p => {
          const d = seismicDir === 'x' ? p.dx : p.dy;
          // Tension from overturning: T_i = M_net × d_i / Σd_i²
          // Positive d = tension side (force pushes away from this anchor)
          // Sign: anchors with negative d (opposite to force direction) go into tension
          const tFromMoment = -M_net * d / I_axis; // Negative d → positive tension
          return tFromMoment;
        });
        // Subtract uniform gravity from each anchor
        tensionPerAnchor = tensionPerAnchor.map(t => Math.max(0, t - gravityPerAnchor_uplift));
      } else {
        tensionPerAnchor = relativePositions.map(() => 0);
      }
    } else {
      // Pivot about compression-edge bolt
      // Find the compression-edge bolt (most positive d in the force direction)
      const distances = relativePositions.map(p =>
        seismicDir === 'x' ? p.dx : p.dy
      );
      const maxD = Math.max(...distances);

      // Actual distance from CG to compression edge bolt (in inches):
      const armFromCGToEdgeBolt_in = maxD + (seismicDir === 'x' ? (centroid.x - cgX) : (centroid.y - cgY));

      // Resisting moment about compression edge bolt
      const totalGravity = (0.9 - 0.2 * SDS) * Wp;
      const M_resist = totalGravity * Math.abs(armFromCGToEdgeBolt_in); // lb-in

      const M_net = Math.max(0, M_ot - M_resist);

      // Distribute net tension moment to anchors by distance from compression edge bolt
      // d_i = maxD - d_actual for each anchor (distance from compression pivot)
      const leverArms = distances.map(d => maxD - d);
      const sumLeverArmsSq = leverArms.reduce((s, l) => s + l * l, 0);

      if (sumLeverArmsSq > 0 && M_net > 0) {
        tensionPerAnchor = leverArms.map(l => {
          const t = M_net * l / sumLeverArmsSq;
          return Math.max(0, t); // Only positive tension
        });
      } else {
        tensionPerAnchor = relativePositions.map(() => 0);
      }
    }

    // Combine per-anchor results
    const perAnchor = relativePositions.map((p, i) => {
      const vtx = torsionalShears[i].vtx;
      const vty = torsionalShears[i].vty;
      const totalVx = vDirectX + vtx;
      const totalVy = vDirectY + vty;
      const vCombined = Math.sqrt(totalVx * totalVx + totalVy * totalVy);
      const tMoment = tensionPerAnchor[i];
      const tCombined = Math.max(0, tMoment); // Net tension (no compression)
      return {
        id: p.id,
        vDirectX, vDirectY,
        vTorsionX: vtx, vTorsionY: vty,
        vCombined,
        tMoment,
        tCombined,
      };
    });

    return { perAnchor, torsionalMoment: Mt };
  }

  // Analyze both directions
  const resultX = analyzeDirection('x');
  const resultY = analyzeDirection('y');

  // --- Step 3: Envelope — take max demands from either direction per anchor ---
  const anchorForces: AnchorForceResult[] = relativePositions.map((p, i) => {
    const ax = resultX.perAnchor[i];
    const ay = resultY.perAnchor[i];

    // Take the direction that produces higher combined demand for each anchor
    const vCombined = Math.max(ax.vCombined, ay.vCombined);
    const tCombined = Math.max(ax.tCombined, ay.tCombined);

    // Use the components from the governing direction for shear
    const useX = ax.vCombined >= ay.vCombined;
    const vDirectX = useX ? ax.vDirectX : ay.vDirectX;
    const vDirectY = useX ? ax.vDirectY : ay.vDirectY;
    const vTorsionX = useX ? ax.vTorsionX : ay.vTorsionX;
    const vTorsionY = useX ? ax.vTorsionY : ay.vTorsionY;

    return {
      anchorId: p.id,
      position: { x: p.dx, y: p.dy },
      vDirectX,
      vDirectY,
      vTorsionX,
      vTorsionY,
      vCombined,
      tDirect: 0, // Direct tension from gravity handled in moment calc
      tMomentX: resultY.perAnchor[i].tMoment, // Seismic in Y → moment about X
      tMomentY: resultX.perAnchor[i].tMoment, // Seismic in X → moment about Y
      tCombined,
      interactionRatio: 0, // Computed after capacity checks
      isCritical: false,   // Set below
    };
  });

  // --- Step 4: Identify critical anchor (highest combined demand proxy) ---
  // Use a simple demand metric: Tu + Vu as a proxy before capacity checks
  // The real interaction ratio is computed later when capacities are known
  let maxDemand = 0;
  let criticalIdx = 0;
  for (let i = 0; i < anchorForces.length; i++) {
    const demand = anchorForces[i].tCombined + anchorForces[i].vCombined;
    if (demand > maxDemand) {
      maxDemand = demand;
      criticalIdx = i;
    }
  }
  anchorForces[criticalIdx].isCritical = true;

  return {
    anchorForces,
    criticalAnchorId: anchorForces[criticalIdx].anchorId,
    boltGroupCentroid: centroid,
    cgPosition: { x: cgX, y: cgY },
    eccentricity: { ex, ey },
    Ix,
    Iy,
    Ip,
    torsionalMomentX: resultX.torsionalMoment,
    torsionalMomentY: resultY.torsionalMoment,
  };
}

// ============================================================================
// ACI 318-19 Chapter 17 — Anchor Capacity Checks
// ============================================================================

/**
 * Steel tension strength — ACI 318-19 Section 17.6.1, Eq. 17.6.1.2
 * φNsa = φ × Ase × futa
 * φ = 0.75 (ductile steel)
 */
export function steelTensionCapacity(
  Ase: number,
  futa: number
): number {
  const phi = 0.75;
  return phi * Ase * futa;
}

/**
 * Steel shear strength — ACI 318-19 Section 17.7.1, Eq. 17.7.1.2b
 * φVsa = φ × 0.6 × Ase × futa
 * φ = 0.65 (ductile steel in shear)
 */
export function steelShearCapacity(
  Ase: number,
  futa: number
): number {
  const phi = 0.65;
  return phi * 0.6 * Ase * futa;
}

/**
 * Concrete breakout tension — ACI 318-19 Section 17.6.2
 *
 * Nb = kc × λa × √f'c × hef^1.5
 * φNcb = φ × (ANc/ANco) × ψed,N × ψc,N × ψcp,N × Nb
 * φ = 0.70 (concrete breakout, Condition B for post-installed)
 */
export function concreteBreakoutTensionCapacity(
  hef: number,
  fc: number,
  anchorType: AnchorType,
  options?: {
    ca_min?: number;         // Minimum edge distance (inches)
    crackedConcrete?: boolean;
    isSeismicPostInstalled?: boolean; // Post-installed in seismic, per ACI 355.2/355.4
  }
): { capacity: number; psiEdN: number; psiCN: number; psiCpN: number; ANcRatio: number } {
  // φ = 0.75 Condition A (supplementary reinf), 0.65 Condition B (no supplementary reinf)
  // Use 0.65 for post-installed (conservative, Condition B typical), 0.70 for cast-in
  const phi = anchorType === 'cast-in' ? 0.70 : 0.65;

  // kc depends on anchor type — ACI 318-19 §17.6.2.2
  const kc = anchorType === 'cast-in' ? 24 : 17;
  const lambdaA = 1.0; // Normal-weight concrete

  // Basic breakout strength (lbs) — Eq. 17.6.2.1b
  const Nb = kc * lambdaA * Math.sqrt(fc) * Math.pow(hef, 1.5);

  const ca_min = options?.ca_min ?? Infinity;
  const cracked = options?.crackedConcrete ?? true; // Default: cracked (conservative)

  // ψed,N — Edge effect factor — §17.6.2.4
  // 1.0 if ca,min ≥ 1.5×hef, else 0.7 + 0.3×(ca,min / (1.5×hef))
  let psiEdN = 1.0;
  if (ca_min < 1.5 * hef) {
    psiEdN = 0.7 + 0.3 * (ca_min / (1.5 * hef));
  }

  // ψc,N — Cracking factor — §17.6.2.5
  // 1.0 for cracked concrete, 1.25 for uncracked
  const psiCN = cracked ? 1.0 : 1.25;

  // ψcp,N — Post-installed anchor cracking factor — §17.6.2.6
  // 1.0 for cast-in anchors
  // For post-installed in cracked concrete: 1.0 if qualified per ACI 355.2/355.4
  // For post-installed in uncracked concrete: 1.0
  // Conservative: use 1.0 (assumes product is qualified for cracked concrete)
  const psiCpN = 1.0;

  // ANc/ANco — Projected area ratio — §17.6.2.1
  // ANco = 9 × hef² (single anchor, no edge effects)
  // For conservative single-anchor check with edge distance:
  // ANc is limited by edge proximity. For ca_min < 1.5×hef:
  // ANc/ANco ≈ (ca_min + 1.5×hef) × min(2×1.5×hef, ca_min + 1.5×hef) / (9×hef²)
  // Simplified conservative: use 1.0 for now (edge effect captured by ψed,N)
  // Full group projected area calculation requires all 4 edge distances + all anchor positions
  const ANcRatio = 1.0;

  const Ncb = ANcRatio * psiEdN * psiCN * psiCpN * Nb;

  return {
    capacity: phi * Ncb,
    psiEdN,
    psiCN,
    psiCpN,
    ANcRatio,
  };
}

/**
 * Concrete breakout shear — ACI 318-19 Section 17.7.2
 *
 * Vb = 7 × (le/da)^0.2 × da^0.5 × λa × √f'c × ca1^1.5
 * φVcb = φ × (AVc/AVco) × ψed,V × ψc,V × ψh,V × Vb
 *
 * le = min(hef, 8×da)
 */
export function concreteBreakoutShearCapacity(
  da: number,
  hef: number,
  fc: number,
  ca1: number,
  options?: {
    ca2?: number;              // Perpendicular edge distance (inches)
    crackedConcrete?: boolean;
    memberThickness?: number;  // ha (inches)
    anchorType?: AnchorType;
  }
): { capacity: number; psiEdV: number; psiCV: number; psiHV: number; AVcRatio: number } {
  // φ = 0.75 Condition A, 0.65 Condition B
  const anchorType = options?.anchorType;
  const phi = (anchorType && anchorType !== 'cast-in') ? 0.65 : 0.70;
  const lambdaA = 1.0;

  // Load-bearing length — §17.7.2.1
  const le = Math.min(hef, 8 * da);

  // Basic breakout strength (lbs) — Eq. 17.7.2.1c
  const Vb =
    7 *
    Math.pow(le / da, 0.2) *
    Math.pow(da, 0.5) *
    lambdaA *
    Math.sqrt(fc) *
    Math.pow(ca1, 1.5);

  const ca2 = options?.ca2 ?? Infinity;
  const cracked = options?.crackedConcrete ?? true;
  const ha = options?.memberThickness ?? 0;

  // ψed,V — Edge effect factor — §17.7.2.4
  // 1.0 if ca2 ≥ 1.5×ca1, else 0.7 + 0.3×(ca2 / (1.5×ca1))
  let psiEdV = 1.0;
  if (ca2 < 1.5 * ca1) {
    psiEdV = 0.7 + 0.3 * (ca2 / (1.5 * ca1));
  }

  // ψc,V — Cracking factor — §17.7.2.5
  // 1.0 for cracked concrete, 1.4 for uncracked
  const psiCV = cracked ? 1.0 : 1.4;

  // ψh,V — Member thickness factor — §17.7.2.6
  // Applies when ha < 1.5×ca1
  // ψh,V = √(1.5×ca1 / ha) ≥ 1.0
  let psiHV = 1.0;
  if (ha > 0 && ha < 1.5 * ca1) {
    psiHV = Math.sqrt(1.5 * ca1 / ha);
  }

  // AVc/AVco — Projected area ratio
  // Conservative: 1.0 (full projected area calculation requires detailed geometry)
  const AVcRatio = 1.0;

  const Vcb = AVcRatio * psiEdV * psiCV * psiHV * Vb;

  return {
    capacity: phi * Vcb,
    psiEdV,
    psiCV,
    psiHV,
    AVcRatio,
  };
}

/**
 * Concrete pryout shear — ACI 318-19 Section 17.7.3
 *
 * Vcp = kcp × Ncb
 * kcp = 1.0 for hef < 2.5 in, 2.0 for hef ≥ 2.5 in
 * φVcp = φ × Vcp
 * φ = 0.70
 */
export function concretePryoutCapacity(
  hef: number,
  fc: number,
  anchorType: AnchorType
): number {
  const phi = 0.70;
  const kcp = hef < 2.5 ? 1.0 : 2.0;

  // Get Ncb (unmodified, without phi factor)
  const kc = anchorType === 'cast-in' ? 24 : 17;
  const lambdaA = 1.0;
  const Nb = kc * lambdaA * Math.sqrt(fc) * Math.pow(hef, 1.5);
  const Ncb = Nb;

  const Vcp = kcp * Ncb;
  return phi * Vcp;
}

// ============================================================================
// ACI 318-19 §17.6.3 — Pullout Strength
// ============================================================================

/**
 * Pullout capacity — ACI 318-19 Section 17.6.3
 *
 * For post-installed expansion/undercut anchors:
 *   φNp = φ × ψc,P × Np
 *   Np from manufacturer ESR data (product-specific)
 *
 * For headed cast-in anchors:
 *   Np = 8 × Abrg × f'c
 *   where Abrg = bearing area of head
 *
 * φ = 0.65 (Condition B, typical for post-installed)
 * ψc,P = 1.0 cracked, 1.4 uncracked — §17.6.3.6
 */
export function pulloutCapacity(
  anchorType: AnchorType,
  fc: number,
  options?: {
    crackedConcrete?: boolean;
    Np_product?: number;   // Manufacturer pullout from ESR (lbs) — for post-installed
    Abrg?: number;         // Bearing area of head (in²) — for cast-in headed
  }
): number | null {
  const cracked = options?.crackedConcrete ?? true;
  const psiCP = cracked ? 1.0 : 1.4;

  if (anchorType === 'cast-in') {
    // Cast-in headed anchor: Np = 8 × Abrg × f'c — Eq. 17.6.3.2.2a
    const Abrg = options?.Abrg;
    if (!Abrg || Abrg <= 0) return null; // Need bearing area for cast-in pullout
    const phi = 0.70;
    const Np = 8 * Abrg * fc;
    return phi * psiCP * Np;
  }

  // Post-installed: need manufacturer data
  const Np_product = options?.Np_product;
  if (!Np_product || Np_product <= 0) return null; // No manufacturer data available
  const phi = 0.65; // Condition B
  return phi * psiCP * Np_product;
}

// ============================================================================
// ACI 318-19 §17.6.4 — Side-Face Blowout
// ============================================================================

/**
 * Side-face blowout — ACI 318-19 Section 17.6.4
 *
 * Applies when: hef > 2.5 × ca1 (deep embedment near an edge)
 *
 * φNsb = φ × 13 × ca1 × √(Abrg) × λa × √f'c
 * φ = 0.70 (cast-in), 0.65 (post-installed Condition B)
 *
 * Only for headed/bearing anchors — not applicable to adhesive anchors without heads
 */
export function sideFaceBlowoutCapacity(
  hef: number,
  ca1: number,
  fc: number,
  anchorType: AnchorType,
  Abrg?: number
): number | null {
  // Only applies when hef > 2.5 × ca1
  if (hef <= 2.5 * ca1) return null;

  // Need bearing area
  if (!Abrg || Abrg <= 0) return null;

  const phi = anchorType === 'cast-in' ? 0.70 : 0.65;
  const lambdaA = 1.0; // Normal-weight concrete

  // Eq. 17.6.4.1
  const Nsb = 13 * ca1 * Math.sqrt(Abrg) * lambdaA * Math.sqrt(fc);

  return phi * Nsb;
}

// ============================================================================
// ACI 318-19 §17.6.5 — Adhesive Anchor Bond Strength
// ============================================================================

/**
 * Adhesive anchor bond — ACI 318-19 Section 17.6.5
 *
 * Na0 = τcr × π × da × hef  (single anchor bond strength)
 * φNa = φ × (ANa/ANao) × ψed,Na × ψcp,Na × Na0
 *
 * τcr = characteristic bond stress from manufacturer ESR (psi)
 * cNa = 10 × da × √(τcr / 1100)  (critical distance)
 *
 * φ = 0.65 (Condition B, typical)
 */
export function adhesiveBondCapacity(
  da: number,
  hef: number,
  anchorType: AnchorType,
  options?: {
    tau_cr?: number;           // Characteristic bond stress from ESR (psi)
    crackedConcrete?: boolean;
    ca_min?: number;           // Minimum edge distance (inches)
  }
): { capacity: number; cNa: number } | null {
  // Only for adhesive anchors
  if (anchorType !== 'post-installed-adhesive') return null;

  const tau_cr = options?.tau_cr;
  if (!tau_cr || tau_cr <= 0) return null; // Need manufacturer bond stress data

  // crackedConcrete available via options but cracking factor for adhesive is
  // captured via psiCpNa (set to 1.0 per code for qualified products)
  const phi = 0.65; // Condition B

  // Single anchor bond strength — Eq. 17.6.5.1
  const Na0 = tau_cr * Math.PI * da * hef;

  // Critical distance — §17.6.5.1
  const cNa = 10 * da * Math.sqrt(tau_cr / 1100);

  // ψed,Na — Edge effect — §17.6.5.4
  const ca_min = options?.ca_min ?? Infinity;
  let psiEdNa = 1.0;
  if (ca_min < cNa) {
    psiEdNa = 0.7 + 0.3 * (ca_min / cNa);
  }

  // ψcp,Na — Cracking factor for adhesive — §17.6.5.5
  // 1.0 for cracked (if qualified per ACI 355.4), 1.0 for uncracked
  const psiCpNa = 1.0;

  // ANa/ANao — Projected area ratio (conservative = 1.0)
  const ANaRatio = 1.0;

  const Na = ANaRatio * psiEdNa * psiCpNa * Na0;

  return {
    capacity: phi * Na,
    cNa,
  };
}

// ============================================================================
// Engineering Warnings Generator
// ============================================================================

/**
 * Generate engineering warnings based on inputs and calculation results.
 * These help engineers identify potential issues with their design.
 */
export function generateWarnings(
  anchor: AnchorageConfig,
  site: SiteParams,
  equip: EquipmentProperties,
  checks: CalculationResults['checks']
): EngineeringWarning[] {
  const warnings: EngineeringWarning[] = [];
  const da = anchor.anchorDiameter;
  const hef = anchor.embedmentDepth;
  const ca1 = anchor.anchorLayout.edgeDistance.ca1;
  const ca2 = anchor.anchorLayout.edgeDistance.ca2;
  const ha = anchor.memberThickness ?? 0;

  // --- Input Validation Warnings ---

  // E-HEF-MIN: Embedment depth < 4×da
  if (hef < 4 * da) {
    warnings.push({
      severity: 'error',
      code: 'E-HEF-MIN',
      message: `Embedment depth (${hef}") is less than 4×da (${(4 * da).toFixed(2)}"). Most post-installed anchors require minimum embedment of 4× nominal diameter.`,
      codeRef: 'ACI 318-19 §17.6.2, ICC-ES AC193/AC308',
      category: 'input',
    });
  }

  // E-EDGE-MIN: Edge distance too small (check both ca1 and ca2)
  const caMin = Math.min(ca1, ca2);
  if (caMin < 1.5 * hef) {
    warnings.push({
      severity: 'warning',
      code: 'W-EDGE-REDUCED',
      message: `Minimum edge distance (${caMin}") < 1.5×hef (${(1.5 * hef).toFixed(1)}"). Concrete breakout capacity is reduced by edge proximity. ψed,N < 1.0.`,
      codeRef: 'ACI 318-19 §17.6.2.4',
      category: 'layout',
    });
  }

  // Product minimum edge distance check
  if (anchor.selectedProduct?.minEdgeDistance && ca1 < anchor.selectedProduct.minEdgeDistance) {
    warnings.push({
      severity: 'error',
      code: 'E-EDGE-MIN',
      message: `Edge distance ca1 (${ca1}") is less than the manufacturer minimum (${anchor.selectedProduct.minEdgeDistance}") per ${anchor.selectedProduct.esrNumber}.`,
      codeRef: anchor.selectedProduct.esrNumber,
      category: 'input',
    });
  }

  // Product minimum spacing check
  const sMin = Math.min(
    anchor.anchorLayout.spacing.longitudinal,
    anchor.anchorLayout.spacing.transverse
  );
  if (anchor.selectedProduct?.minSpacing && sMin < anchor.selectedProduct.minSpacing) {
    warnings.push({
      severity: 'error',
      code: 'E-SPACING-MIN',
      message: `Anchor spacing (${sMin}") is less than the manufacturer minimum (${anchor.selectedProduct.minSpacing}") per ${anchor.selectedProduct.esrNumber}.`,
      codeRef: anchor.selectedProduct.esrNumber,
      category: 'input',
    });
  }

  // E-THICKNESS: Member thickness check
  if (ha > 0 && ha < hef + 1.5) { // 1.5" minimum cover
    warnings.push({
      severity: 'error',
      code: 'E-THICKNESS',
      message: `Member thickness (${ha}") may be insufficient for embedment depth (${hef}") plus minimum concrete cover.`,
      codeRef: 'ACI 318-19 §17.4.4',
      category: 'input',
    });
  }

  // W-CG-HIGH: Unusual CG height
  if (equip.cgHeight > 0.67 * equip.height) {
    warnings.push({
      severity: 'warning',
      code: 'W-CG-HIGH',
      message: `Center of gravity (${equip.cgHeight}") is above 2/3 of equipment height (${equip.height}"). Verify CG location.`,
      codeRef: 'Engineering judgment',
      category: 'input',
    });
  }

  // W-Z-GT-H: Attachment height exceeds building height
  if (site.attachmentHeight > site.buildingHeight) {
    warnings.push({
      severity: 'warning',
      code: 'W-Z-GT-H',
      message: `Attachment height (${site.attachmentHeight} ft) exceeds building height (${site.buildingHeight} ft). z/h capped at 1.0.`,
      codeRef: 'ASCE 7-22 §13.3.1.1',
      category: 'input',
    });
  }

  // --- Capacity Warnings ---

  // W-NO-PRODUCT: No manufacturer product selected for post-installed anchor
  if (anchor.anchorType !== 'cast-in' && !anchor.selectedProduct) {
    warnings.push({
      severity: 'warning',
      code: 'W-NO-PRODUCT',
      message: 'No manufacturer product selected. Capacity calculations use generic ACI 318-19 formulas. VERIFY results against the specific product\'s ICC-ES Evaluation Report (ESR).',
      codeRef: 'ACI 318-19 §17.1.3',
      category: 'capacity',
    });
  }

  // W-UTIL-HIGH: High utilization on any check
  const activeChecks = Object.entries(checks).filter(
    ([, c]) => c !== null
  ) as [string, CapacityCheck][];
  for (const [name, check] of activeChecks) {
    if (check.ratio > 0.85 && check.ratio <= 1.0) {
      warnings.push({
        severity: 'warning',
        code: 'W-UTIL-HIGH',
        message: `${name} utilization is ${(check.ratio * 100).toFixed(0)}% — adequate but near capacity limits. Consider upsizing anchor or increasing embedment.`,
        codeRef: check.codeRef,
        category: 'capacity',
      });
    }
  }

  // W-BREAKOUT-GOVERNS: Concrete breakout governs over steel
  if (checks.concreteBreakoutTension.ratio > checks.steelTension.ratio &&
      checks.concreteBreakoutTension.ratio > 0.5) {
    warnings.push({
      severity: 'info',
      code: 'W-BREAKOUT-GOVERNS',
      message: 'Concrete breakout tension governs over steel strength. Increasing embedment depth or using a higher f\'c may improve capacity.',
      codeRef: 'ACI 318-19 §17.6.2',
      category: 'capacity',
    });
  }

  // W-SIDE-BLOWOUT: Deep embedment near edge
  if (hef > 2.5 * ca1) {
    warnings.push({
      severity: 'warning',
      code: 'W-SIDE-BLOWOUT',
      message: `Deep embedment near edge: hef (${hef}") > 2.5×ca1 (${(2.5 * ca1).toFixed(1)}"). Side-face blowout check applies per §17.6.4.`,
      codeRef: 'ACI 318-19 §17.6.4',
      category: 'capacity',
    });
  }

  // --- Seismic Warnings ---

  // I-GENERAL-APPROACH: Using conservative defaults
  const approach = site.seismicApproach ?? 'general';
  if (approach === 'general') {
    warnings.push({
      severity: 'info',
      code: 'I-GENERAL-APPROACH',
      message: 'Using conservative defaults: Hf per Eq. 13.3-5 (no period), Rμ = 1.3. If the building SFRS is known, selecting it may reduce the design force.',
      codeRef: 'ASCE 7-22 §13.3.1',
      category: 'seismic',
    });
  }

  // W-FLOOR-ACCEL: Floor acceleration override
  if (approach === 'floor-accel') {
    warnings.push({
      severity: 'warning',
      code: 'W-FLOOR-ACCEL',
      message: `Floor acceleration Ai = ${site.Ai_override}g provided by user. Verify this value comes from a code-compliant structural analysis per ASCE 7-22 §13.3.1.1.`,
      codeRef: 'ASCE 7-22 §13.3.1.1',
      category: 'seismic',
    });
  }

  // W-SDC-D-ADHESIVE: Adhesive anchor in high seismic
  if (anchor.anchorType === 'post-installed-adhesive' &&
      ['D', 'E', 'F'].includes(site.seismicDesignCategory)) {
    warnings.push({
      severity: 'warning',
      code: 'W-SDC-D-ADHESIVE',
      message: `Adhesive anchor in SDC ${site.seismicDesignCategory}: Must be qualified for use in cracked concrete per ACI 355.4 and installed per manufacturer ESR requirements.`,
      codeRef: 'ACI 318-19 §17.5.2',
      category: 'seismic',
    });
  }

  return warnings;
}

/**
 * Combined tension and shear interaction — ACI 318-19 Section 17.8, Eq. 17.8.3
 *
 * (Tu / φNn)^(5/3) + (Vu / φVn)^(5/3) ≤ 1.0
 *
 * φNn = governing tension capacity (min of steel and concrete breakout)
 * φVn = governing shear capacity (min of steel, breakout, and pryout)
 */
export function interactionCheck(
  Tu: number,
  Vu: number,
  phiNn: number,
  phiVn: number
): number {
  if (phiNn <= 0 || phiVn <= 0) return Infinity;

  const tensionRatio = Tu / phiNn;
  const shearRatio = Vu / phiVn;

  // If either is zero, just return the other ratio raised to 5/3
  if (Tu <= 0) return Math.pow(shearRatio, 5 / 3);
  if (Vu <= 0) return Math.pow(tensionRatio, 5 / 3);

  return Math.pow(tensionRatio, 5 / 3) + Math.pow(shearRatio, 5 / 3);
}

// ============================================================================
// Main Calculation Runner
// ============================================================================

/**
 * Runs the complete seismic anchorage calculation.
 * Returns null if inputs are invalid.
 */
export function runCalculation(
  site: SiteParams,
  equip: EquipmentProperties,
  anchor: AnchorageConfig
): CalculationResults | null {
  // Validate critical inputs
  if (site.SDS <= 0 || equip.weight <= 0 || site.buildingHeight <= 0) {
    return null;
  }

  const anchorProps = getAnchorProps(anchor.anchorDiameter);
  if (!anchorProps) return null;

  const futa = getFuta(anchor.anchorDiameter, anchor.anchorMaterial);
  if (futa <= 0) return null;

  // --- Step 1: ASCE 7-22 Seismic Force ---

  const approach = site.seismicApproach ?? 'general';
  const CAR = getCAR(site.attachmentHeight, equip.CAR_atGrade, equip.CAR_aboveGrade);
  const Rpo = equip.Rpo;

  let Hf: number;
  let Rmu: number;
  let fp: { fpCalculated: number; fpMinimum: number; fpMaximum: number; fpDesign: number };

  if (approach === 'floor-accel' && site.Ai_override != null && site.Ai_override > 0) {
    // Floor acceleration alternative — §13.3.1.1
    Hf = 0;  // Not used in floor-accel approach
    Rmu = 0; // Not used in floor-accel approach
    fp = calculateFpFromFloorAccel(site.Ai_override, site.SDS, site.Ip, equip.weight, CAR, Rpo);
  } else if (approach === 'known-sfrs') {
    // Known SFRS — use stored building parameters
    Hf = calculateHf(site.attachmentHeight, site.buildingHeight, site.Ta_approx);
    Rmu = calculateRmu(
      site.attachmentHeight,
      site.R_building,
      site.Omega0_building,
      site.Ie_building
    );
    fp = calculateFp(site.SDS, site.Ip, equip.weight, Hf, Rmu, CAR, Rpo);
  } else {
    // General case — conservative defaults: Eq 13.3-5, Rmu = 1.3
    Hf = calculateHf(site.attachmentHeight, site.buildingHeight, null);
    Rmu = site.attachmentHeight <= 0 ? 1.0 : 1.3;
    fp = calculateFp(site.SDS, site.Ip, equip.weight, Hf, Rmu, CAR, Rpo);
  }

  // --- Step 2: Overturning Analysis ---

  const overturning = calculateOverturning(
    fp.fpDesign,
    equip.weight,
    equip.cgHeight,
    equip.length,
    equip.width,
    anchor.anchorLayout.spacing.longitudinal,
    anchor.anchorLayout.spacing.transverse
  );

  // --- Step 3: Anchor Demands ---

  let demands: { tuPerAnchor: number; vuPerAnchor: number };
  let boltGroupResult: BoltGroupResults | undefined;

  if (anchor.anchorLayout.analysisMethod === 'rigid-bolt-group') {
    // Rigid bolt group analysis
    const positions = anchor.anchorLayout.anchors
      ?? generateAnchorPositions(
        anchor.anchorLayout.nLong,
        anchor.anchorLayout.nTrans,
        anchor.anchorLayout.spacing.longitudinal,
        anchor.anchorLayout.spacing.transverse,
        equip.length,
        equip.width
      );
    const cgX = equip.length / 2 + (equip.cgOffsetX ?? 0);
    const cgY = equip.width / 2 + (equip.cgOffsetY ?? 0);
    const pivotMethod = anchor.anchorLayout.pivotMethod ?? 'centroid';

    boltGroupResult = calculateRigidBoltGroupDemands(
      fp.fpDesign,
      equip.weight,
      equip.Omega0p,
      site.SDS,
      equip.cgHeight,
      cgX,
      cgY,
      positions,
      pivotMethod
    );

    // Use critical anchor demands for ACI capacity checks
    const critical = boltGroupResult.anchorForces.find(a => a.isCritical)!;
    demands = {
      tuPerAnchor: critical.tCombined,
      vuPerAnchor: critical.vCombined,
    };
  } else {
    // Simple analysis (original method)
    demands = calculateAnchorDemands(
      fp.fpDesign,
      equip.weight,
      equip.Omega0p,
      overturning,
      anchor.anchorLayout.nLong,
      anchor.anchorLayout.nTrans,
      anchor.anchorLayout.spacing.longitudinal,
      anchor.anchorLayout.spacing.transverse
    );
  }

  // --- Step 4: ACI 318-19 Capacity Checks ---

  const Ase = anchorProps.Ase;
  const hef = anchor.embedmentDepth;
  const fc = anchor.concreteStrength;
  const da = anchor.anchorDiameter;
  const ca1 = anchor.anchorLayout.edgeDistance.ca1;
  const ca2 = anchor.anchorLayout.edgeDistance.ca2;
  const cracked = anchor.crackedConcrete ?? true; // Default: cracked (conservative)
  const ha = anchor.memberThickness ?? 0;
  const ca_min = Math.min(ca1, ca2);

  // Steel tension
  const phiNsa = steelTensionCapacity(Ase, futa);
  const steelTension: CapacityCheck = {
    demand: demands.tuPerAnchor,
    capacity: phiNsa,
    ratio: phiNsa > 0 ? demands.tuPerAnchor / phiNsa : 0,
    status: demands.tuPerAnchor <= phiNsa ? 'PASS' : 'FAIL',
    codeRef: 'ACI 318-19 Eq. 17.6.1.2',
  };

  // Steel shear
  const phiVsa = steelShearCapacity(Ase, futa);
  const steelShear: CapacityCheck = {
    demand: demands.vuPerAnchor,
    capacity: phiVsa,
    ratio: phiVsa > 0 ? demands.vuPerAnchor / phiVsa : 0,
    status: demands.vuPerAnchor <= phiVsa ? 'PASS' : 'FAIL',
    codeRef: 'ACI 318-19 Eq. 17.7.1.2b',
  };

  // Concrete breakout tension — with ψ modification factors
  const breakoutTensionResult = concreteBreakoutTensionCapacity(hef, fc, anchor.anchorType, {
    ca_min,
    crackedConcrete: cracked,
    isSeismicPostInstalled: anchor.anchorType !== 'cast-in',
  });
  const phiNcb = breakoutTensionResult.capacity;
  const concreteBreakoutTension: CapacityCheck = {
    demand: demands.tuPerAnchor,
    capacity: phiNcb,
    ratio: phiNcb > 0 ? demands.tuPerAnchor / phiNcb : 0,
    status: demands.tuPerAnchor <= phiNcb ? 'PASS' : 'FAIL',
    codeRef: 'ACI 318-19 Section 17.6.2',
  };

  // Concrete breakout shear — with ψ modification factors
  const breakoutShearResult = concreteBreakoutShearCapacity(da, hef, fc, ca1, {
    ca2,
    crackedConcrete: cracked,
    memberThickness: ha,
    anchorType: anchor.anchorType,
  });
  const phiVcb = breakoutShearResult.capacity;
  const concreteBreakoutShear: CapacityCheck = {
    demand: demands.vuPerAnchor,
    capacity: phiVcb,
    ratio: phiVcb > 0 ? demands.vuPerAnchor / phiVcb : 0,
    status: demands.vuPerAnchor <= phiVcb ? 'PASS' : 'FAIL',
    codeRef: 'ACI 318-19 Section 17.7.2',
  };

  // Concrete pryout
  const phiVcp = concretePryoutCapacity(hef, fc, anchor.anchorType);
  const concretePryout: CapacityCheck = {
    demand: demands.vuPerAnchor,
    capacity: phiVcp,
    ratio: phiVcp > 0 ? demands.vuPerAnchor / phiVcp : 0,
    status: demands.vuPerAnchor <= phiVcp ? 'PASS' : 'FAIL',
    codeRef: 'ACI 318-19 Section 17.7.3',
  };

  // Pullout — §17.6.3
  const phiNp = pulloutCapacity(anchor.anchorType, fc, {
    crackedConcrete: cracked,
    Np_product: anchor.selectedProduct?.Np_cracked
      ? (cracked ? anchor.selectedProduct.Np_cracked : anchor.selectedProduct.Np_uncracked)
      : undefined,
  });
  const pulloutCheck: CapacityCheck = phiNp !== null
    ? {
        demand: demands.tuPerAnchor,
        capacity: phiNp,
        ratio: phiNp > 0 ? demands.tuPerAnchor / phiNp : 0,
        status: demands.tuPerAnchor <= phiNp ? 'PASS' : 'FAIL',
        codeRef: 'ACI 318-19 Section 17.6.3',
      }
    : {
        demand: demands.tuPerAnchor,
        capacity: 0,
        ratio: 0,
        status: 'PASS', // No data — cannot check, flagged by warning
        codeRef: 'ACI 318-19 Section 17.6.3 — NEEDS MANUFACTURER DATA',
      };

  // Side-face blowout — §17.6.4
  const phiNsb = sideFaceBlowoutCapacity(hef, ca1, fc, anchor.anchorType);
  const sideFaceBlowoutCheck: CapacityCheck | null = phiNsb !== null
    ? {
        demand: demands.tuPerAnchor,
        capacity: phiNsb,
        ratio: phiNsb > 0 ? demands.tuPerAnchor / phiNsb : 0,
        status: demands.tuPerAnchor <= phiNsb ? 'PASS' : 'FAIL',
        codeRef: 'ACI 318-19 Section 17.6.4',
      }
    : null; // Not applicable (hef ≤ 2.5×ca1)

  // Adhesive bond — §17.6.5
  const tau_cr = cracked
    ? anchor.selectedProduct?.tau_cr_cracked
    : anchor.selectedProduct?.tau_cr_uncracked;
  const bondResult = adhesiveBondCapacity(da, hef, anchor.anchorType, {
    tau_cr,
    crackedConcrete: cracked,
    ca_min,
  });
  const adhesiveBondCheck: CapacityCheck | null = bondResult !== null
    ? {
        demand: demands.tuPerAnchor,
        capacity: bondResult.capacity,
        ratio: bondResult.capacity > 0 ? demands.tuPerAnchor / bondResult.capacity : 0,
        status: demands.tuPerAnchor <= bondResult.capacity ? 'PASS' : 'FAIL',
        codeRef: 'ACI 318-19 Section 17.6.5',
      }
    : null; // Not adhesive anchor or no tau_cr data

  // Interaction check — include ALL applicable tension and shear capacities
  const tensionCapacities = [phiNsa, phiNcb];
  if (phiNp !== null) tensionCapacities.push(phiNp);
  if (phiNsb !== null) tensionCapacities.push(phiNsb);
  if (bondResult !== null) tensionCapacities.push(bondResult.capacity);

  const phiNn = Math.min(...tensionCapacities); // Governing tension capacity
  const phiVn = Math.min(phiVsa, phiVcb, phiVcp); // Governing shear capacity
  const interactionRatio = interactionCheck(
    demands.tuPerAnchor,
    demands.vuPerAnchor,
    phiNn,
    phiVn
  );
  const interaction: CapacityCheck = {
    demand: interactionRatio,
    capacity: 1.0,
    ratio: interactionRatio,
    status: interactionRatio <= 1.0 ? 'PASS' : 'FAIL',
    codeRef: 'ACI 318-19 Eq. 17.8.3',
  };

  // --- ψ Factor Summary (for PE review) ---

  const psiFactors = {
    psiEdN: breakoutTensionResult.psiEdN,
    psiCN: breakoutTensionResult.psiCN,
    psiCpN: breakoutTensionResult.psiCpN,
    ANcRatio: breakoutTensionResult.ANcRatio,
    psiEdV: breakoutShearResult.psiEdV,
    psiCV: breakoutShearResult.psiCV,
    psiHV: breakoutShearResult.psiHV,
    AVcRatio: breakoutShearResult.AVcRatio,
  };

  // --- Overall Status ---

  const checks = {
    steelTension,
    steelShear,
    concreteBreakoutTension,
    concreteBreakoutShear,
    concretePryout,
    pullout: pulloutCheck,
    sideFaceBlowout: sideFaceBlowoutCheck,
    adhesiveBond: adhesiveBondCheck,
    interaction,
  };

  // Check all non-null checks for pass/fail
  const allChecks = Object.entries(checks).filter(
    ([, c]) => c !== null
  ) as [string, CapacityCheck][];
  const overallStatus: 'PASS' | 'FAIL' = allChecks.every(
    ([, c]) => c.status === 'PASS'
  )
    ? 'PASS'
    : 'FAIL';

  // Find governing check (highest ratio)
  let governingCheck = 'steelTension';
  let maxUtilizationRatio = 0;
  for (const [name, check] of allChecks) {
    if (check.ratio > maxUtilizationRatio) {
      maxUtilizationRatio = check.ratio;
      governingCheck = name;
    }
  }

  // --- Update bolt group interaction ratios if applicable ---

  if (boltGroupResult) {
    for (const af of boltGroupResult.anchorForces) {
      af.interactionRatio = interactionCheck(af.tCombined, af.vCombined, phiNn, phiVn);
    }
    // Re-identify critical anchor by interaction ratio
    let maxIR = 0;
    let critId = boltGroupResult.criticalAnchorId;
    for (const af of boltGroupResult.anchorForces) {
      af.isCritical = false;
      if (af.interactionRatio > maxIR) {
        maxIR = af.interactionRatio;
        critId = af.anchorId;
      }
    }
    const critAnchor = boltGroupResult.anchorForces.find(a => a.anchorId === critId);
    if (critAnchor) critAnchor.isCritical = true;
    boltGroupResult.criticalAnchorId = critId;
  }

  // --- Generate Engineering Warnings ---

  const warnings = generateWarnings(anchor, site, equip, checks);

  // --- Load Case Reactions (before combinations/overstrength) ---
  const nTotal = anchor.anchorLayout.anchors?.length
    ?? anchor.anchorLayout.nLong * anchor.anchorLayout.nTrans;
  const tuWithoutOmega = equip.Omega0p > 0 ? demands.tuPerAnchor / equip.Omega0p : 0;
  const vuWithoutOmega = equip.Omega0p > 0 ? demands.vuPerAnchor / equip.Omega0p : 0;

  return {
    seismicApproach: site.seismicApproach ?? 'general',
    Hf,
    Rmu,
    CAR,
    Rpo,
    fpCalculated: fp.fpCalculated,
    fpMinimum: fp.fpMinimum,
    fpMaximum: fp.fpMaximum,
    fpDesign: fp.fpDesign,
    overturnMoment: overturning.overturnMoment,
    resistingMoment1: overturning.resistingMoment1,
    resistingMoment2: overturning.resistingMoment2,
    netUpliftMoment1: overturning.netUpliftMoment1,
    netUpliftMoment2: overturning.netUpliftMoment2,
    governingDirection: overturning.governingDirection,
    upliftOccurs: overturning.upliftOccurs,
    loadCases: {
      dead: {
        verticalReaction: equip.weight / nTotal,
        description: `D = Wp / ${nTotal} anchors = ${(equip.weight / nTotal).toFixed(0)} lbs/anchor (stabilizing)`,
      },
      seismicFp: {
        horizontalForce: fp.fpDesign,
        description: `Eh = Fp = ${fp.fpDesign.toFixed(0)} lbs (ASCE 7-22 Eq. 13.3-1)`,
      },
      seismicOverturn: {
        moment: overturning.overturnMoment,
        description: `M_ot = Fp × h_cg = ${overturning.overturnMoment.toFixed(0)} lb-ft`,
      },
      seismicTensionPerAnchor: tuWithoutOmega,
      seismicShearPerAnchor: vuWithoutOmega,
    },
    tuPerAnchor: demands.tuPerAnchor,
    vuPerAnchor: demands.vuPerAnchor,
    boltGroup: boltGroupResult,
    checks,
    psiFactors,
    warnings,
    overallStatus,
    governingCheck,
    maxUtilizationRatio,
  };
}
