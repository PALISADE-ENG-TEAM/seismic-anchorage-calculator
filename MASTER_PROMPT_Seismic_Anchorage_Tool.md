# MASTER PROMPT: Build a Professional Seismic Anchorage Calculation Tool

## Overview

Build a **production-grade, professional seismic anchorage calculation web application** for structural and MEP engineers in California and Nevada. The tool must allow an engineer to:

1. Search a manufacturer equipment database by model number
2. Auto-populate all equipment specs (weight, dimensions, CG)
3. Enter site seismic parameters (via USGS lookup or manual entry)
4. Run a complete ASCE 7 + ACI 318 calculation in one click
5. Generate a PE-ready stamped PDF report
6. Be done in under 5 minutes per piece of equipment

This is a **life-safety tool**. Every formula, factor, and check must be implemented exactly as specified below. Do not simplify or approximate. Errors in seismic anchorage calculations can result in equipment falling during earthquakes and killing people.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Routing**: Wouter
- **State**: React useState/useContext (no Redux needed)
- **PDF Reports**: Browser print-to-PDF via styled HTML, or jsPDF
- **USGS Integration**: Fetch from `https://earthquake.usgs.gov/ws/designmaps/asce7-16.json`
- **Data Persistence**: localStorage for projects and custom equipment
- **Deployment**: Static frontend (no backend required)

---

## Application Structure

### Pages / Routes

```
/                          → Dashboard (project list)
/project/new               → Create new project
/project/:id               → Project view (list of calculations)
/project/:id/calc/new      → New calculation wizard
/project/:id/calc/:calcId  → Calculation detail (tabs: Site | Properties | Anchorage | Results | Report)
```

### Data Models

```typescript
interface Project {
  id: string;
  name: string;
  client: string;
  projectNumber: string;
  engineer: string;
  createdAt: string;
  updatedAt: string;
}

interface Calculation {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'draft' | 'calculated' | 'complete';
  
  // Site Parameters
  siteParams: {
    address: string;
    latitude: number;
    longitude: number;
    SDS: number;       // Design spectral acceleration, short period (g)
    SD1: number;       // Design spectral acceleration, 1-second period (g)
    Ss: number;        // Mapped spectral acceleration, short period (g)
    S1: number;        // Mapped spectral acceleration, 1-second period (g)
    siteClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    riskCategory: 'I' | 'II' | 'III' | 'IV';
    Ip: number;        // Importance factor: 1.0 (RC I/II/III) or 1.5 (RC IV)
    buildingHeight: number;   // h, total building height (ft)
    attachmentHeight: number; // z, height of equipment attachment (ft)
    seismicDesignCategory: string;
  };
  
  // Equipment Properties
  equipmentProperties: {
    manufacturer: string;
    modelNumber: string;
    equipmentType: string;
    componentType: string;  // Drives ap and Rp
    weight: number;         // Wp (lbs)
    length: number;         // L (inches)
    width: number;          // W (inches)
    height: number;         // H (inches)
    cgHeight: number;       // hcg (inches) - center of gravity height above base
    ap: number;             // Component amplification factor
    Rp: number;             // Component response modification factor
    Omega0: number;         // Overstrength factor (typically 2.0)
  };
  
  // Anchorage Configuration
  anchorageConfig: {
    anchorType: string;       // 'cast-in' | 'post-installed-expansion' | 'post-installed-adhesive'
    anchorMaterial: string;   // 'A307' | 'A36' | 'F1554-36' | 'F1554-55' | 'A193-B7'
    anchorDiameter: number;   // inches (0.375, 0.5, 0.625, 0.75, 0.875, 1.0, 1.125, 1.25)
    embedmentDepth: number;   // hef (inches)
    concreteStrength: number; // f'c (psi)
    anchorLayout: {
      pattern: '2x2' | '2x3' | '3x3' | '2x4' | 'custom';
      nLong: number;          // Number of anchors in longitudinal direction
      nTrans: number;         // Number of anchors in transverse direction
      spacing: {
        longitudinal: number; // sx (inches) - center-to-center spacing
        transverse: number;   // sy (inches) - center-to-center spacing
      };
      edgeDistance: {
        ca1: number;          // Critical edge distance (inches)
        ca2: number;          // Perpendicular edge distance (inches)
      };
    };
  };
  
  // Calculation Results (populated after running calculation)
  results?: CalculationResults;
}

interface CalculationResults {
  // Seismic Force
  fpCalculated: number;   // Raw calculated Fp (lbs)
  fpMinimum: number;      // Minimum Fp per ASCE 7 Eq. 13.3-2 (lbs)
  fpMaximum: number;      // Maximum Fp per ASCE 7 Eq. 13.3-3 (lbs)
  fpDesign: number;       // Governing Fp (lbs) - max of calculated and minimum, capped at maximum
  amplificationFactor: number;  // (1 + 2z/h)
  
  // Anchor Demands
  tuPerAnchor: number;    // Tension demand per anchor (lbs) - 0 if no uplift
  vuPerAnchor: number;    // Shear demand per anchor (lbs)
  upliftOccurs: boolean;  // Whether overturning moment exceeds stabilizing moment
  governingDirection: 'longitudinal' | 'transverse';
  
  // Overturning Analysis
  overturnMoment: number;   // M_ot (lb-ft)
  resistingMoment: number;  // M_r (lb-ft)
  netUpliftMoment: number;  // M_net = M_ot - M_r (lb-ft), 0 if no uplift
  
  // Capacity Checks
  checks: {
    steelTension: CapacityCheck;
    steelShear: CapacityCheck;
    concreteBreakoutTension: CapacityCheck;
    concreteBreakoutShear: CapacityCheck;
    concretePryout: CapacityCheck;
    interaction: CapacityCheck;
  };
  
  overallStatus: 'PASS' | 'FAIL';
  governingCheck: string;
  maxUtilizationRatio: number;
}

interface CapacityCheck {
  demand: number;
  capacity: number;
  ratio: number;
  status: 'PASS' | 'FAIL';
  codeRef: string;
}
```

