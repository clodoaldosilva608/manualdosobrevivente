/**
 * Personagens (avatares) do Manual — catálogo escolhível no cadastro e no
 * perfil, administrado no painel /admin › Personagens.
 *
 * Fluxo:
 *   • Admin cadastra personagens (nome + imagem via upload ou URL, ordem, ativo).
 *   • Ao criar conta (ou em Conta › Perfil na nuvem) o operador escolhe um
 *     personagem OU envia a própria foto (bucket público "avatares", pasta
 *     avatares/<uid>/… — cada um grava só na própria pasta; o admin grava
 *     qualquer pasta, inclusive avatares/personagens/…).
 *   • A escolha vira avatar_url no espelho manual_perfil_usuarios (RLS:
 *     dono edita o próprio perfil).
 *
 * Imagens dos personagens também vivem no bucket "avatares", na pasta
 * avatares/personagens/ — só o admin pode gravar lá.
 */
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */

export interface Personagem {
  id: string;
  nome: string;
  descricao: string | null;
  url_imagem: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Catálogo público (cadastro, conta e vitrine)                       */
/* ------------------------------------------------------------------ */

export async function listarPersonagensPublicos(): Promise<Personagem[]> {
  const { data, error } = await supabase
    .from("manual_personagens")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Personagem[];
}

/* ------------------------------------------------------------------ */
/* CRUD do painel (RLS: só admin escreve)                             */
/* ------------------------------------------------------------------ */

export async function listarPersonagensAdmin(): Promise<Personagem[]> {
  const { data, error } = await supabase
    .from("manual_personagens")
    .select("*")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Personagem[];
}

export async function salvarPersonagem(
  personagem: Omit<Personagem, "created_at"> & { created_at?: string },
) {
  const { id, created_at: criado, ...resto } = personagem;
  const linha = {
    ...resto,
    nome: personagem.nome.trim(),
    descricao: personagem.descricao?.trim() || null,
    url_imagem: personagem.url_imagem?.trim() || null,
  };
  if (id) {
    const { error } = await supabase.from("manual_personagens").update(linha).eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("manual_personagens").insert(linha);
  if (error) throw error;
}

export async function excluirPersonagem(id: string) {
  const { error } = await supabase.from("manual_personagens").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Upload de imagens (bucket "avatares")                              */
/* ------------------------------------------------------------------ */

/**
 * Converte o arquivo num JPEG comprimido (maior lado `maiorLado`) pronto
 * para o storage — avatar de perfil não precisa de imagem original.
 */
export async function arquivoParaBlobImagem(
  file: File,
  maiorLado = 256,
  qualidade = 0.85,
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const imagem = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const img = new Image();
      img.onload = () => resolver(img);
      img.onerror = () => rejeitar(new Error("arquivo de imagem inválido"));
      img.src = url;
    });
    const escala = Math.min(1, maiorLado / Math.max(imagem.width, imagem.height));
    const w = Math.max(1, Math.round(imagem.width * escala));
    const h = Math.max(1, Math.round(imagem.height * escala));
    const tela = document.createElement("canvas");
    tela.width = w;
    tela.height = h;
    const ctx = tela.getContext("2d");
    if (!ctx) throw new Error("canvas indisponível");
    ctx.drawImage(imagem, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolver) =>
      tela.toBlob(resolver, "image/jpeg", qualidade),
    );
    if (!blob) throw new Error("falha ao comprimir a imagem");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Envia a foto de perfil do operador autenticado (pasta avatares/<uid>/)
 * e devolve a URL pública. Sobrescreve o arquivo anterior (upsert).
 */
export async function enviarFotoPerfil(uid: string, file: File): Promise<string> {
  const blob = await arquivoParaBlobImagem(file, 256, 0.85);
  const caminho = `${uid}/perfil.jpg`;
  const { error } = await supabase.storage
    .from("avatares")
    .upload(caminho, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return urlPublicaAvatar(caminho);
}

/**
 * Envia a imagem de um personagem (só admin — pasta avatares/personagens/)
 * e devolve a URL pública.
 */
export async function enviarImagemPersonagem(file: File): Promise<string> {
  const blob = await arquivoParaBlobImagem(file, 320, 0.88);
  const caminho = `personagens/personagem-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from("avatares")
    .upload(caminho, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return urlPublicaAvatar(caminho);
}

export function urlPublicaAvatar(caminho: string): string {
  const { data } = supabase.storage.from("avatares").getPublicUrl(caminho);
  return data.publicUrl;
}

/* ------------------------------------------------------------------ */
/* Avatar do operador autenticado                                     */
/* ------------------------------------------------------------------ */

/** Define o avatar (personagem escolhido ou foto enviada) do próprio perfil. */
export async function definirMeuAvatar(avatarUrl: string | null): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const uid = data?.user?.id;
  if (!uid) throw new Error("Sessão necessária para escolher avatar");
  const { error } = await supabase
    .from("manual_perfil_usuarios")
    .update({ avatar_url: avatarUrl })
    .eq("id", uid);
  if (error) throw error;
}
