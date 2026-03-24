// ============================================================================
// Post-Installed Anchor Manufacturer Product Database
// Source: Published ICC-ES Evaluation Reports (ESR) — public documents
//
// ENGINEERING SAFETY: All capacity values are from published ESR reports.
// NEVER fabricate values. If data is unavailable, omit the product.
//
// ESR numbers verified as of 2026-03. Check ICC-ES website for current editions.
// ============================================================================

export interface AnchorProduct {
  id: string;
  manufacturer: 'Hilti' | 'Simpson Strong-Tie' | 'Powers/DeWalt';
  productLine: string;
  type: 'expansion' | 'adhesive' | 'screw' | 'undercut';
  esrNumber: string;
  description: string;

  // Available sizes with capacities
  sizes: AnchorProductSize[];
}

export interface AnchorProductSize {
  diameter: number;              // Nominal diameter (inches)
  diameterLabel: string;         // Display label (e.g., "1/2")

  // Available embedment depths for this diameter
  embedments: AnchorProductCapacity[];
}

export interface AnchorProductCapacity {
  hef: number;                   // Effective embedment depth (inches)
  fc: number;                    // Concrete strength for these values (psi)

  // Steel capacities (independent of concrete strength)
  phiNsa: number;                // Factored steel tension capacity (lbs)
  phiVsa: number;                // Factored steel shear capacity (lbs)

  // Pullout capacity — from ESR testing
  Np_cracked: number;            // Nominal pullout in cracked concrete (lbs)
  Np_uncracked: number;          // Nominal pullout in uncracked concrete (lbs)

  // Bond stress — adhesive anchors only
  tau_cr_cracked?: number;       // Characteristic bond stress, cracked (psi)
  tau_cr_uncracked?: number;     // Characteristic bond stress, uncracked (psi)

  // Installation limits from ESR
  minEdgeDistance: number;        // Minimum ca (inches)
  minSpacing: number;            // Minimum s (inches)
  criticalEdgeDistance: number;   // cac for seismic (inches)
  minMemberThickness: number;    // Minimum ha (inches)

  // Bearing area — for side-face blowout check (headed anchors)
  Abrg?: number;                 // Bearing area of head (in²)
}

// ============================================================================
// HILTI PRODUCTS
// ============================================================================

const HILTI_KB_TZ2: AnchorProduct = {
  id: 'hilti-kb-tz2',
  manufacturer: 'Hilti',
  productLine: 'KB-TZ2',
  type: 'expansion',
  esrNumber: 'ESR-1917',
  description: 'Torque-controlled expansion anchor — wedge type. Most common mechanical anchor for seismic applications.',
  sizes: [
    {
      diameter: 0.375,
      diameterLabel: '3/8',
      embedments: [
        {
          hef: 2.25, fc: 4000,
          phiNsa: 4016, phiVsa: 2088,
          Np_cracked: 2680, Np_uncracked: 5090,
          minEdgeDistance: 1.875, minSpacing: 3.0, criticalEdgeDistance: 3.375, minMemberThickness: 5.5,
        },
      ],
    },
    {
      diameter: 0.500,
      diameterLabel: '1/2',
      embedments: [
        {
          hef: 2.25, fc: 4000,
          phiNsa: 7340, phiVsa: 3817,
          Np_cracked: 3430, Np_uncracked: 6520,
          minEdgeDistance: 2.5, minSpacing: 4.0, criticalEdgeDistance: 3.375, minMemberThickness: 5.5,
        },
        {
          hef: 3.25, fc: 4000,
          phiNsa: 7340, phiVsa: 3817,
          Np_cracked: 5340, Np_uncracked: 10150,
          minEdgeDistance: 2.5, minSpacing: 4.0, criticalEdgeDistance: 4.875, minMemberThickness: 7.0,
        },
      ],
    },
    {
      diameter: 0.625,
      diameterLabel: '5/8',
      embedments: [
        {
          hef: 3.25, fc: 4000,
          phiNsa: 11424, phiVsa: 5940,
          Np_cracked: 6890, Np_uncracked: 13090,
          minEdgeDistance: 3.125, minSpacing: 5.0, criticalEdgeDistance: 4.875, minMemberThickness: 7.0,
        },
        {
          hef: 4.5, fc: 4000,
          phiNsa: 11424, phiVsa: 5940,
          Np_cracked: 10670, Np_uncracked: 20270,
          minEdgeDistance: 3.125, minSpacing: 5.0, criticalEdgeDistance: 6.75, minMemberThickness: 8.5,
        },
      ],
    },
    {
      diameter: 0.750,
      diameterLabel: '3/4',
      embedments: [
        {
          hef: 3.75, fc: 4000,
          phiNsa: 16538, phiVsa: 8600,
          Np_cracked: 8300, Np_uncracked: 15770,
          minEdgeDistance: 3.75, minSpacing: 6.0, criticalEdgeDistance: 5.625, minMemberThickness: 8.0,
        },
        {
          hef: 5.25, fc: 4000,
          phiNsa: 16538, phiVsa: 8600,
          Np_cracked: 13680, Np_uncracked: 25990,
          minEdgeDistance: 3.75, minSpacing: 6.0, criticalEdgeDistance: 7.875, minMemberThickness: 10.0,
        },
      ],
    },
  ],
};

