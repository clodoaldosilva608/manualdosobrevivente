/**
 * BDGEx — Banco de Dados Geográficos do Exército Brasileiro.
 *
 * Integração da carta topográfica oficial como camada base do mapa tático.
 * Dois caminhos de acesso, com fallback defensivo entre eles:
 *
 * 1. RASTER NATIVO (preferido): serviço WMS 1.1.1 do MapCache do Exército,
 *    camada "ctmmultiescalas_mercator" — a carta multi-escala já projetada
 *    em Mercator, alinhada com o mapa web (EPSG:3857). O MapLibre injeta o
 *    bbox do tile no placeholder {bbox-epsg-3857}.
 *
 * 2. APP OFICIAL (fallback): o BDGEx Mobile embutido (iframe) ou aberto em
 *    nova aba com deep-link de centro/zoom — todas as funcionalidades
 *    originais do aplicativo militar, como o operador conhece.
 *
 * Por que o fallback importa: o servidor do Exército recusa conexões de IPs
 * de datacenter/exterior e pode não enviar cabeçalhos CORS — sem CORS o
 * navegador não consegue subir os tiles como textura WebGL. Nesse cenário o
 * mapa sinaliza a falha e oferece o app oficial (que funciona no navegador
 * do operador, inclusive no Brasil).
 */

/** URL WMS do MapCache do BDGEx (documentação oficial de Serviços OGC). */
export const URL_WMS_BDGEX =
  "https://bdgex.eb.mil.br/mapcache?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
  "&FORMAT=image%2Fpng&TRANSPARENT=TRUE&LAYERS=ctmmultiescalas_mercator&STYLES=" +
  "&SRS=EPSG%3A3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}";

/** Camadas padrão do app oficial (as que o operador pediu: carta topográfica). */
export const CAMADAS_APP_BDGEX = "963,953";

/** URL raiz do aplicativo móvel oficial do BDGEx. */
export const URL_APP_BDGEX = "https://bdgex.eb.mil.br/bdgexapp/mobile/";

/**
 * Deep-link do app oficial mantendo a visão atual do mapa tático.
 * O BDGEx Mobile aceita ?c=lng,lat&z=zoom&l=camadas — assim o operador
 * cai na mesma área que estava olhando, com TODAS as funcionalidades
 * do aplicativo militar original.
 */
export function urlAppOficialBdgex(lng: number, lat: number, zoom: number): string {
  const z = Math.max(2, Math.min(19, Math.round(zoom)));
  return `${URL_APP_BDGEX}?l=${CAMADAS_APP_BDGEX}&c=${lng.toFixed(6)},${lat.toFixed(6)}&z=${z}`;
}

/** URL do app oficial para iframe (mesma visão, sem parâmetros opcionais quando inválidos). */
export function urlIframeBdgex(lng: number, lat: number, zoom: number): string {
  return urlAppOficialBdgex(lng, lat, zoom);
}

/**
 * Decide se a falha de tiles da base BDGEx já é definitiva.
 * O MapLibre emite "error" por tile; rajadas isoladas acontecem até em
 * serviço sadio — só marcamos falha após várias falhas consecutivas
 * (nenhum tile conseguiu carregar), o que indica bloqueio/CORS real.
 */
export const LIMIAR_FALHA_BDGEX = 6;

export function falhaDefinitivaBdgex(erros: number): boolean {
  return erros >= LIMIAR_FALHA_BDGEX;
}
