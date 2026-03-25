# Handoff: ASCE 7-22 Seismic Approach Workflow Upgrade

**Date:** 2026-03-25
**Status:** Complete — ready to commit and push

## What Was Done

### 1. Three-Tier Seismic Approach Selector (SiteTab)
Replaced the flat SFRS dropdown with a radio group offering three approaches:

- **General Case** (DEFAULT) — Unknown building. Forces Hf per Eq. 13.3-5, Rμ = 1.3. No SFRS/period inputs shown.
- **Known SFRS** — Shows SFRS dropdown (14 systems from Table 12.2-1), R/Ω₀/Ie readouts, optional period Tₐ. Rμ calculated per Eq. 13.3-6.
- **Floor Acceleration** — Single Ai input (g) for when structural analysis is available. Fp = Ai × (CAR/Rpo) × Ip × Wp per §13.3.1.1.

### 2. SDC Exemption Badge (§13.1.4)
After USGS lookup, a colored badge shows exemption status:
- Green "EXEMPT" for SDC A (all components) and qualifying SDC B/C conditions
- Red "REQUIRED" for SDC D/E/F and non-exempt B/C cases
- Full Items 1-6 conditional logic implemented in `checkSDCExemption()`

### 3. Ie_building Auto-Population
`Ie_building` now auto-updates from Risk Category selection (same lookup as Ip per Table 1.5-2). Previously hardcoded at 1.0.

### 4. Component Type Optgroup
PropertiesTab dropdown now groups components by Table 13.6-1 (Mechanical/Electrical) vs Table 13.5-1 (Architectural) using `<optgroup>`.

### 5. Approach-Aware Equation Display
EquationBlock.tsx shows which Hf/Rμ equation was used, or shows the Ai formula for floor acceleration.

### 6. Diagnostic Validation Document
`output/deliverables/seismic-diagnostic.html` — Self-contained HTML (open in browser, print to PDF). Contains:
- Complete calculation procedure flowchart
- All ASCE 7-22 equations with KaTeX rendering
- Component and SFRS parameter tables
- SDC exemption decision matrix
- Verified numerical example (General vs Known SFRS)
- Industry reference validation (FEMA P-2192, NIST GCR 18-917-43)
- Program input map (every input traced to UI location)

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Added `SeismicApproach`, `SDCExemptionResult`, `seismicApproach` + `Ai_override` to SiteParams, `tableRef` to ComponentTypeParams |
| `src/lib/constants.ts` | Added `tableRef` to all 17 component types, added `SFRS_TYPES_KNOWN` |
| `src/lib/calculations.ts` | Added `calculateFpFromFloorAccel()`, `checkSDCExemption()`, made `runCalculation()` approach-aware, added seismic warnings |
| `src/lib/calculations.test.ts` | +21 tests (SDC exemption, floor accel, approach-aware runCalculation) |
| `src/hooks/useCalculation.ts` | Added default `seismicApproach: 'general'`, `Ai_override: null` |
| `src/components/calculator/SiteTab.tsx` | Radio group, SDC badge, Ie auto-pop, conditional rendering |
| `src/components/calculator/PropertiesTab.tsx` | `<optgroup>` for component types |
| `src/components/report/EquationBlock.tsx` | Approach-aware equation labels |
| `output/deliverables/seismic-diagnostic.html` | NEW — validation document |

## Uncommitted Changes

Only 2 modified files + 1 new directory remain uncommitted:
- `src/components/calculator/SiteTab.tsx` — UI radio group, SDC badge, Ie fix
- `src/lib/constants.ts` — tableRef additions, SFRS_TYPES_KNOWN
- `output/deliverables/` — diagnostic HTML document

All other changes (types.ts, calculations.ts, tests, EquationBlock, PropertiesTab, useCalculation) were committed in prior sessions.

## Verification

- **127 tests passing** (106 existing + 21 new)
- **Build clean** (tsc + vite)
- Numerical example verified: General Case = 602 lbs, Known SFRS (Special Steel MF) = 330 lbs

## Open Items

- Table values (13.5-1, 13.6-1, 12.2-1) entered from standard — PE should verify against code text
- Only 1 architectural component type implemented (Storage cabinets > 6ft) — expand as needed
- SDC exemption Item 4 (furniture/similar) not implemented — requires subjective classification
