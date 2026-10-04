/**
 * Propagação orbital local — o cliente calcula as posições dos satélites a
 * partir dos TLEs (two-line elements) coletados pelo servidor. O satellite.js
 * implementa o modelo SGP4 do NORAD; cada chamada é pura e barata (~µs), o
 * que permite atualizar a camada várias vezes por minuto sem trafegar rede.
 *
 * A ISS NÃO entra aqui: ela tem camada dedicada com dados do WhereTheISS.at
 * (posição + trajetória + pegada) — evita um segundo marcador duplicado.
 */
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from "satellite.js";
import type { IntelSatelite } from "@/lib/intel.types";

/** TLE bruto (formato Celestrak, duas linhas de 69 caracteres). */
export interface TleSatelite {
  norad: number;
  nome: string;
  linha1: string;
  linha2: string;
}

/** Converte o texto de um grupo Celestrak (FORMAT=TLE) em pares de linhas. */
export function parseTle(texto: string): TleSatelite[] {
  const linhas = texto.split(/\r?\n/);
  const saida: TleSatelite[] = [];
  for (let i = 0; i < linhas.length - 1; i++) {
    const l1 = linhas[i];
    const l2 = linhas[i + 1];
    if (l1?.startsWith("1 ") && l2?.startsWith("2 ")) {
      const nome = (linhas[i - 1] ?? "").trim();
      const norad = Number.parseInt(l1.slice(2, 7), 10);
      if (nome && Number.isFinite(norad)) {
        saida.push({ norad, nome, linha1: l1.trim(), linha2: l2.trim() });
      }
    }
  }
  return saida;
}

/** Propaga UM satélite para o instante dado (null quando decaído/inválido). */
export function propagarSatelite(tle: TleSatelite, agora: number): IntelSatelite | null {
  try {
    const satrec = twoline2satrec(tle.linha1, tle.linha2);
    const data = new Date(agora);
    const pv = propagate(satrec, data);
    // Em caso de erro (satélite decaído, TLE ruim) o satellite.js devolve
    // `false` no lugar dos vetores — filtra explicitamente (o tipo é X | boolean).
    if (!pv || typeof pv.position === "boolean" || typeof pv.velocity === "boolean") {
      return null;
    }
    const geo = eciToGeodetic(pv.position, gstime(data));
    const lat = degreesLat(geo.latitude);
    const lng = degreesLong(geo.longitude);
    const velKms = Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      norad: tle.norad,
      nome: tle.nome,
      lng,
      lat,
      altitudeKm: geo.height,
      velocidadeKmh: velKms * 3600,
      hora: agora,
    };
  } catch {
    return null;
  }
}

/**
 * Propaga a lista inteira descartando os que falharem (decaídos, TLE corrompido).
 * Ordena por nome para o painel ficar estável entre atualizações.
 */
export function propagarSatelites(tles: TleSatelite[], agora: number): IntelSatelite[] {
  return tles
    .map((t) => propagarSatelite(t, agora))
    .filter((s): s is IntelSatelite => s !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
