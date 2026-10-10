/**
 * Persona do assistente — um dos personagens do Manual encarna a IA.
 *
 * O operador escolhe em Ajustes › Assistente IA › "Personagem da IA":
 *   · a MINIATURA flutuante passa a ser o rosto do personagem (toque abre
 *     o chat, exatamente como o orbe padrão);
 *   · o NOME da IA passa a ser o nome do personagem (o operador ainda
 *     pode renomear — o campo "Nome da sua IA" continua valendo);
 *   · descrição + perfil + frase do personagem entram no COMPORTAMENTO
 *     da IA (provedor na nuvem via prompt de sistema; modo local assina
 *     as respostas com o espírito do personagem);
 *   · prompts e skills ensinados pelo operador continuam por cima —
 *     personalização sempre vence, o personagem é a base.
 */
import { tGlobal } from "@/lib/i18n";
import { listarPersonagensPublicos, type Personagem } from "@/lib/personagens";
import type { ConfigIA } from "@/lib/assistente/config";

/* ------------------------------------------------------------------ */
/* Catálogo com cache em memória (o orbe e os Ajustes dividem a lista) */
/* ------------------------------------------------------------------ */

let cachePersonas: Personagem[] = [];
let cacheQuando = 0;
const TTL_MS = 10 * 60 * 1000;

export async function carregarPersonas(forcar = false): Promise<Personagem[]> {
  const fresco = !forcar && cachePersonas.length > 0 && Date.now() - cacheQuando < TTL_MS;
  if (fresco) return cachePersonas;
  try {
    cachePersonas = await listarPersonagensPublicos();
    cacheQuando = Date.now();
  } catch {
    /* offline ou sem banco: devolve o que houver (pode ser vazio) */
  }
  return cachePersonas;
}

/** Invalida o cache (usado após o admin editar personagens). */
export function limparCachePersonas(): void {
  cachePersonas = [];
  cacheQuando = 0;
}

/* ------------------------------------------------------------------ */
/* Resolução da persona ativa                                         */
/* ------------------------------------------------------------------ */

/** Persona ativa a partir da configuração (null = IA padrão do app). */
export function personaAtiva(config: ConfigIA, lista: Personagem[]): Personagem | null {
  const slug = config.personagemSlug.trim();
  if (!slug) return null;
  return lista.find((p) => p.slug === slug && p.ativo) ?? null;
}

/**
 * Nome efetivo da IA: o personagem assume o nome quando escolhido, mas o
 * operador ainda pode renomear (nome customizado ≠ padrão "Sertão" vence).
 */
export function nomeIAEfetivo(config: ConfigIA, persona: Personagem | null): string {
  const custom = config.nomeIA.trim();
  if (persona && (!custom || custom === "Sertão")) return persona.nome;
  return custom || "Sertão";
}

/* ------------------------------------------------------------------ */
/* Blocos de texto (prompt de sistema do provedor)                    */
/* ------------------------------------------------------------------ */

/** Bloco de identidade da persona para o prompt de sistema. */
export function blocoPersona(persona: Personagem): string[] {
  const linhas: string[] = [];
  linhas.push(
    `Você incorpora o personagem "${persona.nome}" do Manual do Sobrevivente — esse é o seu nome e a sua identidade.`,
  );
  if (persona.descricao?.trim()) linhas.push(`Quem você é: ${persona.descricao.trim()}`);
  if (persona.perfil?.trim()) linhas.push(`Sua especialidade: ${persona.perfil.trim()}`);
  if (persona.frase?.trim())
    linhas.push(
      `Frase-símbolo que traduz seu espírito: "${persona.frase.trim()}" — responda no espírito dessa persona, sem repeti-la à força em toda mensagem.`,
    );
  linhas.push(
    "Mesmo incorporando o personagem, você continua executando ações do app e priorizando segurança.",
  );
  return linhas;
}

/**
 * Assinatura curta da persona para respostas do modo LOCAL (sem chave),
 * onde não há prompt de sistema — o espírito entra como vinheta.
 */
export function vinhetaPersona(persona: Personagem): string {
  if (persona.frase?.trim()) return `— ${persona.nome}: "${persona.frase.trim()}"`;
  return `— ${persona.nome}`;
}

/** Texto de apresentação da persona no chat (primeira mensagem vazia). */
export function apresentacaoPersona(persona: Personagem): string {
  const partes = [
    tGlobal("Sou {nome}, seu assistente no Manual do Sobrevivente.", { nome: persona.nome }),
  ];
  if (persona.perfil?.trim()) partes.push(persona.perfil.trim());
  if (persona.frase?.trim()) partes.push(`"${persona.frase.trim()}"`);
  return partes.join("\n");
}
