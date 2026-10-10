/**
 * Rota de ruas — navegação virada a virada (estilo GPS de carro).
 *
 * O caminho vem do OSRM (Open Source Routing Machine — sem chave, mesma
 * família do Nominatim/OpenStreetMap já usados no app): geometria completa
 * do traçado + manobras (vire à direita/esquerda, rotatória, retorno…).
 * A matemática de acompanhamento é PURA (testada sem navegador): distância
 * percorrida ao longo do traçado, distância até a próxima manobra, avisos
 * por voz nos limiares (1 km / 500 m / 100 m / agora), detecção de saída
 * da rota e chegada.
 *
 * Convenções: coordenadas [lng, lat] nos arrays (ordem MapLibre/GeoJSON);
 * { lat, lng } nos pontos nomeados. Todo texto de instrução passa por `t`
 * (traduzível nos 6 idiomas — a voz usa o mesmo texto da tela).
 */
import { getSetting, setSetting } from "@/lib/db";
import { distanceMeters, pathLengthMeters, type LngLat } from "@/lib/geo";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Forma "visual" da manobra — escolhe o ícone da seta na tela e no mapa. */
export type IconeManobra =
  | "partida"
  | "frente"
  | "direita"
  | "esquerda"
  | "leve-direita"
  | "leve-esquerda"
  | "acentuada-direita"
  | "acentuada-esquerda"
  | "retorno"
  | "rotatoria"
  | "acesso"
  | "saida"
  | "chegada";

/** Uma manobra do trajeto (o OSRM chama de "step"). */
export interface ManobraRuas {
  lat: number;
  lng: number;
  /** Tipo bruto do OSRM: turn|depart|arrive|roundabout|merge|fork|on ramp… */
  tipo: string;
  /** Modificador: left|right|straight|slight left|sharp right|uturn… */
  modificador: string | null;
  /** Nome da via DEPOIS da manobra (para onde você vai). */
  rua: string | null;
  /** Saída da rotatória (1 = primeira saída), quando houver. */
  saida: number | null;
  /** Comprimento da perna após esta manobra, em metros. */
  distanciaM: number;
  /** Índice desta manobra dentro da geometria completa (para a distância ao longo do traçado). */
  indiceVertice: number;
}

/** Perfil de roteamento (carro = OSRM demo; a pé/bicicleta = OSM). */
export type PerfilRotaRuas = "carro" | "pe" | "bicicleta";

/** Rota de ruas completa: traçado + manobras + totais. */
export interface RotaRuas {
  id: string;
  nome: string;
  /** Traçado completo a seguir, [lng, lat]. */
  geometria: Array<LngLat>;
  manobras: ManobraRuas[];
  distanciaM: number;
  duracaoS: number;
  destinoNome: string;
  /** Coordenadas do destino (recálculo quando sai da rota). */
  destinoLat: number;
  destinoLng: number;
  /** Perfil usado ao traçar (mantido para recálculo). */
  perfil: PerfilRotaRuas;
  criada_em: string;
}

/** Estado persistido da navegação de ruas (retoma ao reabrir o app). */
export interface EstadoRuas {
  rota: RotaRuas;
  /** Índice da manobra alvo atual dentro de rota.manobras. */
  indice: number;
}

/** Avisos já dados para a manobra atual (reiniciam a cada avanço). */
export interface AnunciosRuas {
  km1?: boolean;
  m500?: boolean;
  m100?: boolean;
  agora?: boolean;
  fora?: boolean;
}

export interface StatusRuas {
  /** Índice da manobra alvo (a próxima a executar). */
  indice: number;
  /** Distância ao longo do traçado até a manobra alvo, em metros. */
  distanciaProximaM: number;
  /** Texto completo da instrução (ex.: "Vire à direita na Rua X"). */
  instrucao: string;
  /** Distância restante até o destino, em metros (ao longo do traçado). */
  distanciaRestanteM: number;
  /** Icone da manobra alvo. */
  icone: IconeManobra;
  /** Fora do traçado (acima da tolerância) — o mapa recalcula sozinho. */
  foraDaRota: boolean;
  /** Dentro do raio de chegada do destino. */
  chegou: boolean;
}

// ---------------------------------------------------------------------------
// Armazenamento (loja de settings — IndexedDB do aparelho)
// ---------------------------------------------------------------------------