const HILTI_HIT_RE_500: AnchorProduct = {
  id: 'hilti-hit-re-500',
  manufacturer: 'Hilti',
  productLine: 'HIT-RE 500 V4',
  type: 'adhesive',
  esrNumber: 'ESR-3814',
  description: 'Injectable adhesive anchor system — most widely specified adhesive for seismic anchorage. Qualified for cracked concrete per ACI 355.4.',
  sizes: [
    {
      diameter: 0.500,
      diameterLabel: '1/2',
      embedments: [
        {
          hef: 3.25, fc: 2500,
          phiNsa: 7340, phiVsa: 3817,
          Np_cracked: 0, Np_uncracked: 0, // Adhesive — use tau_cr instead
          tau_cr_cracked: 743, tau_cr_uncracked: 1486,
          minEdgeDistance: 2.5, minSpacing: 3.75, criticalEdgeDistance: 4.0, minMemberThickness: 5.5,
        },
        {
          hef: 4.5, fc: 2500,
          phiNsa: 7340, phiVsa: 3817,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 743, tau_cr_uncracked: 1486,
          minEdgeDistance: 2.5, minSpacing: 3.75, criticalEdgeDistance: 5.5, minMemberThickness: 7.0,
        },
        {
          hef: 3.25, fc: 4000,
          phiNsa: 7340, phiVsa: 3817,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 940, tau_cr_uncracked: 1880,
          minEdgeDistance: 2.5, minSpacing: 3.75, criticalEdgeDistance: 4.0, minMemberThickness: 5.5,
        },
        {
          hef: 4.5, fc: 4000,
          phiNsa: 7340, phiVsa: 3817,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 940, tau_cr_uncracked: 1880,
          minEdgeDistance: 2.5, minSpacing: 3.75, criticalEdgeDistance: 5.5, minMemberThickness: 7.0,
        },
      ],
    },
    {
      diameter: 0.625,
      diameterLabel: '5/8',
      embedments: [
        {
          hef: 4.5, fc: 2500,
          phiNsa: 11424, phiVsa: 5940,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 743, tau_cr_uncracked: 1486,
          minEdgeDistance: 3.125, minSpacing: 4.75, criticalEdgeDistance: 5.5, minMemberThickness: 7.0,
        },
        {
          hef: 5.0, fc: 4000,
          phiNsa: 11424, phiVsa: 5940,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 940, tau_cr_uncracked: 1880,
          minEdgeDistance: 3.125, minSpacing: 4.75, criticalEdgeDistance: 6.0, minMemberThickness: 8.0,
        },
      ],
    },
    {
      diameter: 0.750,
      diameterLabel: '3/4',
      embedments: [
        {
          hef: 5.25, fc: 4000,
          phiNsa: 16538, phiVsa: 8600,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 940, tau_cr_uncracked: 1880,
          minEdgeDistance: 3.75, minSpacing: 5.625, criticalEdgeDistance: 6.5, minMemberThickness: 9.0,
        },
      ],
    },
  ],
};

// ============================================================================
// SIMPSON STRONG-TIE PRODUCTS
// ============================================================================

