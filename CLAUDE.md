# Seismic Anchorage Calculator

## Project Overview
Professional seismic anchorage calculation tool for structural/MEP engineers in California and Nevada. Implements ASCE 7-22 Chapter 13 (seismic forces on nonstructural components) and ACI 318-19 Chapter 17 (anchor design in concrete).

**This is a life-safety tool. Every formula must match the code text exactly.**

## Tech Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (dark theme: navy/slate with orange accents)
- Wouter (routing), localStorage (persistence)
- No backend — static SPA

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

## File Structure
```
src/lib/calculations.ts    — CORE: All ASCE 7-22 + ACI 318-19 formulas
src/lib/calculations.test.ts — 35 verification tests
src/lib/constants.ts        — Tables 13.5-1, 13.6-1, anchor properties, SFRS
src/lib/equipment-db.ts     — 38 equipment models (22 Trane RTUs + others)
src/lib/types.ts            — TypeScript interfaces
src/lib/usgs-api.ts         — USGS seismic data + geocoding
src/lib/storage.ts          — localStorage wrapper
```

## Commands
- `npm run dev` — Start dev server
- `npm run build` — TypeScript check + Vite production build
- `npm test` — Run Vitest (35 tests)

## Verification
- Always run `npm test` before declaring done
- Always run `npm run build` to check for TypeScript errors
- Cross-reference calculations against FEMA P-2192 examples
- Cross-reference anchor capacity with Simpson Strong-Tie Anchor Designer
