/**
 * Apoiadores — mural público da comunidade que sustenta o Manual.
 *
 * Diferente da redline (contribuições REAIS aprovadas pelo admin), o mural
 * lista os apoiadores cadastrados na tabela manual_apoiadores — semeados
 * com 78 nomes em ordem ALEATÓRIA (expressamente NÃO alfabética, decisão do
 * dono do projeto) e administráveis na aba Apoiadores do painel /admin.
 *
 * RLS: leitura pública dos ativos; escrita só para papel admin.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Apoiador {
  id: string;
  nome: string;
  cidade: string | null;
  nivel: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

/** Lista pública (ativos, na ordem do mural — nunca alfabética). */
export async function listarApoiadores(): Promise<Apoiador[]> {
  const { data, error } = await supabase
    .from("manual_apoiadores")
    .select("id, nome, cidade, nivel, ativo, ordem, created_at")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Apoiador[];
}

/** Lista completa para o admin (inclui inativos). */
export async function listarApoiadoresAdmin(): Promise<Apoiador[]> {
  const { data, error } = await supabase
    .from("manual_apoiadores")
    .select("id, nome, cidade, nivel, ativo, ordem, created_at")
    .order("ordem", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Apoiador[];
}

export interface NovoApoiador {
  nome: string;
  cidade?: string | null;
  nivel?: string;
  ativo?: boolean;
  ordem?: number;
}

export async function criarApoiador(novo: NovoApoiador): Promise<Apoiador> {
  const { data, error } = await supabase
    .from("manual_apoiadores")
    .insert({
      nome: novo.nome.trim(),
      cidade: novo.cidade?.trim() || null,
      nivel: novo.nivel ?? "apoiador",
      ativo: novo.ativo ?? true,
      ordem: novo.ordem ?? 0,
    })
    .select("id, nome, cidade, nivel, ativo, ordem, created_at")
    .single();
  if (error) throw error;
  return data as Apoiador;
}

export async function atualizarApoiador(
  id: string,
  mudancas: Partial<Pick<Apoiador, "nome" | "cidade" | "nivel" | "ativo" | "ordem">>,
): Promise<void> {
  const { error } = await supabase.from("manual_apoiadores").update(mudancas).eq("id", id);
  if (error) throw error;
}

export async function excluirApoiador(id: string): Promise<void> {
  const { error } = await supabase.from("manual_apoiadores").delete().eq("id", id);
  if (error) throw error;
}
