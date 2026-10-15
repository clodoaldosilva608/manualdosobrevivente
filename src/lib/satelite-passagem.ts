/**
 * Previsão de PASSAGEM de satélite sobre o operador — "quando o satélite
 * passa sobre mim" (nascer, pico, pôr), com visibilidade a olho nu.
 *
 * Porta fiel (MIT) do módulo satellitePass.js do projeto God's Eye View
 * (github.com/bilawalsidhu/gods-eye-view), adaptado ao idioma e às tipagens
 * deste repositório. Algoritmos preservados:
 *  - Ângulos de visada por SGP4 (satellite.js): azimute/elevação do satélite
 *    visto do observador;
 *  - Varredura grosseira de 20 s + BISSEÇÃO do limiar de elevação (nascer e
 *    pôr com precisão de subsegundo) + PICO refinado por parábola de 3 pontos
 *    (zero chamadas extras de SGP4);
 *  - Visibilidade a olho nu: satélite ILUMINADO (sombra cilíndrica da Terra
 *    com posição solar USNO de baixa precisão, ~1 arco-minuto) sob céu ESCURO
 *    (crepúsculo civil, Sol ≤ −6°);
 *  - hasVisibleInterval resolve cruzamentos sombra/crepúsculo a 20 ms para
 *    não perder sobreposição curta entre amostras.
 *
 * Padrão de varredura originado em skylight (MIT) shared/src/celestial.ts.
 */
import { twoline2satrec, propagate, gstime, eciToEcf, ecfToLookAngles } from "satellite.js";
import type { TleSatelite } from "@/lib/satelite-propagacao";

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;
const RAIO_TERRA_KM = 6371.0;
const UA_KM = 149597870.7;

/** Uma passagem do satélite sobre o observador (limiar de elevação). */
export interface PassagemSatelite {
  /** Início (nascer do limiar) — Unix ms. */
  inicioMs: number;
  /** Fim (pôr do limiar) — Unix ms. */
  fimMs: number;
  /** Elevação máxima da passagem, em graus [0, 90]. */
  picoElevGraus: number;
  /** Instante do pico — Unix ms. */
  picoMs: number;
  /** Azimute do nascer, em graus [0, 360). */
  azimuteInicioGraus: number;
  /** Alguma parte da passagem é visível a olho nu (satélite iluminado + céu escuro). */
  visivel: boolean;
  /** O satélite está iluminado no pico (fora da sombra da Terra). */
  iluminado: boolean;
  /** O céu do observador está escuro no pico (Sol ≤ −6°). */
  ceuEscuro: boolean;
}

/** Opções de busca da próxima passagem. */
export interface OpcoesPassagem {
  /** Elevação que define nascer/pôr, em graus (padrão 10). */
  elevacaoMinimaGraus?: number;
  /** Horizonte máximo de busca, em horas (padrão 24). */
  horizonteHoras?: number;
  /** Passo da varredura grosseira, em segundos (padrão 20). */
  passoGrossoSeg?: number;
  /** Passo do trânsito fino, em segundos (padrão 5). */
  passoFinoSeg?: number;
  /** Exige passagem visível a olho nu (padrão false). */
  exigirVisivel?: boolean;
  /** Teto de escuridão do céu: elevação solar máxima, em graus (padrão −6). */
  solMaximoGraus?: number;
}

/** Ângulos de visada num instante — null quando a propagação falha. */
export function angulosVisada(
  satrec: ReturnType<typeof twoline2satrec>,
  instanteMs: number,
  latGraus: number,
  lngGraus: number,
): { elevGraus: number; azGraus: number; satEci: { x: number; y: number; z: number } } | null {
  let pv: ReturnType<typeof propagate> | null = null;
  try {
    pv = propagate(satrec, new Date(instanteMs));
  } catch {
    return null;
  }
  const pos = pv && pv.position;
  if (!pos || typeof pos === "boolean" || ![pos.x, pos.y, pos.z].every(Number.isFinite)) {
    return null;
  }
  const ecf = eciToEcf(pos, gstime(new Date(instanteMs)));
  const visada = ecfToLookAngles(
    { latitude: latGraus * D2R, longitude: lngGraus * D2R, height: 0 },
    ecf,
  );
  return {
    elevGraus: visada.elevation * R2D,
    azGraus: (((visada.azimuth * R2D) % 360) + 360) % 360,
    satEci: pos,
  };
}

