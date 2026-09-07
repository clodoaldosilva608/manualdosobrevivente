/**
 * Referência aproximada de litoral: pontos costeiros amostrados (densos no
 * Brasil, esparsos no restante do mundo) para estimar direção e distância
 * até o mar mais próximo sem depender de rede.
 */

const COAST: Array<[number, number]> = [
  // Brasil — norte para sul (lat, lng)
  [4.4, -51.6],
  [1.8, -50.2],
  [-0.6, -47.3],
  [-2.5, -44.3],
  [-2.9, -41.7],
  [-3.7, -38.5],
  [-5.1, -36.2],
  [-6.9, -34.8],
  [-8.05, -34.87],
  [-9.66, -35.7],
  [-10.9, -37.05],
  [-12.97, -38.5],
  [-14.8, -39.0],
  [-16.4, -39.0],
  [-18.6, -39.75],
  [-20.3, -40.29],
  [-21.75, -41.0],
  [-22.9, -43.17],
  [-23.5, -45.1],
  [-24.0, -46.4],
  [-25.5, -48.5],
  [-26.9, -48.65],
  [-27.6, -48.55],
  [-28.9, -49.6],
  [-30.0, -50.2],
  [-31.8, -52.2],
  [-33.7, -53.4],
  // América do Sul — costa oeste e norte
  [-34.6, -58.4],
  [-38.0, -57.5],
  [-42.8, -65.0],
  [-51.6, -69.2],
  [-53.1, -70.9],
  [-41.5, -73.8],
  [-33.0, -71.6],
  [-23.6, -70.4],
  [-12.0, -77.1],
  [-2.2, -80.9],
  [4.0, -77.3],
  [10.4, -75.5],
  [10.6, -61.5],
  [5.8, -55.2],
  // Outros continentes (amostra grosseira)
  [25.8, -80.2],
  [40.7, -74.0],
  [47.6, -122.3],
  [34.0, -118.5],
  [19.4, -96.1],
  [64.1, -21.9],
  [51.5, -0.1],
  [43.3, 5.4],
  [38.7, -9.1],
  [36.8, 10.2],
  [30.0, 31.2],
  [-4.0, 39.7],
  [-33.9, 18.4],
  [-26.0, 32.6],
  [12.8, 45.0],
  [19.1, 72.9],
  [13.1, 80.3],
  [1.3, 103.8],
  [22.3, 114.2],
  [35.7, 139.8],
  [-33.9, 151.2],
  [-37.8, 144.9],
  [-41.3, 174.8],
  [-6.2, 106.8],
  [60.0, 30.3],
  [70.7, 23.7],
];

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearing(aLat: number, aLng: number, bLat: number, bLng: number) {
  const y = Math.sin(rad(bLng - aLng)) * Math.cos(rad(bLat));
  const x =
    Math.cos(rad(aLat)) * Math.sin(rad(bLat)) -
    Math.sin(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLng - aLng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "L",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSO",
  "SO",
  "OSO",
  "O",
  "ONO",
  "NO",
  "NNO",
];

export function compassPoint(bearingDeg: number): string {
  return POINTS[Math.round((((bearingDeg % 360) + 360) % 360) / 22.5) % 16];
}

export interface CoastInfo {
  bearing: number;
  point: string;
  distanceMeters: number;
}

/** Direção e distância aproximada até o litoral mais próximo. */
export function nearestCoast(lng: number, lat: number): CoastInfo {
  let best = COAST[0];
  let bestD = Infinity;
  for (const c of COAST) {
    const d = haversine(lat, lng, c[0], c[1]);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  const b = bearing(lat, lng, best[0], best[1]);
  return { bearing: b, point: compassPoint(b), distanceMeters: bestD };
}
