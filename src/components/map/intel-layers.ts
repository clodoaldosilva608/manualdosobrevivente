/**
 * Camadas MapLibre do modo Osiris (inteligência global).
 *
 * Todas as camadas usam fontes GeoJSON próprias (prefixo "intel-"), criadas
 * sob demanda e alimentadas por este módulo. A ordem de empilhamento é fixa:
 * noite (mais baixa) → focos de calor → eventos → conflitos → sismos (topo).
 * O overlay noturno é inserido abaixo das camadas de desenho para não
 * escurecer waypoints e medições.
 */
import type maplibregl from "maplibre-gl";
import { ROTULO_NIVEL, type IntelConflito, type NivelConflito } from "@/lib/intel-conflicts";
import type { IntelSnapshot, IntelVisibilidade } from "@/lib/intel.types";
import { formatDateTime, formatInteger, formatNumber } from "@/lib/format";

type ML = maplibregl.Map;

export const FONTES_INTEL = [
  "intel-noite",
  "intel-fogo",
  "intel-evento",
  "intel-conflito",
  "intel-sismo",
] as const;

const CAMADA_NOITE = "intel-noite-fill";
const CAMADA_FOGO = "intel-fogo-circle";
const CAMADA_EVENTO = "intel-evento-circle";
const CAMADA_CONFLITO = "intel-conflito-circle";
const CAMADA_CONFLITO_LABEL = "intel-conflito-label";
const CAMADA_SISMO = "intel-sismo-circle";

const CAMADAS_EM_ORDEM = [
  CAMADA_NOITE,
  CAMADA_FOGO,
  CAMADA_EVENTO,
  CAMADA_CONFLITO,
  CAMADA_CONFLITO_LABEL,
  CAMADA_SISMO,
];

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
  const antes = abaixoDe && map.getLayer(abaixoDe) ? abaixoDe : undefined;
  map.addLayer(camada, antes);
}

/** Cria/atualiza as camadas de inteligência conforme visibilidade e dados. */
export function sincronizarCamadasIntel(
  map: ML,
  entrada: {
    snapshot: IntelSnapshot | null;
    conflitos: IntelConflito[];
    noite: GeoJSON.Feature | null;
    vis: IntelVisibilidade;
  },
) {
  const { snapshot, conflitos, noite, vis } = entrada;

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
}

/** Remove camadas e fontes de inteligência (volta ao modo tático limpo). */
export function removerCamadasIntel(map: ML) {
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

/**
 * Registra (uma única vez) o clique que abre popups das entidades de
 * inteligência. Seguro chamar no "load" do mapa: camadas ausentes simplesmente
 * não retornam feições.
 */
export function registrarPopupsIntel(map: ML) {
  const aoClicar = async (e: maplibregl.MapMouseEvent) => {
    const alvos = CAMADAS_EM_ORDEM.filter((id) => id !== CAMADA_CONFLITO_LABEL);
    const feicoes = map.queryRenderedFeatures(e.point, { layers: alvos });
    const f = feicoes[0];
    if (!f) return;
    const ml = await import("maplibre-gl");
    const p = f.properties ?? {};
    let html = "";
    if (f.layer.id === CAMADA_SISMO) {
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
    } else if (f.layer.id === CAMADA_EVENTO) {
      html = htmlPopup(
        `<div class="font-bold text-amber-400">${p["categoria"] ?? "Evento natural"}</div>` +
          `<div>${p["titulo"] ?? ""}</div>` +
          (p["hora"]
            ? `<div class="text-muted-foreground">${formatDateTime(Number(p["hora"]))}</div>`
            : ""),
        typeof p["url"] === "string" && p["url"] ? p["url"] : undefined,
      );
    } else if (f.layer.id === CAMADA_CONFLITO) {
      const nivel = (p["nivel"] ?? "elevado") as NivelConflito;
      html = htmlPopup(
        `<div class="font-bold ${nivel === "guerra" ? "text-red-400" : "text-amber-400"}">${ROTULO_NIVEL[nivel]}</div>` +
          `<div class="font-bold">${p["nome"] ?? ""}</div>` +
          `<div class="text-muted-foreground">${p["resumo"] ?? ""}</div>`,
      );
    } else if (f.layer.id === CAMADA_FOGO) {
      html = htmlPopup(
        `<div class="font-bold text-orange-400">FOCO DE CALOR (VIIRS)</div>` +
          `<div class="text-muted-foreground">Detectado em ${p["hora"] ?? ""} · confiança ${p["confianca"] || "n/d"}</div>` +
          `<div class="text-muted-foreground">Fonte: NASA FIRMS</div>`,
      );
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
