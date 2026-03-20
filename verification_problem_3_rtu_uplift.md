# Verification Problem 3: Heavy Rooftop Unit with Uplift

## Problem Statement

Design the seismic anchorage for a large rooftop HVAC unit (RTU) on a tall building in a very high seismic zone.

## Given Data

### Site Information
- **Location**: Los Angeles, CA (Near fault)
- **Seismic Parameters** (from USGS):
  - SDS = 1.500g (very high seismic zone)
  - SD1 = 0.900g
- **Risk Category**: III (Essential facility - hospital)
- **Importance Factor (Ip)**: 1.5

### Building Information
- **Structure Height**: 120 ft (8 stories)
- **Attachment Height**: 120 ft (rooftop)
- **z/h ratio**: 120/120 = 1.0 (at roof level)

### Equipment Information
- **Type**: Rooftop HVAC Unit (RTU)
- **Weight (Wp)**: 3,500 lbs
- **Dimensions**: 120" L × 60" W × 84" H
- **Center of Gravity Height (hcg)**: 42 inches = 3.5 ft above base
- **Component Amplification Factor (ap)**: 2.5 (flexible-mounted equipment)
- **Component Response Modification Factor (Rp)**: 2.5 (mechanical equipment per ASCE 7-16 Table 13.5-1)

### Anchorage Configuration
- **Number of Anchors**: 4 (2×2 pattern at corners)
- **Anchor Spacing**: 
  - Longitudinal (sx): 120 inches = 10.0 ft
  - Transverse (sy): 60 inches = 5.0 ft
