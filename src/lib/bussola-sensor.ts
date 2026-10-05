/**
 * Estado compartilhado do sensor de orientação do aparelho (bússola).
 *
 * Vive fora do React de propósito: a configuração vale ao mesmo tempo para a
 * bússola em miniatura e para a bússola completa, sobrevive a remontagens
 * (minimizar/maximizar, alternar modos) e continua ativa enquanto o app
 * estiver aberto — do jeito que foi configurada uma vez.
 *
 * O `rumoAparelho` publicado é o rumo VERDADEIRO (norte geográfico),
 * pronto para consumo:
 * 1. compensado por inclinação (matriz W3C) e pela rotação de tela;
 * 2. convertido do norte magnético com a declinação do lugar (Android;
 *    no iOS o webkitCompassHeading já é verdadeiro);
 * 3. com a correção de calibração do usuário aplicada (calibração pelo
 *    Sol/Lua, persistida por aparelho);
 * 4. suavizado contra o tremor do magnetômetro.
 */
import { useSyncExternalStore } from "react";
import {
  norm360,
  rumoVerdadeiroBruto,
  suavizarRumo,
  type LeituraOrientacao,
} from "@/lib/bussola-calculo";
import { magneticDeclination } from "@/lib/declination";
import { nivelUniversal, suavizarGravidade, type LeituraNivel } from "@/lib/nivel";

export interface InclinacaoAparelho {
  beta: number;
  gamma: number;
}

export interface EstadoSensor {
  /** Sensor autorizado e escutando. */
  sensorOn: boolean;
  /** Rumo VERDADEIRO do aparelho em graus (0 = norte geográfico), se já chegou leitura. */
  rumoAparelho: number | null;
  /** Inclinação (beta/gamma) para o nível de bolha. */
  inclinacao: InclinacaoAparelho | null;
  /** Nível UNIVERSAL (vetor gravidade): funciona com o aparelho em qualquer posição. */
  nivel: LeituraNivel | null;
  /** Carimbo (Date.now) da última leitura recebida — indica sensor vivo. */
  ultimaLeitura: number | null;
  /** Correção de calibração aplicada ao sensor, em graus (0 = sem correção). */
  calibracao: number;
}

const ESTADO_INICIAL: EstadoSensor = {
  sensorOn: false,
  rumoAparelho: null,
  inclinacao: null,
  nivel: null,
  ultimaLeitura: null,
  calibracao: 0,
};

/** Chave da preferência "sensor habilitado pelo usuário" (sobrevive ao reload). */
const CHAVE_SENSOR = "tgis:sensor-bussola";
/** Chave da correção de calibração medida pelo usuário (persiste por aparelho). */
const CHAVE_CALIBRACAO = "tgis:bussola-offset";

/** Posição atual do aparelho — referência da declinação magnética. */
const posicao = { lat: -15.7942, lng: -47.8822 }; // padrão: Brasília

function sensorPreferido(): boolean {
  try {
    return localStorage.getItem(CHAVE_SENSOR) === "1";
  } catch {
    return false;
  }
}

function lembrarSensor() {
  try {
    localStorage.setItem(CHAVE_SENSOR, "1");
  } catch {
    /* armazenamento indisponível — o sensor vale só nesta sessão */
  }
}

function lerCalibracao(): number {
  try {
    const bruto = localStorage.getItem(CHAVE_CALIBRACAO);
    if (bruto == null) return 0;
    const valor = Number(bruto);
    return Number.isFinite(valor) ? norm360(valor) : 0;
  } catch {
    return 0;
  }
}

function lembrarCalibracao(valor: number) {
  try {
    localStorage.setItem(CHAVE_CALIBRACAO, String(norm360(valor)));
  } catch {
    /* armazenamento indisponível — a correção vale só nesta sessão */
  }
}

let estado: EstadoSensor = { ...ESTADO_INICIAL, calibracao: lerCalibracao() };
let listenerRegistrado = false;
let motionRegistrado = false;
/** Gravidade suavizada (frame do aparelho) — base do nível universal. */
let gravidadeSuavizada: { x: number; y: number; z: number } | null = null;
const ouvintes = new Set<() => void>();

function notificar() {
  for (const ouvinte of ouvintes) ouvinte();
}

