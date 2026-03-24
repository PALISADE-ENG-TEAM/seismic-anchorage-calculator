// ============================================================================
// Seismic Anchorage Calculator — TypeScript Interfaces
// Code Standards: ASCE 7-22 Chapter 13 + ACI 318-19 Chapter 17
// ============================================================================

export interface Project {
  id: string;
  name: string;
  client: string;
  projectNumber: string;
  engineer: string;
  createdAt: string;
  updatedAt: string;
}

export interface Calculation {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'draft' | 'calculated' | 'complete';
  siteParams: SiteParams;
  equipmentProperties: EquipmentProperties;
  anchorageConfig: AnchorageConfig;
  results?: CalculationResults;
}

export interface SiteParams {
  address: string;
  latitude: number;
  longitude: number;
  SDS: number;       // Design spectral acceleration, short period (g)
  SD1: number;       // Design spectral acceleration, 1-second period (g)
  Ss: number;        // Mapped MCE spectral acceleration, short period (g)
  S1: number;        // Mapped MCE spectral acceleration, 1-second period (g)
  siteClass: SiteClass;
  riskCategory: RiskCategory;
  Ip: number;        // Component importance factor: 1.0 (RC I/II/III) or 1.5 (RC IV)
  buildingHeight: number;   // h, total building height (ft)
  attachmentHeight: number; // z, height of equipment attachment (ft)
  seismicDesignCategory: string;

  // ASCE 7-22: Building SFRS info needed for Rμ calculation
  sfrsType: string;          // Building SFRS type from Table 12.2-1
  R_building: number;        // Response modification coefficient of building
  Omega0_building: number;   // Overstrength factor of building
  Ie_building: number;       // Importance factor of building (Table 1.5-2)
  Ta_approx: number | null;  // Approximate fundamental period (s), null if unknown
}

export type SiteClass = 'A' | 'B' | 'BC' | 'C' | 'CD' | 'D' | 'DE' | 'E' | 'F';
export type RiskCategory = 'I' | 'II' | 'III' | 'IV';

export interface EquipmentProperties {
  manufacturer: string;
  modelNumber: string;
  equipmentType: string;
  componentType: string;       // Drives CAR, Rpo, Ω0p from Table 13.6-1

  weight: number;              // Wp (lbs)
  length: number;              // L (inches)
  width: number;               // W (inches)
  height: number;              // H (inches)
  cgHeight: number;            // hcg (inches) - center of gravity height above base

  // ASCE 7-22 component parameters (from Tables 13.5-1 / 13.6-1)
  CAR_atGrade: number;         // Component resonance ductility factor, at/below grade
  CAR_aboveGrade: number;      // Component resonance ductility factor, above grade
  Rpo: number;                 // Component strength factor
  Omega0p: number;             // Component-level anchorage overstrength factor
}

export interface AnchorageConfig {
  anchorType: AnchorType;
  anchorMaterial: AnchorMaterial;
  anchorDiameter: number;     // inches
  embedmentDepth: number;     // hef (inches)
  concreteStrength: number;   // f'c (psi)
  anchorLayout: AnchorLayout;

  // ACI 318-19 Chapter 17 additional parameters
  crackedConcrete?: boolean;   // Default true (conservative) — affects ψc,N, ψc,V, ψc,P
  memberThickness?: number;    // ha (inches) — slab or wall thickness, for ψh,V

  // Manufacturer product reference (optional)
  selectedProduct?: AnchorProductRef;
}

export interface AnchorProductRef {
  productId: string;
  manufacturer: string;
  productLine: string;
  esrNumber: string;
  // Product-specific capacities override generic ACI formulas
  Np_cracked?: number;         // Nominal pullout, cracked concrete (lbs)
  Np_uncracked?: number;       // Nominal pullout, uncracked concrete (lbs)
  tau_cr_cracked?: number;     // Characteristic bond stress, cracked (psi) — adhesive only
  tau_cr_uncracked?: number;   // Characteristic bond stress, uncracked (psi) — adhesive only
  minEdgeDistance?: number;     // Minimum edge distance per ESR (inches)
  minSpacing?: number;         // Minimum spacing per ESR (inches)
  criticalEdgeDistance?: number; // cac for seismic (inches)
}

export type AnchorType = 'cast-in' | 'post-installed-expansion' | 'post-installed-adhesive';
export type AnchorMaterial = 'A307' | 'A36' | 'F1554-36' | 'F1554-55' | 'A193-B7';

export interface AnchorLayout {
  pattern: string;        // e.g., '2x2', '2x3', '3x3', 'custom'
  nLong: number;          // Number of anchors in longitudinal direction
  nTrans: number;         // Number of anchors in transverse direction
  spacing: {
    longitudinal: number; // sx (inches) - center-to-center
    transverse: number;   // sy (inches) - center-to-center
  };
  edgeDistance: {
    ca1: number;          // Critical edge distance (inches)
    ca2: number;          // Perpendicular edge distance (inches)
  };
}

// ============================================================================
// Calculation Results
// ============================================================================

export interface CalculationResults {
  // ASCE 7-22 Seismic Force
  Hf: number;               // Height amplification factor (Section 13.3.1.1)
  Rmu: number;              // Structure ductility reduction factor (Section 13.3.1.2)
  CAR: number;              // Component resonance ductility factor used (at/above grade)
  Rpo: number;              // Component strength factor used

