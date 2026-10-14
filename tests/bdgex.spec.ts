/**
 * Unidade da integração BDGEx (Carta do Exército) — src/lib/bdgex.ts.
 * Cobre os construtores de URL (app oficial com deep-link de visão) e a
 * regra de falha definitiva de tiles (bloqueio/CORS do servidor militar).
 */
import { describe, expect, it } from "vitest";
import {
  URL_WMS_BDGEX,
  URL_APP_BDGEX,
  CAMADAS_APP_BDGEX,
  urlAppOficialBdgex,
  urlIframeBdgex,
  falhaDefinitivaBdgex,
  LIMIAR_FALHA_BDGEX,
} from "../src/lib/bdgex";

describe("URL do WMS do MapCache (raster nativo)", () => {
  it("aponta para o serviço oficial com a camada multi-escala em Mercator", () => {
    expect(URL_WMS_BDGEX).toContain("https://bdgex.eb.mil.br/mapcache");
    expect(URL_WMS_BDGEX).toContain("LAYERS=ctmmultiescalas_mercator");
    expect(URL_WMS_BDGEX).toContain("SRS=EPSG%3A3857");
    expect(URL_WMS_BDGEX).toContain("VERSION=1.1.1");
    // Placeholder do MapLibre: bbox por tile em EPSG:3857.
    expect(URL_WMS_BDGEX).toContain("BBOX={bbox-epsg-3857}");
  });
});

describe("urlAppOficialBdgex (deep-link do app oficial)", () => {
  it("preserva centro e zoom na URL do BDGEx Mobile", () => {
    const url = urlAppOficialBdgex(-34.934244, -7.996783, 11);
    expect(url.startsWith(URL_APP_BDGEX)).toBe(true);
    expect(url).toContain(`l=${CAMADAS_APP_BDGEX}`);
    expect(url).toContain("c=-34.934244,-7.996783");
    expect(url).toContain("z=11");
  });

  it("arredonda o zoom e satura em [2, 19]", () => {
    expect(urlAppOficialBdgex(0, 0, 11.6)).toContain("z=12");
    expect(urlAppOficialBdgex(0, 0, 0.2)).toContain("z=2");
    expect(urlAppOficialBdgex(0, 0, 40)).toContain("z=19");
  });

  it("formato de coordenadas com 6 casas (estável e curto)", () => {
    expect(urlAppOficialBdgex(-47.8822, -15.7942, 10)).toContain("c=-47.882200,-15.794200");
  });
});

describe("urlIframeBdgex", () => {
  it("espelha o deep-link do app oficial (mesma visão no iframe)", () => {
    expect(urlIframeBdgex(-34.93, -7.99, 11)).toBe(urlAppOficialBdgex(-34.93, -7.99, 11));
  });
});

describe("falhaDefinitivaBdgex (bloqueio/CORS)", () => {
  it("rajadas isoladas de erro não marcam falha", () => {
    for (let n = 1; n < LIMIAR_FALHA_BDGEX; n++) {
      expect(falhaDefinitivaBdgex(n)).toBe(false);
    }
  });

  it("a partir do limiar a falha é definitiva", () => {
    expect(falhaDefinitivaBdgex(LIMIAR_FALHA_BDGEX)).toBe(true);
    expect(falhaDefinitivaBdgex(LIMIAR_FALHA_BDGEX + 10)).toBe(true);
  });
});
