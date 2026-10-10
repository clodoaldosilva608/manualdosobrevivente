/**
 * Memória do assistente IA — o que faz a IA do operador ficar MAIS
 * INTELIGENTE com o uso, exatamente como prometido na configuração:
 *
 *  · toda pergunta respondida (pelo cérebro local OU pelo provedor com
 *    chave) é guardada como par pergunta→resposta;
 *  · na próxima pergunta parecida, a resposta vem da memória — inclusive
 *    OFFLINE, mesmo com chave configurada;
 *  · a memória consolida: pares parecidos se fundem, o teto de 300
 *    entradas expulsa as menos usadas;
 *  · o operador pode limpar tudo em Ajustes › Assistente IA.
 *
 * Tudo vive em localStorage por aparelho — nada sobe para a nuvem.
 */

export interface ParMemoria {
  id: string;
  pergunta: string;
  resposta: string;
  /** Como foi aprendida: local | provedor | operador. */
  origem: "local" | "provedor" | "operador";
  criado_em: number;
  usos: number;
}

const CHAVE_MEMORIA = "manual:ia-memoria";
export const TETO_MEMORIA = 300;

export function lerMemoria(): ParMemoria[] {
  try {
    const bruto = localStorage.getItem(CHAVE_MEMORIA);
    if (!bruto) return [];
    const lista = JSON.parse(bruto) as ParMemoria[];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarMemoria(lista: ParMemoria[]): void {
  try {
    localStorage.setItem(CHAVE_MEMORIA, JSON.stringify(lista));
  } catch {
    /* armazenamento indisponível */
  }
}

export function limparMemoria(): void {
  try {
    localStorage.removeItem(CHAVE_MEMORIA);
  } catch {
    /* armazenamento indisponível */
  }
}

/* ------------------------------------------------------------------ */
/* Similaridade entre perguntas (tokens com peso, sem dependências)   */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "por",
  "para",
  "com",
  "que",
  "qual",
  "quais",
  "como",
  "onde",
  "quando",
  "quanto",
  "e",
  "ou",
  "se",
  "ao",
  "aos",
  "à",
  "às",
  "é",
  "são",
  "ser",
  "está",
  "estão",
  "me",
  "minha",
  "meu",
  "the",
  "of",
  "to",
]);

/** Tokens normalizados de um texto (minúsculas, sem acento, sem stopword). */
export function tokens(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 1 && !STOPWORDS.has(p));
}

/** Similaridade 0..1 entre duas perguntas (Jaccard com peso de cobertura). */
export function similaridade(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

/* ------------------------------------------------------------------ */
/* Registro e consulta                                                */
/* ------------------------------------------------------------------ */

/** Limiar a partir do qual a memória considera a pergunta "a mesma". */
export const LIMIAR_MEMORIA = 0.6;

/** Guarda (ou funde) um par pergunta→resposta na memória. */
export function registrarPar(
  pergunta: string,
  resposta: string,
  origem: ParMemoria["origem"],
): void {
  const perguntaLimpa = pergunta.trim();
  const respostaLimpa = resposta.trim();
  if (perguntaLimpa.length < 3 || respostaLimpa.length < 3) return;

  const memoria = lerMemoria();
  const parecido = memoria.find((p) => similaridade(perguntaLimpa, p.pergunta) >= LIMIAR_MEMORIA);

  if (parecido) {
    // Funde: resposta mais recente vence; contadores somam.
    parecido.resposta = respostaLimpa;
    parecido.origem = origem;
    parecido.usos += 1;
  } else {
    memoria.push({
      id: `m${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
      pergunta: perguntaLimpa,
      resposta: respostaLimpa,
      origem,
      criado_em: Date.now(),
      usos: 1,
    });
  }

  // Teto: expulsa os menos usados e mais antigos.
  const ordenada = memoria
    .sort((a, b) => b.usos - a.usos || b.criado_em - a.criado_em)
    .slice(0, TETO_MEMORIA);
  salvarMemoria(ordenada);
}

export interface AcheMemoria {
  par: ParMemoria;
  score: number;
}

/** Melhor par da memória para a pergunta (null se nada parecido o bastante). */
export function buscarNaMemoria(pergunta: string): AcheMemoria | null {
  let melhor: AcheMemoria | null = null;
  for (const par of lerMemoria()) {
    const score = similaridade(pergunta, par.pergunta);
    if (score >= LIMIAR_MEMORIA && (!melhor || score > melhor.score)) {
      melhor = { par, score };
    }
  }
  return melhor;
}

/** Registra USO do par (a IA fica melhor com o que você mais pergunta). */
export function contarUso(id: string): void {
  const memoria = lerMemoria();
  const par = memoria.find((p) => p.id === id);
  if (!par) return;
  par.usos += 1;
  salvarMemoria(memoria);
}

/** Top N pares para dar contexto ao provedor (a IA cita o que você ensinou). */
export function topoMemoria(n = 12): ParMemoria[] {
  return lerMemoria()
    .slice()
    .sort((a, b) => b.usos - a.usos || b.criado_em - a.criado_em)
    .slice(0, n);
}
