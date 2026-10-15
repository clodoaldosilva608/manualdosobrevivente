/**
 * Pré-aquecimento da camada base — troca de mapa sem espera.
 *
 * Por que existe: ao trocar a camada base, o MapLibre rasga o estilo
 * (setStyle) e volta a baixar TODOS os tiles da nova base do zero — enquanto
 * os tiles chegam (0,5–2 s cada nos provedores voluntários), o mapa mostra
 * só a cor de fundo. Em provedores lentos (OpenTopoMap, CyclOSM, BDGEx WMS)
 * a troca parece "não carregar de imediato".
 *
 * Estratégia: ANTES de aplicar o novo estilo, baixa os tiles da nova base
 * NA VISTA ATUAL (bounds + zoom). Os pedidos passam pela fila do Service
 * Worker e povoam o cache runtime — o setStyle acontece quando o
 * pré-aquecimento termina OU no tempo limite, e na hora da troca os tiles
 * saem do cache: a base nova pinta de imediato. Enquanto preaquece, a base
 * antiga continua visível (sem flash vazio).
 *
 * O pedido usa mode "cors" — o MESMO modo do MapLibre. NÃO usar "no-cors":
 * a resposta opaque ficaria no cache e, servida depois a um pedido cors,
 * viraria network error no navegador (Fetch spec) — os tiles nem
 * carregariam. Servidor sem CORS (BDGEx): o pré-aquecimento falha sem
 * cachear nada e o mapa segue o comportamento normal (detecção de falha
 * própria da base).
 */

/** Um tile da pirâmide Web Mercator (XYZ). */
export interface TileVisivel {
  z: number;
  x: number;
  y: number;
}

/** Retângulo geográfico em graus (oeste/sul/leste/norte). */
export interface Retangulo {
  oeste: number;
  sul: number;
  leste: number;
  norte: number;
}

const RAIO_MERCATOR = 6378137;
/** Lado do mundo em metros Web Mercator (2πR). */
const LADO_MUNDO = 2 * Math.PI * RAIO_MERCATOR;
/** Teto por pré-aquecimento — vista típica tem 6–30 tiles. */
export const LIMITE_TILES = 64;
/** Zoom mínimo da pirâmide (abaixo disso o mundo inteiro cabe em poucos tiles). */
const Z_MINIMO = 2;

/** Coordenada y fracionária do tile para uma latitude (pólos contidos). */
function latParaY(lat: number, z: number): number {
  const seno = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  const frac = 0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI);
  return frac * (1 << z);
}

/**
 * Coordenada x fracionária do tile para uma longitude — SEM normalizar:
 * valores fora de [-180, 180) continuam contínuos (180 → borda direita,
 * 190 → já "passou do mundo") e o wrap real é feito por módulo em
 * tilesVisiveis. Normalizar aqui quebrava a vista do mundo inteiro
 * (leste=180 virava −180 e a largura colapsava para 1 coluna).
 */
function lngParaX(lng: number, z: number): number {
  return ((lng + 180) / 360) * (1 << z);
}

/**
 * Lista os tiles que cobrem o retângulo no zoom dado. O zoom é arredondado
 * (igual ao recorte da pirâmide que o MapLibre pede) e contido no maxzoom
 * da base — com zoom acima do maxzoom, o MapLibre amplifica o tile do
 * maxzoom, então é esse nível que precisa estar no cache. Cobre a travessia
 * da linha de data (oeste > leste) e respeita o limite de segurança.
 */
export function tilesVisiveis(
  ret: Retangulo,
  zoomAtual: number,
  maxzoomBase: number,
  limite = LIMITE_TILES,
): TileVisivel[] {
  const z = Math.max(Z_MINIMO, Math.min(Math.round(zoomAtual), Math.max(Z_MINIMO, maxzoomBase)));
  const n = 1 << z;
  const x0 = Math.floor(lngParaX(ret.oeste, z));
  const x1 = Math.floor(lngParaX(ret.leste, z));
  const y0 = Math.max(0, Math.floor(latParaY(ret.norte, z)));
  const y1 = Math.min(n - 1, Math.floor(latParaY(ret.sul, z)));
  const largura = Math.min(n, (x1 >= x0 ? x1 - x0 : x1 + n - x0) + 1);
  const vistos = new Set<string>();
  const tiles: TileVisivel[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let dx = 0; dx < largura; dx++) {
      const x = (((x0 + dx) % n) + n) % n;
      const chave = `${x}/${y}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      tiles.push({ z, x, y });
      if (tiles.length >= limite) return tiles;
    }
  }
  return tiles;
}

/**
 * URL final do tile a partir do template da base — expande {z}/{x}/{y} e o
 * placeholder {bbox-epsg-3857} do WMS (BDGEx), injetando o bbox do tile em
 * metros Mercator (minx,miny,maxx,maxy), igual ao que o MapLibre injeta.
 */
export function urlDoTile(template: string, t: TileVisivel): string {
  if (template.includes("{bbox-epsg-3857}")) {
    const lado = LADO_MUNDO / (1 << t.z);
    const minx = -LADO_MUNDO / 2 + t.x * lado;
    const maxx = minx + lado;
    const maxy = LADO_MUNDO / 2 - t.y * lado;
    const miny = maxy - lado;
    return template.replace("{bbox-epsg-3857}", `${minx},${miny},${maxx},${maxy}`);
  }
  return template
    .replace("{z}", String(t.z))
    .replace("{x}", String(t.x))
    .replace("{y}", String(t.y));
}

export interface OpcoesPreaquecer {
  /** Tempo máximo de espera antes de liberar a troca de estilo (ms). */
  tempoLimiteMs?: number;
  /** Injetável para testes (padrão: fetch cors — ver nota do cabeçalho). */
  buscar?: (url: string) => Promise<unknown>;
}

/**
 * Dispara o download dos tiles (passam pela fila do Service Worker, que os
 * cacheia) e espera até que terminem OU o tempo limite — o bastante para a
 * troca pintar quase tudo do cache sem atrasar demais a troca. Com vários
 * templates (subdomínios a/b/c), distribui os tiles em rodízio, igual ao
 * que o MapLibre faz com a lista de URLs da fonte. Tiles em andamento no
 * momento do limite continuam em segundo plano e entram no cache — o mapa
 * reaproveita quando repintar. Devolve quantos pedidos foram disparados.
 */
export async function preaquecerTiles(
  templates: string[],
  tiles: TileVisivel[],
  opcoes: OpcoesPreaquecer = {},
): Promise<number> {
  if (templates.length === 0 || tiles.length === 0) return 0;
  const tempoLimiteMs = opcoes.tempoLimiteMs ?? 1600;
  const buscar = opcoes.buscar ?? ((url: string) => fetch(url, { mode: "cors" }));
  const pedidos: Promise<unknown>[] = [];
  tiles.forEach((t, indice) => {
    const template = templates[indice % templates.length];
    pedidos.push(buscar(urlDoTile(template, t)).catch(() => null));
  });
  let soltar: (() => void) | undefined;
  const vigia = new Promise<void>((resolver) => {
    const id = setTimeout(resolver, tempoLimiteMs);
    soltar = () => clearTimeout(id);
  });
  try {
    await Promise.race([Promise.allSettled(pedidos), vigia]);
  } finally {
    soltar?.();
  }
  return pedidos.length;
}
