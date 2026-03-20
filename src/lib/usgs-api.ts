// ============================================================================
// USGS Seismic Data Integration + Geocoding
// Uses USGS Design Maps API (asce7-22 endpoint if available, falls back to asce7-16)
// Spectral values (SDS, SD1) are the same between 7-16 and 7-22 — only Ch.13 changed.
// ============================================================================

export interface USGSResponse {
  SDS: number;
  SD1: number;
  Ss: number;
  S1: number;
  seismicDesignCategory: string;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Fetch seismic design parameters from USGS Design Maps API.
 * Tries ASCE 7-22 endpoint first; falls back to ASCE 7-16 if not available.
 * The spectral acceleration values are identical between the two editions.
 */
export async function fetchSeismicData(
  latitude: number,
  longitude: number,
  riskCategory: string,
  siteClass: string
): Promise<USGSResponse> {
  // Map site class for API (ASCE 7-22 uses different naming)
  const siteClassForApi = mapSiteClass(siteClass);

  // Try ASCE 7-22 first, fall back to 7-16
  const endpoints = [
    'https://earthquake.usgs.gov/ws/designmaps/asce7-22.json',
    'https://earthquake.usgs.gov/ws/designmaps/asce7-16.json',
  ];

  for (const baseUrl of endpoints) {
    try {
      const url =
        `${baseUrl}?latitude=${latitude}&longitude=${longitude}` +
        `&riskCategory=${riskCategory}&siteClass=${siteClassForApi}` +
        `&title=Equipment+Anchorage`;

      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();

      if (data?.response?.data) {
        const d = data.response.data;
        return {
          SDS: parseFloat(d.sds) || 0,
          SD1: parseFloat(d.sd1) || 0,
          Ss: parseFloat(d.ss) || 0,
          S1: parseFloat(d.s1) || 0,
          seismicDesignCategory: d.sdc || '',
        };
      }
    } catch {
      // Try next endpoint
      continue;
    }
  }

  throw new Error(
    'Unable to fetch seismic data from USGS. Please enter values manually.'
  );
}

/**
 * Map ASCE 7-22 site classes to USGS API format.
 * ASCE 7-22 added intermediate classes (BC, CD, DE).
 * USGS API may only support A-F, so map to the more conservative class.
 */
function mapSiteClass(siteClass: string): string {
  const mapping: Record<string, string> = {
    A: 'A',
    B: 'B',
    BC: 'C',   // Conservative: use C for BC
    C: 'C',
    CD: 'D',   // Conservative: use D for CD
    D: 'D',
    DE: 'E',   // Conservative: use E for DE
    E: 'E',
    F: 'F',
  };
  return mapping[siteClass] || 'D'; // Default to D if unknown
}

/**
 * Geocode an address using the US Census Geocoder API (free, no key required).
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult> {
  const encoded = encodeURIComponent(address);
  const url =
    `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress` +
    `?address=${encoded}&benchmark=2020&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Geocoding request failed');
  }

  const data = await response.json();
  const matches = data?.result?.addressMatches;

  if (!matches || matches.length === 0) {
    throw new Error(
      'Address not found. Try a more specific address or enter coordinates manually.'
    );
  }

  const match = matches[0];
  return {
    latitude: parseFloat(match.coordinates.y),
    longitude: parseFloat(match.coordinates.x),
    formattedAddress: match.matchedAddress,
  };
}

/**
 * Determine Seismic Design Category from SDS, SD1, and Risk Category.
 * Per ASCE 7-22 Tables 11.6-1 and 11.6-2.
 */
export function determineSDC(
  SDS: number,
  SD1: number,
  riskCategory: string
): string {
  // Table 11.6-1 (Short period)
  let sdcShort: string;
  if (riskCategory === 'I' || riskCategory === 'II' || riskCategory === 'III') {
    if (SDS < 0.167) sdcShort = 'A';
    else if (SDS < 0.33) sdcShort = 'B';
    else if (SDS < 0.50) sdcShort = 'C';
    else sdcShort = 'D';
  } else {
    // Risk Category IV
    if (SDS < 0.167) sdcShort = 'A';
    else if (SDS < 0.33) sdcShort = 'C';
    else if (SDS < 0.50) sdcShort = 'D';
    else sdcShort = 'D';
  }

  // Table 11.6-2 (1-second period)
  let sdc1s: string;
  if (riskCategory === 'I' || riskCategory === 'II' || riskCategory === 'III') {
    if (SD1 < 0.067) sdc1s = 'A';
    else if (SD1 < 0.133) sdc1s = 'B';
    else if (SD1 < 0.20) sdc1s = 'C';
    else sdc1s = 'D';
  } else {
    if (SD1 < 0.067) sdc1s = 'A';
    else if (SD1 < 0.133) sdc1s = 'C';
    else if (SD1 < 0.20) sdc1s = 'D';
    else sdc1s = 'D';
  }

  // SDC is the more severe of the two
  const order = ['A', 'B', 'C', 'D', 'E', 'F'];
  return order.indexOf(sdcShort) >= order.indexOf(sdc1s) ? sdcShort : sdc1s;
}