---

## COMPLETE CALCULATION ENGINE

### STEP 1: Seismic Force on Nonstructural Components (ASCE 7-16 Section 13.3)

#### Primary Formula (ASCE 7-16 Equation 13.3-1):

```
Fp = (0.4 × ap × SDS × Wp) / (Rp / Ip) × (1 + 2 × z/h)
```

Where:
- `ap` = Component amplification factor (see table below)
- `SDS` = Design spectral acceleration, short period (g) — from USGS
- `Wp` = Component operating weight (lbs)
- `Rp` = Component response modification factor (see table below)
- `Ip` = Component importance factor (1.0 or 1.5)
- `z` = Height of point of attachment above base of structure (ft)
- `h` = Average roof height of structure above base (ft)

#### Minimum Force (ASCE 7-16 Equation 13.3-2):
```
Fp,min = 0.3 × SDS × Ip × Wp
```

#### Maximum Force (ASCE 7-16 Equation 13.3-3):
```
Fp,max = 1.6 × SDS × Ip × Wp
```

#### Governing Design Force:
```
Fp,design = max(Fp, Fp,min)
Fp,design = min(Fp,design, Fp,max)
```

**CRITICAL**: Always check both minimum and maximum. The minimum often governs for low-rise buildings or low-seismic zones. The maximum governs for rooftop equipment in high-seismic zones.

#### Importance Factor (Ip):
| Risk Category | Ip |
|---|---|
| I, II, III | 1.0 |
| IV (Essential Facilities) | 1.5 |

#### ap and Rp Values (ASCE 7-16 Table 13.5-1 — Mechanical and Electrical Components):

| Component Type | ap | Rp |
|---|---|---|
| Mechanical equipment — rigid, non-vibration-isolated | 1.0 | 2.5 |
| Mechanical equipment — flexible or vibration-isolated | 2.5 | 2.5 |
| Electrical equipment — rigid | 1.0 | 2.5 |
| Electrical equipment — flexible | 2.5 | 2.5 |
| Transformers — dry-type | 1.0 | 2.5 |
| Transformers — liquid-filled | 1.0 | 2.5 |
| Generators | 1.0 | 2.5 |
| Motor control centers, switchgear | 1.0 | 2.5 |
| Battery racks | 1.0 | 2.0 |
| UPS systems | 1.0 | 2.5 |
| Storage racks | 2.5 | 3.5 |
| Architectural components — rigid | 1.0 | 2.5 |
| Architectural components — flexible | 2.5 | 2.5 |
| Boilers, furnaces, pressure vessels | 1.0 | 2.5 |
| HVAC ductwork | 1.0 | 2.5 |
| Piping systems — high deformability | 1.0 | 4.5 |
| Piping systems — limited deformability | 1.0 | 3.5 |
| Piping systems — low deformability | 1.0 | 2.5 |

**NOTE**: When in doubt, use ap = 1.0 and Rp = 2.5 for rigid mechanical/electrical equipment. Use ap = 2.5 for vibration-isolated equipment (spring isolators under RTUs, chillers, etc.).

---

### STEP 2: Overturning Moment Analysis

The seismic force Fp acts horizontally at the center of gravity height hcg.

#### Overturning Moment:
```
M_ot = Fp × hcg   (lb-ft, where hcg is in feet = cgHeight_inches / 12)
```

#### Resisting Moment (from equipment weight):

**CRITICAL BUG WARNING** — This is where most implementations fail. The resisting moment arm depends on which direction the force is acting:

**Direction 1: Force acts along equipment LENGTH (overturning about transverse axis)**
```
M_r1 = 0.9 × Wp × (L/2)   (lb-ft, where L = equipment length in feet = length_inches / 12)
```
The resisting moment arm is **half the equipment LENGTH** (distance from CG to the pivot edge along the length direction).

**Direction 2: Force acts along equipment WIDTH (overturning about longitudinal axis)**
```
M_r2 = 0.9 × Wp × (W/2)   (lb-ft, where W = equipment width in feet = width_inches / 12)
```
The resisting moment arm is **half the equipment WIDTH** (distance from CG to the pivot edge along the width direction).

**DO NOT SWAP THESE.** The most common bug is using W/2 for Direction 1 and L/2 for Direction 2. This causes the wrong direction to govern and severely under-predicts tension demands (82% error observed in testing).

#### Net Uplift Moment:
```
M_net1 = max(0, M_ot - M_r1)   // Direction 1
M_net2 = max(0, M_ot - M_r2)   // Direction 2
```

#### Governing Direction:
The governing direction is the one with the **larger net uplift moment divided by anchor spacing**:
```
T_total1 = M_net1 / (sx/12)   // sx = longitudinal anchor spacing in inches
T_total2 = M_net2 / (sy/12)   // sy = transverse anchor spacing in inches

governing = (T_total1 >= T_total2) ? 'longitudinal' : 'transverse'
```

**IMPORTANT**: The anchor spacing used as the moment arm must match the direction of the force:
- Direction 1 (force along length) → use **longitudinal anchor spacing** (sx) as moment arm
- Direction 2 (force along width) → use **transverse anchor spacing** (sy) as moment arm

This is because the tension anchors are on the far side from the pivot, and the moment arm is the distance between the tension anchors and the compression edge, which equals the anchor spacing in that direction.

