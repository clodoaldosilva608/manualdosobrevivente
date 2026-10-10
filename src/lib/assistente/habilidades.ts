/**
 * Habilidades do assistente — as ações que a IA EXECUTA no aplicativo.
 *
 * O barramento (onibus) é um singleton fora do React: o MapShell registra
 * os manipuladores ao montar o mapa e o assistente chama `executar` de
 * qualquer lugar da tela — igual ao padrão do sensor da bússola. Funciona
 * para texto e para áudio (o cérebro extrai a habilidade da transcrição).
 *
 * Habilidades nativas: centralizar no ponto, traçar rota, ligar/desligar
 * camadas, trocar base, tela limpa, abrir boletim/medir/marcador, clima,
 * notícias. Skills customizadas do operador somam texto (prompt), não
 * ações — a execução real sempre passa por aqui.
 */

/** Identificadores das habilidades nativas do mapa. */
export type HabilidadeMapa =
  | "centralizar"
  | "rota"
  | "camada"
  | "base"
  | "limpar"
  | "boletim"
  | "medir"
  | "marcador"
  | "posicao";

/** Argumentos genéricos de execução (cada habilidade define os seus). */
export interface ArgsHabilidade {
  /** Destino {lat,lng} para centralizar/rota. */
  ponto?: { lat: number; lng: number };
  /** Nome do destino (para anunciar a rota). */
  nomeDestino?: string;
  /** Id da camada de inteligência para alternar. */
  camada?: string;
  /** Estado desejado da camada (true = ligar). */
  ligar?: boolean;
  /** Id da base do mapa (satellite|topo|streets|dark). */
  base?: string;
}

type Manipulador = (args: ArgsHabilidade) => void | Promise<void>;

interface Barramento {
  manipuladores: Map<HabilidadeMapa, Manipulador>;
}

const onibus: Barramento = { manipuladores: new Map() };

/** Registra o manipulador de uma habilidade (chamado pelo MapShell). */
export function registrarHabilidade(hab: HabilidadeMapa, fn: Manipulador): () => void {
  onibus.manipuladores.set(hab, fn);
  return () => {
    if (onibus.manipuladores.get(hab) === fn) onibus.manipuladores.delete(hab);
  };
}

/**
 * Executa uma habilidade. Devolve true quando havia manipulador (o mapa
 * está vivo na tela); false significa "mapa fechado" — o cérebro responde
 * educadamente que a ação precisa do mapa aberto.
 */
export async function executarHabilidade(
  hab: HabilidadeMapa,
  args: ArgsHabilidade = {},
): Promise<boolean> {
  const fn = onibus.manipuladores.get(hab);
  if (!fn) return false;
  await fn(args);
  return true;
}

/** Lista as habilidades disponíveis agora (para o status da UI). */
export function habilidadesDisponiveis(): HabilidadeMapa[] {
  return [...onibus.manipuladores.keys()];
}