export const CHAVE_ROTA_RUAS_ATIVA = "guia-rota-ruas-ativa";
/** Desvio transversal tolerado do traçado: acima disso é FORA DA ROTA. */
export const DESVIO_RUAS_M = 70;
/** Raio de chegada do destino, em metros (ao longo do traçado). */
export const CHEGADA_RUAS_M = 25;
/** Distância da manobra em que ela é considerada "executada". */
export const MANOBRA_FEITA_M = 18;

export async function carregarEstadoRuas(): Promise<EstadoRuas | null> {
  return (await getSetting<EstadoRuas>(CHAVE_ROTA_RUAS_ATIVA)) ?? null;
}

export async function salvarEstadoRuas(estado: EstadoRuas | null): Promise<void> {
  await setSetting(CHAVE_ROTA_RUAS_ATIVA, estado);
}

// ---------------------------------------------------------------------------
// Ícones: tipo+modificador do OSRM → forma visual
// ---------------------------------------------------------------------------

/** Forma visual da manobra a partir do par tipo/modificador do OSRM. */
export function iconeManobra(tipo: string, modificador: string | null): IconeManobra {
  if (tipo === "depart") return "partida";
  if (tipo === "arrive") return "chegada";
  if (tipo === "roundabout" || tipo === "rotary" || tipo === "roundabout turn") return "rotatoria";
  if (tipo === "on ramp") return "acesso";
  if (tipo === "off ramp") return "saida";
  const m = (modificador ?? "straight").toLowerCase();
  if (tipo === "fork" && m === "straight") return "frente";
  if (tipo === "fork" && (m === "left" || m === "right"))
    return m === "left" ? "leve-esquerda" : "leve-direita";
  switch (m) {
    case "straight":
      return "frente";
    case "slight left":
      return "leve-esquerda";
    case "slight right":
      return "leve-direita";
    case "sharp left":
      return "acentuada-esquerda";
    case "sharp right":
      return "acentuada-direita";
    case "uturn":
      return "retorno";
    case "left":
      return tipo === "merge" || tipo === "end of road" ? "esquerda" : "esquerda";
    case "right":
      return tipo === "merge" || tipo === "end of road" ? "direita" : "direita";
    default:
      return "frente";
  }
}

/** Rotação da seta no mapa (graus; 0 = para cima/caminho da tela). */
export function anguloManobra(icone: IconeManobra): number | null {
  switch (icone) {
    case "frente":
    case "partida":
      return 0;
    case "leve-direita":
      return 40;
    case "direita":
      return 90;
    case "acentuada-direita":
      return 135;
    case "retorno":
      return 180;
    case "acentuada-esquerda":
      return -135;
    case "esquerda":
      return -90;
    case "leve-esquerda":
      return -40;
    default:
      return null; // rotatoria/acesso/saida/chegada: só o círculo
  }
}

// ---------------------------------------------------------------------------
// Texto das instruções (t() com variáveis — mesma string na tela e na voz)
// ---------------------------------------------------------------------------

type Tradutor = (texto: string, vars?: Record<string, string | number>) => string;

/** Instrução completa da manobra, ex.: "Vire à direita na Rua X". */
export function textoManobra(
  m: Pick<ManobraRuas, "tipo" | "modificador" | "rua" | "saida">,
  t: Tradutor,
): string {
  const rua = m.rua ? t("na {rua}", { rua: m.rua }) : null;
  const icone = iconeManobra(m.tipo, m.modificador);
  const comRua = (base: string) => (rua ? `${t(base)} ${rua}` : t(base));

  if (m.tipo === "depart")
    return m.rua ? t("Siga pela {rua}", { rua: m.rua }) : t("Siga em frente");
  if (m.tipo === "arrive") return t("Chegou ao destino");
  if (icone === "rotatoria") {
    const n = m.saida ?? 1;
    return t("Na rotatória, pegue a {n}ª saída", { n });
  }
  switch (icone) {
    case "direita":
      return m.tipo === "end of road"
        ? comRua("No fim da via, vire à direita")
        : m.tipo === "merge"
          ? comRua("Entre à direita")
          : comRua("Vire à direita");
    case "esquerda":
      return m.tipo === "end of road"
        ? comRua("No fim da via, vire à esquerda")
        : m.tipo === "merge"
          ? comRua("Entre à esquerda")
          : comRua("Vire à esquerda");
    case "leve-direita":
      return comRua("Mantenha-se à direita");
    case "leve-esquerda":
      return comRua("Mantenha-se à esquerda");
    case "acentuada-direita":
      return comRua("Curva acentuada à direita");
    case "acentuada-esquerda":
      return comRua("Curva acentuada à esquerda");
    case "retorno":
      return t("Faça o retorno");
    case "acesso":
      return comRua("Pegue o acesso");
    case "saida":
      return comRua("Pegue a saída");
    case "frente":
      return m.rua ? t("Continue pela {rua}", { rua: m.rua }) : t("Continue em frente");
    default:
      return m.rua ? t("Continue pela {rua}", { rua: m.rua }) : t("Continue");
  }
}