- **Anchor Type**: 5/8" diameter post-installed expansion anchors
- **Embedment Depth (hef)**: 5 inches
- **Concrete Strength (f'c)**: 3500 psi

---

## Hand Calculation

### Step 1: Calculate Seismic Force (Fp)

Per ASCE 7-16 Equation 13.3-1:

**Fp = (0.4 × ap × SDS × Wp) / (Rp / Ip) × (1 + 2 × z/h)**

Substituting values:

Fp = (0.4 × 2.5 × 1.500 × 3500) / (2.5 / 1.5) × (1 + 2 × 1.0)

Fp = (5250) / (1.667) × (1 + 2.0)

Fp = 3,150 × 3.0

**Fp = 9,450 lbs**

Check minimum per Equation 13.3-2:

Fp,min = 0.3 × SDS × Ip × Wp = 0.3 × 1.500 × 1.5 × 3500 = **2,362.5 lbs**

Check maximum per Equation 13.3-3:

Fp,max = 1.6 × SDS × Ip × Wp = 1.6 × 1.500 × 1.5 × 3500 = **12,600 lbs**

**Governing Fp = 9,450 lbs** (calculated value within min/max range)

---

### Step 2: Calculate Overturning Moments

The seismic force acts horizontally at the center of gravity.

**Moment about base in longitudinal direction:**

M_long = Fp × hcg = 9450 lbs × 3.5 ft = **33,075 lb-ft**

**Moment about base in transverse direction:**

M_trans = Fp × hcg = 9450 lbs × 3.5 ft = **33,075 lb-ft**

---

### Step 3: Calculate Anchor Demands

#### Longitudinal Direction (2×2 anchor pattern, sx = 10.0 ft)

**Tension demand per anchor:**

For a 2×2 pattern, the moment arm from base to anchor centerline = sx/2 = 5.0 ft

Number of anchors resisting tension = 2 (one row)

Resisting moment from weight = Wp × (sx/2) = 3500 × 5.0 = 17,500 lb-ft

Overturning moment (33,075 lb-ft) > Resisting moment (17,500 lb-ft)

**Net overturning moment = 33,075 - 17,500 = 15,575 lb-ft**

Tension per anchor = Net moment / (n × arm) = 15,575 / (2 × 5.0) = **1,557.5 lbs per anchor**

**Shear demand per anchor:**

Vu = Fp / (total anchors) = 9450 / 4 = **2,362.5 lbs per anchor**

#### Transverse Direction (2×2 anchor pattern, sy = 5.0 ft)

**Tension demand per anchor:**

Moment arm = sy/2 = 2.5 ft

Resisting moment from weight = Wp × (sy/2) = 3500 × 2.5 = 8,750 lb-ft

Overturning moment (33,075 lb-ft) > Resisting moment (8,750 lb-ft)

**Net overturning moment = 33,075 - 8,750 = 24,325 lb-ft**

Tension per anchor = Net moment / (n × arm) = 24,325 / (2 × 2.5) = **4,865 lbs per anchor**

**Shear demand per anchor:**

Vu = Fp / (total anchors) = 9450 / 4 = **2,362.5 lbs per anchor**

#### Governing Demands (worst case from both directions)

**Maximum Tension Demand: Tu = 4,865 lbs per anchor** (transverse direction governs)

**Maximum Shear Demand: Vu = 2,362.5 lbs per anchor**

---

### Step 4: Anchor Capacity Checks (ACI 318-19 Chapter 17)

#### Steel Strength in Tension (ACI 318-19 Section 17.6.1)

For 5/8" diameter anchor:
- Effective cross-sectional area (Ase) ≈ 0.226 in²
- Tensile strength (futa) = 58,000 psi (Grade 36 steel)

φNsa = φ × Ase × futa = 0.75 × 0.226 × 58,000 = **9,831 lbs**

**Capacity Ratio: Tu / φNsa = 4865 / 9831 = 0.495 ✓ PASS** (49.5% utilization)

#### Concrete Breakout Strength in Tension (ACI 318-19 Section 17.6.2)

For single anchor in tension:

ANc = 9 × hef² = 9 × (5)² = 225 in²

Ncb = 24 × √f'c × hef^1.5 = 24 × √3500 × (5)^1.5 = 24 × 59.16 × 11.18 = **15,876 lbs**

Assuming ψed,N = ψc,N = ψcp,N = 1.0 (conservative)

φNcb = 0.75 × 1.0 × 1.0 × 1.0 × 15,876 = **11,907 lbs**

**Capacity Ratio: Tu / φNcb = 4865 / 11907 = 0.409 ✓ PASS** (40.9% utilization)

#### Steel Strength in Shear (ACI 318-19 Section 17.7.1)

φVsa = φ × 0.6 × Ase × futa = 0.65 × 0.6 × 0.226 × 58,000 = **5,119 lbs**

**Capacity Ratio: Vu / φVsa = 2362.5 / 5119 = 0.462 ✓ PASS** (46.2% utilization)

#### Concrete Breakout Strength in Shear (ACI 318-19 Section 17.7.2)

Assuming ca1 = 10 inches (edge distance)

AVc = 4.5 × ca1² = 4.5 × (10)² = 450 in²

Vcb = 7 × √f'c × ca1^1.5 = 7 × √3500 × (10)^1.5 = 7 × 59.16 × 31.62 = **13,097 lbs**

φVcb = 0.75 × 13,097 = **9,823 lbs**

**Capacity Ratio: Vu / φVcb = 2362.5 / 9823 = 0.241 ✓ PASS** (24.1% utilization)

#### Concrete Pryout Strength in Shear (ACI 318-19 Section 17.7.3)

Vcp = kcp × Ncb = 2.0 × 15,876 = **31,752 lbs**

φVcp = 0.75 × 31,752 = **23,814 lbs**

**Capacity Ratio: Vu / φVcp = 2362.5 / 23814 = 0.099 ✓ PASS** (9.9% utilization)

#### Interaction Check (Tension + Shear Combined)

Per ACI 318-19 Section 17.8, when both tension and shear are present:

**(Tu / φNn)^(5/3) + (Vu / φVn)^(5/3) ≤ 1.0**

Using governing capacities (steel tension and steel shear):

(4865 / 9831)^(5/3) + (2362.5 / 5119)^(5/3)

= (0.495)^(5/3) + (0.462)^(5/3)

= 0.343 + 0.297

= **0.640 ≤ 1.0 ✓ PASS**

---

## Summary of Hand Calculation Results

| Parameter | Value |
|-----------|-------|
| **Seismic Force (Fp)** | 9,450 lbs |
| **Maximum Tension Demand (Tu)** | 4,865 lbs per anchor |
| **Maximum Shear Demand (Vu)** | 2,362.5 lbs per anchor |
| **Steel Tension Capacity Ratio** | 0.495 (49.5%) |
| **Concrete Breakout Tension Ratio** | 0.409 (40.9%) |
| **Steel Shear Capacity Ratio** | 0.462 (46.2%) |
| **Concrete Breakout Shear Ratio** | 0.241 (24.1%) |
| **Concrete Pryout Shear Ratio** | 0.099 (9.9%) |
| **Tension-Shear Interaction Ratio** | 0.640 (64.0%) |
| **Overall Status** | ✅ PASS - All checks satisfied |

---

## Key Observations

1. **Significant Uplift**: This scenario demonstrates substantial tension demand (4,865 lbs per anchor) due to:
   - Very high seismic force (9,450 lbs)
   - Rooftop location (z/h = 1.0) amplifies force by 3×
   - High importance factor (Ip = 1.5) for essential facility
   - Flexible mounting (ap = 2.5) increases force

2. **High Utilization**: Capacity ratios approach 50%, indicating efficient design. Steel strength governs for both tension and shear.

3. **Interaction Check**: The combined tension-shear interaction ratio (0.640) is well below 1.0, confirming adequate capacity under combined loading.

4. **Critical Design**: This represents a realistic "worst-case" scenario that properly challenges the anchorage system.

---

## Calculator Verification

**Next Step**: Enter these exact parameters into the seismic anchorage calculator and compare results.

**Expected Outcome**: 
- Fp = 9,450 lbs
- Tu ≈ 4,865 lbs per anchor
- Vu ≈ 2,363 lbs per anchor
- Steel tension ratio ≈ 0.49-0.50
- Steel shear ratio ≈ 0.46
- Interaction ratio ≈ 0.64

**Tolerance**: ±2% acceptable due to rounding differences in intermediate calculations.

**Critical Checks**: 
1. Verify calculator correctly handles z/h = 1.0 (rooftop amplification factor of 3.0)
2. Verify calculator applies Ip = 1.5 correctly
3. Verify calculator computes interaction equation correctly
4. Confirm significant uplift is detected and calculated properly
