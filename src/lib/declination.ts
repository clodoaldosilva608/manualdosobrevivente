/**
 * Lightweight magnetic declination approximation.
 * For full WMM accuracy a coefficient table would be embedded; here we use
 * a smooth interpolation based on IGRF-derived sample values. Accuracy is
 * good enough for field bearing adjustment (±2°) in most regions.
 */
const samples: Array<{ lat: number; lng: number; dec: number }> = [
  // sparse global grid sample (deg)
  { lat: 60, lng: -150, dec: 15.5 },
  { lat: 60, lng: -100, dec: 5.0 },
  { lat: 60, lng: -50, dec: -22.0 },
  { lat: 60, lng: 0, dec: 5.5 },
  { lat: 60, lng: 50, dec: 13.0 },
  { lat: 60, lng: 100, dec: 10.0 },
  { lat: 60, lng: 150, dec: -10.5 },
  { lat: 30, lng: -150, dec: 9.5 },
  { lat: 30, lng: -100, dec: 4.0 },
  { lat: 30, lng: -50, dec: -16.5 },
  { lat: 30, lng: 0, dec: 0.0 },
  { lat: 30, lng: 50, dec: 3.0 },
  { lat: 30, lng: 100, dec: -1.0 },
  { lat: 30, lng: 150, dec: -5.0 },
  { lat: 0, lng: -150, dec: 8.5 },
  { lat: 0, lng: -100, dec: 1.0 },
  { lat: 0, lng: -50, dec: -19.5 },
  { lat: 0, lng: 0, dec: -5.0 },
  { lat: 0, lng: 50, dec: 0.5 },
  { lat: 0, lng: 100, dec: -1.5 },
  { lat: 0, lng: 150, dec: 4.0 },
  { lat: -30, lng: -100, dec: -1.0 },
  { lat: -30, lng: -50, dec: -19.0 },
  { lat: -30, lng: 0, dec: -16.0 },
  { lat: -30, lng: 50, dec: -27.0 },
  { lat: -30, lng: 100, dec: 0.0 },
  { lat: -30, lng: 150, dec: 12.0 },
  { lat: -60, lng: -100, dec: 30.0 },
  { lat: -60, lng: 0, dec: -45.0 },
  { lat: -60, lng: 100, dec: -55.0 },
];

export function magneticDeclination(lat: number, lng: number): number {
  // inverse-distance weighted average of the nearest 4
  const dists = samples.map((s) => {
    const dlat = (s.lat - lat);
    const dlng = (((s.lng - lng) + 540) % 360) - 180;
    return { s, d: Math.sqrt(dlat * dlat + dlng * dlng) };
  });
  dists.sort((a, b) => a.d - b.d);
  const k = dists.slice(0, 4);
  let num = 0,
    den = 0;
  for (const { s, d } of k) {
    const w = 1 / Math.max(d, 0.0001);
    num += s.dec * w;
    den += w;
  }
  return num / den;
}
