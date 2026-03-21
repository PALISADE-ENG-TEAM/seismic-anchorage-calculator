# Seismic Anchorage Calculator

## Project Overview
Professional seismic anchorage calculation tool for structural/MEP engineers in California and Nevada. Implements ASCE 7-22 Chapter 13 (seismic forces on nonstructural components) and ACI 318-19 Chapter 17 (anchor design in concrete).

**This is a life-safety tool. Every formula must match the code text exactly.**

## Tech Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (PESE light theme: white cards, navy #1e3a5f, blue #2563eb accent)
- Wouter (routing), localStorage (persistence), KaTeX (equations)
- No backend — static SPA, deployed on Vercel

## Code Standards
- **ASCE 7-22** (not 7-16) for seismic force equations
- **ACI 318-19** Chapter 17 for anchor capacity checks
- Verification methodology: 0.9W dead load factor + Ω0p overstrength per master prompt

## Key ASCE 7-22 Equations
- **Fp** = 0.4 × SDS × Ip × Wp × (Hf/Rμ) × (CAR/Rpo) — Eq. 13.3-1
- **Fp_min** = 0.3 × SDS × Ip × Wp — Eq. 13.3-2
- **Fp_max** = 1.6 × SDS × Ip × Wp — Eq. 13.3-3
- **Hf** = height amplification (replaces 1+2z/h)
- **Rμ** = structure ductility reduction (new in 7-22)
- **CAR/Rpo/Ω0p** = per-component from Tables 13.5-1 and 13.6-1

## Critical Bugs to Avoid
1. **DO NOT swap resisting moment arms** — Direction 1 (force along length) uses L/2, Direction 2 uses W/2
2. **Ω0p is per-component** — Not a blanket 2.0. Values from Tables 13.5-1/13.6-1
3. **Rμ requires building SFRS info** — Default to 1.3 if unknown
4. **CAR has two columns** — "at/below grade" vs "above grade" based on z
5. **All dimensions in inches, moments in lb-ft** — Convert explicitly

## File Structure (38 source files)
```
src/lib/
  calculations.ts          — CORE: All ASCE 7-22 + ACI 318-19 formulas
  calculations.test.ts     — 35 verification tests
  constants.ts             — Tables 13.5-1, 13.6-1, anchor properties, SFRS
  equipment-db.ts          — 38 equipment models (22 Trane RTUs + others)
  types.ts                 — TypeScript interfaces
  usgs-api.ts              — USGS seismic data + geocoding
  storage.ts               — localStorage wrapper
  svg/                     — Drawing primitives library (ported from PESE structural calc)
    DimensionLine.tsx, LoadArrow.tsx, SupportSymbol.tsx, SharedMarkerDefs.tsx
    hatching-patterns.tsx, format-helpers.ts, types.ts, index.ts

src/components/
  calculator/              — Tab components (SiteTab, PropertiesTab, AnchorageTab, ResultsTab, ReportTab)
    AddressAutocomplete.tsx — Debounced Nominatim address search
    EquipmentSearchDialog.tsx — 38-model equipment database search
  diagrams/                — SVG engineering diagrams
    BuildingDiagram.tsx, EquipmentDiagram.tsx, AnchorDiagram.tsx
    EquipmentFBD.tsx        — Free body diagram with color-coded forces
    AnchorDetailDiagram.tsx — Enhanced anchor plan view
  report/                  — KaTeX equation components
    ReportEquation.tsx      — "Show your work" Breyer-style renderer
    EquationBlock.tsx       — All 7 ASCE 7-22 + ACI 318-19 derivations

src/pages/                 — Dashboard, ProjectView, CalculationDetail (5-tab)
src/hooks/                 — useProjects, useCalculation, useCalculationDetail
```

## Quick Start (new machine)
```bash
git clone https://github.com/palisadeengineering/seismic-anchorage-calculator.git
cd seismic-anchorage-calculator
npm install
npm test          # 35 tests should pass
npm run build     # Should compile clean
npm run dev       # localhost:5173
```

## Commands
- `npm run dev` — Start dev server
- `npm run build` — TypeScript check + Vite production build
- `npm test` — Run Vitest (35 tests)

## Verification Protocol — MANDATORY

### Before declaring any work "done" — DO NOT ASK, JUST DO:

1. **Run tests**: `npm test` — all tests must pass. Run automatically. Never ask the user.
2. **Run build**: `npm run build` — must compile clean. Run automatically. Never ask the user.
3. **Visual verification with browser** (Playwright):
   - Start dev server (`npm run dev`)
   - Navigate to affected pages
   - Take screenshots — verify text readable, inputs functional, diagrams render
   - Test full workflow: create project → create calc → fill tabs → calculate → check results
4. **Always commit and push** when done — don't leave changes uncommitted.

### Cross-reference checks:
- Cross-reference calculations against FEMA P-2192 examples
- Cross-reference anchor capacity with Simpson Strong-Tie Anchor Designer

### Common Mistakes — DON'T REPEAT
1. Don't declare done without visual verification — build passing ≠ working
2. Don't ask the user if you should run tests — JUST RUN THEM
3. Always commit and push when done — user expects work persisted to remote
