# Verification Problem 4: Post-Installed Expansion Anchor with Edge Distance Effects

## Scenario
- **Equipment**: 1,500 lb dry-type transformer on rooftop
- **Location**: Sacramento, CA (SDS = 1.2, SD1 = 0.72, SDC D)
- **Building**: 60 ft height, z = 60 ft (rooftop), Risk Category II, Ip = 1.0
- **SFRS**: Ordinary reinforced concrete shear wall (R=4, Ω0=2.5)
- **Component**: Dry-type transformer — CAR_above=1.0, Rpo=1.5, Ω0p=2.0
- **Anchor**: 1/2" post-installed expansion, F1554-36 (futa=58 ksi), hef=3.25"
- **Concrete**: f'c = 4,000 psi, cracked, member thickness = 8"
- **Layout**: 2×2 pattern, sx=36", sy=18", ca1=4", ca2=4"

## Purpose
Tests edge distance reduction effects on post-installed expansion anchors:
- ψed,N < 1.0 (tension breakout edge reduction)
- ψed,V < 1.0 (shear breakout edge reduction)
- Condition B φ factors (0.65 for post-installed)
- Warning system for edge proximity

## Hand Calculations

### Step 1: ASCE 7-22 Seismic Force
- Hf = 1 + 2.5×(60/60) = **3.5**
- Rμ = max(1.3, √(1.1×4/(1.0×2.5))) = max(1.3, 1.327) = **1.327**
- CAR = 1.0, Rpo = 1.5
- Fp_calc = 0.4 × 1.2 × 1.0 × 1500 × (3.5/1.327) × (1.0/1.5) = **1,266 lbs**
- Fp_min = 540 lbs, Fp_max = 2,880 lbs
- **Fp_design = 1,266 lbs** (calculated governs)

### Step 2: Overturning
- M_ot = 1,266 × (24/12) = **2,532 lb-ft**
- M_r1 = 0.9 × 1500 × (36/2)/12 = **2,025 lb-ft** (Dir 1)
- M_r2 = 0.9 × 1500 × (24/2)/12 = **1,350 lb-ft** (Dir 2)
- M_net2 = 2,532 - 1,350 = **1,182 lb-ft** (transverse governs)

### Step 3: Anchor Demands (with Ω0p = 2.0)
- **Tu = (1,182/1.5) / 2 × 2.0 = 788 lbs/anchor**
- **Vu = (1,266 × 2.0) / 4 = 633 lbs/anchor**

### Step 4: ACI 318-19 Capacity Checks

| Check | Capacity (lbs) | Demand (lbs) | Ratio | Status |
|-------|---------------|-------------|-------|--------|
| Steel Tension | 6,173 | 788 | 0.128 | PASS |
| Steel Shear | 3,210 | 633 | 0.197 | PASS |
| Concrete Breakout Tension | 3,873 | 788 | 0.204 | PASS |
| Concrete Breakout Shear | 2,132 | 633 | 0.297 | PASS |
| Interaction | 1.0 | 0.262 | 0.262 | PASS |

### ψ Modification Factors Applied
- ψed,N = 0.7 + 0.3×(4/4.875) = **0.946** (ca_min=4" < 1.5×hef=4.875")
- ψc,N = **1.0** (cracked concrete)
- ψed,V = 0.7 + 0.3×(4/6) = **0.9** (ca2=4" < 1.5×ca1=6")
- ψh,V = **1.0** (ha=8" ≥ 1.5×ca1=6")

### Warnings Expected
- W-EDGE-REDUCED: Edge distance reduces breakout capacity
- W-NO-PRODUCT: No manufacturer product selected — verify against ESR

## Result: **PASS** (with edge distance warnings)
## Tolerance: ±2% on intermediate values, ±5% on interaction ratio
