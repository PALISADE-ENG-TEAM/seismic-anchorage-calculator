# Bug Analysis: Tension Demand Calculation Error

## Bug Location

File: `/home/ubuntu/seismic-code-reference/client/src/lib/calculations.ts`
Function: `calculateAnchorDemands()` (lines 184-226)

## The Bug

**Line 206:**
```typescript
const totalTension = momentArm > 0 ? netUpliftMoment / momentArm : 0;
```

**This is WRONG!** The formula is incorrect.

## Correct Formula

The correct formula for total tension force from overturning is:

**T_total × d = M_net**

Where:
- T_total = Total tension force on the tension side anchors
- d = Moment arm (distance from compression edge to tension anchors)
- M_net = Net overturning moment

Solving for T_total:
**T_total = M_net / d**

BUT the moment arm `d` is NOT the anchor spacing!

## The Error Explained

**Current (WRONG) Code:**
```typescript
const momentArm = anchorSpacing / 12; // Convert inches to feet
const totalTension = netUpliftMoment / momentArm;
```

**Problem**: The code uses `anchorSpacing` as the moment arm, but this is incorrect!

**For a 2×2 anchor pattern:**
- If longitudinal spacing = 120 inches (10 ft)
- The moment arm from the pivot edge to the tension anchors is **NOT** 120 inches
- The moment arm is actually the distance from the **compression edge** to the **centroid of tension anchors**

**Correct Moment Arm Calculation:**

For a rectangular equipment with 2×2 anchor pattern:
- When force acts longitudinally (overturning about transverse axis):
  - Pivot edge is at one end of the equipment
  - Tension anchors are at the opposite end
  - Moment arm = Distance from pivot to tension anchors = **longitudinal spacing** (CORRECT in this case)

- When force acts transversely (overturning about longitudinal axis):
  - Pivot edge is at one side of the equipment
  - Tension anchors are at the opposite side
  - Moment arm = Distance from pivot to tension anchors = **transverse spacing** (CORRECT in this case)

**Wait... the code IS using the correct spacing!**

Let me re-analyze...

## Re-Analysis

Looking at the main calculation (lines 28-61):

```typescript
const longSpacing = anchorageConfig.anchorLayout.spacing.longitudinal;
const transSpacing = anchorageConfig.anchorLayout.spacing.transverse;

// Direction 1: Force along equipment length → overturn about transverse axis (width)
const overturnMoment1 = (fpDesign * equipmentProperties.cgHeight) / 12; // lb-ft
const resistingMoment1 = (0.9 * equipmentProperties.weight * (equipWidth / 2)) / 12; // lb-ft

// Direction 2: Force along equipment width → overturn about longitudinal axis (length)
const overturnMoment2 = (fpDesign * equipmentProperties.cgHeight) / 12; // lb-ft
const resistingMoment2 = (0.9 * equipmentProperties.weight * (equipLength / 2)) / 12; // lb-ft

// Use the worst case
if (netUplift1 >= netUplift2) {
    momentArm = longSpacing; // Direction 1 governs
} else {
    momentArm = transSpacing; // Direction 2 governs
}
```

**FOUND THE BUG!**

The **resisting moment calculation is WRONG!**

**Current (WRONG) Code:**
```typescript
const resistingMoment1 = (0.9 * equipmentProperties.weight * (equipWidth / 2)) / 12;
```

**Problem**: When force acts along the equipment LENGTH, it overturns about the transverse axis (WIDTH). The resisting moment arm should be **half the equipment LENGTH**, NOT half the equipment WIDTH!

## The Correct Logic

**Direction 1: Force acts along equipment LENGTH**
- Overturning axis: Transverse (perpendicular to length)
- Pivot edge: At one end of the equipment (along the width)
- Resisting moment arm: **equipLength / 2** (distance from CG to pivot edge along length)
- Tension anchor spacing: **longSpacing** (distance between tension/compression anchors)

**Direction 2: Force acts along equipment WIDTH**
- Overturning axis: Longitudinal (perpendicular to width)
- Pivot edge: At one side of the equipment (along the length)
- Resisting moment arm: **equipWidth / 2** (distance from CG to pivot edge along width)
- Tension anchor spacing: **transSpacing** (distance between tension/compression anchors)

## The Fix

**Lines 33-45 should be:**

