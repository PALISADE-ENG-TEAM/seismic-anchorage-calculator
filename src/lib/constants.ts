// ============================================================================
// Seismic Anchorage Calculator — Lookup Tables & Constants
// Code Standards: ASCE 7-22 Chapter 13 + ACI 318-19 Chapter 17
// ============================================================================

import type {
  AnchorSteelProps,
  AnchorMaterial,
  SFRSType,
  ComponentTypeParams,
} from './types.ts';
import type { RiskCategory } from './types.ts';

// ============================================================================
// 1. Component Types — ASCE 7-22 Tables 13.5-1 & 13.6-1
// ============================================================================

export const COMPONENT_TYPES = [
  {
    name: 'Air-side HVAC (fans, AHUs, ductwork)',
    CAR_atGrade: 1.4,
    CAR_aboveGrade: 1.4,
    Rpo: 2,
    Omega0p: 2,
    category: 'mechanical',
  },
  {
    name: 'Wet-side HVAC (boilers, chillers, cooling towers)',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'mechanical',
  },
  {
    name: 'Generators',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'electrical',
  },
  {
    name: 'Transformers (dry-type)',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'electrical',
  },
  {
    name: 'Transformers (liquid-filled)',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'electrical',
  },
  {
    name: 'Motor control centers, switchgear',
    CAR_atGrade: 1.4,
    CAR_aboveGrade: 1.4,
    Rpo: 2,
    Omega0p: 2,
    category: 'electrical',
  },
  {
    name: 'Battery racks',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'electrical',
  },
  {
    name: 'UPS systems',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'electrical',
  },
  {
    name: 'Vibration-isolated equipment (spring/neoprene)',
    CAR_atGrade: 1.8,
    CAR_aboveGrade: 2.2,
    Rpo: 1.3,
    Omega0p: 1.75,
    category: 'mechanical',
  },
  {
    name: 'Storage cabinets > 6ft',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'architectural',
  },
  {
    name: 'Piping - high deformability',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1.4,
    Rpo: 3.5,
    Omega0p: 1.5,
    category: 'mechanical',
  },
  {
    name: 'Piping - limited deformability',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1.4,
    Rpo: 2.5,
    Omega0p: 1.75,
    category: 'mechanical',
  },
  {
    name: 'Piping - low deformability',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1.4,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'mechanical',
  },
  {
    name: 'Pressure vessels',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'mechanical',
  },
  {
    name: 'Fire protection piping',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1.4,
    Rpo: 3.5,
    Omega0p: 1.5,
    category: 'mechanical',
  },
  {
    name: 'Rooftop unit (RTU) - rigid',
    CAR_atGrade: 1,
    CAR_aboveGrade: 1,
    Rpo: 1.5,
    Omega0p: 2,
    category: 'mechanical',
  },
  {
    name: 'Rooftop unit (RTU) - vibration-isolated',
    CAR_atGrade: 1.8,
    CAR_aboveGrade: 2.2,
    Rpo: 1.3,
    Omega0p: 1.75,
    category: 'mechanical',
  },
] as const satisfies readonly ComponentTypeParams[];

// ============================================================================
// 2. Anchor Steel Properties — Per ASTM Standards
// ============================================================================

export const ANCHOR_STEEL_PROPERTIES = [
  {
    diameter: 0.375,
    diameterLabel: '3/8',
    Ase: 0.0775,
    futaByMaterial: { 'A307': 58_000, 'A36': 58_000, 'F1554-36': 58_000, 'F1554-55': 75_000, 'A193-B7': 125_000 },
  },
  {
    diameter: 0.500,
    diameterLabel: '1/2',
    Ase: 0.1419,
    futaByMaterial: { 'A307': 58_000, 'A36': 58_000, 'F1554-36': 58_000, 'F1554-55': 75_000, 'A193-B7': 125_000 },
  },
  {
    diameter: 0.625,
    diameterLabel: '5/8',
    Ase: 0.2260,
    futaByMaterial: { 'A307': 58_000, 'A36': 58_000, 'F1554-36': 58_000, 'F1554-55': 75_000, 'A193-B7': 125_000 },
  },
  {
    diameter: 0.750,
    diameterLabel: '3/4',
    Ase: 0.3340,
    futaByMaterial: { 'A307': 58_000, 'A36': 58_000, 'F1554-36': 58_000, 'F1554-55': 75_000, 'A193-B7': 125_000 },
  },
  {
    diameter: 0.875,
    diameterLabel: '7/8',
    Ase: 0.4620,
    futaByMaterial: { 'A307': 58_000, 'A36': 58_000, 'F1554-36': 58_000, 'F1554-55': 75_000, 'A193-B7': 125_000 },
  },
  {
    diameter: 1.000,
    diameterLabel: '1',
    Ase: 0.6060,
    futaByMaterial: { 'A307': 58_000, 'A36': 58_000, 'F1554-36': 58_000, 'F1554-55': 75_000, 'A193-B7': 125_000 },
  },
  {
    diameter: 1.125,
    diameterLabel: '1-1/8',
    Ase: 0.7630,
    futaByMaterial: { 'A307': 58_000, 'A36': 58_000, 'F1554-36': 58_000, 'F1554-55': 75_000, 'A193-B7': 125_000 },
  },
  {
    diameter: 1.250,
    diameterLabel: '1-1/4',
    Ase: 0.9690,
    futaByMaterial: { 'A307': 58_000, 'A36': 58_000, 'F1554-36': 58_000, 'F1554-55': 75_000, 'A193-B7': 125_000 },
  },
] as const satisfies readonly AnchorSteelProps[];

