/**
 * Engineering format helpers for SVG labels and annotations.
 *
 * All functions accept raw numeric values in the units indicated
 * by their name and return a human-readable string suitable for
 * use in drawing labels.
 */

const DASH = '\u2014' // em-dash for invalid values

function commaFmt(n: number): string {
  return n.toLocaleString('en-US')
}

function isInvalid(n: number): boolean {
  return !Number.isFinite(n)
}

/**
 * Format a force value given in **pounds**.
 * - >= 10 000 lbs  → "X.X k"
 * - < 10 000 lbs   → "X,XXX lbs"
 */
export function fmtForce(lbs: number): string {
  if (isInvalid(lbs)) return DASH
  const abs = Math.abs(lbs)
  if (abs >= 10_000) {
    return `${(lbs / 1000).toFixed(1)} k`
  }
  return `${commaFmt(Math.round(lbs))} lbs`
}

/**
 * Format a moment value given in **lb-ft**.
 * - >= 10 000 lb-ft → "X.X k-ft"
 * - < 10 000 lb-ft  → "X,XXX lb-ft"
 */
export function fmtMoment(lbft: number): string {
  if (isInvalid(lbft)) return DASH
  const abs = Math.abs(lbft)
  if (abs >= 10_000) {
    return `${(lbft / 1000).toFixed(1)} k-ft`
  }
  return `${commaFmt(Math.round(lbft))} lb-ft`
}

/**
 * Format a length given in **inches** as feet-inches (X'-Y").
 */
export function fmtLength(inches: number): string {
  if (isInvalid(inches)) return DASH
  const totalInches = Math.abs(inches)
  const feet = Math.floor(totalInches / 12)
  const remainInches = totalInches % 12
  const sign = inches < 0 ? '-' : ''

  // Avoid floating-point noise — round remaining inches to 1 decimal
  const rem = Math.round(remainInches * 10) / 10

  if (feet === 0) {
    return `${sign}${rem}"`
  }
  if (rem === 0) {
    return `${sign}${feet}'-0"`
  }
  return `${sign}${feet}'-${rem}"`
}

/**
 * Format a pressure value given in **psi**.
 */
export function fmtPressure(psi: number): string {
  if (isInvalid(psi)) return DASH
  return `${commaFmt(Math.round(psi))} psi`
}

/**
 * Format a dimensionless ratio to 3 decimal places (e.g. DCR).
 */
export function fmtRatio(ratio: number): string {
  if (isInvalid(ratio)) return DASH
  return ratio.toFixed(3)
}

/**
 * Format a ratio as a percentage with 1 decimal place.
 */
export function fmtPercent(ratio: number): string {
  if (isInvalid(ratio)) return DASH
  return `${(ratio * 100).toFixed(1)}%`
}
