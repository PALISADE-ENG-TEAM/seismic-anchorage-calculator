# Verification Problem 6: Side-Face Blowout Condition

## Scenario
- **Equipment**: 800 lb motor control center, wall-mounted
- **Location**: San Francisco, CA (SDS = 1.0, SDC D)
- **Building**: 45 ft height, z = 10 ft, Risk Category II, Ip = 1.0
- **SFRS**: Unknown
- **Component**: Motor control centers — CAR_above=1.4, Rpo=2.0, Ω0p=2.0
- **Anchor**: 3/4" cast-in headed, A36 (futa=58 ksi), hef=8"
- **Concrete**: f'c = 4,000 psi, cracked
- **Layout**: 2×2 pattern, sx=24", sy=12", ca1=3", ca2=8"
- **CRITICAL**: hef=8" > 2.5×ca1=7.5" → Side-face blowout applies!
- **Bearing Area**: Abrg = 0.75 in² (typical for 3/4" headed stud)

## Purpose
Tests the side-face blowout failure mode:
- Deep embedment near edge triggers §17.6.4
- Severe edge distance reduction on breakout tension (ψed,N = 0.775)
- Cast-in anchor φ factors (0.70)
- Multiple warnings for edge proximity

## Hand Calculations

### Step 1: ASCE 7-22 Seismic Force
- Hf = 1 + 2.5×(10/45) = **1.556**
- Rμ = **1.3** (SFRS unknown)
- CAR = 1.4, Rpo = 2.0
- Fp_calc = 0.4 × 1.0 × 1.0 × 800 × (1.556/1.3) × (1.4/2.0) = **268 lbs**
- **Fp_design = 268 lbs** (calculated governs, above Fp_min=240)

### Step 2: Overturning
- M_ot = 268 × (24/12) = **536 lb-ft**
- M_r1 = 0.9 × 800 × (24/2)/12 = **720 lb-ft** (no uplift Dir 1)
- M_r2 = 0.9 × 800 × (12/2)/12 = **360 lb-ft**
- M_net2 = 536 - 360 = **176 lb-ft** (transverse governs)

### Step 3: Anchor Demands
- **Tu = (176/1.0) / 2 × 2.0 = 176 lbs/anchor**
- **Vu = (268 × 2.0) / 4 = 134 lbs/anchor**

### Step 4: Side-Face Blowout Check
- hef = 8" > 2.5 × ca1 = 7.5" → **APPLIES**
- Nsb = 13 × 3 × √0.75 × 1.0 × √4000 = 13 × 3 × 0.866 × 63.25 = **2,136 lbs**
- φNsb = 0.70 × 2,136 = **1,495 lbs**
- Tu/φNsb = 176/1,495 = **0.118** → PASS

### ψ Modification Factors
- ψed,N = 0.7 + 0.3×(3/12) = **0.775** (severe edge reduction)
- ψed,V = 0.7 + 0.3×(8/4.5) = not limited (ca2=8 > 1.5×ca1=4.5)

### Warnings Expected
- W-SIDE-BLOWOUT: Deep embedment near edge
- W-EDGE-REDUCED: Edge distance reduces breakout capacity

## Result: **PASS** (with side-face blowout and edge warnings)
## Tolerance: ±2%