```typescript
// Direction 1: Force along equipment length → overturn about transverse axis (width)
// Resisting moment arm = half of EQUIPMENT LENGTH (distance from CG to pivot edge)
// Tension moment arm = longitudinal ANCHOR SPACING (distance between tension/compression anchors)
const overturnMoment1 = (fpDesign * equipmentProperties.cgHeight) / 12; // lb-ft
const resistingMoment1 = (0.9 * equipmentProperties.weight * (equipLength / 2)) / 12; // lb-ft ← FIX: was equipWidth
const netUplift1 = Math.max(0, overturnMoment1 - resistingMoment1);

// Direction 2: Force along equipment width → overturn about longitudinal axis (length)
// Resisting moment arm = half of EQUIPMENT WIDTH (distance from CG to pivot edge)
// Tension moment arm = transverse ANCHOR SPACING (distance between tension/compression anchors)
const overturnMoment2 = (fpDesign * equipmentProperties.cgHeight) / 12; // lb-ft
const resistingMoment2 = (0.9 * equipmentProperties.weight * (equipWidth / 2)) / 12; // lb-ft ← FIX: was equipLength
const netUplift2 = Math.max(0, overturnMoment2 - resistingMoment2);
```

**The resisting moment arms were SWAPPED!**

## Verification

**VP3 Example:**
- Equipment: 120" L × 60" W × 84" H
- Weight: 3,500 lbs
- CG Height: 42" = 3.5 ft
- Fp: 9,576 lbs
- Anchor spacing: 120" long × 60" trans

**Current (WRONG) Calculation:**
- Direction 1 (force along length):
  - Overturn moment = 9,576 × 3.5 = 33,516 lb-ft
  - Resisting moment = 0.9 × 3,500 × (60/2) / 12 = 7,875 lb-ft ← WRONG! Should use equipLength
  - Net uplift = 33,516 - 7,875 = 25,641 lb-ft
  - Tension per anchor = 25,641 / (120/12) / 2 = 1,282 lbs ← This is close to the 3,205 lbs the calculator shows

Wait, that doesn't match either. Let me check the actual values...

Actually, I need to verify which direction is governing and trace through the exact calculation the code is doing.

## Summary

The bug is in **lines 37 and 44** where the resisting moment arms are swapped:
- Line 37 should use `equipLength / 2` instead of `equipWidth / 2`
- Line 44 should use `equipWidth / 2` instead of `equipLength / 2`

This causes the calculator to under-estimate the resisting moment, which leads to over-estimating the net uplift moment, but then... wait, that would OVER-predict tension, not under-predict.

Let me re-read the code more carefully...

## ACTUAL BUG FOUND

Looking at lines 37 and 44 again:

```typescript
const resistingMoment1 = (0.9 * equipmentProperties.weight * (equipWidth / 2)) / 12; // lb-ft
const resistingMoment2 = (0.9 * equipmentProperties.weight * (equipLength / 2)) / 12; // lb-ft
```

**Direction 1**: Force along LENGTH, overturn about WIDTH
- Should use **equipLength / 2** for resisting moment arm
- Currently uses **equipWidth / 2** ← WRONG!

**Direction 2**: Force along WIDTH, overturn about LENGTH  
- Should use **equipWidth / 2** for resisting moment arm
- Currently uses **equipLength / 2** ← WRONG!

**They are SWAPPED!**

When equipment is longer than it is wide (120" × 60"), using the smaller dimension (width) when you should use the larger dimension (length) will:
1. Under-estimate the resisting moment
2. Over-estimate the net uplift moment
3. Over-estimate the tension demand

But wait... the bug shows UNDER-estimation of tension, not over-estimation!

This means the code must be selecting the WRONG direction as governing!

Let me trace through VP3:
- Equipment: 120" L × 60" W
- Fp = 9,576 lbs, CG = 42" = 3.5 ft

**Direction 1 (WRONG code):**
- Overturn = 9,576 × 3.5 = 33,516 lb-ft
- Resisting = 0.9 × 3,500 × 30 / 12 = 7,875 lb-ft (using width/2 = 30")
- Net = 25,641 lb-ft
- Moment arm for tension = longSpacing = 120" = 10 ft
- Total tension = 25,641 / 10 = 2,564 lbs
- Tension per anchor = 2,564 / 2 × 2.5 (omegaO) = 3,205 lbs ← MATCHES CALCULATOR!

**Direction 2 (WRONG code):**
- Overturn = 9,576 × 3.5 = 33,516 lb-ft
- Resisting = 0.9 × 3,500 × 60 / 12 = 15,750 lb-ft (using length/2 = 60")
- Net = 17,766 lb-ft
- Moment arm for tension = transSpacing = 60" = 5 ft
- Total tension = 17,766 / 5 = 3,553 lbs
- Tension per anchor = 3,553 / 2 × 2.5 = 4,441 lbs

**The code selects Direction 1 (net = 25,641) as governing because 25,641 > 17,766**

But this is WRONG! Direction 2 should have:
- Resisting = 0.9 × 3,500 × 30 / 12 = 7,875 lb-ft (using WIDTH/2 = 30", not length!)
- Net = 33,516 - 7,875 = 25,641 lb-ft
- Total tension = 25,641 / 5 = 5,128 lbs
- Tension per anchor = 5,128 / 2 × 2.5 = 6,410 lbs ← This would be the correct answer!

**CONFIRMED: The resisting moment arms are SWAPPED, causing the wrong direction to govern and under-estimating tension!**
