/**
 * Camada administrativa do Manual — usada exclusivamente pela rota /admin.
 *
 * Toda operação é executada com a sessão do próprio admin e passa pelo RLS
 * do banco compartilhado: as policies de manual_* só autorizam leitura e
 * escrita quando `manual_eh_admin()` confirma o papel no espelho
 * manual_perfil_usuarios. Sem papel de admin, tudo falha no servidor — o
 * bloqueio da tela é conveniência, a segurança é o banco.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Contribuicao, ConfigPix, Parceiro, PerfilManual } from "@/lib/colaboracao";

/* ------------------------------------------------------------------ */
/* Estatísticas do painel                                             */
/* ------------------------------------------------------------------ */

export interface Estatisticas {
  usuarios: number;
  contribuicoesPendentes: number;
  contribuicoesAprovadas: number;
  totalAprovado: number;
  parceirosAtivos: number;
  parceirosTotal: number;
}

export async function lerEstatisticas(): Promise<Estatisticas> {
  const [usuarios, contribuicoes, parceiros] = await Promise.all([
    supabase.from("manual_perfil_usuarios").select("id", { count: "exact", head: true }),
    supabase
      .from("manual_contribuicoes")
      .select("status, valor, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("manual_parceiros").select("ativo", { count: "exact" }),
  ]);

  const linhas = (contribuicoes.data ?? []) as { status: string; valor: number }[];
  const aprovadas = linhas.filter((l) => l.status === "aprovada");
  return {
    usuarios: usuarios.count ?? 0,
    contribuicoesPendentes: linhas.filter((l) => l.status === "pendente").length,
    contribuicoesAprovadas: aprovadas.length,
    totalAprovado: aprovadas.reduce((t, l) => t + Number(l.valor ?? 0), 0),
    parceirosAtivos: (parceiros.data ?? []).filter((p) => p.ativo).length,
    parceirosTotal: parceiros.count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Contribuições (aprovar / rejeitar / excluir)                       */
/* ------------------------------------------------------------------ */

export async function listarContribuicoesAdmin(
  filtro: "todas" | Contribuicao["status"],
  busca = "",
) {
  let consulta = supabase
    .from("manual_contribuicoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (filtro !== "todas") consulta = consulta.eq("status", filtro);
  if (busca.trim()) consulta = consulta.ilike("nome_exibicao", `%${busca.trim()}%`);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as Contribuicao[];
}

export async function decidirContribuicao(id: string, decisao: "aprovada" | "rejeitada") {
  const { data } = await supabase.auth.getUser();
  const adminId = data?.user?.id ?? null;
  const { error } = await supabase
    .from("manual_contribuicoes")
    .update({
      status: decisao,
      approved_by: decisao === "aprovada" ? adminId : null,
      approved_at: decisao === "aprovada" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function excluirContribuicao(id: string) {
  const { error } = await supabase.from("manual_contribuicoes").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Usuários (espelho administrável de auth.users)                     */
/* ------------------------------------------------------------------ */

export async function listarPerfisAdmin(busca = "") {
  let consulta = supabase
    .from("manual_perfil_usuarios")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (busca.trim())
    consulta = consulta.or(`email.ilike.%${busca.trim()}%,nome_exibicao.ilike.%${busca.trim()}%`);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as PerfilManual[];
}

export async function atualizarPerfilAdmin(
  id: string,
  mudancas: Partial<Pick<PerfilManual, "papel" | "nome_exibicao" | "avatar_url">>,
) {
  const { error } = await supabase.from("manual_perfil_usuarios").update(mudancas).eq("id", id);
  if (error) throw error;
}

export async function apagarPerfilAdmin(id: string) {
  const { error } = await supabase.from("manual_perfil_usuarios").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Parceiros (CRUD completo)                                          */
/* ------------------------------------------------------------------ */

export async function listarParceirosAdmin(): Promise<Parceiro[]> {
  const { data, error } = await supabase
    .from("manual_parceiros")
    .select("*")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Parceiro[];
}

export async function salvarParceiro(
  parceiro: Omit<Parceiro, "created_at"> & { created_at?: string },
) {
  const { id, created_at: created, ...resto } = parceiro;
  const linha = {
    ...resto,
    nome: parceiro.nome.trim(),
    logo_url: parceiro.logo_url?.trim() || null,
    link: parceiro.link?.trim() || null,
    descricao: parceiro.descricao?.trim() || null,
  };
  if (id) {
    const { error } = await supabase.from("manual_parceiros").update(linha).eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("manual_parceiros").insert(linha);
  if (error) throw error;
}

export async function excluirParceiro(id: string) {
  const { error } = await supabase.from("manual_parceiros").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Configurações (PIX)                                                */
/* ------------------------------------------------------------------ */

export async function salvarConfigPix(config: ConfigPix) {
  const { error } = await supabase
    .from("manual_configuracoes")
    .upsert({ chave: "pix", valor: config, updated_at: new Date().toISOString() });
  if (error) throw error;
}
