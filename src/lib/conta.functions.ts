import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Criação de conta pelo SERVIDOR — o cadastro autentica na hora, sem depender
 * de SMTP nem de "Confirm email" no painel do Supabase.
 *
 * Por quê: o projeto não tem SMTP próprio (os e-mails nativos do Supabase
 * sofrem limite rígido e o cadastro ficava preso em "confira seu e-mail").
 * Pela API Admin (service role no servidor) a conta já nasce com o e-mail
 * confirmado — o cliente entra em seguida com signInWithPassword normal.
 * A chave secreta NUNCA sai do servidor; o navegador só fala com esta
 * server function.
 */

const ContaInput = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  senha: z.string().min(6).max(72),
  nome: z.string().trim().max(80).optional(),
});

// ---------------------------------------------------------------------------
// Rate limit por e-mail em memória (melhor esforço): barra rajadas contra um
// mesmo destinatário sem precisar de infraestrutura extra. Exportado para
// testes unitários — não é usado no cliente.
// ---------------------------------------------------------------------------
const JANELA_MS = 60 * 60_000;
const MAX_POR_JANELA = 8;
const TENTATIVAS = new Map<string, { n: number; janela: number }>();

export function podeTentarCriar(email: string, agora: number = Date.now()): boolean {
  const chave = email.trim().toLowerCase();
  if (!chave) return false;
  const atual = TENTATIVAS.get(chave);
  if (!atual || agora - atual.janela >= JANELA_MS) {
    TENTATIVAS.set(chave, { n: 1, janela: agora });
    return true;
  }
  if (atual.n >= MAX_POR_JANELA) return false;
  atual.n += 1;
  return true;
}

/** Mensagens de erro do GoTrue → texto claro para o operador. */
export function mensagemAmigavel(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("already been registered") || m.includes("already registered")) {
    return "Este e-mail já tem conta — entre com a sua senha.";
  }
  if (m.includes("password") && (m.includes("weak") || m.includes("short"))) {
    return "A senha é curta demais — use pelo menos 6 caracteres.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "E-mail inválido — confira o que foi digitado.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Muitas tentativas seguidas — espere alguns minutos e tente de novo.";
  }
  return mensagem;
}

export const criarConta = createServerFn({ method: "POST" })
  .inputValidator((input) => ContaInput.parse(input))
  .handler(async ({ data }) => {
    if (!podeTentarCriar(data.email)) {
      throw new Error(
        "Muitas tentativas para este e-mail — espere alguns minutos e tente de novo.",
      );
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      // Conta já confirmada: o cadastro autentica na hora, sem e-mail.
      email_confirm: true,
      user_metadata: data.nome ? { nome: data.nome } : undefined,
    });
    if (error) throw new Error(mensagemAmigavel(error.message));
    return { ok: true, userId: criado.user?.id ?? "" };
  });
