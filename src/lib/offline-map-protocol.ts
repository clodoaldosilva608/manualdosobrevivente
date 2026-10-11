/**
 * Protocolo de tiles OFFLINE do mapa — os blocos baixados na página
 * /offline (IndexedDB, lib/offline-tiles) passam a alimentar o mapa de
 * verdade. Sem isto, a área baixada ficava no banco e o mapa nunca a
 * lia: o prontidão marcava amarelo e o operador seguia sem fundo de
 * mapa sem sinal.
 *
 * Design:
 *  • protocolo custom `tg-offline://{source_id}/{z}/{x}/{y}` registrado no
 *    maplibre (addProtocol) — a resolução lê o IndexedDB e devolve o blob;
 *  • cada área baixada vira um raster source + raster layer INSERIDOS na
 *    base da pilha (abaixo de tudo, exceto o background): quando há rede os
 *    tiles online cobrem por cima; quando não há, os blocos locais aparecem;
 *  • sincronização idempotente: pode rodar no load, no styledata (troca de
 *    estilo limpa sources custom) e no evento `tgis:areas-offline` (download
 *    ou exclusão de área) — nunca duplica e remove órfãos.
 *
 * O módulo NÃO importa maplibre-gl estaticamente (o mapa é carregado com
 * `await import` no MapShell) — as funções recebem o namespace via parâmetro.
 */
import { getCachedTile, listAreas } from "./offline-tiles";
import type { CachedArea } from "./db";

/** Prefixo do protocolo custom registrado no maplibre. */
export const PROTOCOLO_OFFLINE = "tg-offline";

/** Evento disparado quando áreas offline mudam (download/exclusão). */
export const EVENTO_AREAS = "tgis:areas-offline";

export interface TileParsed {
  sourceId: string;
  z: number;
  x: number;
  y: number;
}

/** Lê `tg-offline://{source_id}/{z}/{x}/{y}` — null quando não é do protocolo. */
export function parseUrlOffline(url: string): TileParsed | null {
  if (typeof url !== "string") return null;
  const prefixo = `${PROTOCOLO_OFFLINE}:`;
  if (!url.startsWith(prefixo)) return null;
  const partes = url
    .slice(prefixo.length)
    .split("/")
    .map((p) => p.trim());
  if (partes.length !== 4 || partes.some((p) => p.length === 0)) return null;
  const [sourceId, z, x, y] = partes;
  if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) return null;
  return { sourceId, z: Number(z), x: Number(x), y: Number(y) };
}

/**
 * Resolve um tile do protocolo a partir do IndexedDB — injetável nos testes.
 * Sem o bloco local devolve `data: null` (tile transparente: o que estiver
 * por baixo aparece, sem derrubar o mapa).
 */
export async function resolverTileOffline(
  url: string,
  obterTile: (
    sourceId: string,
    z: number,
    x: number,
    y: number,
  ) => Promise<Blob | undefined> = getCachedTile,
): Promise<{ data: ArrayBuffer | null }> {
  const tile = parseUrlOffline(url);
  if (!tile) return { data: null };
  try {
    const blob = await obterTile(tile.sourceId, tile.z, tile.x, tile.y);
    if (!blob) return { data: null };
    return { data: await blob.arrayBuffer() };
  } catch {
    return { data: null };
  }
}

interface MapLibreNamespace {
  // Assinatura de MÉTODO (bivariante): o .d.ts do maplibre usa tipos próprios
  // (RequestParameters/GetResourceResponse) — com propriedade arrow sob
  // strictFunctionTypes a atribuição do namespace real falharia.
  addProtocol(
    protocolo: string,
    carga: (params: { url: string }, abort: AbortController) => Promise<unknown>,
  ): void;
  removeProtocol?(protocolo: string): void;
}

let protocoloRegistrado = false;