---

### STEP 3: Anchor Tension and Shear Demands

#### Tension Demand Per Anchor (with Overstrength Factor):
```
if (upliftOccurs) {
  // Number of anchors in tension = nTrans (for Direction 1) or nLong (for Direction 2)
  nTension = (governing === 'longitudinal') ? nTrans : nLong;
  Tu = (M_net_governing / (spacing_governing / 12)) / nTension × Omega0
} else {
  Tu = 0
}
```

Where `Omega0` = overstrength factor = 2.0 (per ASCE 7-16 Section 13.4.2 for post-installed anchors in concrete).

**NOTE on Omega0**: ASCE 7-16 Section 13.4.2 requires that anchors in concrete or masonry be designed using the load combinations with overstrength factor Ω₀ from Section 12.4.3. For equipment anchorage, this typically means multiplying the seismic demands by Ω₀ = 2.0 before checking anchor capacity. Some engineers apply this to both tension and shear; others apply it only to tension. Apply to both for conservatism.

#### Shear Demand Per Anchor:
```
Vu = (Fp × Omega0) / (nLong × nTrans)   // Total anchors = nLong × nTrans
```

---

### STEP 4: Anchor Capacity Checks (ACI 318-19 Chapter 17)

#### Anchor Steel Properties by Diameter:

| Diameter (in) | Ase (in²) | futa (psi) — A36/F1554-36 | futa (psi) — F1554-55 | futa (psi) — A193-B7 |
|---|---|---|---|---|
| 3/8 (0.375) | 0.0775 | 58,000 | 75,000 | 125,000 |
| 1/2 (0.500) | 0.1419 | 58,000 | 75,000 | 125,000 |
| 5/8 (0.625) | 0.2260 | 58,000 | 75,000 | 125,000 |
| 3/4 (0.750) | 0.3340 | 58,000 | 75,000 | 125,000 |
| 7/8 (0.875) | 0.4620 | 58,000 | 75,000 | 125,000 |
| 1 (1.000) | 0.6060 | 58,000 | 75,000 | 125,000 |
| 1-1/8 (1.125) | 0.7630 | 58,000 | 75,000 | 125,000 |
| 1-1/4 (1.250) | 0.9690 | 58,000 | 75,000 | 125,000 |

#### 4a. Steel Strength in Tension (ACI 318-19 Section 17.6.1):
```
Nsa = Ase × futa
φNsa = φ × Nsa    where φ = 0.75 (ductile steel element)

Code ref: ACI 318-19 Eq. 17.6.1.2
```

#### 4b. Steel Strength in Shear (ACI 318-19 Section 17.7.1):
```
Vsa = 0.6 × Ase × futa
φVsa = φ × Vsa    where φ = 0.65 (ductile steel element in shear)

Code ref: ACI 318-19 Eq. 17.7.1.2b
```

#### 4c. Concrete Breakout Strength in Tension (ACI 318-19 Section 17.6.2):

For a **single anchor** (conservative, use for individual anchor checks):
```
ANc = 9 × hef²                                    (projected failure area, in²)
ANco = 9 × hef²                                   (reference area for single anchor)
Nb = kc × λa × √f'c × hef^1.5                    (basic breakout strength, lbs)

where:
  kc = 24 for cast-in anchors
  kc = 17 for post-installed anchors (conservative)
  λa = 1.0 for normal-weight concrete
  f'c in psi
  hef in inches

Ncb = (ANc/ANco) × ψed,N × ψc,N × ψcp,N × Nb

where (conservative assumptions):
  ψed,N = 1.0 (no edge effects if ca,min ≥ 1.5×hef)
  ψc,N = 1.0 (uncracked concrete, conservative)
  ψcp,N = 1.0 (no splitting)

φNcb = 0.70 × Ncb   (φ = 0.70 for concrete breakout)

Code ref: ACI 318-19 Section 17.6.2
```

#### 4d. Concrete Breakout Strength in Shear (ACI 318-19 Section 17.7.2):
```
AVc = 4.5 × ca1²                                  (projected failure area, in²)
AVco = 4.5 × ca1²                                 (reference area)
Vb = 7 × (le/da)^0.2 × da^0.5 × λa × √f'c × ca1^1.5

where:
  le = min(hef, 8×da) = load-bearing length of anchor in shear
  da = anchor diameter (in)
  ca1 = edge distance in direction of shear (in)

Vcb = (AVc/AVco) × ψed,V × ψc,V × ψh,V × Vb

where (conservative):
  ψed,V = 1.0 (no perpendicular edge effects)
  ψc,V = 1.0 (uncracked concrete)
  ψh,V = 1.0 (ha ≥ 1.5×ca1)

φVcb = 0.70 × Vcb   (φ = 0.70 for concrete breakout)

Code ref: ACI 318-19 Section 17.7.2
```

#### 4e. Concrete Pryout Strength in Shear (ACI 318-19 Section 17.7.3):
```
Vcp = kcp × Ncb

where:
  kcp = 1.0 for hef < 2.5 in
  kcp = 2.0 for hef ≥ 2.5 in

φVcp = 0.70 × Vcp

Code ref: ACI 318-19 Section 17.7.3
```

#### 4f. Combined Tension and Shear Interaction (ACI 318-19 Section 17.8):

When both tension and shear are present:
```
(Tu / φNn)^(5/3) + (Vu / φVn)^(5/3) ≤ 1.0

where:
  φNn = governing tension capacity (minimum of φNsa and φNcb)
  φVn = governing shear capacity (minimum of φVsa, φVcb, φVcp)

Code ref: ACI 318-19 Eq. 17.8.3
```