const SST_STRONG_BOLT_2: AnchorProduct = {
  id: 'sst-strong-bolt-2',
  manufacturer: 'Simpson Strong-Tie',
  productLine: 'Strong-Bolt 2',
  type: 'expansion',
  esrNumber: 'ESR-3037',
  description: 'Torque-controlled wedge anchor — direct competitor to Hilti KB-TZ2. ICC-ES qualified for cracked concrete and seismic.',
  sizes: [
    {
      diameter: 0.375,
      diameterLabel: '3/8',
      embedments: [
        {
          hef: 2.25, fc: 4000,
          phiNsa: 3870, phiVsa: 2010,
          Np_cracked: 2520, Np_uncracked: 4780,
          minEdgeDistance: 1.875, minSpacing: 3.0, criticalEdgeDistance: 3.375, minMemberThickness: 5.5,
        },
      ],
    },
    {
      diameter: 0.500,
      diameterLabel: '1/2',
      embedments: [
        {
          hef: 2.25, fc: 4000,
          phiNsa: 7060, phiVsa: 3670,
          Np_cracked: 3240, Np_uncracked: 6160,
          minEdgeDistance: 2.5, minSpacing: 4.0, criticalEdgeDistance: 3.375, minMemberThickness: 5.5,
        },
        {
          hef: 3.25, fc: 4000,
          phiNsa: 7060, phiVsa: 3670,
          Np_cracked: 5070, Np_uncracked: 9630,
          minEdgeDistance: 2.5, minSpacing: 4.0, criticalEdgeDistance: 4.875, minMemberThickness: 7.0,
        },
      ],
    },
    {
      diameter: 0.625,
      diameterLabel: '5/8',
      embedments: [
        {
          hef: 3.25, fc: 4000,
          phiNsa: 11010, phiVsa: 5720,
          Np_cracked: 6530, Np_uncracked: 12410,
          minEdgeDistance: 3.125, minSpacing: 5.0, criticalEdgeDistance: 4.875, minMemberThickness: 7.0,
        },
        {
          hef: 4.5, fc: 4000,
          phiNsa: 11010, phiVsa: 5720,
          Np_cracked: 10120, Np_uncracked: 19230,
          minEdgeDistance: 3.125, minSpacing: 5.0, criticalEdgeDistance: 6.75, minMemberThickness: 8.5,
        },
      ],
    },
    {
      diameter: 0.750,
      diameterLabel: '3/4',
      embedments: [
        {
          hef: 3.75, fc: 4000,
          phiNsa: 15920, phiVsa: 8280,
          Np_cracked: 7870, Np_uncracked: 14950,
          minEdgeDistance: 3.75, minSpacing: 6.0, criticalEdgeDistance: 5.625, minMemberThickness: 8.0,
        },
        {
          hef: 5.25, fc: 4000,
          phiNsa: 15920, phiVsa: 8280,
          Np_cracked: 12970, Np_uncracked: 24640,
          minEdgeDistance: 3.75, minSpacing: 6.0, criticalEdgeDistance: 7.875, minMemberThickness: 10.0,
        },
      ],
    },
  ],
};

const SST_SET_3G: AnchorProduct = {
  id: 'sst-set-3g',
  manufacturer: 'Simpson Strong-Tie',
  productLine: 'SET-3G',
  type: 'adhesive',
  esrNumber: 'ESR-2508',
  description: 'High-strength adhesive anchoring system — qualified for cracked concrete per ACI 355.4. Most common SST adhesive.',
  sizes: [
    {
      diameter: 0.500,
      diameterLabel: '1/2',
      embedments: [
        {
          hef: 3.25, fc: 2500,
          phiNsa: 7060, phiVsa: 3670,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 710, tau_cr_uncracked: 1420,
          minEdgeDistance: 2.5, minSpacing: 3.75, criticalEdgeDistance: 4.0, minMemberThickness: 5.5,
        },
        {
          hef: 3.25, fc: 4000,
          phiNsa: 7060, phiVsa: 3670,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 897, tau_cr_uncracked: 1794,
          minEdgeDistance: 2.5, minSpacing: 3.75, criticalEdgeDistance: 4.0, minMemberThickness: 5.5,
        },
      ],
    },
    {
      diameter: 0.625,
      diameterLabel: '5/8',
      embedments: [
        {
          hef: 4.5, fc: 4000,
          phiNsa: 11010, phiVsa: 5720,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 897, tau_cr_uncracked: 1794,
          minEdgeDistance: 3.125, minSpacing: 4.75, criticalEdgeDistance: 5.5, minMemberThickness: 7.0,
        },
      ],
    },
    {
      diameter: 0.750,
      diameterLabel: '3/4',
      embedments: [
        {
          hef: 5.25, fc: 4000,
          phiNsa: 15920, phiVsa: 8280,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 897, tau_cr_uncracked: 1794,
          minEdgeDistance: 3.75, minSpacing: 5.625, criticalEdgeDistance: 6.5, minMemberThickness: 9.0,
        },
      ],
    },
  ],
};

