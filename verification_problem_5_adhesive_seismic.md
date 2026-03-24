# Verification Problem 5: Post-Installed Adhesive Anchor in High Seismic

## Scenario
- **Equipment**: 5,000 lb air-cooled chiller at grade level
- **Location**: Los Angeles, CA (SDS = 1.5, SD1 = 0.9, SDC E)
- **Building**: 40 ft height, z = 0 ft (grade level), Risk Category II, Ip = 1.0
- **SFRS**: Unknown
- **Component**: Wet-side HVAC — CAR_atGrade=1.0, Rpo=1.5, Ω0p=2.0
- **Anchor**: 5/8" Hilti HIT-RE 500 V4 adhesive (ESR-3814), F1554-36, hef=5"
- **Concrete**: f'c = 3,000 psi, cracked, member thickness = 12"
- **Layout**: 2×3 pattern, sx=72", sy=36", ca1=12", ca2=12"
- **Bond Stress**: τcr = 743 psi (cracked, from ESR-3814 for f'c ≥ 2500)

## Purpose
Tests adhesive anchor behavior:
- Fp minimum governs at grade level
- No uplift condition (heavy equipment, low CG)
- Adhesive bond check with manufacturer τcr data
- Seismic warning for adhesive in SDC D/E/F
- Shear-only interaction

## Hand Calculations

### Step 1: ASCE 7-22 Seismic Force (at grade, z=0)
- Hf = **1.0** (at grade)
- Rμ = **1.0** (at grade)
- CAR = **1.0** (at grade value)
- Fp_calc = 0.4 × 1.5 × 1.0 × 5000 × (1.0/1.0) × (1.0/1.5) = **2,000 lbs**
- Fp_min = 0.3 × 1.5 × 1.0 × 5000 = **2,250 lbs**
- **Fp_design = 2,250 lbs** (minimum governs!)

### Step 2: Overturning
- M_ot = 2,250 × (30/12) = **5,625 lb-ft**
- M_r1 = 0.9 × 5000 × (72/2)/12 = **13,500 lb-ft**
- M_r2 = 0.9 × 5000 × (48/2)/12 = **9,000 lb-ft**
- **NO UPLIFT** — resisting moments exceed overturning in both directions

### Step 3: Anchor Demands
- **Tu = 0 lbs** (no uplift)
- **Vu = (2,250 × 2.0) / 6 = 750 lbs/anchor**

### Step 4: Key Capacity Checks

| Check | Capacity (lbs) | Demand (lbs) | Ratio | Status |
|-------|---------------|-------------|-------|--------|
| Steel Shear | 5,124 | 750 | 0.146 | PASS |
| Adhesive Bond | 4,742 | 0 | 0.000 | PASS |
| Interaction (shear only) | 1.0 | 0.039 | 0.039 | PASS |

### Adhesive Bond Calculation
- Na0 = τcr × π × da × hef = 743 × π × 0.625 × 5 = **7,295 lbs**
- cNa = 10 × 0.625 × √(743/1100) = **5.14"**
- ψed,Na = 1.0 (ca_min=12 > cNa=5.14)
- φNa = 0.65 × 7,295 = **4,742 lbs**

### Warnings Expected
- W-SDC-D-ADHESIVE: Adhesive anchor in SDC E requires ACI 355.4 qualification

## Result: **PASS** (with seismic adhesive qualification warning)
## Tolerance: ±2%