/** Registra o protocolo `tg-offline` no maplibre (uma única vez por página). */
export function registrarProtocoloOffline(ml: MapLibreNamespace): void {
  if (protocoloRegistrado) return;
  if (!ml || typeof ml.addProtocol !== "function") return;
  ml.addProtocol(PROTOCOLO_OFFLINE, (params, abort) => {
    if (abort?.signal?.aborted) return Promise.resolve({ data: null });
    return resolverTileOffline(params?.url ?? "");
  });
  protocoloRegistrado = true;
}

/** Ids estáveis de source/layer de uma área. */
export function idSourceArea(areaId: string): string {
  return `tg-area-src-${areaId}`;
}
export function idLayerArea(areaId: string): string {
  return `tg-area-${areaId}`;
}

/** Spec do raster source de uma área (zoom fora da faixa usa overzoom). */
export function especificacaoSourceArea(
  area: Pick<CachedArea, "source_id" | "min_zoom" | "max_zoom">,
) {
  return {
    type: "raster" as const,
    tiles: [`${PROTOCOLO_OFFLINE}:${area.source_id}/{z}/{x}/{y}`],
    tileSize: 256,
    minzoom: area.min_zoom,
    maxzoom: area.max_zoom,
    attribution: "Área offline salva no aparelho",
  };
}

/** Id da primeira camada NÃO background (ponto de inserção na base da pilha). */
export function pontoInsercaoBase(layers: Array<{ id: string; type: string }>): string | undefined {
  return layers.find((l) => l.type !== "background")?.id;
}

interface MapaMinimo {
  getStyle(): { layers?: Array<{ id: string; type: string }> };
  getSource(id: string): unknown;
  getLayer(id: string): unknown;
  addSource(id: string, spec: unknown): void;
  addLayer(spec: unknown, antes?: string): void;
  removeLayer(id: string): void;
  removeSource(id: string): void;
}

let fila: Promise<number> = Promise.resolve(0);
let emAndamento = false;

/**
 * Sincroniza as áreas baixadas com o mapa — idempotente e serializada (o
 * styledata e o evento podem disparar juntos). Devolve quantas áreas ficaram
 * ativas no mapa. Operações individuais falham manso (área corrompida não
 * derruba o mapa).
 */
export async function sincronizarAreasOffline(
  map: MapaMinimo,
  listar: () => Promise<CachedArea[]> = listAreas,
): Promise<number> {
  if (emAndamento) return -1; // já existe sincronização no exato instante
  emAndamento = true;
  try {
    return await (fila = fila.then(async () => {
      try {
        let areas: CachedArea[] = [];
        try {
          areas = await listar();
        } catch {
          return 0;
        }
        const desejados = new Set(areas.map((a) => a.id));
        // Órfãos primeiro: camadas/sources de áreas que não existem mais.
        const atuais = map.getStyle()?.layers ?? [];
        for (const l of atuais) {
          if (
            typeof l.id === "string" &&
            l.id.startsWith("tg-area-") &&
            !l.id.startsWith("tg-area-src-")
          ) {
            const areaId = l.id.slice("tg-area-".length);
            if (!desejados.has(areaId)) {
              try {
                map.removeLayer(l.id);
                map.removeSource(idSourceArea(areaId));
              } catch {
                /* já removido pelo setStyle */
              }
            }
          }
        }
        let ativas = 0;
        for (const area of areas) {
          const srcId = idSourceArea(area.id);
          const layerId = idLayerArea(area.id);
          try {
            if (!map.getSource(srcId)) {
              map.addSource(srcId, especificacaoSourceArea(area));
            }
            if (!map.getLayer(layerId)) {
              const antes = pontoInsercaoBase(map.getStyle()?.layers ?? []);
              map.addLayer(
                { id: layerId, type: "raster", source: srcId, paint: { "raster-opacity": 1 } },
                antes,
              );
            }
            ativas++;
          } catch {
            /* área problemática: segue para a próxima */
          }
        }
        return ativas;
      } catch {
        // Mapa destruído/estilo interim: nada a fazer — a próxima chamada refaz.
        return 0;
      }
    }));
  } finally {
    emAndamento = false;
  }
}