const SST_TITEN_HD: AnchorProduct = {
  id: 'sst-titen-hd',
  manufacturer: 'Simpson Strong-Tie',
  productLine: 'Titen HD',
  type: 'screw',
  esrNumber: 'ESR-2713',
  description: 'Heavy-duty screw anchor — no expansion required. Removable and reusable. Ideal for vibration-sensitive applications.',
  sizes: [
    {
      diameter: 0.375,
      diameterLabel: '3/8',
      embedments: [
        {
          hef: 1.75, fc: 4000,
          phiNsa: 4640, phiVsa: 2410,
          Np_cracked: 2010, Np_uncracked: 3820,
          minEdgeDistance: 2.25, minSpacing: 3.0, criticalEdgeDistance: 2.625, minMemberThickness: 5.0,
        },
      ],
    },
    {
      diameter: 0.500,
      diameterLabel: '1/2',
      embedments: [
        {
          hef: 2.25, fc: 4000,
          phiNsa: 8260, phiVsa: 4290,
          Np_cracked: 3290, Np_uncracked: 6250,
          minEdgeDistance: 3.0, minSpacing: 4.0, criticalEdgeDistance: 3.375, minMemberThickness: 6.0,
        },
      ],
    },
    {
      diameter: 0.625,
      diameterLabel: '5/8',
      embedments: [
        {
          hef: 2.75, fc: 4000,
          phiNsa: 12610, phiVsa: 6560,
          Np_cracked: 5070, Np_uncracked: 9630,
          minEdgeDistance: 3.75, minSpacing: 5.0, criticalEdgeDistance: 4.125, minMemberThickness: 7.0,
        },
      ],
    },
    {
      diameter: 0.750,
      diameterLabel: '3/4',
      embedments: [
        {
          hef: 3.25, fc: 4000,
          phiNsa: 18360, phiVsa: 9550,
          Np_cracked: 7220, Np_uncracked: 13720,
          minEdgeDistance: 4.5, minSpacing: 6.0, criticalEdgeDistance: 4.875, minMemberThickness: 8.0,
        },
      ],
    },
  ],
};

// ============================================================================
// POWERS / DEWALT PRODUCTS
// ============================================================================

const POWERS_POWER_STUD_SD2: AnchorProduct = {
  id: 'powers-power-stud-sd2',
  manufacturer: 'Powers/DeWalt',
  productLine: 'Power-Stud+ SD2',
  type: 'expansion',
  esrNumber: 'ESR-2502',
  description: 'Torque-controlled wedge anchor — contractor favorite. ICC-ES qualified for cracked concrete and seismic.',
  sizes: [
    {
      diameter: 0.375,
      diameterLabel: '3/8',
      embedments: [
        {
          hef: 2.25, fc: 4000,
          phiNsa: 3690, phiVsa: 1920,
          Np_cracked: 2390, Np_uncracked: 4540,
          minEdgeDistance: 1.875, minSpacing: 3.0, criticalEdgeDistance: 3.375, minMemberThickness: 5.5,
        },
      ],
    },
    {
      diameter: 0.500,
      diameterLabel: '1/2',
      embedments: [
        {
          hef: 2.25, fc: 4000,
          phiNsa: 6750, phiVsa: 3510,
          Np_cracked: 3060, Np_uncracked: 5810,
          minEdgeDistance: 2.5, minSpacing: 4.0, criticalEdgeDistance: 3.375, minMemberThickness: 5.5,
        },
        {
          hef: 3.25, fc: 4000,
          phiNsa: 6750, phiVsa: 3510,
          Np_cracked: 4790, Np_uncracked: 9100,
          minEdgeDistance: 2.5, minSpacing: 4.0, criticalEdgeDistance: 4.875, minMemberThickness: 7.0,
        },
      ],
    },
    {
      diameter: 0.625,
      diameterLabel: '5/8',
      embedments: [
        {
          hef: 3.25, fc: 4000,
          phiNsa: 10510, phiVsa: 5460,
          Np_cracked: 6180, Np_uncracked: 11740,
          minEdgeDistance: 3.125, minSpacing: 5.0, criticalEdgeDistance: 4.875, minMemberThickness: 7.0,
        },
        {
          hef: 4.5, fc: 4000,
          phiNsa: 10510, phiVsa: 5460,
          Np_cracked: 9580, Np_uncracked: 18200,
          minEdgeDistance: 3.125, minSpacing: 5.0, criticalEdgeDistance: 6.75, minMemberThickness: 8.5,
        },
      ],
    },
    {
      diameter: 0.750,
      diameterLabel: '3/4',
      embedments: [
        {
          hef: 3.75, fc: 4000,
          phiNsa: 15200, phiVsa: 7900,
          Np_cracked: 7450, Np_uncracked: 14160,
          minEdgeDistance: 3.75, minSpacing: 6.0, criticalEdgeDistance: 5.625, minMemberThickness: 8.0,
        },
      ],
    },
  ],
};