function definir(parcial: Partial<EstadoSensor>) {
  estado = { ...estado, ...parcial };
  notificar();
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function obterEstado(): EstadoSensor {
  return estado;
}

/** Último rumo VERDADEIRO bruto (pré-calibração, pós-suavização) — referência da calibração. */
let rumoBrutoSuavizado: number | null = null;

function registrarOuvinteNativo() {
  if (listenerRegistrado) return;
  listenerRegistrado = true;
  const tratar = (evento: Event) => {
    const e = evento as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const leitura: LeituraOrientacao = {
      alpha: e.alpha,
      beta: e.beta,
      gamma: e.gamma,
      webkitCompassHeading: e.webkitCompassHeading,
      anguloTela: anguloTelaAtual(),
    };
    const parcial: Partial<EstadoSensor> = { ultimaLeitura: Date.now() };
    if (typeof e.beta === "number" && typeof e.gamma === "number") {
      parcial.inclinacao = { beta: e.beta, gamma: e.gamma };
    }
    const bruto = rumoVerdadeiroBruto(leitura, magneticDeclination(posicao.lat, posicao.lng));
    if (bruto != null) {
      rumoBrutoSuavizado = suavizarRumo(rumoBrutoSuavizado, bruto);
      parcial.rumoAparelho = norm360(rumoBrutoSuavizado + estado.calibracao);
    }
    definir(parcial);
  };
  window.addEventListener("deviceorientation", tratar as EventListener, true);
  registrarOuvinteNivel();
}

/**
 * Nível universal: ouve o devicemotion (vetor gravidade completo) e publica
 * a leitura compensada pela rotação de tela — mede inclinação com o
 * aparelho em QUALQUER posição (deitado, em pé, de lado, tela para baixo).
 */
function registrarOuvinteNivel() {
  if (motionRegistrado) return;
  motionRegistrado = true;
  const tratar = (evento: DeviceMotionEvent) => {
    const g = evento.accelerationIncludingGravity;
    if (!g || typeof g.x !== "number" || typeof g.y !== "number" || typeof g.z !== "number") return;
    gravidadeSuavizada = suavizarGravidade(gravidadeSuavizada, g.x, g.y, g.z);
    const nivel = nivelUniversal(
      gravidadeSuavizada.x,
      gravidadeSuavizada.y,
      gravidadeSuavizada.z,
      anguloTelaAtual(),
    );
    if (nivel) definir({ nivel });
  };
  window.addEventListener("devicemotion", tratar as EventListener, true);
}

/** Ângulo de rotação da tela (0/90/180/270) em todos os motores. */
function anguloTelaAtual(): number {
  if (typeof screen !== "undefined" && screen.orientation) return screen.orientation.angle;
  const janela = (window as Window & { orientation?: number }).orientation;
  return typeof janela === "number" ? Math.abs(janela) : 0;
}

/**
 * Informa a posição do aparelho para a declinação magnética do lugar.
 * Chamada pelo mapa a cada fix de GPS — a declinação é local, não global.
 */
export function definirPosicaoSensor(lat: number, lng: number) {
  posicao.lat = lat;
  posicao.lng = lng;
}

/**
 * Pede permissão (iOS) e ativa o sensor uma única vez. Resolvida com `true`
 * quando o sensor está efetivamente ligado.
 */
export async function ativarSensorBussola(): Promise<boolean> {
  type Construtor = typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  type ConstrutorMovimento = typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  const construtor = (
    typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined
  ) as Construtor | undefined;
  if (!construtor) return false;
  if (estado.sensorOn) return true;
  // iOS: a permissão do orientation cobre o rumo; o motion (nível universal)
  // pede a sua separadamente — tenta, mas não bloqueia se negado.
  const movimento = (typeof DeviceMotionEvent !== "undefined" ? DeviceMotionEvent : undefined) as
    ConstrutorMovimento | undefined;
  if (movimento && typeof movimento.requestPermission === "function") {
    try {
      await movimento.requestPermission();
    } catch {
      /* sem permissão de motion: o nível universal fica sem leitura */
    }
  }
  if (typeof construtor.requestPermission === "function") {
    try {
      if ((await construtor.requestPermission()) !== "granted") return false;
    } catch {
      return false;
    }
  }
  registrarOuvinteNativo();
  lembrarSensor();
  definir({ sensorOn: true });
  return true;
}

/**
 * Reativa o sensor no carregamento do app quando o usuário já o havia
 * habilitado antes. No iOS a permissão concedida persiste entre sessões
 * (requestPermission resolve "granted" sem gesto novo); no Android não há
 * permissão a pedir. Se não for possível (permissão revogada ou gesto
 * exigido), nada acontece — o botão SEN continua disponível.
 */
export async function reativarSensorSeConfigurado(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (estado.sensorOn) return true;
  if (!sensorPreferido()) return false;
  return ativarSensorBussola();
}

/** Observa o sensor FORA do React (ex.: rotação do mapa) sem re-render. */
export function observarSensor(ouvinte: (estado: EstadoSensor) => void): () => void {
  const tratar = () => ouvinte(estado);
  ouvintes.add(tratar);
  return () => {
    ouvintes.delete(tratar);
  };
}

/** Hook de leitura reativa do estado compartilhado do sensor. */
export function useSensorBussola(): EstadoSensor {
  return useSyncExternalStore(inscrever, obterEstado, obterEstado);
}

/**
 * Calibração pelo astro: o usuário aponta a borda superior do aparelho para
 * o Sol (ou a Lua) e o erro do sensor é medido contra o azimute astronômico
 * real do astro. A correção fica persistida e entra em todas as leituras
 * seguintes — cancela viés do magnetômetro, erro do modelo de declinação e
 * desalinhamento de montagem. Devolve a correção aplicada (null sem leitura).
 */
export function calibrarComAstro(azimuteVerdadeiroDoAstro: number): number | null {
  if (rumoBrutoSuavizado == null) return null;
  const correcao = norm360(azimuteVerdadeiroDoAstro - rumoBrutoSuavizado);
  lembrarCalibracao(correcao);
  definir({ calibracao: correcao, rumoAparelho: norm360(rumoBrutoSuavizado + correcao) });
  return correcao;
}

/** Zera a correção de calibração (volta ao modelo puro). */
export function zerarCalibracaoBussola() {
  lembrarCalibracao(0);
  if (rumoBrutoSuavizado != null) {
    definir({ calibracao: 0, rumoAparelho: norm360(rumoBrutoSuavizado) });
  } else {
    definir({ calibracao: 0 });
  }
}