/** Posição do Sol em ECI geocêntrico — USNO de baixa precisão (±1′ perto de J2000). */
export function posicaoSolarEci(instanteMs: number): {
  x: number;
  y: number;
  z: number;
  arGraus: number;
  decGraus: number;
} {
  const JD = instanteMs / 86400000 + 2440587.5;
  const D = JD - 2451545.0; // dias desde J2000.0
  const g = ((((357.529 + 0.98560028 * D) % 360) + 360) % 360) * D2R;
  const q = (((280.459 + 0.98564736 * D) % 360) + 360) % 360;
  const L = ((((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360) + 360) % 360) * D2R;
  const e = (23.439 - 0.00000036 * D) * D2R;
  const ar = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  return {
    x: UA_KM * Math.cos(dec) * Math.cos(ar),
    y: UA_KM * Math.cos(dec) * Math.sin(ar),
    z: UA_KM * Math.sin(dec),
    arGraus: (((ar * R2D) % 360) + 360) % 360,
    decGraus: dec * R2D,
  };
}

/** True quando o satélite (km, ECI) está fora da sombra cilíndrica da Terra. */
export function sateliteIluminado(
  satEci: { x: number; y: number; z: number },
  instanteMs: number,
): boolean {
  if (!satEci || typeof satEci !== "object") return false;
  const sol = posicaoSolarEci(instanteMs);
  const comprimento = Math.hypot(sol.x, sol.y, sol.z);
  const sx = sol.x / comprimento;
  const sy = sol.y / comprimento;
  const sz = sol.z / comprimento;
  const projecao = satEci.x * sx + satEci.y * sy + satEci.z * sz;
  if (projecao > 0) return true; // lado voltado ao Sol
  const dx = satEci.x - projecao * sx;
  const dy = satEci.y - projecao * sy;
  const dz = satEci.z - projecao * sz;
  return Math.hypot(dx, dy, dz) > RAIO_TERRA_KM;
}

/** Elevação solar local do observador, em graus [−90, 90]. */
export function elevacaoSolarObservador(
  latGraus: number,
  lngGraus: number,
  instanteMs: number,
): number {
  const sol = posicaoSolarEci(instanteMs);
  const gmst = gstime(new Date(instanteMs));
  const gmstGraus = (((gmst * R2D) % 360) + 360) % 360;
  const anguloHorarioLocalGraus = (((gmstGraus + lngGraus - sol.arGraus) % 360) + 360) % 360;
  const H = anguloHorarioLocalGraus * D2R;
  const phi = latGraus * D2R;
  const dec = sol.decGraus * D2R;
  const senoElev = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  return Math.asin(Math.max(-1, Math.min(1, senoElev))) * R2D;
}

/** Céu escuro para visão a olho nu (crepúsculo civil: Sol ≤ −6° por padrão). */
export function ceuEscuro(
  latGraus: number,
  lngGraus: number,
  instanteMs: number,
  solMaximoGraus = -6,
): boolean {
  return elevacaoSolarObservador(latGraus, lngGraus, instanteMs) <= solMaximoGraus;
}

/** Bisseção do limiar f(t) = elev(t) − mínimo = 0 (10 iterações ≈ 0,16 s). */
function bissecaoLimite(
  satrec: ReturnType<typeof twoline2satrec>,
  latGraus: number,
  lngGraus: number,
  tBaixo: number,
  tAlto: number,
  elevacaoMinimaGraus: number,
  subindo: boolean,
  iteracoes = 10,
): number {
  let baixo = tBaixo;
  let alto = tAlto;
  for (let i = 0; i < iteracoes; i++) {
    const meio = (baixo + alto) / 2;
    const visada = angulosVisada(satrec, meio, latGraus, lngGraus);
    const elev = visada ? visada.elevGraus : -90;
    if (subindo) {
      if (elev >= elevacaoMinimaGraus) alto = meio;
      else baixo = meio;
    } else {
      if (elev >= elevacaoMinimaGraus) baixo = meio;
      else alto = meio;
    }
  }
  return subindo ? Math.ceil(alto) : Math.floor(baixo);
}

/** Resolve cruzamentos sombra/crepúsculo a 20 ms (não perde sobreposição curta). */
export function intervaloVisivel(
  inicioMs: number,
  fimMs: number,
  condicoesEm: (t: number) => [boolean, boolean],
): boolean {
  const visivel = (estados: [boolean, boolean]) => estados[0] && estados[1];
  for (let esq = inicioMs; esq < fimMs; esq += 5000) {
    const dir = Math.min(fimMs, esq + 5000);
    const a = condicoesEm(esq);
    const b = condicoesEm(dir);
    if (visivel(a) || visivel(b)) return true;
    const cortes = [esq, dir];
    for (let condicao = 0; condicao < 2; condicao++) {
      if (a[condicao] === b[condicao]) continue;
      let baixo = esq;
      let alto = dir;
      while (alto - baixo > 20) {
        const meio = (baixo + alto) / 2;
        if (condicoesEm(meio)[condicao] === a[condicao]) baixo = meio;
        else alto = meio;
      }
      cortes.push((baixo + alto) / 2);
    }
    cortes.sort((x, y) => x - y);
    for (let i = 1; i < cortes.length; i++) {
      if (visivel(condicoesEm((cortes[i - 1] + cortes[i]) / 2))) return true;
    }
  }
  return false;
}

/**
 * Próxima passagem de um satélite (TLE) sobre o observador.
 * Varredura de 20 s, bisseção para nascer/pôr, pico por parábola e filtro
 * opcional de visibilidade a olho nu. Devolve null quando não há passagem
 * no horizonte ou os parâmetros são inválidos.
 */
export function proximaPassagemSatelite(
  tle: TleSatelite,
  latGraus: number,
  lngGraus: number,
  deMs: number,
  opcoes: OpcoesPassagem = {},
): PassagemSatelite | null {
  const {
    elevacaoMinimaGraus = 10,
    horizonteHoras = 24,
    passoGrossoSeg = 20,
    passoFinoSeg = 5,
    exigirVisivel = false,
    solMaximoGraus = -6,
  } = opcoes;

  let satrec: ReturnType<typeof twoline2satrec> | null = null;
  try {
    satrec = twoline2satrec(tle.linha1, tle.linha2);
  } catch {
    return null;
  }
  if (!satrec) return null;

  if (
    ![
      latGraus,
      lngGraus,
      deMs,
      elevacaoMinimaGraus,
      horizonteHoras,
      passoGrossoSeg,
      passoFinoSeg,
      solMaximoGraus,
    ].every(Number.isFinite) ||
    Math.abs(latGraus) > 90 ||
    Math.abs(lngGraus) > 180 ||
    Math.abs(deMs) > 8.63e15 ||
    elevacaoMinimaGraus < 0 ||
    elevacaoMinimaGraus > 90 ||
    horizonteHoras <= 0 ||
    horizonteHoras > 72 ||
    passoGrossoSeg < 1 ||
    passoGrossoSeg > 120 ||
    passoFinoSeg < 0.1 ||
    passoFinoSeg > 60
  ) {
    return null;
  }
  const horizonteMs = deMs + horizonteHoras * 3600_000;
  const passoGrossoMs = passoGrossoSeg * 1000;
  const passoFinoMs = Math.max(1000, (passoFinoSeg || 5) * 1000);

  let cursor = deMs;

  while (cursor <= horizonteMs) {
    let tAnterior = cursor;
    let tAchou: number | null = null;
    const visadaInicial = angulosVisada(satrec, tAnterior, latGraus, lngGraus);
    let elevAnterior = visadaInicial ? visadaInicial.elevGraus : -90;

    // Já começa dentro de uma passagem?
    if (elevAnterior >= elevacaoMinimaGraus) {
      tAchou = cursor;
    } else {
      for (let t = cursor + passoGrossoMs; t <= horizonteMs; t += passoGrossoMs) {
        const visada = angulosVisada(satrec, t, latGraus, lngGraus);
        const elev = visada ? visada.elevGraus : -90;
        if (elev >= elevacaoMinimaGraus) {
          tAchou = t;
          break;
        }
        tAnterior = t;
        elevAnterior = elev;
      }
    }

    if (tAchou == null) return null; // nada no horizonte restante

    // Nascer do limiar
    let inicioMs: number;
    if (tAchou === cursor && elevAnterior >= elevacaoMinimaGraus) {
      inicioMs = cursor;
    } else {
      inicioMs = bissecaoLimite(
        satrec,
        latGraus,
        lngGraus,
        tAnterior,
        tAchou,
        elevacaoMinimaGraus,
        true,
      );
    }

    // Trânsito fino: pico e limite do pôr
    let tAtual = inicioMs;
    let picoElev = -90;
    let picoMs = inicioMs;
    let tPassoAnterior = inicioMs;
    let fimMs: number | null = null;
    let trechoVisivel = false;
    let elevAmostraAnterior: number | null = null;
    let picoElevEsq: number | null = null;
    let picoElevDir: number | null = null;
    let passoPicoMs = passoFinoMs;

    const conferirVisibilidade = (tMs: number) => {
      if (trechoVisivel) return;
      const visada = angulosVisada(satrec, tMs, latGraus, lngGraus);
      if (!visada) return;
      const iluminado = sateliteIluminado(visada.satEci, tMs);
      const escuro = ceuEscuro(latGraus, lngGraus, tMs, solMaximoGraus);
      if (iluminado && escuro) trechoVisivel = true;
    };

    conferirVisibilidade(inicioMs);

    while (tAtual <= horizonteMs) {
      const visada = angulosVisada(satrec, tAtual, latGraus, lngGraus);
      const elev = visada ? visada.elevGraus : -90;

      if (visada) {
        const iluminado = sateliteIluminado(visada.satEci, tAtual);
        const escuro = ceuEscuro(latGraus, lngGraus, tAtual, solMaximoGraus);
        if (iluminado && escuro && elev >= elevacaoMinimaGraus) trechoVisivel = true;
      }

      if (elev < elevacaoMinimaGraus && tAtual > inicioMs) {
        if (picoElevDir == null && tAtual > picoMs) {
          picoElevDir = elev;
          passoPicoMs = tAtual - picoMs;
        }
        fimMs = bissecaoLimite(
          satrec,
          latGraus,
          lngGraus,
          tPassoAnterior,
          tAtual,
          elevacaoMinimaGraus,
          false,
        );
        break;
      }

      if (elev > picoElev) {
        picoElev = elev;
        picoMs = tAtual;
        picoElevEsq = elevAmostraAnterior;
        picoElevDir = null;
      } else if (picoElevDir == null && tAtual > picoMs) {
        picoElevDir = elev;
        passoPicoMs = tAtual - picoMs;
      }

      elevAmostraAnterior = elev;
      tPassoAnterior = tAtual;
      tAtual += passoFinoMs;
    }

    if (fimMs == null) fimMs = Math.min(horizonteMs, tAtual);

    // Pico refinado por parábola de 3 pontos (sem chamadas extras de SGP4)
    let picoRefinadoMs = picoMs;
    let picoRefinadoElev = picoElev;
    if (
      Number.isFinite(picoElevEsq) &&
      Number.isFinite(picoElevDir) &&
      (picoElevEsq as number) - 2 * picoElev + (picoElevDir as number) < 0 // côncava p/ baixo
    ) {
      const denominador = 2 * ((picoElevEsq as number) - 2 * picoElev + (picoElevDir as number));
      const deslocamento =
        (((picoElevEsq as number) - (picoElevDir as number)) / denominador) * passoPicoMs;
      if (Math.abs(deslocamento) < passoPicoMs) {
        picoRefinadoMs = Math.max(inicioMs, Math.min(fimMs, Math.round(picoMs + deslocamento)));
        picoRefinadoElev = Math.min(
          90,
          picoElev -
            Math.pow((picoElevEsq as number) - (picoElevDir as number), 2) /
              (8 * ((picoElevEsq as number) - 2 * picoElev + (picoElevDir as number))),
        );
      }
    }

    // Estado do Sol e do céu no pico
    const visadaPico = angulosVisada(satrec, picoRefinadoMs, latGraus, lngGraus);
    const iluminadoPico = visadaPico ? sateliteIluminado(visadaPico.satEci, picoRefinadoMs) : false;
    const escuroPico = ceuEscuro(latGraus, lngGraus, picoRefinadoMs, solMaximoGraus);

    conferirVisibilidade(picoRefinadoMs);
    conferirVisibilidade(fimMs);

    if (!trechoVisivel) {
      trechoVisivel = intervaloVisivel(inicioMs, fimMs, (t) => {
        const visada = angulosVisada(satrec, t, latGraus, lngGraus);
        return [
          Boolean(visada && sateliteIluminado(visada.satEci, t)),
          ceuEscuro(latGraus, lngGraus, t, solMaximoGraus),
        ];
      });
    }

    // Passagens sem trecho visível podem ser puladas — continua a busca
    if (exigirVisivel && !trechoVisivel) {
      cursor = Math.max((fimMs as number) + 1000, cursor + passoGrossoMs);
      continue;
    }

    const visadaInicio = angulosVisada(satrec, inicioMs, latGraus, lngGraus);
    return {
      inicioMs,
      fimMs: fimMs as number,
      picoElevGraus: picoRefinadoElev,
      picoMs: picoRefinadoMs,
      azimuteInicioGraus: visadaInicio ? visadaInicio.azGraus : 0,
      visivel: trechoVisivel,
      iluminado: iluminadoPico,
      ceuEscuro: escuroPico,
    };
  }

  return null;
}

/** Próxima passagem entre VÁRIOS satélites — a que nasce primeiro. */
export function melhorProximaPassagem(
  tles: TleSatelite[],
  latGraus: number,
  lngGraus: number,
  deMs: number,
  opcoes: OpcoesPassagem = {},
): { tle: TleSatelite; passagem: PassagemSatelite } | null {
  let melhor: { tle: TleSatelite; passagem: PassagemSatelite } | null = null;
  for (const tle of tles) {
    try {
      const passagem = proximaPassagemSatelite(tle, latGraus, lngGraus, deMs, opcoes);
      if (passagem && (!melhor || passagem.inicioMs < melhor.passagem.inicioMs)) {
        melhor = { tle, passagem };
      }
    } catch {
      /* TLE ruim — segue para o próximo */
    }
  }
  return melhor;
}

/** Hora curta local ("14:32") — prefixada pelo dia da semana quando não é hoje. */
export function horaPassagem(instanteMs: number, agoraMs: number, locale: string): string {
  const d = new Date(instanteMs);
  const agora = new Date(agoraMs);
  const hora = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const mesmoDia =
    d.getFullYear() === agora.getFullYear() &&
    d.getMonth() === agora.getMonth() &&
    d.getDate() === agora.getDate();
  if (mesmoDia) return hora;
  const dia = d.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
  return `${dia} ${hora}`;
}