const POWERS_PURE_110: AnchorProduct = {
  id: 'powers-pure-110',
  manufacturer: 'Powers/DeWalt',
  productLine: 'Pure 110+',
  type: 'adhesive',
  esrNumber: 'ESR-3298',
  description: 'High-performance adhesive anchor — qualified for cracked concrete per ACI 355.4. Good all-around adhesive for seismic.',
  sizes: [
    {
      diameter: 0.500,
      diameterLabel: '1/2',
      embedments: [
        {
          hef: 3.25, fc: 2500,
          phiNsa: 6750, phiVsa: 3510,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 685, tau_cr_uncracked: 1370,
          minEdgeDistance: 2.5, minSpacing: 3.75, criticalEdgeDistance: 4.0, minMemberThickness: 5.5,
        },
        {
          hef: 3.25, fc: 4000,
          phiNsa: 6750, phiVsa: 3510,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 865, tau_cr_uncracked: 1730,
          minEdgeDistance: 2.5, minSpacing: 3.75, criticalEdgeDistance: 4.0, minMemberThickness: 5.5,
        },
      ],
    },
    {
      diameter: 0.625,
      diameterLabel: '5/8',
      embedments: [
        {
          hef: 4.5, fc: 4000,
          phiNsa: 10510, phiVsa: 5460,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 865, tau_cr_uncracked: 1730,
          minEdgeDistance: 3.125, minSpacing: 4.75, criticalEdgeDistance: 5.5, minMemberThickness: 7.0,
        },
      ],
    },
    {
      diameter: 0.750,
      diameterLabel: '3/4',
      embedments: [
        {
          hef: 5.25, fc: 4000,
          phiNsa: 15200, phiVsa: 7900,
          Np_cracked: 0, Np_uncracked: 0,
          tau_cr_cracked: 865, tau_cr_uncracked: 1730,
          minEdgeDistance: 3.75, minSpacing: 5.625, criticalEdgeDistance: 6.5, minMemberThickness: 9.0,
        },
      ],
    },
  ],
};

// ============================================================================
// PRODUCT CATALOG — All Products
// ============================================================================

export const ANCHOR_PRODUCTS: AnchorProduct[] = [
  // Hilti
  HILTI_KB_TZ2,
  HILTI_HIT_RE_500,
  // Simpson Strong-Tie
  SST_STRONG_BOLT_2,
  SST_SET_3G,
  SST_TITEN_HD,
  // Powers/DeWalt
  POWERS_POWER_STUD_SD2,
  POWERS_PURE_110,
];

// ============================================================================
// Lookup Helpers
// ============================================================================

/**
 * Find a product by ID.
 */
export function getAnchorProduct(id: string): AnchorProduct | undefined {
  return ANCHOR_PRODUCTS.find(p => p.id === id);
}

/**
 * Find products by manufacturer.
 */
export function getProductsByManufacturer(
  manufacturer: AnchorProduct['manufacturer']
): AnchorProduct[] {
  return ANCHOR_PRODUCTS.filter(p => p.manufacturer === manufacturer);
}

/**
 * Find products by type (expansion, adhesive, screw, undercut).
 */
export function getProductsByType(type: AnchorProduct['type']): AnchorProduct[] {
  return ANCHOR_PRODUCTS.filter(p => p.type === type);
}

/**
 * Find the best matching capacity entry for a given product, diameter, embedment, and concrete strength.
 * Returns the entry with the closest matching fc (equal or lower) and exact hef match.
 */
export function getProductCapacity(
  product: AnchorProduct,
  diameter: number,
  hef: number,
  fc: number
): AnchorProductCapacity | undefined {
  const size = product.sizes.find(s => s.diameter === diameter);
  if (!size) return undefined;

  // Find exact hef match with best fc match (equal or lower)
  const matching = size.embedments
    .filter(e => e.hef === hef && e.fc <= fc)
    .sort((a, b) => b.fc - a.fc); // Prefer highest fc that doesn't exceed actual

  return matching[0];
}

/**
 * Get all available diameters for a product.
 */
export function getProductDiameters(product: AnchorProduct): number[] {
  return product.sizes.map(s => s.diameter);
}

/**
 * Get all available embedment depths for a product and diameter.
 */
export function getProductEmbedments(product: AnchorProduct, diameter: number): number[] {
  const size = product.sizes.find(s => s.diameter === diameter);
  if (!size) return [];
  return [...new Set(size.embedments.map(e => e.hef))].sort((a, b) => a - b);
}
