/** 2D point in SVG coordinate space */
export interface Point2D {
  x: number
  y: number
}

/** Cardinal orientation for supports, arrows, etc. */
export type Orientation = 'top' | 'right' | 'bottom' | 'left'

/**
 * PESE load arrow color palette — each color communicates
 * a specific load type at a glance.
 */
export const LOAD_ARROW_COLORS = {
  gravity: '#000000',     // Dead loads (black)
  demand: '#dc2626',      // Seismic/lateral demand (red)
  compression: '#2563eb', // Compression forces (blue)
  tension: '#16a34a',     // Tension/uplift (green)
  reaction: '#b45309',    // Bearing reactions (amber)
  moment: '#9333ea',      // Moments/overturning (purple)
} as const

export type LoadColor = keyof typeof LOAD_ARROW_COLORS

/**
 * Drawing-element color palette — line weights and annotation colors
 * that are not load-specific.
 */
export const DRAWING_COLORS = {
  dimension: '#6b7280',
  object: '#1e293b',
  hidden: '#9ca3af',
  centerline: '#6b7280',
  section: '#9333ea',
} as const
