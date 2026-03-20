// ============================================================================
// Seismic Anchorage Calculation Engine — Tests
// Verifies ASCE 7-22 Chapter 13 + ACI 318-19 Chapter 17 calculations
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  calculateHf,
  calculateRmu,
  getCAR,
  calculateFp,
  calculateOverturning,
  steelTensionCapacity,
  steelShearCapacity,
  concreteBreakoutTensionCapacity,
  concreteBreakoutShearCapacity,
  concretePryoutCapacity,
  interactionCheck,
  runCalculation,
} from './calculations.ts';
import type { SiteParams, EquipmentProperties, AnchorageConfig } from './types.ts';

// ============================================================================
// Hf — Height Amplification Factor (ASCE 7-22 §13.3.1.1)
// ============================================================================

describe('calculateHf', () => {
  it('returns 1.0 at grade (z=0)', () => {
    expect(calculateHf(0, 100, null)).toBe(1.0);
  });

  it('returns 1.0 when h=0', () => {
    expect(calculateHf(10, 0, null)).toBe(1.0);
  });

  it('uses default formula when Ta is unknown (Eq. 13.3-5)', () => {
    // Hf = 1 + 2.5 * (z/h)
    // z=50, h=100 → z/h=0.5 → Hf = 1 + 2.5*0.5 = 2.25
    expect(calculateHf(50, 100, null)).toBeCloseTo(2.25, 4);
  });

  it('caps z/h at 1.0 for default formula', () => {
    // z=120, h=100 → z/h capped at 1.0 → Hf = 1 + 2.5*1.0 = 3.5
    expect(calculateHf(120, 100, null)).toBeCloseTo(3.5, 4);
  });

  it('Hf = 3.5 at roof (z/h=1.0) with unknown Ta', () => {
    expect(calculateHf(100, 100, null)).toBeCloseTo(3.5, 4);
  });

  it('uses refined formula when Ta is known (Eq. 13.3-4)', () => {
    // Ta=0.5s, z=50, h=100 → z/h=0.5
    // a1 = min(1/0.5, 2.5) = min(2.0, 2.5) = 2.0
    // a2 = max(0, 1 - (0.4/0.5)^2) = max(0, 1 - 0.64) = 0.36
    // Hf = 1 + 2.0*0.5 + 0.36*0.5^10 = 1 + 1.0 + 0.36*0.000977 ≈ 2.000
    expect(calculateHf(50, 100, 0.5)).toBeCloseTo(2.000, 2);
  });

  it('a1 is capped at 2.5 for very short period buildings', () => {
    // Ta=0.2s → a1 = min(1/0.2, 2.5) = min(5.0, 2.5) = 2.5
    const Hf = calculateHf(100, 100, 0.2);
    // a2 = max(0, 1 - (0.4/0.2)^2) = max(0, 1 - 4) = 0
    // Hf = 1 + 2.5*1.0 + 0*1 = 3.5
    expect(Hf).toBeCloseTo(3.5, 4);
  });
});

// ============================================================================
// Rμ — Structure Ductility Reduction Factor (ASCE 7-22 §13.3.1.2)
// ============================================================================

describe('calculateRmu', () => {
  it('returns 1.0 at grade (z=0)', () => {
    expect(calculateRmu(0, 8, 3, 1)).toBe(1.0);
  });

  it('defaults to 1.3 when SFRS unknown (R=0)', () => {
    expect(calculateRmu(10, 0, 0, 0)).toBe(1.3);
  });

  it('calculates correctly for special steel moment frame', () => {
    // R=8, Ω0=3, Ie=1.0
    // Rμ = max(1.3, sqrt(1.1 * 8 / (1.0 * 3))) = max(1.3, sqrt(2.933)) = max(1.3, 1.713) = 1.713
    expect(calculateRmu(10, 8, 3, 1)).toBeCloseTo(1.713, 2);
  });

  it('floors at 1.3 for low-R systems', () => {
    // R=2, Ω0=2.5, Ie=1.0
    // Rμ = max(1.3, sqrt(1.1 * 2 / (1.0 * 2.5))) = max(1.3, sqrt(0.88)) = max(1.3, 0.938) = 1.3
    expect(calculateRmu(10, 2, 2.5, 1)).toBe(1.3);
  });
});