**IMPORTANT**: The 5/3 power interaction equation is specific to ACI 318. Do not use the simpler linear interaction (Tu/φNn + Vu/φVn ≤ 1.2) unless specifically required. The 5/3 power equation is more accurate and less conservative.

---

## USGS Seismic Data Integration

Use the USGS Design Maps API to automatically fetch seismic parameters:

```javascript
const fetchSeismicData = async (lat, lon, riskCategory, siteClass) => {
  const url = `https://earthquake.usgs.gov/ws/designmaps/asce7-16.json` +
    `?latitude=${lat}&longitude=${lon}` +
    `&riskCategory=${riskCategory}&siteClass=${siteClass}` +
    `&title=Equipment+Anchorage`;
    
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    SDS: data.response.data.sds,
    SD1: data.response.data.sd1,
    Ss: data.response.data.ss,
    S1: data.response.data.s1,
    seismicDesignCategory: data.response.data.sdc,
  };
};
```

**ALSO** provide a manual entry fallback for when USGS lookup fails or for international projects. Many engineers already have SDS and SD1 from their geotechnical report.

For address-to-coordinates, use the US Census Geocoder API (free, no key required):
```javascript
const geocodeAddress = async (address) => {
  const encoded = encodeURIComponent(address);
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress` +
    `?address=${encoded}&benchmark=2020&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  const match = data.result.addressMatches[0];
  return {
    lat: parseFloat(match.coordinates.y),
    lon: parseFloat(match.coordinates.x),
    formattedAddress: match.matchedAddress
  };
};
```

---

## Equipment Database

### Database Structure

Build a searchable equipment database with the following schema:

```typescript
interface EquipmentSpec {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  category: 'HVAC' | 'Electrical' | 'Plumbing' | 'Fire Protection' | 'Architectural' | 'Other';
  type: string;           // e.g., "Rooftop Unit (RTU)", "Dry-Type Transformer"
  capacity: string;       // Human-readable, e.g., "10 tons", "500 kVA"
  weight_lbs: number;
  length_in: number;
  width_in: number;
  height_in: number;
  cg_height_in: number;   // Center of gravity height above base
  anchor_spacing_x_in: number;  // Typical longitudinal anchor spacing
  anchor_spacing_y_in: number;  // Typical transverse anchor spacing
  ap: number;             // Default ap value
  Rp: number;             // Default Rp value
  notes: string;          // Source, special conditions
  isCustom?: boolean;     // True if user-added via Quick Add
}
```

### Seed Data — Trane Precedent RTU Series (Exact Specs from Catalog RT-PRC117B-EN)

Include these 22 models with exact manufacturer specifications:

```json
[
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK048", "type": "Rooftop Unit (RTU)", "capacity": "4 tons", "weight_lbs": 797, "length_in": 88, "width_in": 51, "height_in": 48, "cg_height_in": 20, "anchor_spacing_x_in": 41, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK060", "type": "Rooftop Unit (RTU)", "capacity": "5 tons", "weight_lbs": 805, "length_in": 88, "width_in": 51, "height_in": 48, "cg_height_in": 20, "anchor_spacing_x_in": 41, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK072", "type": "Rooftop Unit (RTU)", "capacity": "6 tons", "weight_lbs": 810, "length_in": 88, "width_in": 51, "height_in": 48, "cg_height_in": 20, "anchor_spacing_x_in": 41, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK090", "type": "Rooftop Unit (RTU)", "capacity": "7.5 tons", "weight_lbs": 859, "length_in": 104, "width_in": 51, "height_in": 48, "cg_height_in": 21, "anchor_spacing_x_in": 57, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK102", "type": "Rooftop Unit (RTU)", "capacity": "8.5 tons", "weight_lbs": 875, "length_in": 104, "width_in": 51, "height_in": 48, "cg_height_in": 21, "anchor_spacing_x_in": 57, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK120", "type": "Rooftop Unit (RTU)", "capacity": "10 tons", "weight_lbs": 1245, "length_in": 120, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 73, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK150", "type": "Rooftop Unit (RTU)", "capacity": "12.5 tons", "weight_lbs": 1285, "length_in": 120, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 73, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK180", "type": "Rooftop Unit (RTU)", "capacity": "15 tons", "weight_lbs": 1480, "length_in": 147, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 100, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK210", "type": "Rooftop Unit (RTU)", "capacity": "17.5 tons", "weight_lbs": 1560, "length_in": 147, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 100, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK240", "type": "Rooftop Unit (RTU)", "capacity": "20 tons", "weight_lbs": 1690, "length_in": 147, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 100, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "TZK300", "type": "Rooftop Unit (RTU)", "capacity": "25 tons", "weight_lbs": 2100, "length_in": 165, "width_in": 65, "height_in": 60, "cg_height_in": 27, "anchor_spacing_x_in": 118, "anchor_spacing_y_in": 39, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK048", "type": "Rooftop Unit (RTU)", "capacity": "4 tons", "weight_lbs": 820, "length_in": 88, "width_in": 51, "height_in": 48, "cg_height_in": 20, "anchor_spacing_x_in": 41, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK060", "type": "Rooftop Unit (RTU)", "capacity": "5 tons", "weight_lbs": 830, "length_in": 88, "width_in": 51, "height_in": 48, "cg_height_in": 20, "anchor_spacing_x_in": 41, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK072", "type": "Rooftop Unit (RTU)", "capacity": "6 tons", "weight_lbs": 838, "length_in": 88, "width_in": 51, "height_in": 48, "cg_height_in": 20, "anchor_spacing_x_in": 41, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK090", "type": "Rooftop Unit (RTU)", "capacity": "7.5 tons", "weight_lbs": 885, "length_in": 104, "width_in": 51, "height_in": 48, "cg_height_in": 21, "anchor_spacing_x_in": 57, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK102", "type": "Rooftop Unit (RTU)", "capacity": "8.5 tons", "weight_lbs": 900, "length_in": 104, "width_in": 51, "height_in": 48, "cg_height_in": 21, "anchor_spacing_x_in": 57, "anchor_spacing_y_in": 25, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK120", "type": "Rooftop Unit (RTU)", "capacity": "10 tons", "weight_lbs": 1245, "length_in": 120, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 73, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK150", "type": "Rooftop Unit (RTU)", "capacity": "12.5 tons", "weight_lbs": 1295, "length_in": 120, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 73, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK180", "type": "Rooftop Unit (RTU)", "capacity": "15 tons", "weight_lbs": 1510, "length_in": 147, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 100, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK210", "type": "Rooftop Unit (RTU)", "capacity": "17.5 tons", "weight_lbs": 1590, "length_in": 147, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 100, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK240", "type": "Rooftop Unit (RTU)", "capacity": "20 tons", "weight_lbs": 1720, "length_in": 147, "width_in": 53, "height_in": 54, "cg_height_in": 24, "anchor_spacing_x_in": 100, "anchor_spacing_y_in": 27, "ap": 2.5, "Rp": 2.5 },
  { "manufacturer": "Trane", "series": "Precedent", "model": "YZK300", "type": "Rooftop Unit (RTU)", "capacity": "25 tons", "weight_lbs": 2150, "length_in": 165, "width_in": 65, "height_in": 60, "cg_height_in": 27, "anchor_spacing_x_in": 118, "anchor_spacing_y_in": 39, "ap": 2.5, "Rp": 2.5 }
]
```

### Additional Representative Equipment (Typical Values for Common Types)

Include these representative models for other equipment categories:

**Dry-Type Transformers (typical values):**
- 75 kVA: 450 lbs, 30"L × 18"W × 36"H, CG = 18"
- 150 kVA: 650 lbs, 34"L × 20"W × 42"H, CG = 21"
- 225 kVA: 850 lbs, 38"L × 22"W × 48"H, CG = 24"
- 300 kVA: 1,100 lbs, 42"L × 24"W × 54"H, CG = 27"
- 500 kVA: 1,800 lbs, 50"L × 28"W × 60"H, CG = 30"
- 750 kVA: 2,800 lbs, 58"L × 32"W × 66"H, CG = 33"
- 1000 kVA: 4,200 lbs, 66"L × 36"W × 72"H, CG = 36"

**Standby Generators (typical values):**
- 100 kW: 3,200 lbs, 96"L × 36"W × 60"H, CG = 30"
- 200 kW: 5,500 lbs, 120"L × 42"W × 66"H, CG = 33"
- 500 kW: 12,000 lbs, 168"L × 54"W × 78"H, CG = 39"
- 1000 kW: 24,000 lbs, 240"L × 66"W × 90"H, CG = 45"
- 2000 kW: 48,000 lbs, 336"L × 84"W × 108"H, CG = 54"

**Chillers (typical values):**
- 50 ton: 4,500 lbs, 120"L × 48"W × 72"H, CG = 36"
- 100 ton: 8,000 lbs, 168"L × 60"W × 84"H, CG = 42"
- 200 ton: 18,000 lbs, 240"L × 72"W × 96"H, CG = 48"
- 500 ton: 45,000 lbs, 360"L × 96"W × 120"H, CG = 60"

### Quick Add Feature

Allow users to add custom equipment to the database. Save to localStorage under key `custom_equipment`. Include fields: manufacturer, model, type, weight, dimensions, CG height, anchor spacing, ap, Rp, and notes. Custom equipment should be clearly marked with a "Custom" badge in search results.

---

## UI/UX Requirements

### Workflow (Critical Path)

The entire workflow from opening the app to having a printable report must be achievable in **under 5 minutes** for an experienced user. Design every interaction with this goal in mind.

**Optimal workflow:**
1. Open app → Select project (or create new in 30 seconds)
2. Click "New Calculation" → Name it and select equipment type → 30 seconds
3. **Properties tab**: Click "Search Database" → Type model number → Select → All specs auto-populate → 30 seconds
4. **Site tab**: Type address → Click "Lookup" → All seismic params populate → Verify z/h → 60 seconds
5. **Anchorage tab**: Verify anchor layout (pre-populated from template) → Adjust if needed → 60 seconds
6. Click "CALCULATE" → Results appear instantly → 5 seconds
7. **Results tab**: Review pass/fail → Click "Generate Report" → Print/save PDF → 60 seconds

**Total: ~4.5 minutes**

### Tab Structure (Calculation Detail Page)

Each calculation has 5 tabs:

**1. Site Tab**
- Address input with "Lookup" button (USGS integration)
- Manual override toggle for SDS, SD1, Ss, S1
- Site Class dropdown (A through F)
- Risk Category dropdown (I, II, III, IV) — auto-sets Ip
- Building height (h) input in feet
- Attachment height (z) input in feet
- **Building Elevation Diagram** (SVG): Shows building with equipment position, z/h ratio prominently displayed, ASCE 7 code reference for (1 + 2z/h) amplification factor
- Seismic Design Category display (auto-calculated from SDS, SD1, Risk Category)

**2. Properties Tab**
- "Search Database" button (opens search dialog)
- Manufacturer, Model Number, Equipment Type fields
- Component Type dropdown (drives ap and Rp — show values next to dropdown)
- Weight (Wp) in lbs
- Dimensions: Length, Width, Height in inches
- CG Height in inches
- ap and Rp fields (auto-populated from component type, editable)
- Overstrength factor (Ω₀) — default 2.0
- **Equipment Geometry Diagram** (SVG): 3D isometric view showing L, W, H dimensions, CG location with red dot, Fp arrow in orange, Wp arrow in green, parameter definitions below

**3. Anchorage Tab**
- Anchor Type dropdown (cast-in, post-installed expansion, post-installed adhesive)
- Anchor Material dropdown (A307, A36/F1554-36, F1554-55, A193-B7)
- Anchor Diameter dropdown (3/8" through 1-1/4")
- Embedment Depth (hef) in inches
- Concrete Strength (f'c) in psi
- Anchor Layout: nLong × nTrans pattern
- Longitudinal Spacing (sx) in inches
- Transverse Spacing (sy) in inches
- Edge Distance (ca1) in inches
- **Anchor Layout Diagram** (SVG): Plan view showing anchor pattern, equipment footprint as dashed rectangle, spacing dimensions labeled, note explaining moment arm relationship

**4. Results Tab**
- Prominent PASS/FAIL banner (green/red)
- Seismic Force section: Fp calculated, Fp minimum, Fp maximum, Fp design (governing), amplification factor
- Anchor Demands section: Tension per anchor, Shear per anchor, uplift indicator
- Capacity Checks table: Each check with demand, capacity, ratio, and status
- Interaction check
- Governing check highlighted
- "Generate Report" button

**5. Report Tab**
- Preview of the PDF report
- "Download PDF" / "Print" button
- Engineer information fields (name, license number, firm, date)
- Optional stamp/seal area

### Equipment Search Dialog

- Full-screen modal with search input at top
- Filter chips: All | HVAC | Electrical | Plumbing | Custom
- Filter by manufacturer
- Results list: Model number (bold), type, capacity, weight, dimensions
- Each result has "Select" button
- "Add Custom Equipment" button at bottom
- Search is instant/typeahead across model number, manufacturer, type, capacity
- Show "37 models" count in header

### Technical Diagrams

All diagrams should be SVG-based (not images) so they scale perfectly and can be updated dynamically based on user inputs. The diagrams should update in real-time as users change values.

**Equipment Geometry Diagram (Properties Tab):**
- 3D isometric box representing equipment
- Dimension arrows with labels: L (length), W (width), H (height)
- Red dot at CG location (at height hcg)
- Orange horizontal arrow labeled "Fp (Seismic Force)" acting at CG
- Green downward arrow labeled "Wp (Weight)" acting at CG
- Parameter definitions table below diagram

**Building Elevation Diagram (Site Tab):**
- Building outline with floor lines
- Equipment shown at attachment height z
- Dimension lines for h (total height) and z (attachment height)
- Orange badge showing z/h ratio and amplification factor (1 + 2z/h)
- Ground hatch pattern at base
- Code reference: "ASCE 7-16 §13.3.1"

**Anchor Layout Diagram (Anchorage Tab):**
- Plan view (top-down)
- Equipment footprint as blue dashed rectangle
- Anchor locations as red filled circles
- Dimension arrows showing sx (longitudinal) and sy (transverse) spacing
- Coordinate system (N/S/E/W or X/Y)
- Note: "Larger anchor spacing → smaller tension demand per anchor"

---

## PDF Report Requirements

The generated report must be suitable for **building department submittal** and **PE stamp**. Include:

**Header:**
- Project name, project number, client name
- Calculation title and description
- Engineer name, PE license number, firm name
- Date
- Calculation reference number

**Section 1: Project Information**
- Equipment description and location
- Code references used (ASCE 7-16, ACI 318-19)

**Section 2: Site Parameters**
- Location, coordinates, site class
- SDS, SD1, Ss, S1 values with source (USGS)
- Risk Category, Importance Factor
- Building height, attachment height, z/h ratio

**Section 3: Equipment Properties**
- Manufacturer, model, type
- Weight, dimensions, CG height
- Component type, ap, Rp values with code reference

**Section 4: Seismic Force Calculation**
- Show ASCE 7-16 Equation 13.3-1 with all values substituted
- Show minimum check (Eq. 13.3-2)
- Show maximum check (Eq. 13.3-3)
- State governing Fp with reason

**Section 5: Overturning Analysis**
- Show overturning moment calculation
- Show resisting moment for both directions
- Show net uplift moment
- State governing direction

**Section 6: Anchor Demands**
- Show tension demand calculation with formula
- Show shear demand calculation with formula
- State whether uplift occurs

**Section 7: Anchor Capacity Checks**
- For each check: formula, substituted values, capacity, demand, ratio, PASS/FAIL
- Include code section reference for each check

**Section 8: Summary**
- Table of all checks with ratios
- Overall PASS/FAIL
- Governing check
- PE signature/stamp block

---

## Critical Bugs to Avoid

These bugs were discovered during development and testing. **Do not repeat them:**

### Bug 1: Swapped Resisting Moment Arms (SAFETY CRITICAL)

**WRONG:**
```typescript
// Direction 1: Force along LENGTH
const resistingMoment1 = 0.9 * Wp * (equipWidth / 2) / 12;  // ❌ WRONG: uses width