// ============================================================================
// 3. SFRS Types — ASCE 7-22 Table 12.2-1
// ============================================================================

export const SFRS_TYPES = [
  { name: 'Special steel moment frame', R: 8, Omega0: 3, Cd: 5.5 },
  { name: 'Intermediate steel moment frame', R: 4.5, Omega0: 3, Cd: 4 },
  { name: 'Ordinary steel moment frame', R: 3.5, Omega0: 3, Cd: 3 },
  { name: 'Special reinforced concrete moment frame', R: 8, Omega0: 3, Cd: 5.5 },
  { name: 'Intermediate reinforced concrete moment frame', R: 5, Omega0: 3, Cd: 4.5 },
  { name: 'Ordinary reinforced concrete moment frame', R: 3, Omega0: 3, Cd: 2.5 },
  { name: 'Special reinforced concrete shear wall', R: 5, Omega0: 2.5, Cd: 5 },
  { name: 'Ordinary reinforced concrete shear wall', R: 4, Omega0: 2.5, Cd: 4 },
  { name: 'Special reinforced masonry shear wall', R: 5.5, Omega0: 2.5, Cd: 4 },
  { name: 'Ordinary reinforced masonry shear wall', R: 2, Omega0: 2.5, Cd: 1.75 },
  { name: 'Steel concentrically braced frame', R: 6, Omega0: 2, Cd: 5 },
  { name: 'Steel eccentrically braced frame', R: 8, Omega0: 2, Cd: 4 },
  { name: 'Wood frame - wood structural panels', R: 6.5, Omega0: 3, Cd: 4 },
  { name: 'Light-frame cold-formed steel - wood structural panels', R: 6.5, Omega0: 3, Cd: 4 },
  { name: 'Unknown / Not specified', R: 1.3, Omega0: 1, Cd: 1 },
] as const satisfies readonly SFRSType[];

// ============================================================================
// 4. Importance Factors — ASCE 7-22 Table 13.3-1
// ============================================================================

export const IMPORTANCE_FACTORS: Record<RiskCategory, number> = {
  I: 1.0,
  II: 1.0,
  III: 1.0,
  IV: 1.5,
} as const satisfies Record<RiskCategory, number>;

// ============================================================================
// 5. Common Concrete Strengths (psi)
// ============================================================================

export const CONCRETE_STRENGTHS = [
  3000, 3500, 4000, 4500, 5000, 6000,
] as const satisfies readonly number[];

// ============================================================================
// 6. Available Anchor Diameters (inches)
// ============================================================================

export const ANCHOR_DIAMETERS = [
  0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.125, 1.25,
] as const satisfies readonly number[];

// ============================================================================
// 7. Helper Functions
// ============================================================================

/**
 * Look up anchor steel properties by nominal diameter.
 */
export function getAnchorProps(diameter: number): AnchorSteelProps | undefined {
  return ANCHOR_STEEL_PROPERTIES.find((a) => a.diameter === diameter);
}

/**
 * Get the ultimate tensile strength (futa) for a given diameter and material.
 * Returns 0 if the diameter is not found.
 */
export function getFuta(diameter: number, material: AnchorMaterial): number {
  const props = getAnchorProps(diameter);
  if (!props) return 0;
  return props.futaByMaterial[material];
}

/**
 * Look up component seismic parameters by name (case-insensitive).
 */
export function getComponentParams(name: string): ComponentTypeParams | undefined {
  const lower = name.toLowerCase();
  return COMPONENT_TYPES.find((c) => c.name.toLowerCase() === lower);
}

/**
 * Look up SFRS properties by system name (case-insensitive).
 */
export function getSFRS(name: string): SFRSType | undefined {
  const lower = name.toLowerCase();
  return SFRS_TYPES.find((s) => s.name.toLowerCase() === lower);
}
