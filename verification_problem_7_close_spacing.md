# Verification Problem 7: Close Spacing, High Seismic RTU

## Scenario
- **Equipment**: 2,000 lb rooftop unit (vibration-isolated) on rooftop
- **Location**: Riverside, CA (SDS = 1.3, SDC D)
- **Building**: 30 ft height, z = 30 ft (rooftop), Risk Category II, Ip = 1.0
- **SFRS**: Wood frame - wood structural panels (R=6.5, Ω0=3)
- **Component**: RTU vibration-isolated — CAR_above=2.2, Rpo=1.3, Ω0p=1.75
- **Anchor**: 1/2" post-installed expansion, F1554-55 (futa=75 ksi), hef=4"
- **Concrete**: f'c = 3,000 psi, cracked
- **Layout**: 2×2 pattern, sx=24", sy=18", ca1=6", ca2=6"

## Purpose
Stress test with high seismic demand and close anchor spacing:
- High CAR=2.2 amplifies Fp significantly
- F1554-55 higher-strength steel
- Concrete breakout governs both tension and shear
- High interaction ratio (near capacity)
- Edge distance at exact threshold (ca_min = 1.5×hef)

## Hand Calculations

### Step 1: ASCE 7-22 Seismic Force
- Hf = 1 + 2.5×(30/30) = **3.5**
- Rμ = max(1.3, √(1.1×6.5/(1.0×3))) = max(1.3, 1.544) = **1.544**
- CAR = **2.2** (above grade, vibration-isolated)
- Rpo = 1.3
- Fp_calc = 0.4 × 1.3 × 1.0 × 2000 × (3.5/1.544) × (2.2/1.3) = **3,990 lbs**
- Fp_max = 1.6 × 1.3 × 1.0 × 2000 = 4,160 lbs
- **Fp_design = 3,990 lbs** (under cap)

### Step 2: Overturning
- M_ot = 3,990 × (21/12) = **6,983 lb-ft**
- M_r1 = 0.9 × 2000 × (48/2)/12 = **3,600 lb-ft**
- M_r2 = 0.9 × 2000 × (36/2)/12 = **2,700 lb-ft**
- M_net1 = 6,983 - 3,600 = 3,383 lb-ft
- M_net2 = 6,983 - 2,700 = **4,283 lb-ft** (transverse governs)

### Step 3: Anchor Demands (with Ω0p = 1.75)
- **Tu = (4,283 / 1.5) / 2 × 1.75 ≈ 2,498 lbs/anchor**
- **Vu = (3,990 × 1.75) / 4 = 1,746 lbs/anchor**

### Step 4: Capacity Checks

| Check | Capacity (lbs) | Demand (lbs) | Ratio | Status |
|-------|---------------|-------------|-------|--------|
| Steel Tension (F1554-55) | 7,982 | 2,498 | 0.313 | PASS |
| Steel Shear (F1554-55) | 4,150 | 1,746 | 0.421 | PASS |
| Conc. Breakout Tension | 4,842 | 2,498 | 0.516 | PASS |
| Conc. Breakout Shear | 3,537 | 1,746 | 0.494 | PASS |
| Interaction | 1.0 | ~0.64 | 0.64 | PASS |

### Key Observations
1. **Concrete breakout governs both T and V** — not steel
2. **F1554-55 steel strength advantage** — futa=75 ksi vs 58 ksi for F1554-36
3. **Edge at threshold**: ca_min=6" = 1.5×hef=6.0" → ψed,N = 1.0 (no reduction)
4. **ψed,V = 0.9**: ca2=6 < 1.5×ca1=9
5. **Interaction ~0.64**: Adequate but not excessive margin

### Warnings Expected
- W-NO-PRODUCT: No manufacturer product selected
- W-BREAKOUT-GOVERNS: Concrete breakout governs over steel

## Result: **PASS** (high utilization but adequate)
## Tolerance: ±5% on interaction ratio (cumulative rounding)
