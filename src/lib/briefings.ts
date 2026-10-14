/**
 * Briefings em vídeo — os três perfis da equipe do Manual do Sobrevivente.
 *
 * Cada vídeo toca com o ÁUDIO ORIGINAL (nada de dublagem) e recebe LEGENDA
 * em pt-BR sincronizada por código: o componente ouve o timeupdate do
 * elemento <video> e pede a fala corrente com legendaAtual().
 *
 * Os tempos de fala foram medidos por transcrição em janelas de 2,5 s
 * (reconhecimento de fala por pedaço) — cada fala entra na janela em que
 * foi de fato falada. As legendas de "Preparador Urbano" e "Sobrevivente
 * do Mato" traduzem a narração original em inglês; a da "Operadora Tática"
 * acompanha a fala em português. O texto é chave do i18n (t()) — cai no
 * pt-BR até os outros dicionários cobrirem as falas.
 */

/** Uma fala dentro do vídeo, em segundos. */
export interface FalaVideo {
  /** Início da fala (s, inclusivo). */
  inicio: number;
  /** Fim da fala (s, exclusivo). */
  fim: number;
  /** Texto da legenda — chave i18n (pt-BR). */
  texto: string;
}

/** Um briefing em vídeo da equipe. */
export interface Briefing {
  /** Identificador estável (testes/telemetria). */
  id: "preparador-urbano" | "sobrevivente-mato" | "operadora-tatica";
  /** Endereço do vídeo (public/, cacheado no service worker). */
  url: string;
  /** Poster — primeiro quadro, pinta antes de baixar qualquer vídeo. */
  poster: string;
  /** Título do perfil — chave i18n. */
  titulo: string;
  /** Uma linha de resumo — chave i18n. */
  descricao: string;
  /** Duração real do arquivo (s) — valida as falas nos testes. */
  duracao: number;
  /** Legendas ordenadas por tempo, sem sobreposição. */
  falas: FalaVideo[];
}

export const BRIEFINGS: Briefing[] = [
  {
    id: "preparador-urbano",
    url: "/briefing-preparador-urbano.mp4",
    poster: "/briefing-preparador-urbano-poster.jpg",
    titulo: "O Preparador Urbano",
    descricao: "Planejamento e prontidão para qualquer emergência na cidade.",
    duracao: 10.0,
    falas: [
      { inicio: 0.2, fim: 2.6, texto: "Sou o preparador urbano." },
      { inicio: 2.6, fim: 5.3, texto: "Planejo, organizo e deixo tudo pronto." },
      {
        inicio: 5.3,
        fim: 9.9,
        texto: "Pronto para enfrentar qualquer emergência na cidade.",
      },
    ],
  },
  {
    id: "sobrevivente-mato",
    url: "/briefing-sobrevivente-mato.mp4",
    poster: "/briefing-sobrevivente-mato-poster.jpg",
    titulo: "A Sobrevivente do Mato",
    descricao: "Conhecimento, recursos e calma transformados em sobrevivência.",
    duracao: 10.0,
    falas: [
      { inicio: 0.2, fim: 2.6, texto: "Sou a sobrevivente do mato." },
      {
        inicio: 2.6,
        fim: 7.4,
        texto: "Na natureza, transformo conhecimento, recursos e calma",
      },
      { inicio: 7.4, fim: 9.9, texto: "em sobrevivência." },
    ],
  },
  {
    id: "operadora-tatica",
    url: "/briefing-operadora-tatica.mp4",
    poster: "/briefing-operadora-tatica-poster.jpg",
    titulo: "A Operadora Tática",
    descricao: "Disciplina e estratégia: desafios viram missões possíveis.",
    duracao: 10.0,
    falas: [
      { inicio: 0.2, fim: 2.6, texto: "Disciplina," },
      { inicio: 2.6, fim: 5.1, texto: "estratégia e preparo" },
      { inicio: 5.1, fim: 9.9, texto: "transformam desafios em missões possíveis." },
    ],
  },
];

/**
 * Fala corrente para um dado tempo do vídeo. Pura — recebe a lista e o
 * tempo, devolve o texto ou nulo (antes da primeira fala, entre falas e
 * depois da última). Limites: inicio inclusivo, fim exclusivo.
 */
export function legendaAtual(falas: FalaVideo[], tempoSegundos: number): string | null {
  for (const fala of falas) {
    if (tempoSegundos >= fala.inicio && tempoSegundos < fala.fim) return fala.texto;
  }
  return null;
}