/** Distância em texto falável: "300 metros" | "1,2 quilômetros" | "1 quilômetro". */
export function distanciaFalavel(m: number, locale = "pt-BR"): string {
  if (m < 1000) {
    const passo = m < 100 ? 10 : 50;
    const arredondado = Math.max(passo, Math.round(m / passo) * passo);
    return `${arredondado} ${locale.startsWith("pt") ? "metros" : "m"}`;
  }
  const km = m / 1000;
  const num = new Intl.NumberFormat(locale, {
    minimumFractionDigits: km < 10 ? 1 : 0,
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km);
  // Singular só quando o número EXIBIDO é exatamente "1" (1,0): "1,2 quilômetros".
  if (locale.startsWith("pt"))
    return km >= 0.95 && km < 1.05 ? `${num} quilômetro` : `${num} quilômetros`;
  return `${num} km`;
}

/** Anúncio falável da manobra: "Em 300 metros, vire à direita na Rua X". */
export function anuncioManobra(
  distanciaM: number,
  instrucao: string,
  t: Tradutor,
  locale = "pt-BR",
): string {
  if (distanciaM <= 35) return `${instrucao} ${t("agora")}`;
  return `${t("Em {dist}", { dist: distanciaFalavel(distanciaM, locale) })}, ${instrucao}`;
}

/** Resumo curto da rota: "4,2 km · 12 min". */
export function resumoRotaRuas(
  rota: Pick<RotaRuas, "distanciaM" | "duracaoS">,
  locale = "pt-BR",
): string {
  const km = rota.distanciaM / 1000;
  const dist =
    km < 1
      ? `${Math.round(rota.distanciaM)} m`
      : `${new Intl.NumberFormat(locale, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
  const min = Math.max(1, Math.round(rota.duracaoS / 60));
  return `${dist} · ${min} min`;
}

// ---------------------------------------------------------------------------
// Geometria: comprimentos acumulados + ponto mais próximo ao longo do traçado
// ---------------------------------------------------------------------------

const cacheComprimentos = new WeakMap<RotaRuas, number[]>();

/** Comprimento acumulado em cada vértice da geometria (cum[0] = 0). */
export function comprimentosAcumulados(rota: RotaRuas): number[] {
  const emCache = cacheComprimentos.get(rota);
  if (emCache) return emCache;
  const cum: number[] = [0];
  for (let i = 1; i < rota.geometria.length; i++) {
    const d = distanceMeters(rota.geometria[i - 1], rota.geometria[i]);
    cum.push(cum[i - 1] + d);
  }
  cacheComprimentos.set(rota, cum);
  return cum;
}

/** Vértice mais próximo da posição + distância até ele (varredura linear). */
export function verticeMaisProximo(
  rota: RotaRuas,
  pos: { lat: number; lng: number },
): { indice: number; distanciaM: number } {
  let melhor = 0;
  let melhorD = Infinity;
  for (let i = 0; i < rota.geometria.length; i++) {
    const [lng, lat] = rota.geometria[i];
    const d = (lng - pos.lng) * (lng - pos.lng) + (lat - pos.lat) * (lat - pos.lat);
    if (d < melhorD) {
      melhorD = d;
      melhor = i;
    }
  }
  return {
    indice: melhor,
    // raiz quadrada só no final (métrica quadrada durante a varredura)
    distanciaM: Math.sqrt(melhorD) * 111_320,
  };
}

/**
 * Progresso ao longo do traçado com projeção no segmento adjacente ao
 * vértice mais próximo (evita "pular à frente" quando o GPS cai entre
 * vértices). Devolve também o desvio perpendicular — é o sinal de rota.
 */
export function progressoNoTracado(
  rota: RotaRuas,
  pos: { lat: number; lng: number },
  cum: number[],
): { progressoM: number; desvioM: number } {
  const { indice: k } = verticeMaisProximo(rota, pos);
  const posArr: LngLat = [pos.lng, pos.lat];
  let melhor = {
    progressoM: cum[k],
    desvioM: distanceMeters(rota.geometria[k], posArr),
  };
  for (const i of [k - 1, k]) {
    if (i < 0 || i + 1 >= rota.geometria.length) continue;
    const a = rota.geometria[i];
    const b = rota.geometria[i + 1];
    const seg = distanceMeters(a, b);
    if (seg <= 0) continue;
    // Coordenadas métricas locais (equiretangular) para o produto escalar.
    const rad = Math.PI / 180;
    const mx = (lng: number, lat: number) => lng * Math.cos(lat * rad) * 111_320;
    const my = (lat: number) => lat * 111_320;
    const ax = mx(a[0], a[1]);
    const ay = my(a[1]);
    const abx = mx(b[0], b[1]) - ax;
    const aby = my(b[1]) - ay;
    const px = mx(pos.lng, pos.lat);
    const py = my(pos.lat);
    const fator = Math.max(
      0,
      Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)),
    );
    const desvio = Math.hypot(px - (ax + abx * fator), py - (ay + aby * fator));
    if (desvio < melhor.desvioM) melhor = { progressoM: cum[i] + seg * fator, desvioM: desvio };
  }
  return melhor;
}

// ---------------------------------------------------------------------------
// Acompanhamento virada a virada (puro — chamado a cada correção de GPS)
// ---------------------------------------------------------------------------

export interface ResultadoRuas {
  indice: number;
  anunciados: AnunciosRuas;
  status: StatusRuas;
  /** Texto para a voz falar agora (null = nada novo). */
  fala: string | null;
}

const LIMIARES: Array<{ chave: keyof AnunciosRuas; metros: number }> = [
  { chave: "km1", metros: 1000 },
  { chave: "m500", metros: 500 },
  { chave: "m100", metros: 100 },
  { chave: "agora", metros: 35 },
];

/**
 * Avança a navegação de ruas com a posição nova. Devolve o estado atualizado,
 * o texto a falar (ou null) e os avisos já dados. `t` e `locale` seguem o
 * idioma da interface (a voz repete exatamente o que a tela mostra).
 */
export function avancarNavegacaoRuas(params: {
  pos: { lat: number; lng: number };
  rota: RotaRuas;
  indice: number;
  anunciados: AnunciosRuas;
  t: Tradutor;
  locale?: string;
}): ResultadoRuas {
  const { pos, rota, t } = params;
  const locale = params.locale ?? "pt-BR";
  const cum = comprimentosAcumulados(rota);
  const total = cum[cum.length - 1] || pathLengthMeters(rota.geometria);
  const anunciados: AnunciosRuas = { ...params.anunciados };

  let indice = Math.min(Math.max(1, params.indice), rota.manobras.length - 1);

  // Progresso ao longo do traçado + desvio perpendicular (sinal de rota).
  const andamento = progressoNoTracado(rota, pos, cum);
  const progresso = andamento.progressoM;

  const distAlongAte = (indiceVertice: number) => Math.max(0, cum[indiceVertice] - progresso);

  // Avança manobras já ultrapassadas (e reinicia os avisos de cada uma).
  while (
    indice < rota.manobras.length - 1 &&
    distAlongAte(rota.manobras[indice].indiceVertice) < MANOBRA_FEITA_M
  ) {
    indice += 1;
    for (const k of Object.keys(anunciados) as Array<keyof AnunciosRuas>) delete anunciados[k];
  }

  const alvo = rota.manobras[indice];
  const distanciaProximaM = distAlongAte(alvo.indiceVertice);
  const distanciaRestanteM = Math.max(0, total - progresso);
  const chegou = distanciaRestanteM <= CHEGADA_RUAS_M;
  const foraDaRota = andamento.desvioM > DESVIO_RUAS_M && rota.geometria.length > 2;

  const instrucao = textoManobra(alvo, t);
  const icone = iconeManobra(alvo.tipo, alvo.modificador);

  // Voz: fora da rota fala UMA vez e silencia os limiares (a distância à
  // manobra perde o sentido fora do traçado); ao voltar, os avisos voltam.
  let fala: string | null = null;
  if (foraDaRota) {
    if (!anunciados.fora) {
      anunciados.fora = true;
      fala = t("Você saiu da rota");
    }
  } else if (chegou) {
    if (!anunciados.agora) {
      anunciados.agora = true;
      fala = t("Você chegou ao destino");
    }
  } else {
    for (const lim of LIMIARES) {
      if (!anunciados[lim.chave] && distanciaProximaM <= lim.metros) {
        anunciados[lim.chave] = true;
        fala = anuncioManobra(distanciaProximaM, instrucao, t, locale);
        break; // anuncia só o limiar mais apertado atingido
      }
    }
  }

  return {
    indice,
    anunciados,
    fala,
    status: {
      indice,
      distanciaProximaM,
      instrucao,
      distanciaRestanteM,
      icone,
      foraDaRota,
      chegou,
    },
  };
}

// ---------------------------------------------------------------------------
// Parser da resposta do OSRM
// ---------------------------------------------------------------------------

/** Índice da geometria mais próximo de um ponto (varredura simples). */
function indiceVerticeMaisProximo(geometria: Array<LngLat>, lng: number, lat: number): number {
  let melhor = 0;
  let melhorD = Infinity;
  for (let i = 0; i < geometria.length; i++) {
    const dx = geometria[i][0] - lng;
    const dy = geometria[i][1] - lat;
    const d = dx * dx + dy * dy;
    if (d < melhorD) {
      melhorD = d;
      melhor = i;
    }
  }
  return melhor;
}

interface OsrmStep {
  distance?: number;
  name?: string;
  maneuver?: { type?: string; modifier?: string; exit?: number; location?: [number, number] };
}

interface OsrmResposta {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: Array<[number, number]> };
    legs?: Array<{ steps?: OsrmStep[] }>;
  }>;
}

/**
 * Converte a resposta do OSRM em RotaRuas. Devolve null quando a resposta
 * não é aproveitável (sem rota, código != Ok, geometria vazia).
 */
export function parsearRotaOSRM(
  json: OsrmResposta,
  nome: string,
  destino: { nome: string; lat: number; lng: number; perfil: PerfilRotaRuas },
): RotaRuas | null {
  const rota0 = json?.routes?.[0];
  const geometria = rota0?.geometry?.coordinates;
  if (!rota0 || !geometria || geometria.length < 2) return null;
  if (typeof rota0.distance !== "number" || typeof rota0.duration !== "number") return null;

  const passos: OsrmStep[] = [];
  for (const perna of rota0.legs ?? []) for (const p of perna.steps ?? []) passos.push(p);
  if (passos.length === 0) return null;

  const manobras: ManobraRuas[] = passos.map((p, i) => {
    const mv = p.maneuver ?? {};
    const local = mv.location ?? geometria[0];
    const proximoNome = passos[i + 1]?.name?.trim() || null;
    // depart: a via é a que você JÁ ESTÁ (nome do próprio passo); nas demais,
    // a rua é aquela em que você CAI depois da manobra (passo seguinte).
    const rua = (mv.type === "depart" ? p.name?.trim() : proximoNome) || null;
    return {
      lat: local[1],
      lng: local[0],
      tipo: mv.type ?? "continue",
      modificador: mv.modifier ?? null,
      rua,
      saida: mv.exit ?? null,
      distanciaM: typeof p.distance === "number" ? p.distance : 0,
      indiceVertice: indiceVerticeMaisProximo(geometria, local[0], local[1]),
    };
  });

  return {
    id: crypto.randomUUID(),
    nome: nome || destino.nome || "Rota de ruas",
    geometria,
    manobras,
    distanciaM: rota0.distance,
    duracaoS: rota0.duration,
    destinoNome: destino.nome,
    destinoLat: destino.lat,
    destinoLng: destino.lng,
    perfil: destino.perfil,
    criada_em: new Date().toISOString(),
  };
}

/** FeatureCollection da linha do traçado (fonte "rota-ruas" do mapa). */
export function rotaRuasFC(rota: RotaRuas | null): GeoJSON.FeatureCollection {
  if (!rota || rota.geometria.length < 2) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: rota.geometria },
      },
    ],
  };
}

/** FeatureCollection dos pontos de manobra (círculo + seta girada no mapa). */
export function manobrasFC(rota: RotaRuas | null): GeoJSON.FeatureCollection {
  if (!rota) return { type: "FeatureCollection", features: [] };
  const features: GeoJSON.Feature[] = [];
  for (const m of rota.manobras) {
    const icone = iconeManobra(m.tipo, m.modificador);
    const angulo = anguloManobra(icone);
    const cor = icone === "chegada" ? "#4ADE80" : icone === "partida" ? "#38BDF8" : "#FFC24D";
    features.push({
      type: "Feature",
      properties: { icone, angulo, cor },
      geometry: { type: "Point", coordinates: [m.lng, m.lat] },
    });
  }
  return { type: "FeatureCollection", features };
}
