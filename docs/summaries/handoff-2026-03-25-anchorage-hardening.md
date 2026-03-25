# Session Handoff — March 25, 2026: Post-Installed Anchor Hardening & White Paper

## What Was Done This Session

### 1. Complete ACI 318-19 Chapter 17 Implementation (commit `33a11b2`)
- **ψ modification factors** now computed (were all hardcoded to 1.0):
  - `ψed,N` — edge effect on tension breakout
  - `ψed,V` — edge effect on shear breakout
  - `ψc,N` / `ψc,V` — cracking factors (cracked/uncracked toggle)
  - `ψh,V` — member thickness factor
  - `ψcp,N` — post-installed cracking factor
- **Three new failure mode checks added**:
  - Pullout (§17.6.3) — uses manufacturer ESR data when available
  - Side-face blowout (§17.6.4) — triggers when hef > 2.5×ca1
  - Adhesive bond (§17.6.5) — uses τcr from manufacturer ESR
- **φ factors corrected**: Post-installed anchors now use φ = 0.65 (Condition B), was incorrectly 0.70
- **Interaction check updated**: Includes all applicable failure modes in governing capacity

### 2. Manufacturer Product Database (commit `33a11b2`)
- New file: `src/lib/anchor-products.ts`
- 7 products from 3 manufacturers with ICC-ES ESR data:
  - Hilti: KB-TZ2 (ESR-1917), HIT-RE 500 V4 (ESR-3814)
  - Simpson Strong-Tie: Strong-Bolt 2 (ESR-3037), SET-3G (ESR-2508), Titen HD (ESR-2713)
  - Powers/DeWalt: Power-Stud+ SD2 (ESR-2502), Pure 110+ (ESR-3298)

### 3. Engineering Warnings System (commit `33a11b2`)
- 12 warning conditions covering input, capacity, layout, and seismic categories
- Displayed in ResultsTab with color-coded severity (error/warning/info)

### 4. Verification Cases VP4-VP7 (commit `ece823f`)
- New file: `src/lib/verification.test.ts` (30 tests)
- VP4: Expansion anchor with edge effects (Sacramento, ψed,N=0.946)
- VP5: Adhesive anchor at grade, SDC E (Hilti HIT-RE 500, τcr=743 psi)
- VP6: Side-face blowout (cast-in, hef=8" > 2.5×ca1=7.5")
- VP7: Close spacing stress test (interaction ratio 0.64)
- VP1-VP3 regression tests confirmed

### 5. UI Updates (commit `0d01c4b`)
- AnchorageTab: cracked/uncracked toggle, member thickness input, product selector
- ResultsTab: warnings banner, ψ factor display, new check names (Pullout, Side-Face Blowout, Adhesive Bond)
- ReportTab: new check labels for PDF
- Fixed `seismicApproach` compatibility (tests need `'known-sfrs'` when SFRS data provided)

### 6. White Paper (commit `f5be00f`)
- `docs/white-paper-calculation-methodology.md` — 756 lines
- Full LaTeX equations, code references, 6 verification cases with hand-calc comparisons
- Accuracy evaluation, conservative bias analysis, bug history

## Current State

### Git
- **Branch**: `master`
- **Latest commit**: `f5be00f` — white paper
- **Remote**: Up to date with `origin/master`
- **All committed work is pushed**

### Uncommitted Changes (from another terminal session)
Two modified files NOT yet committed:
1. **`src/components/calculator/SiteTab.tsx`** — Seismic approach UI (adds approach toggle, SDC exemption display, refactors SFRS dropdown to `SFRS_TYPES_KNOWN`)
2. **`src/lib/constants.ts`** — Adds `tableRef` field to COMPONENT_TYPES, renames `SFRS_TYPES` to `SFRS_TYPES_KNOWN`

One untracked directory:
- **`output/deliverables/seismic-diagnostic.html`** — likely a debugging artifact, can be .gitignored

**Decision needed**: Commit these changes or discard? They appear to be in-progress work on the seismic approach UI (general / known-sfrs / floor-accel toggle).

### Tests & Build
- **127 tests pass** (97 in calculations.test.ts + 30 in verification.test.ts)
- **Build clean** (TypeScript + Vite, no errors)

## Key Files Modified This Session

| File | What Changed |
|------|-------------|
| `src/lib/calculations.ts` | ψ factors, pullout, blowout, bond, warnings, seismicApproach compat |
| `src/lib/types.ts` | AnchorProductRef, crackedConcrete, memberThickness, new checks, warnings, BoltGroupResults |
| `src/lib/constants.ts` | tableRef additions (uncommitted) |
| `src/lib/anchor-products.ts` | **NEW** — manufacturer database |
| `src/lib/calculations.test.ts` | 76→97 tests, bolt group tests, seismicApproach fixes |
| `src/lib/verification.test.ts` | **NEW** — VP4-VP7, 30 tests |
| `src/components/calculator/AnchorageTab.tsx` | Product selector, cracked toggle, thickness, RBG UI |
| `src/components/calculator/ResultsTab.tsx` | Warnings, ψ factors, bolt group results table |
| `src/components/calculator/ReportTab.tsx` | New check labels |
| `docs/white-paper-calculation-methodology.md` | **NEW** — full methodology document |

## Open Items / Next Steps

1. **Commit the uncommitted SiteTab/constants changes** — these appear to be the seismic approach UI work (general/known-sfrs/floor-accel toggle). Review and commit or stash.
2. **Cross-reference verification** — VP4/VP5 could be validated against Hilti PROFIS (free online tool) and FEMA P-2192 examples
3. **ANc/ANco projected area** — Currently 1.0 (conservative). Full group projected area calculation would improve accuracy for edge/group scenarios
4. **Visual verification** — Run the dev server (`npm run dev`) and test the UI end-to-end with VP4-VP7 scenarios
5. **Vercel deployment** — Push to trigger Vercel build if auto-deploy is configured

## Quick Start for Next Session

```bash
cd "C:\Claude Code Projects\Anchorage Calculaton Tool"
git pull                    # Get latest
git status                  # Check for uncommitted work
npx vitest run              # Should show 127 passing
npm run build               # Should build clean
npm run dev                 # Start dev server on localhost:5173
```