// ============================================================================
// CAR selection
// ============================================================================

describe('getCAR', () => {
  it('returns at-grade value when z <= 0', () => {
    expect(getCAR(0, 1.0, 2.2)).toBe(1.0);
  });

  it('returns above-grade value when z > 0', () => {
    expect(getCAR(10, 1.0, 2.2)).toBe(2.2);
  });
});

// ============================================================================
// Fp — Seismic Force (ASCE 7-22 Eq. 13.3-1 through 13.3-3)
// ============================================================================

describe('calculateFp', () => {
  it('calculates basic Fp correctly', () => {
    // SDS=1.0, Ip=1.0, Wp=1000, Hf=2.0, Rmu=1.3, CAR=1.0, Rpo=1.5
    // Fp = 0.4 * 1.0 * 1.0 * 1000 * (2.0/1.3) * (1.0/1.5) = 400 * 1.538 * 0.667 = 410.3
    const result = calculateFp(1.0, 1.0, 1000, 2.0, 1.3, 1.0, 1.5);
    expect(result.fpCalculated).toBeCloseTo(410.3, 0);
  });

  it('applies minimum Fp (Eq. 13.3-2)', () => {
    // Very small calculated Fp should be governed by minimum
    // Fp_min = 0.3 * SDS * Ip * Wp
    const result = calculateFp(1.0, 1.0, 1000, 1.0, 3.0, 0.5, 3.0);
    // Fp_calc = 0.4*1*1*1000*(1/3)*(0.5/3) = 400*0.333*0.167 = 22.2
    // Fp_min = 0.3*1*1*1000 = 300
    expect(result.fpDesign).toBe(300);
  });

  it('applies maximum Fp (Eq. 13.3-3)', () => {
    // Very large calculated Fp should be capped
    const result = calculateFp(1.5, 1.5, 1000, 3.5, 1.0, 2.5, 1.0);
    // Fp_calc = 0.4*1.5*1.5*1000*(3.5/1.0)*(2.5/1.0) = 900*3.5*2.5 = 7875
    // Fp_max = 1.6*1.5*1.5*1000 = 3600
    expect(result.fpDesign).toBeCloseTo(3600, 0);
  });
});

// ============================================================================
// Overturning Analysis
// ============================================================================

describe('calculateOverturning', () => {
  it('correctly computes resisting moments with 0.9W factor', () => {
    // Fp=1000, Wp=3000, cgHeight=36in, equipL=120in, equipW=60in, sx=100in, sy=40in
    const result = calculateOverturning(1000, 3000, 36, 120, 60, 100, 40);

    // M_ot = 1000 * (36/12) = 3000 lb-ft
    expect(result.overturnMoment).toBeCloseTo(3000, 1);

    // M_r1 (Dir 1: force along length) = 0.9 * 3000 * (120/2)/12 = 0.9 * 3000 * 5 = 13500
    expect(result.resistingMoment1).toBeCloseTo(13500, 1);

    // M_r2 (Dir 2: force along width) = 0.9 * 3000 * (60/2)/12 = 0.9 * 3000 * 2.5 = 6750
    expect(result.resistingMoment2).toBeCloseTo(6750, 1);
  });

  it('does NOT swap resisting moment arms (critical bug check)', () => {
    // Direction 1 arm = L/2, Direction 2 arm = W/2
    const result = calculateOverturning(1000, 1000, 24, 100, 50, 80, 40);

    // M_r1 should use L=100: 0.9 * 1000 * (100/2)/12 = 3750
    expect(result.resistingMoment1).toBeCloseTo(3750, 1);

    // M_r2 should use W=50: 0.9 * 1000 * (50/2)/12 = 1875
    expect(result.resistingMoment2).toBeCloseTo(1875, 1);

    // M_r1 should NOT equal what M_r2 would be if swapped
    expect(result.resistingMoment1).not.toBeCloseTo(1875, 1);
  });

  it('reports no uplift when resisting moments exceed overturning', () => {
    // Small force, big equipment → no uplift
    const result = calculateOverturning(100, 5000, 24, 120, 60, 100, 40);
    expect(result.upliftOccurs).toBe(false);
    expect(result.netUpliftMoment1).toBe(0);
    expect(result.netUpliftMoment2).toBe(0);
  });

  it('correctly identifies governing direction', () => {
    // Force=5000, light equipment → uplift in both directions
    // Direction with SMALLER equipment dimension governs (higher tension)
    const result = calculateOverturning(5000, 500, 36, 120, 40, 100, 30);
    // M_ot = 5000 * 3 = 15000
    // M_r1 = 0.9*500*(120/2)/12 = 2250
    // M_r2 = 0.9*500*(40/2)/12 = 750
    // M_net1 = 12750, M_net2 = 14250
    // T_total1 = 12750 / (100/12) = 1530
    // T_total2 = 14250 / (30/12) = 5700
    expect(result.governingDirection).toBe('transverse');
  });
});

