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
 * φ = 0.70 (concrete breakout)
 *
 * Conservative: ψed,N = ψc,N = ψcp,N = 1.0, ANc/ANco = 1.0
 */
export function concreteBreakoutTensionCapacity(
  hef: number,
  fc: number,
  anchorType: AnchorType
): number {
  const phi = 0.70;

  // kc depends on anchor type
  const kc = anchorType === 'cast-in' ? 24 : 17;
  const lambdaA = 1.0; // Normal-weight concrete

  // Basic breakout strength (lbs)
  const Nb = kc * lambdaA * Math.sqrt(fc) * Math.pow(hef, 1.5);

  // Conservative ψ factors = 1.0
  const Ncb = Nb;

  return phi * Ncb;
}

/**
 * Concrete breakout shear — ACI 318-19 Section 17.7.2
 *
 * Vb = 7 × (le/da)^0.2 × da^0.5 × λa × √f'c × ca1^1.5
 * φVcb = φ × (AVc/AVco) × ψed,V × ψc,V × ψh,V × Vb
 * φ = 0.70
 *
 * le = min(hef, 8×da)
 */
export function concreteBreakoutShearCapacity(
  da: number,
  hef: number,
  fc: number,
  ca1: number
): number {
  const phi = 0.70;
  const lambdaA = 1.0;

  // Load-bearing length
  const le = Math.min(hef, 8 * da);

  // Basic breakout strength (lbs)
  const Vb =
    7 *
    Math.pow(le / da, 0.2) *
    Math.pow(da, 0.5) *
    lambdaA *
    Math.sqrt(fc) *
    Math.pow(ca1, 1.5);

  // Conservative ψ factors = 1.0
  const Vcb = Vb;

  return phi * Vcb;
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

  const Hf = calculateHf(site.attachmentHeight, site.buildingHeight, site.Ta_approx);
  const Rmu = calculateRmu(
    site.attachmentHeight,
    site.R_building,
    site.Omega0_building,
    site.Ie_building
  );
  const CAR = getCAR(site.attachmentHeight, equip.CAR_atGrade, equip.CAR_aboveGrade);
  const Rpo = equip.Rpo;

  const fp = calculateFp(site.SDS, site.Ip, equip.weight, Hf, Rmu, CAR, Rpo);

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

  const demands = calculateAnchorDemands(
    fp.fpDesign,
    equip.weight,
    equip.Omega0p,
    overturning,
    anchor.anchorLayout.nLong,
    anchor.anchorLayout.nTrans,
    anchor.anchorLayout.spacing.longitudinal,
    anchor.anchorLayout.spacing.transverse
  );

  // --- Step 4: ACI 318-19 Capacity Checks ---

  const Ase = anchorProps.Ase;
  const hef = anchor.embedmentDepth;
  const fc = anchor.concreteStrength;
  const da = anchor.anchorDiameter;
  const ca1 = anchor.anchorLayout.edgeDistance.ca1;

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

  // Concrete breakout tension
  const phiNcb = concreteBreakoutTensionCapacity(hef, fc, anchor.anchorType);
  const concreteBreakoutTension: CapacityCheck = {
    demand: demands.tuPerAnchor,
    capacity: phiNcb,
    ratio: phiNcb > 0 ? demands.tuPerAnchor / phiNcb : 0,
    status: demands.tuPerAnchor <= phiNcb ? 'PASS' : 'FAIL',
    codeRef: 'ACI 318-19 Section 17.6.2',
  };

  // Concrete breakout shear
  const phiVcb = concreteBreakoutShearCapacity(da, hef, fc, ca1);
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

  // Interaction check
  const phiNn = Math.min(phiNsa, phiNcb); // Governing tension capacity
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

  // --- Overall Status ---

  const checks = {
    steelTension,
    steelShear,
    concreteBreakoutTension,
    concreteBreakoutShear,
    concretePryout,
    interaction,
  };

  const allChecks = Object.entries(checks);
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

  // --- Load Case Reactions (before combinations/overstrength) ---
  const nTotal = anchor.anchorLayout.nLong * anchor.anchorLayout.nTrans;
  const tuWithoutOmega = equip.Omega0p > 0 ? demands.tuPerAnchor / equip.Omega0p : 0;
  const vuWithoutOmega = equip.Omega0p > 0 ? demands.vuPerAnchor / equip.Omega0p : 0;

  return {
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
    checks,
    overallStatus,
    governingCheck,
    maxUtilizationRatio,
  };
}
