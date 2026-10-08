/**
 * Camadas MapLibre do modo Osiris (inteligência global).
 *
 * Todas as camadas usam fontes GeoJSON próprias (prefixo "intel-"), criadas
 * sob demanda e alimentadas por este módulo. A ordem de empilhamento é fixa:
 * noite (mais baixa) → focos de calor → pegada da ISS → eventos → conflitos
 * → alertas GDACS → nucleares → marítimo → sismos → voos → navios → ISS
 * (topo). O overlay noturno é inserido abaixo das camadas de desenho para
 * não escurecer waypoints e medições.
 */
import type maplibregl from "maplibre-gl";
import { ROTULO_NIVEL, type IntelConflito, type NivelConflito } from "@/lib/intel-conflicts";
import { CENTRAIS_NUCLEARES } from "@/lib/intel-nuclear";
import { ESTREITOS, PORTOS, ROTULO_ESTREITO, type NivelEstreito } from "@/lib/intel-maritimo";
import { ROTULO_STATUS_NUCLEAR } from "@/lib/intel-nuclear";
import { anelGeo } from "@/lib/intel-v2.functions";
import {
  CAMERAS,
  ROTULO_CATEGORIA_CAMERA,
  urlEmbedCamera,
  urlPaginaCamera,
  type IntelCamera,
} from "@/lib/intel-cameras";
import { CABOS, type IntelCabo } from "@/lib/intel-cables";
import { centroidePais } from "@/lib/pais-centroides";
import type {
  IntelAlerta,
  IntelIss,
  IntelNavio,
  IntelNoticia,
  IntelSatelite,
  IntelSnapshot,
  IntelVisibilidade,
  IntelVoo,
} from "@/lib/intel.types";
import { formatDateTime, formatInteger, formatNumber } from "@/lib/format";

type ML = maplibregl.Map;

export const FONTES_INTEL = [
  "intel-noite",
  "intel-fogo",
  "intel-evento",
  "intel-conflito",
  "intel-sismo",
  "intel-voo",
  "intel-iss",
  "intel-iss-trajetoria",
  "intel-iss-pegada",
  "intel-alerta",
  "intel-nuclear",
  "intel-estreito",
  "intel-porto",
  "intel-navio",
  "intel-camera",
  "intel-cabo",
  "intel-cabo-ponto",
  "intel-noticia",
  "intel-sat",
] as const;

const CAMADA_NOITE = "intel-noite-fill";
const CAMADA_FOGO = "intel-fogo-circle";
const CAMADA_EVENTO = "intel-evento-circle";
const CAMADA_CONFLITO = "intel-conflito-circle";
const CAMADA_CONFLITO_LABEL = "intel-conflito-label";
const CAMADA_SISMO = "intel-sismo-circle";
const CAMADA_VOO = "intel-voo-symbol";
const CAMADA_VOO_MIL = "intel-voo-mil-symbol";
const CAMADA_NAVIO = "intel-navio-symbol";
const CAMADA_ISS = "intel-iss-symbol";
const CAMADA_ISS_LABEL = "intel-iss-label";
const CAMADA_ISS_TRAJ = "intel-iss-trajetoria-line";
const CAMADA_ISS_PEGADA = "intel-iss-pegada-fill";
const CAMADA_ALERTA = "intel-alerta-circle";
const CAMADA_NUCLEAR = "intel-nuclear-symbol";
const CAMADA_ESTREITO = "intel-estreito-circle";
const CAMADA_ESTREITO_ANEL = "intel-estreito-anel";
const CAMADA_ESTREITO_LABEL = "intel-estreito-label";
const CAMADA_PORTO = "intel-porto-circle";
const CAMADA_PORTO_LABEL = "intel-porto-label";
const CAMADA_CAMERA = "intel-camera-symbol";
const CAMADA_CABO = "intel-cabo-line";
const CAMADA_CABO_PONTO = "intel-cabo-ponto-circle";
const CAMADA_NOTICIA = "intel-noticia-circle";
const CAMADA_SAT = "intel-sat-circle";
const CAMADA_SAT_LABEL = "intel-sat-label";

const CAMADAS_EM_ORDEM = [
  CAMADA_NOITE,
  CAMADA_CABO,
  CAMADA_CABO_PONTO,
  CAMADA_FOGO,
  CAMADA_ISS_PEGADA,
  CAMADA_EVENTO,
  CAMADA_CONFLITO,
  CAMADA_CONFLITO_LABEL,
  CAMADA_ALERTA,
  CAMADA_NUCLEAR,
  CAMADA_ESTREITO_ANEL,
  CAMADA_ESTREITO,
  CAMADA_ESTREITO_LABEL,
  CAMADA_PORTO,
  CAMADA_PORTO_LABEL,
  CAMADA_SISMO,
  CAMADA_VOO,
  CAMADA_VOO_MIL,
  CAMADA_NAVIO,
  CAMADA_CAMERA,
  CAMADA_NOTICIA,
  CAMADA_SAT,
  CAMADA_SAT_LABEL,
  CAMADA_ISS_TRAJ,
  CAMADA_ISS,
  CAMADA_ISS_LABEL,
];

/** Camadas clicáveis com popup (exclui apenas rótulos). */
const CAMADAS_COM_POPUP = CAMADAS_EM_ORDEM.filter(
  (id) => !id.endsWith("-label") && id !== CAMADA_ISS_PEGADA && id !== CAMADA_ESTREITO_ANEL,
);

