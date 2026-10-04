/**
 * Centroides de países — usados para geolocalizar as manchetes GDELT
 * (camada "Notícias ao vivo" do mapa tático). O campo sourcecountry da API
 * GDELT traz o nome do país em inglês; a tabela mapeia esse nome para um
 * ponto aproximado no território (referência curada, precisão de ~100 km).
 *
 * A camada serve para situar de onde vem a cobertura jornalística — não
 * indica onde o evento aconteceu.
 */
export interface EntradaPais {
  /** Nome do país em inglês (como a GDELT escreve em sourcecountry). */
  en: string;
  lng: number;
  lat: number;
}

export const PAIS_CENTROIDES: EntradaPais[] = [
  { en: "Brazil", lng: -51.9, lat: -10.8 },
  { en: "United States", lng: -97.0, lat: 39.5 },
  { en: "USA", lng: -97.0, lat: 39.5 },
  { en: "United Kingdom", lng: -1.5, lat: 52.6 },
  { en: "UK", lng: -1.5, lat: 52.6 },
  { en: "Canada", lng: -97.0, lat: 57.0 },
  { en: "Mexico", lng: -102.5, lat: 23.9 },
  { en: "Argentina", lng: -64.2, lat: -34.6 },
  { en: "Chile", lng: -71.0, lat: -33.5 },
  { en: "Colombia", lng: -73.1, lat: 4.1 },
  { en: "Peru", lng: -75.0, lat: -9.2 },
  { en: "Venezuela", lng: -66.2, lat: 7.1 },
  { en: "Ecuador", lng: -78.5, lat: -1.4 },
  { en: "Bolivia", lng: -64.7, lat: -16.7 },
  { en: "Paraguay", lng: -58.4, lat: -23.4 },
  { en: "Uruguay", lng: -56.0, lat: -32.8 },
  { en: "Panama", lng: -80.1, lat: 8.5 },
  { en: "Costa Rica", lng: -84.2, lat: 9.9 },
  { en: "Guatemala", lng: -90.4, lat: 15.7 },
  { en: "Honduras", lng: -86.6, lat: 14.8 },
  { en: "Nicaragua", lng: -85.0, lat: 12.9 },
  { en: "El Salvador", lng: -88.9, lat: 13.7 },
  { en: "Cuba", lng: -79.5, lat: 21.6 },
  { en: "Dominican Republic", lng: -70.5, lat: 18.9 },
  { en: "Haiti", lng: -72.7, lat: 18.9 },
  { en: "Jamaica", lng: -77.3, lat: 18.1 },
  { en: "Puerto Rico", lng: -66.4, lat: 18.2 },
  { en: "France", lng: 2.5, lat: 46.6 },
  { en: "Germany", lng: 10.4, lat: 51.2 },
  { en: "Spain", lng: -3.7, lat: 40.2 },
  { en: "Italy", lng: 12.5, lat: 42.8 },
  { en: "Portugal", lng: -8.2, lat: 39.6 },
  { en: "Ireland", lng: -8.0, lat: 53.2 },
  { en: "Netherlands", lng: 5.6, lat: 52.2 },
  { en: "Belgium", lng: 4.5, lat: 50.6 },
  { en: "Switzerland", lng: 8.2, lat: 46.8 },
  { en: "Austria", lng: 14.1, lat: 47.6 },
  { en: "Poland", lng: 19.1, lat: 52.1 },
  { en: "Czechia", lng: 15.3, lat: 49.8 },
  { en: "Czech Republic", lng: 15.3, lat: 49.8 },
  { en: "Slovakia", lng: 19.7, lat: 48.7 },
  { en: "Hungary", lng: 19.4, lat: 47.2 },
  { en: "Romania", lng: 25.0, lat: 45.9 },
  { en: "Bulgaria", lng: 25.2, lat: 42.8 },
  { en: "Greece", lng: 22.5, lat: 39.1 },
  { en: "Croatia", lng: 15.2, lat: 45.1 },
  { en: "Serbia", lng: 20.8, lat: 44.0 },
  { en: "Sweden", lng: 15.5, lat: 62.2 },
  { en: "Norway", lng: 9.5, lat: 61.5 },
  { en: "Denmark", lng: 9.4, lat: 56.0 },
  { en: "Finland", lng: 26.0, lat: 64.5 },
  { en: "Iceland", lng: -18.6, lat: 64.9 },
  { en: "Russia", lng: 97.0, lat: 61.5 },
  { en: "Ukraine", lng: 31.2, lat: 48.9 },
  { en: "Belarus", lng: 27.9, lat: 53.5 },
  { en: "Turkey", lng: 35.2, lat: 39.0 },
  { en: "Georgia", lng: 43.4, lat: 42.2 },
  { en: "Armenia", lng: 45.0, lat: 40.3 },
  { en: "Azerbaijan", lng: 47.6, lat: 40.3 },
  { en: "Kazakhstan", lng: 67.3, lat: 48.2 },
  { en: "China", lng: 104.2, lat: 35.4 },
  { en: "Taiwan", lng: 121.0, lat: 23.7 },
  { en: "Japan", lng: 138.5, lat: 36.2 },
  { en: "South Korea", lng: 127.8, lat: 36.4 },
  { en: "North Korea", lng: 127.2, lat: 40.0 },
  { en: "India", lng: 79.6, lat: 22.9 },
  { en: "Pakistan", lng: 69.4, lat: 30.4 },
  { en: "Bangladesh", lng: 90.3, lat: 23.7 },
  { en: "Sri Lanka", lng: 80.7, lat: 7.6 },
  { en: "Nepal", lng: 84.1, lat: 28.3 },
  { en: "Afghanistan", lng: 66.0, lat: 33.8 },
  { en: "Indonesia", lng: 117.3, lat: -0.8 },
  { en: "Malaysia", lng: 109.7, lat: 4.2 },
  { en: "Singapore", lng: 103.8, lat: 1.35 },
  { en: "Philippines", lng: 122.9, lat: 11.8 },
  { en: "Vietnam", lng: 108.3, lat: 14.1 },
  { en: "Thailand", lng: 100.9, lat: 15.1 },
  { en: "Myanmar", lng: 96.5, lat: 21.2 },
  { en: "Cambodia", lng: 104.9, lat: 12.6 },
  { en: "Australia", lng: 134.5, lat: -25.3 },
  { en: "New Zealand", lng: 172.8, lat: -41.8 },
  { en: "Israel", lng: 34.9, lat: 31.4 },
  { en: "Palestine", lng: 35.2, lat: 31.9 },
  { en: "Lebanon", lng: 35.9, lat: 33.9 },
  { en: "Syria", lng: 38.5, lat: 35.0 },
  { en: "Jordan", lng: 36.8, lat: 31.2 },
  { en: "Iraq", lng: 43.7, lat: 33.0 },
  { en: "Iran", lng: 53.7, lat: 32.4 },
  { en: "Saudi Arabia", lng: 45.1, lat: 24.1 },
  { en: "United Arab Emirates", lng: 54.2, lat: 23.9 },
  { en: "Qatar", lng: 51.2, lat: 25.3 },
  { en: "Kuwait", lng: 47.5, lat: 29.3 },
  { en: "Oman", lng: 56.1, lat: 20.6 },
  { en: "Yemen", lng: 47.5, lat: 15.9 },
  { en: "Egypt", lng: 30.8, lat: 26.6 },
  { en: "Libya", lng: 17.9, lat: 27.0 },
  { en: "Tunisia", lng: 9.6, lat: 34.1 },
  { en: "Algeria", lng: 2.6, lat: 28.0 },
  { en: "Morocco", lng: -6.8, lat: 31.9 },
  { en: "Sudan", lng: 30.2, lat: 15.6 },
  { en: "Ethiopia", lng: 39.6, lat: 9.1 },
  { en: "Somalia", lng: 45.9, lat: 5.2 },
  { en: "Kenya", lng: 37.9, lat: 0.2 },
  { en: "Tanzania", lng: 34.8, lat: -6.4 },
  { en: "Uganda", lng: 32.4, lat: 1.4 },
  { en: "Rwanda", lng: 29.9, lat: -2.0 },
  { en: "Nigeria", lng: 8.1, lat: 9.6 },
  { en: "Ghana", lng: -1.2, lat: 7.9 },
  { en: "Ivory Coast", lng: -5.6, lat: 7.5 },
  { en: "Cote d'Ivoire", lng: -5.6, lat: 7.5 },
  { en: "Senegal", lng: -14.5, lat: 14.4 },
  { en: "Mali", lng: -4.0, lat: 17.4 },
  { en: "Niger", lng: 8.1, lat: 17.6 },
  { en: "Chad", lng: 18.7, lat: 15.5 },
  { en: "Guinea", lng: -10.9, lat: 10.4 },
  { en: "Cameroon", lng: 12.7, lat: 5.7 },
  { en: "Angola", lng: 17.5, lat: -12.3 },
  { en: "Mozambique", lng: 35.5, lat: -18.7 },
  { en: "Zambia", lng: 27.8, lat: -13.5 },
  { en: "Zimbabwe", lng: 29.7, lat: -19.0 },
  { en: "Botswana", lng: 24.7, lat: -22.2 },
  { en: "Namibia", lng: 17.2, lat: -22.1 },
  { en: "South Africa", lng: 25.1, lat: -29.0 },
  { en: "Madagascar", lng: 46.7, lat: -19.4 },
];

const INDICE = new Map<string, EntradaPais>(PAIS_CENTROIDES.map((p) => [p.en.toLowerCase(), p]));

/**
 * Ponto aproximado [lng, lat] do país (nome em inglês, como na GDELT).
 * Aceita variações com sufixos usados pela fonte ("Brazil (north)" etc.) e
 * normaliza acentos/caixa. Retorna null para países fora da tabela.
 */
export function centroidePais(nome: string): [number, number] | null {
  const limpo = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const direto = INDICE.get(limpo);
  if (direto) return [direto.lng, direto.lat];
  // Variações: "Brazil (north)", "United States of America", "USA (south)"…
  const base = limpo
    .replace(/\s*\(.*\)\s*/g, " ")
    .replace(/\s+of\s+america\s*$/, " ")
    .trim();
  const alternativo = INDICE.get(base);
  if (alternativo) return [alternativo.lng, alternativo.lat];
  for (const p of INDICE.values()) {
    if (base.startsWith(p.en.toLowerCase())) return [p.lng, p.lat];
  }
  return null;
}