// ============================================================================
// ACI 318-19 Capacity Checks
// ============================================================================

describe('ACI 318-19 Capacity', () => {
  it('steel tension: φNsa = 0.75 × Ase × futa', () => {
    // 5/8" anchor, A36 steel: Ase=0.226, futa=58000
    const cap = steelTensionCapacity(0.226, 58000);
    // φNsa = 0.75 * 0.226 * 58000 = 9831
    expect(cap).toBeCloseTo(9831, 0);
  });

  it('steel shear: φVsa = 0.65 × 0.6 × Ase × futa', () => {
    // 5/8" anchor, A36 steel: Ase=0.226, futa=58000
    const cap = steelShearCapacity(0.226, 58000);
    // φVsa = 0.65 * 0.6 * 0.226 * 58000 ≈ 5112
    expect(cap).toBeCloseTo(5112, 0);
  });

  it('concrete breakout tension: post-installed (kc=17)', () => {
    // hef=5, f'c=3500, post-installed
    const cap = concreteBreakoutTensionCapacity(5, 3500, 'post-installed-expansion');
    // Nb = 17 * 1.0 * sqrt(3500) * 5^1.5 = 17 * 59.16 * 11.18 = 11239
    // φNcb = 0.70 * 11239 = 7867
    expect(cap).toBeCloseTo(7867, -1); // Within 10 lbs
  });

  it('concrete breakout tension: cast-in (kc=24)', () => {
    // hef=5, f'c=3500, cast-in
    const cap = concreteBreakoutTensionCapacity(5, 3500, 'cast-in');
    // Nb = 24 * 1.0 * sqrt(3500) * 5^1.5 = 24 * 59.16 * 11.18 = 15868
    // φNcb = 0.70 * 15868 = 11108
    expect(cap).toBeCloseTo(11108, -1);
  });

  it('concrete breakout shear', () => {
    // da=0.625, hef=5, f'c=3500, ca1=10
    const cap = concreteBreakoutShearCapacity(0.625, 5, 3500, 10);
    // le = min(5, 8*0.625) = min(5, 5) = 5
    // Vb = 7 * (5/0.625)^0.2 * 0.625^0.5 * 1.0 * sqrt(3500) * 10^1.5
    //    = 7 * 8^0.2 * 0.7906 * 59.16 * 31.623
    //    = 7 * 1.516 * 0.7906 * 59.16 * 31.623
    expect(cap).toBeGreaterThan(5000);
    expect(cap).toBeLessThan(20000);
  });

  it('concrete pryout: kcp=2.0 for hef >= 2.5', () => {
    const cap = concretePryoutCapacity(5, 3500, 'post-installed-expansion');
    // Vcp = 2.0 * Ncb
    // Nb = 17 * sqrt(3500) * 5^1.5 = 11239
    // Vcp = 2.0 * Ncb (Ncb = 17 * sqrt(3500) * 5^1.5)
    // φVcp = 0.70 * 2.0 * Ncb ≈ 15742
    expect(cap).toBeCloseTo(15742, -1);
  });

  it('concrete pryout: kcp=1.0 for hef < 2.5', () => {
    const cap = concretePryoutCapacity(2, 4000, 'post-installed-expansion');
    // kcp = 1.0
    // Nb = 17 * sqrt(4000) * 2^1.5 = 17 * 63.25 * 2.828 = 3042
    // φVcp = 0.70 * 3042 = 2129
    expect(cap).toBeCloseTo(2129, -1);
  });

  it('interaction equation: (Tu/φNn)^(5/3) + (Vu/φVn)^(5/3)', () => {
    // Use exact computed capacities for consistency
    const phiNn = steelTensionCapacity(0.226, 58000); // 9831
    const phiVn = steelShearCapacity(0.226, 58000);   // 5112
    const ratio = interactionCheck(4865, 2362.5, phiNn, phiVn);
    // (4865/9831)^(5/3) + (2362.5/5112)^(5/3)
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(0.7);
  });

  it('interaction: zero tension means only shear contributes', () => {
    const ratio = interactionCheck(0, 1000, 5000, 3000);
    // = (1000/3000)^(5/3) = 0.333^1.667 ≈ 0.160
    expect(ratio).toBeCloseTo(0.160, 2);
  });
});