  fpCalculated: number;     // Raw calculated Fp (lbs) — Eq. 13.3-1
  fpMinimum: number;        // Minimum Fp per Eq. 13.3-2 (lbs)
  fpMaximum: number;        // Maximum Fp per Eq. 13.3-3 (lbs)
  fpDesign: number;         // Governing Fp (lbs)

  // Overturning Analysis
  overturnMoment: number;   // M_ot (lb-ft) = Fp × hcg
  resistingMoment1: number; // M_r1 (lb-ft) — Direction 1: force along length
  resistingMoment2: number; // M_r2 (lb-ft) — Direction 2: force along width
  netUpliftMoment1: number; // M_net1 (lb-ft) — Direction 1
  netUpliftMoment2: number; // M_net2 (lb-ft) — Direction 2
  governingDirection: 'longitudinal' | 'transverse';
  upliftOccurs: boolean;

  // Individual Load Case Reactions (before load combinations)
  loadCases: {
    dead: { verticalReaction: number; description: string };       // 0.9D stabilizing
    seismicFp: { horizontalForce: number; description: string };   // Fp design force
    seismicOverturn: { moment: number; description: string };      // M_ot = Fp × hcg
    seismicTensionPerAnchor: number;     // Tu per anchor WITHOUT Ω0p
    seismicShearPerAnchor: number;       // Vu per anchor WITHOUT Ω0p
  };

  // Anchor Demands (with Ω0p overstrength — for capacity checks)
  tuPerAnchor: number;      // Tension demand per anchor (lbs), 0 if no uplift, includes Ω0p
  vuPerAnchor: number;      // Shear demand per anchor (lbs), includes Ω0p

  // Capacity Checks (ACI 318-19 Chapter 17)
  checks: {
    steelTension: CapacityCheck;
    steelShear: CapacityCheck;
    concreteBreakoutTension: CapacityCheck;
    concreteBreakoutShear: CapacityCheck;
    concretePryout: CapacityCheck;
    pullout: CapacityCheck;                    // ACI 318-19 §17.6.3
    sideFaceBlowout: CapacityCheck | null;     // ACI 318-19 §17.6.4 — null if not applicable
    adhesiveBond: CapacityCheck | null;        // ACI 318-19 §17.6.5 — null if not adhesive anchor
    interaction: CapacityCheck;
  };

  // ψ Modification Factors Applied (for PE review transparency)
  psiFactors: {
    // Tension breakout
    psiEdN: number;    // Edge effect — §17.6.2.4
    psiCN: number;     // Cracking — §17.6.2.5
    psiCpN: number;    // Post-installed cracking — §17.6.2.6
    ANcRatio: number;  // ANc/ANco — projected area ratio

    // Shear breakout
    psiEdV: number;    // Edge effect — §17.7.2.4
    psiCV: number;     // Cracking — §17.7.2.5
    psiHV: number;     // Member thickness — §17.7.2.6
    AVcRatio: number;  // AVc/AVco — projected area ratio
  };

  // Engineering Warnings
  warnings: EngineeringWarning[];

  overallStatus: 'PASS' | 'FAIL';
  governingCheck: string;
  maxUtilizationRatio: number;
}

// ============================================================================
// Engineering Warnings
// ============================================================================

export interface EngineeringWarning {
  severity: 'error' | 'warning' | 'info';
  code: string;          // e.g., "W-EDGE-MIN", "E-HEF-MIN"
  message: string;       // Engineer-readable message
  codeRef: string;       // ACI/ASCE section reference
  category: 'input' | 'capacity' | 'layout' | 'seismic';
}

export interface CapacityCheck {
  demand: number;
  capacity: number;
  ratio: number;
  status: 'PASS' | 'FAIL';
  codeRef: string;
}

// ============================================================================
// Equipment Database
// ============================================================================

export interface EquipmentSpec {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  category: 'HVAC' | 'Electrical' | 'Plumbing' | 'Fire Protection' | 'Architectural' | 'Other';
  type: string;
  capacity: string;
  weight_lbs: number;
  length_in: number;
  width_in: number;
  height_in: number;
  cg_height_in: number;
  anchor_spacing_x_in: number;
  anchor_spacing_y_in: number;

  // ASCE 7-22 component parameters
  CAR_atGrade: number;
  CAR_aboveGrade: number;
  Rpo: number;
  Omega0p: number;
  componentType: string;    // Key into Table 13.6-1 / 13.5-1

  notes: string;
  isCustom?: boolean;
}

// ============================================================================
// Constants / Lookup Types
// ============================================================================

export interface AnchorSteelProps {
  diameter: number;      // inches
  diameterLabel: string; // e.g., "3/8"
  Ase: number;           // Effective cross-sectional area (in²)
  futaByMaterial: Record<AnchorMaterial, number>; // futa (psi) by material
}

export interface SFRSType {
  name: string;
  R: number;
  Omega0: number;
  Cd: number;
}

export interface ComponentTypeParams {
  name: string;
  CAR_atGrade: number;
  CAR_aboveGrade: number;
  Rpo: number;
  Omega0p: number;
  category: 'mechanical' | 'electrical' | 'architectural';
}
