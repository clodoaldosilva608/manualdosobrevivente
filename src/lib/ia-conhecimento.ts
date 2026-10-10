/**
 * Conhecimento global do assistente IA — registros curados pelo admin na
 * aba IA › Conhecimento do painel /admin (tabela manual_ia_conhecimento).
 *
 * Os clientes do app leem os registros ATIVOS e mesclam com a base local
 * do aparelho: é o canal pelo qual a IA de TODOS os operadores fica mais
 * inteligente quando o admin ensina algo novo — sem publicar versão.
 *
 * Cache: guarda a última resposta boa no localStorage (chave ia-conhec)
 * para a IA continuar respondendo offline; validade de 6 horas.
 */
import { supabase } from "@/integrations/supabase/client";

export interface EntradaConhecimento {
  id: string;
  pergunta: string;
  palavras_chave: string;
  resposta: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

const CHAVE_CACHE = "manual:ia-conhecimento";
const VALIDADE_MS = 6 * 60 * 60 * 1000;

interface CacheConhecimento {
  quando: number;
  entradas: EntradaConhecimento[];
}

export function lerCacheConhecimento(): EntradaConhecimento[] {
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE);
    if (!bruto) return [];
    const c = JSON.parse(bruto) as CacheConhecimento;
    return c.entradas ?? [];
  } catch {
    return [];
  }
}

function salvarCache(entradas: EntradaConhecimento[]): void {
  try {
    localStorage.setItem(
      CHAVE_CACHE,
      JSON.stringify({ quando: Date.now(), entradas } satisfies CacheConhecimento),
    );
  } catch {
    /* armazenamento indisponível */
  }
}

/** Lista pública ativa: rede primeiro, cache como plano B (offline). */
export async function listarConhecimentoPublico(): Promise<EntradaConhecimento[]> {
  try {
    const { data, error } = await supabase
      .from("manual_ia_conhecimento")
      .select("id, pergunta, palavras_chave, resposta, ativo, ordem, created_at")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .limit(200);
    if (error) throw error;
    const entradas = (data ?? []) as EntradaConhecimento[];
    if (entradas.length > 0) salvarCache(entradas);
    return entradas;
  } catch {
    return lerCacheConhecimento();
  }
}

/* ------------------------------------------------------------------ */
/* Admin (aba IA › Conhecimento — escrita via RLS de admin)           */
/* ------------------------------------------------------------------ */

export async function listarConhecimentoAdmin(): Promise<EntradaConhecimento[]> {
  const { data, error } = await supabase
    .from("manual_ia_conhecimento")
    .select("id, pergunta, palavras_chave, resposta, ativo, ordem, created_at")
    .order("ordem", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as EntradaConhecimento[];
}

export interface NovaEntradaIA {
  pergunta: string;
  palavras_chave: string;
  resposta: string;
  ativo?: boolean;
  ordem?: number;
}

export async function criarConhecimento(nova: NovaEntradaIA): Promise<void> {
  const { error } = await supabase.from("manual_ia_conhecimento").insert({
    pergunta: nova.pergunta.trim(),
    palavras_chave: nova.palavras_chave.trim(),
    resposta: nova.resposta.trim(),
    ativo: nova.ativo ?? true,
    ordem: nova.ordem ?? 0,
  });
  if (error) throw error;
}

export async function atualizarConhecimento(
  id: string,
  mudancas: Partial<
    Pick<EntradaConhecimento, "pergunta" | "palavras_chave" | "resposta" | "ativo" | "ordem">
  >,
): Promise<void> {
  const { error } = await supabase.from("manual_ia_conhecimento").update(mudancas).eq("id", id);
  if (error) throw error;
}

export async function excluirConhecimento(id: string): Promise<void> {
  const { error } = await supabase.from("manual_ia_conhecimento").delete().eq("id", id);
  if (error) throw error;
}