// Direction 2: Force along WIDTH  
const resistingMoment2 = 0.9 * Wp * (equipLength / 2) / 12; // ❌ WRONG: uses length
```

**CORRECT:**
```typescript
// Direction 1: Force along LENGTH → pivot about transverse axis → arm = half LENGTH
const resistingMoment1 = 0.9 * Wp * (equipLength / 2) / 12; // ✅ CORRECT

// Direction 2: Force along WIDTH → pivot about longitudinal axis → arm = half WIDTH
const resistingMoment2 = 0.9 * Wp * (equipWidth / 2) / 12;  // ✅ CORRECT
```

This bug caused 34-82% under-prediction of tension demands in testing. It is a safety-critical error.

### Bug 2: NaN from Missing Seismic Parameters

Always validate that SDS > 0 before running calculations. If SDS = 0 or undefined, show an error message: "Please enter seismic parameters or use the USGS Lookup feature."

```typescript
if (!siteParams.SDS || siteParams.SDS <= 0) {
  throw new Error('SDS must be greater than 0. Use USGS Lookup or enter manually.');
}
```

### Bug 3: Incorrect Unit Conversions

All dimensions in the database and UI are in **inches**. The calculation engine works in **feet** for moments. Always convert explicitly:

```typescript
const cgHeightFt = equipmentProperties.cgHeight / 12;  // inches → feet
const equipLengthFt = equipmentProperties.length / 12;  // inches → feet
const spacingFt = anchorageConfig.anchorLayout.spacing.longitudinal / 12; // inches → feet
```

### Bug 4: Wrong Anchor Count for Tension

For a 2×2 anchor pattern with force acting longitudinally:
- Compression anchors: 2 (near side)
- **Tension anchors: 2 (far side)** — use nTrans = 2 for tension count
- NOT total anchors (4)

```typescript
const nTension = (governingDirection === 'longitudinal') 
  ? anchorageConfig.anchorLayout.nTrans   // anchors in transverse direction
  : anchorageConfig.anchorLayout.nLong;   // anchors in longitudinal direction
