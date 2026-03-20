# Verification Problem 1: Light Equipment with Uplift

## Problem Statement

Design the seismic anchorage for a wall-mounted storage cabinet in a high seismic zone.

## Given Data

### Site Information
- **Location**: San Francisco, CA (High seismic zone)
- **Seismic Parameters** (from USGS):
  - SDS = 1.000g
  - SD1 = 0.600g
- **Risk Category**: II
- **Importance Factor (Ip)**: 1.0

### Building Information
- **Structure Height**: 45 ft (3 stories)
- **Attachment Height**: 10 ft (1st floor)
- **z/h ratio**: 10/45 = 0.222

### Equipment Information
- **Type**: Storage Cabinet (wall-mounted)
- **Weight (Wp)**: 250 lbs
- **Dimensions**: 36" W × 18" D × 72" H
- **Center of Gravity Height (hcg)**: 36 inches = 3.0 ft above base
- **Component Amplification Factor (ap)**: 1.0 (rigid)
- **Component Response Modification Factor (Rp)**: 2.5 (storage cabinets per ASCE 7-16 Table 13.5-1)

### Anchorage Configuration
- **Number of Anchors**: 4 (2×2 pattern)
- **Anchor Spacing**: 
  - Longitudinal (sx): 30 inches = 2.5 ft
  - Transverse (sy): 12 inches = 1.0 ft
- **Anchor Type**: 3/8" diameter expansion anchors
- **Embedment Depth (hef)**: 3.5 inches
- **Concrete Strength (f'c)**: 3000 psi

---

## Hand Calculation

### Step 1: Calculate Seismic Force (Fp)

Per ASCE 7-16 Equation 13.3-1:

**Fp = (0.4 × ap × SDS × Wp) / (Rp / Ip) × (1 + 2 × z/h)**

Substituting values:

Fp = (0.4 × 1.0 × 1.000 × 250) / (2.5 / 1.0) × (1 + 2 × 0.222)

Fp = (100) / (2.5) × (1 + 0.444)

Fp = 40 × 1.444

**Fp = 57.76 lbs**

Check minimum per Equation 13.3-2:

Fp,min = 0.3 × SDS × Ip × Wp = 0.3 × 1.000 × 1.0 × 250 = **75 lbs**

Check maximum per Equation 13.3-3:

Fp,max = 1.6 × SDS × Ip × Wp = 1.6 × 1.000 × 1.0 × 250 = **400 lbs**

**Governing Fp = 75 lbs (minimum controls)**

---

### Step 2: Calculate Overturning Moments

The seismic force acts horizontally at the center of gravity.

**Moment about base in longitudinal direction:**

M_long = Fp × hcg = 75 lbs × 3.0 ft = **225 lb-ft**

**Moment about base in transverse direction:**

M_trans = Fp × hcg = 75 lbs × 3.0 ft = **225 lb-ft**

---

### Step 3: Calculate Anchor Demands

#### Longitudinal Direction (2×2 anchor pattern, sx = 2.5 ft)

**Tension demand per anchor (uplift):**

For a 2×2 pattern, the moment arm from base to anchor centerline = sx/2 = 1.25 ft

Number of anchors resisting tension = 2 (one row)

Tu = M_long / (n × arm) - Wp / (total anchors)

Tu = 225 / (2 × 1.25) - 250/4

Tu = 90 - 62.5

**Tu = 27.5 lbs per anchor**

**Shear demand per anchor:**

Vu = Fp / (total anchors) = 75 / 4 = **18.75 lbs per anchor**

#### Transverse Direction (2×2 anchor pattern, sy = 1.0 ft)

**Tension demand per anchor (uplift):**

Moment arm = sy/2 = 0.5 ft

Number of anchors resisting tension = 2 (one row)

Tu = M_trans / (n × arm) - Wp / (total anchors)

Tu = 225 / (2 × 0.5) - 250/4

Tu = 225 - 62.5

**Tu = 162.5 lbs per anchor**

**Shear demand per anchor:**

Vu = Fp / (total anchors) = 75 / 4 = **18.75 lbs per anchor**

#### Governing Demands (worst case from both directions)

**Maximum Tension Demand: Tu = 162.5 lbs per anchor** (transverse direction governs)

**Maximum Shear Demand: Vu = 18.75 lbs per anchor**

---

### Step 4: Anchor Capacity Checks (ACI 318-19 Chapter 17)

#### Steel Strength in Tension (ACI 318-19 Section 17.6.1)

For 3/8" diameter anchor:
- Effective cross-sectional area (Ase) ≈ 0.08 in²
- Tensile strength (futa) = 58,000 psi (Grade 36 steel)

φNsa = φ × Ase × futa = 0.75 × 0.08 × 58,000 = **3,480 lbs**

**Capacity Ratio: Tu / φNsa = 162.5 / 3480 = 0.047 ✓ PASS**

#### Concrete Breakout Strength in Tension (ACI 318-19 Section 17.6.2)

For single anchor in tension (simplified):

ANc = 9 × hef² = 9 × (3.5)² = 110.25 in²

Ncb = 24 × √f'c × hef^1.5 = 24 × √3000 × (3.5)^1.5 = 24 × 54.77 × 6.55 = **8,610 lbs**

Assuming ψed,N = ψc,N = ψcp,N = 1.0 (conservative)

φNcb = 0.75 × 1.0 × 1.0 × 1.0 × 8,610 = **6,458 lbs**

**Capacity Ratio: Tu / φNcb = 162.5 / 6458 = 0.025 ✓ PASS**

#### Steel Strength in Shear (ACI 318-19 Section 17.7.1)

φVsa = φ × 0.6 × Ase × futa = 0.65 × 0.6 × 0.08 × 58,000 = **1,814 lbs**

**Capacity Ratio: Vu / φVsa = 18.75 / 1814 = 0.010 ✓ PASS**

#### Concrete Breakout Strength in Shear (ACI 318-19 Section 17.7.2)

Assuming ca1 = 6 inches (edge distance)

AVc = 4.5 × ca1² = 4.5 × (6)² = 162 in²

Vcb = 7 × √f'c × ca1^1.5 = 7 × √3000 × (6)^1.5 = 7 × 54.77 × 14.7 = **5,636 lbs**

φVcb = 0.75 × 5,636 = **4,227 lbs**

**Capacity Ratio: Vu / φVcb = 18.75 / 4227 = 0.004 ✓ PASS**

---

## Summary of Hand Calculation Results

| Parameter | Value |
|-----------|-------|
| **Seismic Force (Fp)** | 75 lbs (minimum governs) |
| **Maximum Tension Demand (Tu)** | 162.5 lbs per anchor |
| **Maximum Shear Demand (Vu)** | 18.75 lbs per anchor |
| **Steel Tension Capacity Ratio** | 0.047 (4.7%) |
| **Concrete Breakout Tension Ratio** | 0.025 (2.5%) |
| **Steel Shear Capacity Ratio** | 0.010 (1.0%) |
| **Concrete Breakout Shear Ratio** | 0.004 (0.4%) |
| **Overall Status** | ✅ PASS - All checks satisfied |

---

## Calculator Verification

**Next Step**: Enter these exact parameters into the seismic anchorage calculator and compare results.

**Expected Outcome**: Calculator should produce Fp = 75 lbs, Tu ≈ 162-163 lbs, Vu ≈ 18-19 lbs, with all capacity ratios < 0.05.

**Tolerance**: ±2% acceptable due to rounding differences in intermediate calculations.