/**
 * Primeira camada de inteligência presente no estilo — usada como âncora
 * "abaixo de" por overlays raster externos (radar de chuva), que precisam
 * ficar sobre a camada base mas sob todos os marcadores de inteligência.
 */
export function ancoraIntel(map: ML): string | undefined {
  if (!map) return undefined;
  for (const id of CAMADAS_EM_ORDEM) if (map.getLayer(id)) return id;
  return undefined;
}

function fonteVazia() {
  return { type: "FeatureCollection" as const, features: [] };
}

function garantirFonte(map: ML, id: string, data: GeoJSON.FeatureCollection | GeoJSON.Feature) {
  const atual = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (atual) {
    atual.setData(data as never);
    return;
  }
  map.addSource(id, { type: "geojson", data: data as never });
}

function adicionarCamada(map: ML, camada: maplibregl.LayerSpecification, abaixoDe?: string) {
  if (!map) return;
  const antes = abaixoDe && map.getLayer(abaixoDe) ? abaixoDe : undefined;
  map.addLayer(camada, antes);
}

// ---------------------------------------------------------------------------
// Ícones desenhados em canvas (injetados no estilo com addImage)
// ---------------------------------------------------------------------------

type Ctx2D = CanvasRenderingContext2D;

function desenharBase(lado: number): { canvas: HTMLCanvasElement; ctx: Ctx2D } | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return { canvas, ctx };
}

function aplicar(map: ML, id: string, lado: number, desenhar: (ctx: Ctx2D) => void) {
  if (map.hasImage(id)) return;
  const base = desenharBase(lado);
  if (!base) return;
  const { canvas, ctx } = base;
  desenhar(ctx);
  const img = ctx.getImageData(0, 0, lado, lado);
  map.addImage(id, img, { pixelRatio: lado / 15 });
}