```

### Bug 5: Missing Minimum Force Check

Never forget the minimum Fp check. In low-seismic zones or for heavy equipment, the calculated Fp can be very small but the minimum (0.3 × SDS × Ip × Wp) may govern. This is especially important for heavy equipment like transformers and generators.

---

## Verification Problems

Use these three problems to validate your implementation. If your results don't match, there is a bug.

### VP1: Light Storage Cabinet (Minimum Force Governs)

**Inputs:**
- SDS = 1.000g, Risk Category II, Ip = 1.0
- z = 10 ft, h = 45 ft, z/h = 0.222
- Wp = 250 lbs, ap = 1.0, Rp = 2.5
- L = 36", W = 18", H = 72", hcg = 36" (3.0 ft)
- 4 anchors: sx = 30", sy = 12"

**Expected Results:**
- Fp_calculated = 57.8 lbs
- Fp_minimum = 75 lbs ← GOVERNS
- Fp_design = 75 lbs
- M_ot = 75 × 3.0 = 225 lb-ft
- Direction 1 (force along L=36"): M_r1 = 0.9 × 250 × (36/2)/12 = 337.5 lb-ft → No uplift
- Direction 2 (force along W=18"): M_r2 = 0.9 × 250 × (18/2)/12 = 168.75 lb-ft → Net = 56.25 lb-ft
- Governing: Direction 2 (transverse, sy = 12")
- Tu = (56.25 / (12/12)) / 2 × 2.0 = 56.25 lbs per anchor
- Vu = (75 × 2.0) / 4 = 37.5 lbs per anchor

### VP2: Heavy Transformer (No Uplift)

**Inputs:**
- SDS = 1.26g (Oakland, CA), Risk Category II, Ip = 1.0
- z = 0 ft, h = 30 ft, z/h = 0.0
- Wp = 5,000 lbs, ap = 1.0, Rp = 2.5
- L = 96", W = 60", H = 72", hcg = 36" (3.0 ft)
- 4 anchors: sx = 72", sy = 48"

**Expected Results:**
- Fp_calculated = 0.4 × 1.0 × 1.26 × 5000 / (2.5/1.0) × (1 + 0) = 1,008 lbs
- Fp_minimum = 0.3 × 1.26 × 1.0 × 5000 = 1,890 lbs ← GOVERNS
- Fp_design = 1,890 lbs
- M_ot = 1,890 × 3.0 = 5,670 lb-ft
- Direction 1: M_r1 = 0.9 × 5000 × (96/2)/12 = 18,000 lb-ft → No uplift (5,670 < 18,000)
- Direction 2: M_r2 = 0.9 × 5000 × (60/2)/12 = 11,250 lb-ft → No uplift (5,670 < 11,250)
- **Tu = 0 lbs (NO UPLIFT in either direction)**
- Vu = (1,890 × 2.0) / 4 = 945 lbs per anchor

### VP3: Heavy RTU on Hospital Roof (Significant Uplift)

**Inputs:**
- SDS = 1.50g (Los Angeles, CA), Risk Category IV, Ip = 1.5
- z = 120 ft, h = 120 ft, z/h = 1.0
- Wp = 3,500 lbs, ap = 2.5 (vibration isolated), Rp = 2.5
- L = 120", W = 60", H = 84", hcg = 42" (3.5 ft)
- 4 anchors: sx = 120", sy = 60"

**Expected Results:**
- Fp_calculated = 0.4 × 2.5 × 1.50 × 3500 / (2.5/1.5) × (1 + 2×1.0) = 9,450 lbs
- Fp_minimum = 0.3 × 1.50 × 1.5 × 3500 = 2,362.5 lbs
- Fp_maximum = 1.6 × 1.50 × 1.5 × 3500 = 12,600 lbs
- Fp_design = 9,450 lbs (calculated governs)
- M_ot = 9,450 × 3.5 = 33,075 lb-ft
- Direction 1 (force along L=120"): M_r1 = 0.9 × 3500 × (120/2)/12 = 15,750 lb-ft → Net = 17,325 lb-ft
- Direction 2 (force along W=60"): M_r2 = 0.9 × 3500 × (60/2)/12 = 7,875 lb-ft → Net = 25,200 lb-ft
- Governing: Direction 2 (transverse, sy = 60")
- Tu = (25,200 / (60/12)) / 2 × 2.0 = (25,200/5) / 2 × 2.0 = 5,040 lbs per anchor
- Vu = (9,450 × 2.0) / 4 = 4,725 lbs per anchor

---

## Code References

All calculations must cite the specific code section. Include these references in the report:

| Calculation | Code Reference |
|---|---|
| Seismic force on components | ASCE 7-16 Section 13.3.1, Equations 13.3-1, 13.3-2, 13.3-3 |
| Component amplification factor ap | ASCE 7-16 Table 13.5-1 (mechanical/electrical) or Table 13.6-1 (architectural) |
| Component importance factor Ip | ASCE 7-16 Section 13.1.3 |
| Overstrength factor Ω₀ | ASCE 7-16 Section 13.4.2 |
| Steel strength in tension | ACI 318-19 Section 17.6.1, Equation 17.6.1.2 |
| Concrete breakout in tension | ACI 318-19 Section 17.6.2 |
| Steel strength in shear | ACI 318-19 Section 17.7.1, Equation 17.7.1.2b |
| Concrete breakout in shear | ACI 318-19 Section 17.7.2 |
| Concrete pryout in shear | ACI 318-19 Section 17.7.3 |
| Tension-shear interaction | ACI 318-19 Section 17.8, Equation 17.8.3 |
| Strength reduction factors φ | ACI 318-19 Table 17.5.3 |

---

## Design Philosophy

This tool is used by professional engineers who are **time-pressured** and **detail-oriented**. The design must reflect both realities:

1. **Speed**: Every common action must be one click. No hunting for buttons. The "Calculate" button should be large and prominent on every tab.

2. **Clarity**: Show the math. Engineers don't trust black boxes. Display intermediate values (M_ot, M_r, M_net) so they can verify by hand.

3. **Conservative**: When in doubt, calculate conservatively. Over-predicting tension demands is safe. Under-predicting is dangerous.

4. **Professional**: The output must look like something a PE would be proud to stamp. Clean typography, proper notation, code references on every line.

5. **Diagrams**: Every parameter that isn't immediately obvious should have a diagram. Engineers are visual. The z/h ratio diagram, the anchor layout diagram, and the equipment geometry diagram are not optional — they prevent errors.

---

## Common Engineering Questions / Edge Cases

**Q: What if z/h > 1.0?**
A: Cap z/h at 1.0. Equipment cannot be attached above the roof. If z = h, z/h = 1.0 is the maximum amplification.

**Q: What if the equipment is on the ground floor (z = 0)?**
A: z/h = 0, amplification factor = (1 + 2×0) = 1.0. This is the minimum amplification.

**Q: What if Fp_calculated < Fp_minimum?**
A: Use Fp_minimum. This is extremely common for heavy equipment (transformers, generators) in moderate seismic zones.

**Q: What if there's no uplift (Tu = 0)?**
A: This is valid and common for heavy, low-profile equipment. Shear governs the design. Do not force a tension check.

**Q: What anchor size should I use?**
A: The tool should calculate demands and check capacity for the user-specified anchor. If capacity is exceeded, show which check fails and by how much. The engineer decides whether to increase anchor size, add more anchors, or use a higher-strength material.

**Q: What if the equipment is wall-mounted vs. floor-mounted?**
A: The calculation is the same. The difference is in the anchor layout — wall-mounted equipment typically has anchors in a vertical plane, while floor-mounted equipment has anchors in a horizontal plane. The overturning analysis applies to both.

**Q: What about seismic bracing (lateral bracing vs. anchorage)?**
A: This tool covers **anchorage** (the connection between equipment and the structure). Seismic bracing (cable bracing, strut bracing for piping and ductwork) is a separate calculation not covered here.

**Q: What about vertical seismic effects?**
A: ASCE 7-16 Section 13.3.2 requires consideration of vertical seismic forces for certain components. For most equipment anchorage, horizontal forces govern. The tool conservatively ignores vertical seismic effects (they would reduce the stabilizing weight, potentially increasing uplift).

---

## Final Notes for Claude Code

1. **Test with all three verification problems** before considering the calculation engine complete. If VP3 doesn't give Tu ≈ 5,040 lbs, there is a bug.

2. **The resisting moment arm bug is the most common mistake.** Double-check that Direction 1 uses equipLength/2 and Direction 2 uses equipWidth/2 for the resisting moment.

3. **Make the USGS lookup robust.** It will fail sometimes (network issues, addresses outside US). Always provide a manual entry fallback.

4. **localStorage is sufficient** for data persistence in a static deployment. No backend required for the core functionality.

5. **The equipment database should grow over time.** Build the Quick Add feature so engineers can add equipment they encounter on projects. Over time, this becomes the most valuable part of the tool.

6. **PDF reports must be printable.** Test the print layout. Use `@media print` CSS to hide navigation and show only the calculation content.

7. **This is a professional tool.** Use a clean, technical aesthetic — not playful or consumer-facing. Dark navy/slate color scheme with orange accents works well for engineering tools. Monospace font for numbers and formulas.

8. **Every number should show its units.** Never display a bare number like "1245" — always show "1,245 lbs" or "1,245 lb". Engineers are trained to catch unit errors.

9. **Significant figures matter.** Show 3-4 significant figures for intermediate calculations, round to 1 decimal for final results. Don't show 1245.0000 lbs.

10. **The tool is for California and Nevada primarily**, where seismic design is mandatory for most commercial projects. SDS values of 0.8-1.5g are common. Design the default values and examples around this range.
