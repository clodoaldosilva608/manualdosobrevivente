/**
 * Colaboração voluntária — o Manual é 100% gratuito e se mantém com a ajuda
 * de quem pode contribuir com qualquer valor via PIX.
 *
 * Fluxo do apoiador:
 *   1. Página /colaboradores — redline com os perfis de quem já colaborou.
 *   2. Botão "Seja um colaborador" → /colaboradores/apoiar (exige sessão).
 *   3. Operador paga via QR/copia-e-cola e registra a contribuição.
 *   4. Contribuição entra "pendente"; o admin aprova no painel /admin.
 *   5. Aprovada, o perfil aparece na redline pública.
 *
 * Tudo passa pelo RLS do banco compartilhado: cada operador só escreve e lê
 * as próprias contribuições; a lista pública sai da view
 * manual_redline_colaboradores (somente dados de exibição, sem e-mail).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */

export interface PerfilManual {
  id: string;
  email: string;
  nome_exibicao: string | null;
  avatar_url: string | null;
  papel: string;
  /** Espelho do banimento de conta (lista rápida no painel admin). */
  bloqueado?: boolean | null;
  created_at: string;
}

export interface ContribuicaoRedline {
  id: string;
  nome_exibicao: string;
  valor: number;
  approved_at: string | null;
}

export interface Contribuicao {
  id: string;
  user_id: string;
  nome_exibicao: string;
  email: string | null;
  valor: number;
  mensagem: string | null;
  status: "pendente" | "aprovada" | "rejeitada";
  origem: string;
  approved_at: string | null;
  created_at: string;
}

export interface ConfigPix {
  chave: string;
  nome_recebedor: string;
  cidade: string;
  valores_sugeridos: number[];
  mensagem_apoio: string;
}

export interface Parceiro {
  id: string;
  nome: string;
  descricao: string | null;
  logo_url: string | null;
  link: string | null;
  nivel: "apoiador" | "bronze" | "prata" | "ouro";
  ordem: number;
  ativo: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Sessão e perfil                                                    */
/* ------------------------------------------------------------------ */

/** Usuário autenticado + perfil do Manual (garante a linha no espelho). */
export async function perfilAtual(): Promise<PerfilManual | null> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("manual_perfil_usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil) return perfil as PerfilManual;

  // Conta antiga criada antes do espelho: cria agora com os metadados do auth.
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const novo = {
    id: user.id,
    email: user.email ?? "",
    nome_exibicao:
      meta["nome"] ?? meta["name"] ?? meta["full_name"] ?? user.email?.split("@")[0] ?? null,
    avatar_url: meta["avatar_url"] ?? meta["picture"] ?? null,
  };
  const { data: criado, error } = await supabase
    .from("manual_perfil_usuarios")
    .upsert(novo)
    .select()
    .maybeSingle();
  if (error) throw error;
  return (criado as PerfilManual) ?? null;
}

/** Papel do operador autenticado ("admin" quando autorizado ao painel). */
export async function papelAtual(): Promise<"admin" | "usuario" | null> {
  const perfil = await perfilAtual();
  if (!perfil) return null;
  return perfil.papel === "admin" ? "admin" : "usuario";
}

/* ------------------------------------------------------------------ */
/* Redline pública (colaboradores aprovados)                          */
/* ------------------------------------------------------------------ */

export async function listarRedline(): Promise<ContribuicaoRedline[]> {
  const { data, error } = await supabase
    .from("manual_redline_colaboradores")
    .select("id, nome_exibicao, valor, approved_at")
    .limit(120);
  if (error) throw error;
  return (data ?? []) as ContribuicaoRedline[];
}

/** Total arrecadado (soma das contribuições aprovadas exibidas na redline). */
export function somarRedline(itens: ContribuicaoRedline[]): number {
  return itens.reduce((total, item) => total + Number(item.valor ?? 0), 0);
}

/* ------------------------------------------------------------------ */
/* Contribuir (apoiar)                                                */
/* ------------------------------------------------------------------ */

export async function lerConfigPix(): Promise<ConfigPix | null> {
  const { data, error } = await supabase
    .from("manual_configuracoes")
    .select("valor")
    .eq("chave", "pix")
    .maybeSingle();
  if (error) throw error;
  if (!data?.valor) return null;
  return desserializarPix(data.valor);
}

function desserializarPix(valor: Json): ConfigPix {
  const obj = (valor ?? {}) as Record<string, unknown>;
  return {
    chave: typeof obj.chave === "string" ? obj.chave : "",
    nome_recebedor: typeof obj.nome_recebedor === "string" ? obj.nome_recebedor : "",
    cidade: typeof obj.cidade === "string" ? obj.cidade : "",
    valores_sugeridos: Array.isArray(obj.valores_sugeridos)
      ? (obj.valores_sugeridos as unknown[]).filter((v): v is number => typeof v === "number")
      : [10, 25, 50],
    mensagem_apoio: typeof obj.mensagem_apoio === "string" ? obj.mensagem_apoio : "",
  };
}

/** Registra a contribuição do operador autenticado (fica pendente de aprovação). */
export async function registrarContribuicao(params: {
  valor: number;
  mensagem?: string;
  nomeExibicao: string;
}): Promise<Contribuicao> {
  const perfil = await perfilAtual();
  if (!perfil) throw new Error("Sessão necessária para contribuir");
  const { data, error } = await supabase
    .from("manual_contribuicoes")
    .insert({
      user_id: perfil.id,
      nome_exibicao: params.nomeExibicao.trim() || perfil.nome_exibicao || "Operador",
      email: perfil.email,
      valor: params.valor,
      mensagem: params.mensagem?.trim() ? params.mensagem.trim() : null,
      status: "pendente",
      origem: "pix",
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Contribuicao;
}

/** Contribuições do operador autenticado (mais recentes primeiro). */
export async function minhasContribuicoes(limite = 5): Promise<Contribuicao[]> {
  const { data, error } = await supabase
    .from("manual_contribuicoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []) as Contribuicao[];
}

/* ------------------------------------------------------------------ */
/* Parceiros (público)                                                */
/* ------------------------------------------------------------------ */

export async function listarParceirosPublicos(): Promise<Parceiro[]> {
  const { data, error } = await supabase
    .from("manual_parceiros")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Parceiro[];
}

/* ------------------------------------------------------------------ */
/* Realtime (notificação de nova contribuição no painel)              */
/* ------------------------------------------------------------------ */

/**
 * Assina INSERTs em manual_contribuicoes. O Realtime respeita o RLS:
 * só chega evento ao painel quando o assinante é admin (ou dono da linha).
 * Devolve a função de cancelamento.
 */
export function assinarNovasContribuicoes(aoChegar: (mensagem: string) => void): () => void {
  // Tópico único por assinatura: reabrir com o MESMO nome faria o supabase-js
  // devolver o canal já inscrito e o .on() lançaria erro ("callbacks after
  // subscribe"), quebrando quem assina de novo (remontagem de componentes).
  const topico = `manual-contribuicoes-${Math.random().toString(36).slice(2, 9)}`;
  const canal = supabase
    .channel(topico)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "manual_contribuicoes" },
      (payload) => {
        const linha = (payload.new ?? {}) as Partial<Contribuicao>;
        aoChegar(
          `${linha.nome_exibicao ?? "Operador"} enviou uma contribuição de R$ ${Number(
            linha.valor ?? 0,
          ).toFixed(2)}`,
        );
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(canal);
  };
}