/** Silhueta de aeronave apontando para cima (rotação feita pela camada). */
function iconeAviao(ctx: Ctx2D, cor: string) {
  ctx.fillStyle = cor;
  ctx.strokeStyle = "#0A0A0A";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(15, 1.5); // nariz
  ctx.lineTo(18.2, 10); // fuselagem direita
  ctx.lineTo(28, 17.5); // ponta da asa direita
  ctx.lineTo(28, 20.5);
  ctx.lineTo(18, 18.5);
  ctx.lineTo(17.2, 25); // asa de cauda direita
  ctx.lineTo(20, 27.6);
  ctx.lineTo(20, 29.5);
  ctx.lineTo(15, 28.4); // cauda central
  ctx.lineTo(10, 29.5);
  ctx.lineTo(10, 27.6);
  ctx.lineTo(12.8, 25);
  ctx.lineTo(12, 18.5); // asa de cauda esquerda
  ctx.lineTo(2, 20.5);
  ctx.lineTo(2, 17.5); // ponta da asa esquerda
  ctx.lineTo(11.8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Satélite estilizado (corpo + dois painéis solares). */
function iconeIss(ctx: Ctx2D) {
  ctx.fillStyle = "#8BD5FF";
  ctx.strokeStyle = "#0A0A0A";
  ctx.lineWidth = 1;
  // painéis
  ctx.fillRect(1, 10.5, 7, 9);
  ctx.fillRect(22, 10.5, 7, 9);
  ctx.strokeRect(1, 10.5, 7, 9);
  ctx.strokeRect(22, 10.5, 7, 9);
  // corpo
  ctx.beginPath();
  ctx.roundRect(9.5, 9, 11, 12, 2);
  ctx.fill();
  ctx.stroke();
  // acoplagem
  ctx.fillStyle = "#FFF";
  ctx.fillRect(13, 5.5, 4, 3.2);
  ctx.fillRect(13, 21.3, 4, 3.2);
}

/** Símbolo internacional de radiação (trefoil) simplificado. */
function iconeTrefoil(ctx: Ctx2D) {
  const cx = 15;
  const cy = 15;
  ctx.fillStyle = "#C7A4FF";
  ctx.strokeStyle = "#0A0A0A";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const inicio = -Math.PI / 2 + (i * 2 * Math.PI) / 3 - Math.PI / 6;
    const fim = inicio + Math.PI / 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, inicio, fim);
    ctx.arc(cx, cy, 5, fim, inicio, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 2.6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

/** Setor de proa de embarcação (triângulo alongado). */
function iconeNavio(ctx: Ctx2D, cor: string) {
  ctx.fillStyle = cor;
  ctx.strokeStyle = "#0A0A0A";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(15, 1);
  ctx.lineTo(22, 27);
  ctx.lineTo(15, 22.5);
  ctx.lineTo(8, 27);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Câmera de vigilância (corpo + lente). */
function iconeCamera(ctx: Ctx2D) {
  ctx.fillStyle = "#F9A8D4";
  ctx.strokeStyle = "#0A0A0A";
  ctx.lineWidth = 1;
  // corpo
  ctx.beginPath();
  ctx.roundRect(3, 8, 17, 12, 2.5);
  ctx.fill();
  ctx.stroke();
  // lente
  ctx.beginPath();
  ctx.moveTo(20, 10);
  ctx.lineTo(27, 5);
  ctx.lineTo(27, 23);
  ctx.lineTo(20, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ilhuz de gravação
  ctx.fillStyle = "#0A0A0A";
  ctx.beginPath();
  ctx.arc(8, 14, 2, 0, 2 * Math.PI);
  ctx.fill();
}

function garantirIcones(map: ML) {
  aplicar(map, "intel-ico-voo-civil", 30, (c) => iconeAviao(c, "#6FD3E8"));
  aplicar(map, "intel-ico-voo-mil", 30, (c) => iconeAviao(c, "#FF5C4D"));
  aplicar(map, "intel-ico-iss", 30, (c) => iconeIss(c));
  aplicar(map, "intel-ico-nuclear", 30, (c) => iconeTrefoil(c));
  aplicar(map, "intel-ico-navio", 30, (c) => iconeNavio(c, "#EAF6FF"));
  aplicar(map, "intel-ico-camera", 30, (c) => iconeCamera(c));
}

// ---------------------------------------------------------------------------
// Sincronização das camadas
// ---------------------------------------------------------------------------

export interface EntradaSincronizacaoIntel {
  snapshot: IntelSnapshot | null;
  conflitos: IntelConflito[];
  noite: GeoJSON.Feature | null;
  vis: IntelVisibilidade;
  voos: IntelVoo[] | null;
  iss: IntelIss | null;
  alertas: IntelAlerta[] | null;
  navios: IntelNavio[];
  cameras: IntelCamera[];
  cabos: IntelCabo[];
  /** Manchetes GDELT brutas — geolocalizadas aqui pelo país de origem. */
  noticias: IntelNoticia[] | null;
  /** Satélites de observação propagados no aparelho (TLE/SGP4). */
  satelites: IntelSatelite[];
}

/** Cria/atualiza as camadas de inteligência conforme visibilidade e dados. */
export function sincronizarCamadasIntel(map: ML, entrada: EntradaSincronizacaoIntel) {
  if (!map) return;
  const {
    snapshot,
    conflitos,
    noite,
    vis,
    voos,
    iss,
    alertas,
    navios,
    cameras,
    cabos,
    noticias,
    satelites,
  } = entrada;

  garantirIcones(map);

  garantirFonte(map, "intel-noite", noite ?? fonteVazia());
  garantirFonte(
    map,
    "intel-fogo",
    snapshot
      ? {
          type: "FeatureCollection",
          features: snapshot.incendios.map((f) => ({
            type: "Feature" as const,
            properties: { hora: f.hora, confianca: f.confianca },
            geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
          })),
        }
      : fonteVazia(),
  );
  garantirFonte(
    map,
    "intel-evento",
    snapshot
      ? {
          type: "FeatureCollection",
          features: snapshot.eventos.map((e) => ({
            type: "Feature" as const,
            properties: { titulo: e.titulo, categoria: e.categoria, hora: e.hora, url: e.url },
            geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
          })),
        }
      : fonteVazia(),
  );
  garantirFonte(map, "intel-conflito", {
    type: "FeatureCollection",
    features: conflitos.map((c) => ({
      type: "Feature" as const,
      properties: { nome: c.nome, nivel: c.nivel, resumo: c.resumo },
      geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
    })),
  });
  garantirFonte(
    map,
    "intel-sismo",
    snapshot
      ? {
          type: "FeatureCollection",
          features: snapshot.sismos.map((s) => ({
            type: "Feature" as const,
            properties: {
              mag: s.mag,
              lugar: s.lugar,
              hora: s.hora,
              url: s.url,
              tsunami: s.tsunami,
              prof: s.profundidade,
            },
            geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
          })),
        }
      : fonteVazia(),
  );

  // Voos (militares e civis na mesma fonte, separados por propriedade).
  garantirFonte(
    map,
    "intel-voo",
    voos
      ? {
          type: "FeatureCollection",
          features: voos.map((v) => ({
            type: "Feature" as const,
            properties: {
              indicativo: v.indicativo,
              tipo: v.tipo,
              matricula: v.matricula,
              altitude: v.altitude,
              velocidade: v.velocidade,
              rumo: v.rumo ?? 0,
              militar: v.militar,
              emergencia: v.emergencia,
              solo: v.altitude === null,
            },
            geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
          })),
        }
      : fonteVazia(),
  );

  // ISS: ponto + trajetória + pegada.
  garantirFonte(
    map,
    "intel-iss",
    iss
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature" as const,
              properties: {
                altitudeKm: iss.altitudeKm,
                velocidadeKmh: iss.velocidadeKmh,
                visibilidade: iss.visibilidade,
              },
              geometry: { type: "Point" as const, coordinates: [iss.lng, iss.lat] },
            },
          ],
        }
      : fonteVazia(),
  );
  garantirFonte(
    map,
    "intel-iss-trajetoria",
    iss && iss.trajetoria.length >= 2
      ? {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: iss.trajetoria },
        }
      : fonteVazia(),
  );
  garantirFonte(
    map,
    "intel-iss-pegada",
    iss
      ? {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [anelGeo(iss.lat, iss.lng, iss.pegadaKm)],
          },
        }
      : fonteVazia(),
  );

  // Alertas GDACS.
  garantirFonte(
    map,
    "intel-alerta",
    alertas
      ? {
          type: "FeatureCollection",
          features: alertas.map((a) => ({
            type: "Feature" as const,
            properties: {
              tipo: a.tipo,
              nome: a.nome,
              pais: a.pais,
              nivel: a.nivel,
              inicio: a.inicio,
              url: a.url,
            },
            geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
          })),
        }
      : fonteVazia(),
  );

  // Centrais nucleares (referência curada).
  garantirFonte(map, "intel-nuclear", {
    type: "FeatureCollection",
    features: CENTRAIS_NUCLEARES.map((c) => ({
      type: "Feature" as const,
      properties: {
        nome: c.nome,
        pais: c.pais,
        reatores: c.reatores,
        capacidadeMW: c.capacidadeMW,
        status: c.status,
        nota: c.nota ?? "",
      },
      geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
    })),
  });

  // Pontos marítimos estratégicos (curados) — anel de raio + ponto.
  garantirFonte(map, "intel-estreito", {
    type: "FeatureCollection",
    features: ESTREITOS.flatMap((s) => {
      const ponto: GeoJSON.Feature = {
        type: "Feature",
        properties: { nome: s.nome, nivel: s.nivel, resumo: s.resumo },
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      };
      const anel: GeoJSON.Feature = {
        type: "Feature",
        properties: { nivel: s.nivel },
        geometry: { type: "Polygon", coordinates: [anelGeo(s.lat, s.lng, s.raioKm)] },
      };
      return [ponto, anel];
    }),
  });
  garantirFonte(map, "intel-porto", {
    type: "FeatureCollection",
    features: PORTOS.map((p) => ({
      type: "Feature" as const,
      properties: { nome: p.nome, pais: p.pais, nota: p.nota },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  });

  // Navios ao vivo (AIS via chave do usuário).
  garantirFonte(
    map,
    "intel-navio",
    navios.length
      ? {
          type: "FeatureCollection",
          features: navios.map((n) => ({
            type: "Feature" as const,
            properties: {
              mmsi: n.mmsi,
              nome: n.nome,
              velocidade: n.velocidade,
              rumo: n.rumo ?? 0,
              hora: n.hora,
            },
            geometry: { type: "Point" as const, coordinates: [n.lng, n.lat] },
          })),
        }
      : fonteVazia(),
  );

  // Câmeras públicas ao vivo (referência curada).
  garantirFonte(map, "intel-camera", {
    type: "FeatureCollection",
    features: cameras.map((c) => ({
      type: "Feature" as const,
      properties: {
        nome: c.nome,
        canal: c.canal,
        cidade: c.cidade,
        pais: c.pais,
        categoria: c.categoria,
        videoId: c.videoId,
      },
      geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
    })),
  });

  // Cabos submarinos (rotas aproximadas) + pontos de desembarque.
  garantirFonte(map, "intel-cabo", {
    type: "FeatureCollection",
    features: cabos.map((c) => ({
      type: "Feature" as const,
      properties: {
        nome: c.nome,
        ano: c.ano,
        comprimentoKm: c.comprimentoKm,
        desembarques: c.desembarques.join(" · "),
      },
      geometry: { type: "LineString" as const, coordinates: c.pontos },
    })),
  });
  garantirFonte(map, "intel-cabo-ponto", {
    type: "FeatureCollection",
    features: cabos.flatMap((c) => {
      const primeiro = c.pontos[0];
      const ultimo = c.pontos[c.pontos.length - 1];
      if (!primeiro || !ultimo) return [];
      return [
        {
          type: "Feature" as const,
          properties: {
            nome: c.nome,
            ano: c.ano,
            comprimentoKm: c.comprimentoKm,
            desembarques: c.desembarques.join(" · "),
          },
          geometry: { type: "Point" as const, coordinates: primeiro },
        },
        {
          type: "Feature" as const,
          properties: {
            nome: c.nome,
            ano: c.ano,
            comprimentoKm: c.comprimentoKm,
            desembarques: c.desembarques.join(" · "),
          },
          geometry: { type: "Point" as const, coordinates: ultimo },
        },
      ];
    }),
  });

  // Notícias ao vivo (GDELT) geolocalizadas pelo país de origem.
  garantirFonte(
    map,
    "intel-noticia",
    noticias && noticias.length
      ? {
          type: "FeatureCollection",
          features: noticias.flatMap((n) => {
            const ponto = centroidePais(n.pais);
            if (!ponto) return [];
            return [
              {
                type: "Feature" as const,
                properties: {
                  titulo: n.titulo,
                  fonte: n.fonte,
                  pais: n.pais,
                  hora: n.hora,
                  url: n.url,
                },
                geometry: { type: "Point" as const, coordinates: ponto },
              },
            ];
          }),
        }
      : fonteVazia(),
  );

  // Satélites de observação (propagação SGP4 local).
  garantirFonte(
    map,
    "intel-sat",
    satelites.length
      ? {
          type: "FeatureCollection",
          features: satelites.map((s) => ({
            type: "Feature" as const,
            properties: {
              nome: s.nome,
              norad: s.norad,
              altitudeKm: s.altitudeKm,
              velocidadeKmh: s.velocidadeKmh,
            },
            geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
          })),
        }
      : fonteVazia(),
  );

  // Remove camadas desligadas ou fora de ordem (recria se necessário).
  for (const id of CAMADAS_EM_ORDEM) {
    if (map.getLayer(id)) map.removeLayer(id);
  }

  if (vis.noite) {
    adicionarCamada(
      map,
      {
        id: CAMADA_NOITE,
        type: "fill",
        source: "intel-noite",
        paint: { "fill-color": "#050B14", "fill-opacity": 0.34 },
      },
      "draw-line",
    );
  }
  if (vis.cabos) {
    map.addLayer({
      id: CAMADA_CABO,
      type: "line",
      source: "intel-cabo",
      paint: {
        "line-color": "#22D3EE",
        "line-width": 1.4,
        "line-dasharray": [3, 1.5],
        "line-opacity": 0.75,
      },
    });
    map.addLayer({
      id: CAMADA_CABO_PONTO,
      type: "circle",
      source: "intel-cabo-ponto",
      minzoom: 2,
      paint: {
        "circle-radius": 4,
        "circle-color": "#67E8F9",
        "circle-stroke-color": "#0B0B0B",
        "circle-stroke-width": 1.2,
      },
    });
  }
  if (vis.incendios) {
    map.addLayer({
      id: CAMADA_FOGO,
      type: "circle",
      source: "intel-fogo",
      paint: {
        "circle-radius": 2.6,
        "circle-color": "#FF4D2E",
        "circle-opacity": 0.72,
      },
    });
  }
  if (vis.satelites && iss) {
    map.addLayer({
      id: CAMADA_ISS_PEGADA,
      type: "fill",
      source: "intel-iss-pegada",
      paint: { "fill-color": "#8BD5FF", "fill-opacity": 0.06 },
    });
  }
  if (vis.eventos) {
    map.addLayer({
      id: CAMADA_EVENTO,
      type: "circle",
      source: "intel-evento",
      paint: {
        "circle-radius": 5,
        "circle-color": "#FFB020",
        "circle-stroke-color": "#1A1A1A",
        "circle-stroke-width": 1.5,
      },
    });
  }
  if (vis.conflitos) {
    map.addLayer({
      id: CAMADA_CONFLITO,
      type: "circle",
      source: "intel-conflito",
      paint: {
        "circle-radius": 8,
        "circle-color": [
          "match",
          ["get", "nivel"],
          "guerra",
          "#E63946",
          "alto",
          "#F08C00",
          "#D9A404",
        ],
        "circle-stroke-color": "#FFE8D6",
        "circle-stroke-width": 1.5,
      },
    });
    map.addLayer({
      id: CAMADA_CONFLITO_LABEL,
      type: "symbol",
      source: "intel-conflito",
      layout: {
        "text-field": ["get", "nome"],
        "text-size": 10,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#FFF",
        "text-halo-color": "#121212",
        "text-halo-width": 2,
      },
    });
  }
  if (vis.alertas) {
    map.addLayer({
      id: CAMADA_ALERTA,
      type: "circle",
      source: "intel-alerta",
      paint: {
        "circle-radius": 7,
        "circle-color": [
          "match",
          ["get", "nivel"],
          "Red",
          "#E63946",
          "Orange",
          "#F08C00",
          "#4CAF50",
        ],
        "circle-stroke-color": "#FFE8D6",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.88,
      },
    });
  }
  if (vis.nuclear) {
    map.addLayer({
      id: CAMADA_NUCLEAR,
      type: "symbol",
      source: "intel-nuclear",
      layout: {
        "icon-image": "intel-ico-nuclear",
        "icon-size": 0.62,
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-opacity": ["step", ["zoom"], 0.35, 3, 0.95],
      },
    });
  }
  if (vis.maritimo) {
    map.addLayer({
      id: CAMADA_ESTREITO_ANEL,
      type: "fill",
      source: "intel-estreito",
      paint: { "fill-color": "#F08C00", "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: CAMADA_ESTREITO,
      type: "circle",
      source: "intel-estreito",
      paint: {
        "circle-radius": 6,
        "circle-color": [
          "match",
          ["get", "nivel"],
          "critico",
          "#E63946",
          "atencao",
          "#F08C00",
          "#D9A404",
        ],
        "circle-stroke-color": "#FFE8D6",
        "circle-stroke-width": 1.5,
      },
    });
    map.addLayer({
      id: CAMADA_ESTREITO_LABEL,
      type: "symbol",
      source: "intel-estreito",
      minzoom: 2.5,
      layout: {
        "text-field": ["get", "nome"],
        "text-size": 10,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#FFE8D6",
        "text-halo-color": "#121212",
        "text-halo-width": 2,
      },
    });
    map.addLayer({
      id: CAMADA_PORTO,
      type: "circle",
      source: "intel-porto",
      minzoom: 2,
      paint: {
        "circle-radius": 4,
        "circle-color": "#38BDF8",
        "circle-stroke-color": "#0B0B0B",
        "circle-stroke-width": 1.2,
      },
    });
    map.addLayer({
      id: CAMADA_PORTO_LABEL,
      type: "symbol",
      source: "intel-porto",
      minzoom: 3.5,
      layout: {
        "text-field": ["get", "nome"],
        "text-size": 9,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#BFE7FF",
        "text-halo-color": "#121212",
        "text-halo-width": 2,
      },
    });
  }
  if (vis.sismos) {
    map.addLayer({
      id: CAMADA_SISMO,
      type: "circle",
      source: "intel-sismo",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "mag"], 2.5],
          2.5,
          3.5,
          4,
          5,
          5,
          8,
          6.5,
          12,
        ],
        "circle-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "mag"], 2.5],
          2.5,
          "#FFE14D",
          4,
          "#FF9130",
          5.5,
          "#FF3B30",
        ],
        "circle-stroke-color": "#121212",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.92,
      },
    });
  }
  if (vis.voos) {
    // Civis: só aparecem a partir do zoom 4 para não poluir o mundo inteiro.
    map.addLayer({
      id: CAMADA_VOO,
      type: "symbol",
      source: "intel-voo",
      filter: ["!", ["get", "militar"]],
      layout: {
        "icon-image": "intel-ico-voo-civil",
        "icon-size": 0.5,
        "icon-rotate": ["get", "rumo"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-opacity": ["step", ["zoom"], 0, 4, 0.85],
      },
    });
    // Militares: visíveis desde o zoom mundial (dataset pequeno e crítico).
    map.addLayer({
      id: CAMADA_VOO_MIL,
      type: "symbol",
      source: "intel-voo",
      filter: ["get", "militar"],
      layout: {
        "icon-image": "intel-ico-voo-mil",
        "icon-size": 0.62,
        "icon-rotate": ["get", "rumo"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-opacity": 0.95,
      },
    });
  }
  if (vis.navios) {
    map.addLayer({
      id: CAMADA_NAVIO,
      type: "symbol",
      source: "intel-navio",
      minzoom: 3,
      layout: {
        "icon-image": "intel-ico-navio",
        "icon-size": 0.42,
        "icon-rotate": ["get", "rumo"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-opacity": 0.9,
      },
    });
  }
  if (vis.cameras) {
    map.addLayer({
      id: CAMADA_CAMERA,
      type: "symbol",
      source: "intel-camera",
      minzoom: 3,
      layout: {
        "icon-image": "intel-ico-camera",
        "icon-size": 0.6,
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-opacity": 0.95,
      },
    });
  }
  if (vis.noticias) {
    map.addLayer({
      id: CAMADA_NOTICIA,
      type: "circle",
      source: "intel-noticia",
      minzoom: 2,
      paint: {
        "circle-radius": 6,
        "circle-color": "#FBBF24",
        "circle-stroke-color": "#1A1A1A",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.85,
      },
    });
  }
  if (vis.satelites && satelites.length) {
    map.addLayer({
      id: CAMADA_SAT,
      type: "circle",
      source: "intel-sat",
      paint: {
        "circle-radius": 5,
        "circle-color": "#E879F9",
        "circle-stroke-color": "#0B0B0B",
        "circle-stroke-width": 1.5,
      },
    });
    map.addLayer({
      id: CAMADA_SAT_LABEL,
      type: "symbol",
      source: "intel-sat",
      layout: {
        "text-field": ["get", "nome"],
        "text-size": 9,
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#F5D0FE",
        "text-halo-color": "#0B0B0B",
        "text-halo-width": 2,
      },
    });
  }
  if (vis.satelites && iss) {
    map.addLayer({
      id: CAMADA_ISS_TRAJ,
      type: "line",
      source: "intel-iss-trajetoria",
      paint: {
        "line-color": "#8BD5FF",
        "line-width": 1.3,
        "line-dasharray": [2, 2],
        "line-opacity": 0.6,
      },
    });
    map.addLayer({
      id: CAMADA_ISS,
      type: "symbol",
      source: "intel-iss",
      layout: {
        "icon-image": "intel-ico-iss",
        "icon-size": 0.66,
        "icon-allow-overlap": true,
      },
    });
    map.addLayer({
      id: CAMADA_ISS_LABEL,
      type: "symbol",
      source: "intel-iss",
      layout: {
        "text-field": "ISS",
        "text-size": 10,
        "text-offset": [0, 1.6],
        "text-anchor": "top",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#8BD5FF",
        "text-halo-color": "#0B0B0B",
        "text-halo-width": 2,
      },
    });
  }
}

/** Remove camadas e fontes de inteligência (volta ao modo tático limpo). */
export function removerCamadasIntel(map: ML) {
  if (!map) return;
  for (const id of CAMADAS_EM_ORDEM) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of FONTES_INTEL) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

function htmlPopup(conteudo: string, link?: string): string {
  const rodape = link
    ? `<a href="${link}" target="_blank" rel="noreferrer" class="intel-popup-link">Ver fonte original ↗</a>`
    : "";
  return `<div class="intel-popup">${conteudo}${rodape ? `<div class="mt-1">${rodape}</div>` : ""}</div>`;
}

function ftEmM(ft: number): number {
  return Math.round(ft * 0.3048);
}

function ktEmKmh(kt: number): number {
  return Math.round(kt * 1.852);
}

function rotuloNivelGdacs(nivel: string): string {
  return nivel === "Red" ? "ALERTA VERMELHO" : nivel === "Orange" ? "ALERTA LARANJA" : "VERDE";
}

/**
 * Registra (uma única vez) o clique que abre popups das entidades de
 * inteligência. Seguro chamar no "load" do mapa: camadas ausentes simplesmente
 * não retornam feições.
 */
export function registrarPopupsIntel(map: ML) {
  const aoClicar = async (e: maplibregl.MapMouseEvent) => {
    const feicoes = map.queryRenderedFeatures(e.point, { layers: [...CAMADAS_COM_POPUP] });
    const f = feicoes[0];
    if (!f) return;
    const ml = await import("maplibre-gl");
    const p = f.properties ?? {};
    let html = "";
    switch (f.layer.id) {
      case CAMADA_SISMO: {
        const mag = typeof p["mag"] === "number" ? p["mag"] : Number(p["mag"]);
        html = htmlPopup(
          `<div class="font-bold text-tactical-orange">TERREMOTO M${formatNumber(mag, 1)}</div>` +
            `<div>${p["lugar"] ?? ""}</div>` +
            `<div class="text-muted-foreground">Profundidade ${formatInteger(Number(p["prof"] ?? 0))} km · ${formatDateTime(Number(p["hora"]))}</div>` +
            (p["tsunami"]
              ? `<div class="text-red-400 font-bold">Alerta de tsunami avaliado</div>`
              : ""),
          typeof p["url"] === "string" && p["url"] ? p["url"] : undefined,
        );
        break;
      }
      case CAMADA_EVENTO:
        html = htmlPopup(
          `<div class="font-bold text-amber-400">${p["categoria"] ?? "Evento natural"}</div>` +
            `<div>${p["titulo"] ?? ""}</div>` +
            (p["hora"]
              ? `<div class="text-muted-foreground">${formatDateTime(Number(p["hora"]))}</div>`
              : ""),
          typeof p["url"] === "string" && p["url"] ? p["url"] : undefined,
        );
        break;
      case CAMADA_CONFLITO: {
        const nivel = (p["nivel"] ?? "elevado") as NivelConflito;
        html = htmlPopup(
          `<div class="font-bold ${nivel === "guerra" ? "text-red-400" : "text-amber-400"}">${ROTULO_NIVEL[nivel]}</div>` +
            `<div class="font-bold">${p["nome"] ?? ""}</div>` +
            `<div class="text-muted-foreground">${p["resumo"] ?? ""}</div>`,
        );
        break;
      }
      case CAMADA_FOGO:
        html = htmlPopup(
          `<div class="font-bold text-orange-400">FOCO DE CALOR (VIIRS)</div>` +
            `<div class="text-muted-foreground">Detectado em ${p["hora"] ?? ""} · confiança ${p["confianca"] || "n/d"}</div>` +
            `<div class="text-muted-foreground">Fonte: NASA FIRMS</div>`,
        );
        break;
      case CAMADA_VOO:
      case CAMADA_VOO_MIL: {
        const alt = typeof p["altitude"] === "number" ? (p["altitude"] as number) : null;
        const vel = typeof p["velocidade"] === "number" ? (p["velocidade"] as number) : null;
        const mil = Boolean(p["militar"]);
        html = htmlPopup(
          `<div class="font-bold ${mil ? "text-red-400" : "text-sky-300"}">${mil ? "AERONAVE MILITAR" : "AERONAVE"} ${p["indicativo"] ?? "—"}</div>` +
            `<div class="text-muted-foreground">${[p["tipo"], p["matricula"]].filter(Boolean).join(" · ") || "modelo não informado"}</div>` +
            `<div>${alt != null ? `${formatInteger(alt)} ft (${formatInteger(ftEmM(alt))} m)` : "no solo"}` +
            (vel != null
              ? ` · ${formatInteger(vel)} kt (${formatInteger(ktEmKmh(vel))} km/h)`
              : "") +
            `</div>` +
            (p["emergencia"]
              ? `<div class="text-red-400 font-bold">EMERGÊNCIA: ${p["emergencia"]}</div>`
              : "") +
            `<div class="text-muted-foreground">Fonte: rede ADS-B (adsb.lol)</div>`,
        );
        break;
      }
      case CAMADA_ISS:
        html = htmlPopup(
          `<div class="font-bold text-sky-300">ESTAÇÃO ESPACIAL INTERNACIONAL</div>` +
            `<div>Altitude ${formatInteger(Number(p["altitudeKm"] ?? 0))} km · ${formatInteger(Number(p["velocidadeKmh"] ?? 0))} km/h</div>` +
            `<div class="text-muted-foreground">${p["visibilidade"] === "daylight" ? "Iluminada pelo Sol" : "Na sombra da Terra"}</div>` +
            `<div class="text-muted-foreground">Fonte: WhereTheISS.at</div>`,
        );
        break;
      case CAMADA_ALERTA: {
        const nivel = String(p["nivel"] ?? "Green");
        html = htmlPopup(
          `<div class="font-bold ${nivel === "Red" ? "text-red-400" : nivel === "Orange" ? "text-amber-400" : "text-emerald-400"}">${rotuloNivelGdacs(nivel)}</div>` +
            `<div class="font-bold">${p["tipo"] ?? ""} — ${p["pais"] ?? ""}</div>` +
            `<div>${p["nome"] ?? ""}</div>` +
            (p["inicio"]
              ? `<div class="text-muted-foreground">Início ${formatDateTime(new Date(p["inicio"]).getTime())}</div>`
              : "") +
            `<div class="text-muted-foreground">Fonte: GDACS (UE/ONU)</div>`,
          typeof p["url"] === "string" && p["url"] ? p["url"] : undefined,
        );
        break;
      }
      case CAMADA_NUCLEAR: {
        const status = String(p["status"] ?? "operacional");
        html = htmlPopup(
          `<div class="font-bold text-purple-300">CENTRAL NUCLEAR — ${ROTULO_STATUS_NUCLEAR[status as keyof typeof ROTULO_STATUS_NUCLEAR] ?? status}</div>` +
            `<div class="font-bold">${p["nome"] ?? ""} (${p["pais"] ?? ""})</div>` +
            `<div class="text-muted-foreground">${formatInteger(Number(p["reatores"] ?? 0))} reatores · ${formatInteger(Number(p["capacidadeMW"] ?? 0))} MW</div>` +
            (p["nota"] ? `<div>${p["nota"]}</div>` : "") +
            `<div class="text-muted-foreground">Referência curada — use a ferramenta Medir para distâncias de evacuação.</div>`,
        );
        break;
      }
      case CAMADA_ESTREITO: {
        const nivelE = (p["nivel"] ?? "monitorado") as NivelEstreito;
        html = htmlPopup(
          `<div class="font-bold ${nivelE === "critico" ? "text-red-400" : nivelE === "atencao" ? "text-amber-400" : "text-yellow-300"}">${ROTULO_ESTREITO[nivelE]}</div>` +
            `<div class="font-bold">${p["nome"] ?? ""}</div>` +
            `<div class="text-muted-foreground">${p["resumo"] ?? ""}</div>`,
        );
        break;
      }
      case CAMADA_PORTO:
        html = htmlPopup(
          `<div class="font-bold text-sky-300">PORTO — ${p["pais"] ?? ""}</div>` +
            `<div class="font-bold">${p["nome"] ?? ""}</div>` +
            `<div class="text-muted-foreground">${p["nota"] ?? ""}</div>`,
        );
        break;
      case CAMADA_NAVIO:
        html = htmlPopup(
          `<div class="font-bold text-cyan-200">NAVIO (AIS)</div>` +
            `<div class="font-bold">${p["nome"] || "Sem nome"} · MMSI ${p["mmsi"] ?? "—"}</div>` +
            `<div>${p["velocidade"] != null ? `${formatNumber(Number(p["velocidade"]), 1)} kt` : "velocidade n/d"}` +
            (p["rumo"] ? ` · rumo ${formatInteger(Number(p["rumo"]))}°` : "") +
            `</div>` +
            (p["hora"]
              ? `<div class="text-muted-foreground">${formatDateTime(Number(p["hora"]))}</div>`
              : "") +
            `<div class="text-muted-foreground">Fonte: AISStream.io</div>`,
        );
        break;
      case CAMADA_CAMERA: {
        const categoria = String(p["categoria"] ?? "cidade");
        const videoId = typeof p["videoId"] === "string" ? p["videoId"] : "";
        html = htmlPopup(
          `<div class="font-bold text-pink-300">CÂMERA AO VIVO — ${ROTULO_CATEGORIA_CAMERA[categoria as keyof typeof ROTULO_CATEGORIA_CAMERA] ?? categoria}</div>` +
            `<div class="font-bold">${p["nome"] ?? ""}</div>` +
            `<div class="text-muted-foreground">${p["cidade"] ?? ""} · ${p["pais"] ?? ""} · canal ${p["canal"] ?? "—"}</div>` +
            (videoId
              ? `<iframe width="240" height="135" src="https://www.youtube.com/embed/${videoId}?rel=0" title="Câmera ao vivo" frameborder="0" allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" style="margin-top:4px;border:0;border-radius:6px"></iframe>`
              : ""),
          videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
        );
        break;
      }
      case CAMADA_CABO:
      case CAMADA_CABO_PONTO:
        html = htmlPopup(
          `<div class="font-bold text-cyan-300">CABO SUBMARINO</div>` +
            `<div class="font-bold">${p["nome"] ?? ""}</div>` +
            `<div>${formatInteger(Number(p["comprimentoKm"] ?? 0))} km · em serviço desde ${formatInteger(Number(p["ano"] ?? 0))}</div>` +
            `<div class="text-muted-foreground">Desembarques: ${p["desembarques"] ?? "—"}</div>` +
            `<div class="text-muted-foreground">Rota aproximada — referência curada.</div>`,
        );
        break;
      case CAMADA_NOTICIA:
        html = htmlPopup(
          `<div class="font-bold text-amber-300">MANCHETE — ${p["pais"] ?? ""}</div>` +
            `<div>${p["titulo"] ?? ""}</div>` +
            (p["hora"]
              ? `<div class="text-muted-foreground">${formatDateTime(Number(p["hora"]))} · ${p["fonte"] ?? ""}</div>`
              : "") +
            `<div class="text-muted-foreground">Posição = país de origem do veículo (centroide) — fonte: GDELT</div>`,
          typeof p["url"] === "string" && p["url"] ? p["url"] : undefined,
        );
        break;
      case CAMADA_SAT:
        html = htmlPopup(
          `<div class="font-bold text-fuchsia-300">SATÉLITE — ${p["nome"] ?? ""}</div>` +
            `<div>Altitude ${formatInteger(Number(p["altitudeKm"] ?? 0))} km · ${formatInteger(Number(p["velocidadeKmh"] ?? 0))} km/h</div>` +
            `<div class="text-muted-foreground">NORAD ${p["norad"] ?? "—"} · posição propagada localmente (SGP4/TLE — Celestrak)</div>`,
        );
        break;
      default:
        return;
    }
    if (!html) return;
    new ml.Popup({ closeButton: true, maxWidth: "280px" })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  };
  map.on("click", aoClicar);
  return () => {
    map.off("click", aoClicar);
  };
}