// ============================================================================
// Full Calculation Integration Test — VP3-like scenario (ASCE 7-22)
// ============================================================================

describe('runCalculation — VP3 adapted for ASCE 7-22', () => {
  // VP3: Heavy rooftop RTU, Los Angeles, hospital
  // Re-calculated for ASCE 7-22 equations
  const site: SiteParams = {
    address: 'Los Angeles, CA',
    latitude: 34.05,
    longitude: -118.25,
    SDS: 1.5,
    SD1: 0.9,
    Ss: 2.0,
    S1: 1.0,
    siteClass: 'D',
    riskCategory: 'III',
    Ip: 1.5,              // RC III → Ip = 1.0 actually. Wait - check.
    buildingHeight: 120,
    attachmentHeight: 120, // Rooftop
    seismicDesignCategory: 'D',
    // Use a special moment frame for the building
    sfrsType: 'Special steel moment frame',
    R_building: 8,
    Omega0_building: 3,
    Ie_building: 1.25,     // RC III → Ie = 1.25
    Ta_approx: null,       // Unknown period → default Hf formula
  };

  const equip: EquipmentProperties = {
    manufacturer: 'Trane',
    modelNumber: 'YZK300',
    equipmentType: 'Rooftop Unit (RTU)',
    componentType: 'Rooftop unit (RTU) - vibration-isolated',
    weight: 3500,
    length: 120, // inches
    width: 60,
    height: 84,
    cgHeight: 42,
    // Vibration-isolated RTU per Table 13.6-1
    CAR_atGrade: 1.8,
    CAR_aboveGrade: 2.2,
    Rpo: 1.3,
    Omega0p: 1.75,
  };

  const anchor: AnchorageConfig = {
    anchorType: 'post-installed-expansion',
    anchorMaterial: 'F1554-36',
    anchorDiameter: 0.625,
    embedmentDepth: 5,
    concreteStrength: 3500,
    anchorLayout: {
      pattern: '2x2',
      nLong: 2,
      nTrans: 2,
      spacing: { longitudinal: 120, transverse: 60 },
      edgeDistance: { ca1: 10, ca2: 10 },
    },
  };

  it('produces valid results', () => {
    // Fix Ip for RC III = 1.0 per ASCE 7-22 (wait - the original VP3 uses RC III with Ip=1.5.
    // Actually per ASCE 7-22 Table 13.3-1, Ip=1.5 is for Risk Category IV and for
    // components required for life safety. For a hospital (RC III), Ip could be 1.5
    // for components required for continued functionality.
    // Let's keep Ip=1.5 as the VP3 uses it.
    const results = runCalculation(site, equip, anchor);
    expect(results).not.toBeNull();
    if (!results) return;

    // Hf = 1 + 2.5 * (120/120) = 3.5
    expect(results.Hf).toBeCloseTo(3.5, 3);

    // Rμ = max(1.3, sqrt(1.1 * 8 / (1.25 * 3))) = max(1.3, sqrt(2.347)) = max(1.3, 1.532)
    expect(results.Rmu).toBeCloseTo(1.532, 2);

    // CAR = 2.2 (above grade, z=120 > 0)
    expect(results.CAR).toBe(2.2);

    // Rpo = 1.3
    expect(results.Rpo).toBe(1.3);

    // Fp_calc = 0.4 * 1.5 * 1.5 * 3500 * (3.5/1.532) * (2.2/1.3)
    //         = 3150 * 2.284 * 1.692
    //         = 12168
    // Fp_max = 1.6 * 1.5 * 1.5 * 3500 = 12600
    // Fp_min = 0.3 * 1.5 * 1.5 * 3500 = 2362.5
    // Fp_design = min(max(Fp_calc, 2362.5), 12600) ≈ 12180
    expect(results.fpDesign).toBeCloseTo(12180, -2);

    // Results should exist and have valid structure
    expect(results.overallStatus).toBeDefined();
    expect(['PASS', 'FAIL']).toContain(results.overallStatus);
  });

  it('computes overturning correctly', () => {
    const results = runCalculation(site, equip, anchor);
    if (!results) return;

    // M_ot = Fp * (42/12) = Fp * 3.5
    expect(results.overturnMoment).toBeCloseTo(results.fpDesign * 3.5, 0);

    // M_r1 = 0.9 * 3500 * (120/2)/12 = 0.9 * 3500 * 5 = 15750
    expect(results.resistingMoment1).toBeCloseTo(15750, 1);

    // M_r2 = 0.9 * 3500 * (60/2)/12 = 0.9 * 3500 * 2.5 = 7875
    expect(results.resistingMoment2).toBeCloseTo(7875, 1);

    // With Fp ≈ 12168, uplift should occur in both directions
    expect(results.upliftOccurs).toBe(true);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge cases', () => {
  it('returns null for zero SDS', () => {
    const site = makeSite({ SDS: 0 });
    const results = runCalculation(site, makeEquip(), makeAnchor());
    expect(results).toBeNull();
  });

  it('returns null for zero weight', () => {
    const equip = makeEquip({ weight: 0 });
    const results = runCalculation(makeSite(), equip, makeAnchor());
    expect(results).toBeNull();
  });

  it('handles z/h > 1.0 gracefully (caps at 1.0)', () => {
    const Hf = calculateHf(150, 100, null);
    // z/h capped at 1.0 → Hf = 1 + 2.5*1.0 = 3.5
    expect(Hf).toBeCloseTo(3.5, 4);
  });

  it('handles no-uplift case (Tu = 0)', () => {
    // Very heavy equipment with small force → no uplift
    const site = makeSite({ SDS: 0.2, attachmentHeight: 0 });
    const equip = makeEquip({ weight: 10000 });
    const results = runCalculation(site, equip, makeAnchor());
    if (!results) return;
    expect(results.upliftOccurs).toBe(false);
    expect(results.tuPerAnchor).toBe(0);
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function makeSite(overrides: Partial<SiteParams> = {}): SiteParams {
  return {
    address: 'Test',
    latitude: 34,
    longitude: -118,
    SDS: 1.0,
    SD1: 0.6,
    Ss: 1.5,
    S1: 0.8,
    siteClass: 'D',
    riskCategory: 'II',
    Ip: 1.0,
    buildingHeight: 50,
    attachmentHeight: 25,
    seismicDesignCategory: 'D',
    sfrsType: 'Unknown / Not specified',
    R_building: 0,
    Omega0_building: 0,
    Ie_building: 1.0,
    Ta_approx: null,
    ...overrides,
  };
}

function makeEquip(overrides: Partial<EquipmentProperties> = {}): EquipmentProperties {
  return {
    manufacturer: 'Test',
    modelNumber: 'T-100',
    equipmentType: 'RTU',
    componentType: 'Wet-side HVAC (boilers, chillers, cooling towers)',
    weight: 1000,
    length: 60,
    width: 30,
    height: 48,
    cgHeight: 24,
    CAR_atGrade: 1.0,
    CAR_aboveGrade: 1.0,
    Rpo: 1.5,
    Omega0p: 2.0,
    ...overrides,
  };
}

function makeAnchor(overrides: Partial<AnchorageConfig> = {}): AnchorageConfig {
  return {
    anchorType: 'post-installed-expansion',
    anchorMaterial: 'F1554-36',
    anchorDiameter: 0.625,
    embedmentDepth: 5,
    concreteStrength: 4000,
    anchorLayout: {
      pattern: '2x2',
      nLong: 2,
      nTrans: 2,
      spacing: { longitudinal: 48, transverse: 24 },
      edgeDistance: { ca1: 6, ca2: 6 },
    },
    ...overrides,
  };
}
