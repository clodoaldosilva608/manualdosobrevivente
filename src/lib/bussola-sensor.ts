/**
 * Estado compartilhado do sensor de orientação do aparelho (bússola).
 *
 * Vive fora do React de propósito: a configuração vale ao mesmo tempo para a
 * bússola em miniatura e para a bússola completa, sobrevive a remontagens
 * (minimizar/maximizar, alternar modos) e continua ativa enquanto o app
 * estiver aberto — do jeito que foi configurada uma vez.
 */
import { useSyncExternalStore } from "react";

export interface InclinacaoAparelho {
  beta: number;
  gamma: number;
}

export interface EstadoSensor {
  /** Sensor autorizado e escutando. */
  sensorOn: boolean;
  /** Rumo do aparelho em graus (0 = norte), se já chegou alguma leitura. */
  rumoAparelho: number | null;
  /** Inclinação (beta/gamma) para o nível de bolha. */
  inclinacao: InclinacaoAparelho | null;
  /** Carimbo (Date.now) da última leitura recebida — indica sensor vivo. */
  ultimaLeitura: number | null;
}

const ESTADO_INICIAL: EstadoSensor = {
  sensorOn: false,
  rumoAparelho: null,
  inclinacao: null,
  ultimaLeitura: null,
};

/** Chave da preferência "sensor habilitado pelo usuário" (sobrevive ao reload). */
const CHAVE_SENSOR = "tgis:sensor-bussola";

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

let estado: EstadoSensor = ESTADO_INICIAL;
let listenerRegistrado = false;
const ouvintes = new Set<() => void>();

function normalizar(graus: number) {
  return ((graus % 360) + 360) % 360;
}

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

function registrarOuvinteNativo() {
  if (listenerRegistrado) return;
  listenerRegistrado = true;
  const tratar = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
    const webkit = e.webkitCompassHeading;
    const parcial: Partial<EstadoSensor> = { ultimaLeitura: Date.now() };
    if (typeof webkit === "number") parcial.rumoAparelho = normalizar(webkit);
    else if (typeof e.alpha === "number") parcial.rumoAparelho = normalizar(360 - e.alpha);
    if (typeof e.beta === "number" && typeof e.gamma === "number") {
      parcial.inclinacao = { beta: e.beta, gamma: e.gamma };
    }
    definir(parcial);
  };
  window.addEventListener("deviceorientation", tratar as EventListener, true);
}

/**
 * Pede permissão (iOS) e ativa o sensor uma única vez. Resolvida com `true`
 * quando o sensor está efetivamente ligado.
 */
export async function ativarSensorBussola(): Promise<boolean> {
  type Construtor = typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  const construtor = (
    typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined
  ) as Construtor | undefined;
  if (!construtor) return false;
  if (estado.sensorOn) return true;
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

/** Hook de leitura reativa do estado compartilhado do sensor. */
export function useSensorBussola(): EstadoSensor {
  return useSyncExternalStore(inscrever, obterEstado, obterEstado);
}
