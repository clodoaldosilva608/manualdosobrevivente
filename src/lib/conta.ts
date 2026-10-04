/**
 * Conta local do operador — offline-first, pronta para a nuvem.
 *
 * O app guarda a conta no IndexedDB (store "contas"): nome, e-mail e o hash
 * PBKDF2 da senha. Nada sai do aparelho. Quando o projeto ganhar banco de
 * dados, cada conta mapeia 1:1 para o usuário remoto (mesmo e-mail) e os
 * dados locais passam a sincronizar sob o id da conta — o esquema de campos
 * (id/email/nome/criada_em) já segue o formato do futuro perfil na nuvem.
 *
 * Política: uma conta por aparelho (o aparelho é o kit do operador). Trocar
 * de conta exige apagar a existente — assim os dados locais sempre pertencem
 * à conta ativa, sem partição por usuário.
 */
import {
  listContas,
  saveConta,
  deleteConta,
  getSetting,
  setSetting,
  type LocalConta,
} from "@/lib/db";

export type { LocalConta as ContaLocal };

/** Chave da sessão no store "settings" — persiste entre aberturas do app. */
const CHAVE_SESSAO = "conta-ativa";
/** Iterações do PBKDF2 — custo calibrado para aparelhos modestos. */
const ITERACOES = 120_000;

export class ErroConta extends Error {}

/* ------------------------------------------------------------------ */
/* Hash da senha (WebCrypto PBKDF2; fallback FNV em contexto inseguro)  */
/* ------------------------------------------------------------------ */

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function salNovo(): string {
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return hex(b.buffer as ArrayBuffer);
}

/** Fallback determinístico (contextos sem crypto.subtle — http puro em LAN). */
function hashFallback(senha: string, sal: string): string {
  // FNV-1a de 64 bits simulado com duas passadas (não é criptográfico; só
  // evita guardar a senha crua quando a WebCrypto não existe).
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = `${sal}:${senha}`;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = ((h1 ^ c) >>> 0) * 0x01000193;
    h2 = ((h2 ^ c) >>> 0) * 0x85ebca6b;
    h1 >>>= 0;
    h2 >>>= 0;
  }
  return `${sal}:${h1.toString(16)}${h2.toString(16)}`;
}

/** Gera o hash PBKDF2-SHA256 no formato "pbkdf2$iterações$sal$digest". */
export async function hashSenha(senha: string): Promise<string> {
  const sal = salNovo();
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (!subtle) return `fnv$1$${hashFallback(senha, sal)}`;
  const chave = await subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sal), iterations: ITERACOES },
    chave,
    256,
  );
  return `pbkdf2$${ITERACOES}$${sal}$${hex(bits)}`;
}

/** Confere a senha contra o hash guardado (PBKDF2 ou fallback). */
export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [esquema, , sal] = guardado.split("$");
  if (esquema === "pbkdf2") {
    const recalculado = await hashSenhaComSal(senha, sal ?? "");
    return timingSeguro(recalculado, guardado);
  }
  if (esquema === "fnv") {
    const recalculado = `fnv$1$${hashFallback(senha, sal ?? "")}`;
    return timingSeguro(recalculado, guardado);
  }
  return false;
}

async function hashSenhaComSal(senha: string, sal: string): Promise<string> {
  const subtle = crypto.subtle;
  const chave = await subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sal), iterations: ITERACOES },
    chave,
    256,
  );
  return `pbkdf2$${ITERACOES}$${sal}$${hex(bits)}`;
}

/** Comparação em tempo constante (evita vazar o digest por timing). */
function timingSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/* Validação                                                          */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validarCadastro(nome: string, email: string, senha: string) {
  if (nome.trim().length < 2) {
    throw new ErroConta("O nome precisa ter pelo menos 2 letras");
  }
  if (!EMAIL_RE.test(email.trim())) {
    throw new ErroConta("Informe um e-mail válido");
  }
  if (senha.length < 4) {
    throw new ErroConta("A senha precisa ter pelo menos 4 caracteres");
  }
}

/* ------------------------------------------------------------------ */
/* Sessão                                                             */
/* ------------------------------------------------------------------ */

function idSessao(sessao: unknown): string | null {
  if (sessao && typeof sessao === "object" && typeof (sessao as { id?: unknown }).id === "string") {
    return (sessao as { id: string }).id;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Operações da conta                                                 */
/* ------------------------------------------------------------------ */

/** Conta ativa neste aparelho, ou null quando não há conta/sessão. */
export async function contaAtiva(): Promise<LocalConta | null> {
  const [contas, sessao] = await Promise.all([listContas(), getSetting(CHAVE_SESSAO)]);
  const id = idSessao(sessao);
  const conta = contas.find((c) => c.id === id) ?? null;
  return conta;
}

/** Conta registrada no aparelho mesmo sem sessão (para tela de entrar). */
export async function contaRegistrada(): Promise<LocalConta | null> {
  const contas = await listContas();
  return contas[0] ?? null;
}

/** Cria a conta do aparelho (só funciona quando não existe nenhuma). */
export async function criarConta(dados: { nome: string; email: string; senha: string }) {
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  validarCadastro(nome, email, dados.senha);
  const existente = await contaRegistrada();
  if (existente) {
    throw new ErroConta(
      "Já existe uma conta neste aparelho — entre com a senha ou apague a conta em perfil › Excluir conta.",
    );
  }
  const agora = new Date().toISOString();
  const conta: LocalConta = {
    id: crypto.randomUUID(),
    email,
    nome,
    senha_hash: await hashSenha(dados.senha),
    criada_em: agora,
    atualizada_em: agora,
    ultimo_acesso: agora,
  };
  await saveConta(conta);
  await setSetting(CHAVE_SESSAO, { id: conta.id, em: agora });
  return conta;
}

/** Autentica com e-mail + senha e abre a sessão local. */
export async function entrar(dados: { email: string; senha: string }): Promise<LocalConta> {
  const conta = await contaRegistrada();
  if (!conta) throw new ErroConta("Nenhuma conta criada neste aparelho");
  if (conta.email !== dados.email.trim().toLowerCase()) {
    throw new ErroConta("E-mail não corresponde à conta deste aparelho");
  }
  const ok = await conferirSenha(dados.senha, conta.senha_hash);
  if (!ok) throw new ErroConta("Senha incorreta");
  const agora = new Date().toISOString();
  const atualizada: LocalConta = { ...conta, ultimo_acesso: agora, atualizada_em: agora };
  await saveConta(atualizada);
  await setSetting(CHAVE_SESSAO, { id: conta.id, em: agora });
  return atualizada;
}

/** Fecha a sessão — a conta continua registrada no aparelho. */
export async function sair(): Promise<void> {
  await setSetting(CHAVE_SESSAO, null);
}

/** Atualiza nome (e/ou e-mail) do perfil. */
export async function atualizarPerfil(patch: { nome?: string; email?: string }) {
  const conta = await contaAtiva();
  if (!conta) throw new ErroConta("Nenhuma sessão aberta");
  const nome = (patch.nome ?? conta.nome).trim();
  const email = (patch.email ?? conta.email).trim().toLowerCase();
  validarCadastro(nome, email, "00000000");
  const atualizada: LocalConta = {
    ...conta,
    nome,
    email,
    atualizada_em: new Date().toISOString(),
  };
  await saveConta(atualizada);
  return atualizada;
}

/** Troca a senha (exige a atual). */
export async function alterarSenha(atual: string, nova: string) {
  const conta = await contaAtiva();
  if (!conta) throw new ErroConta("Nenhuma sessão aberta");
  if (!(await conferirSenha(atual, conta.senha_hash))) {
    throw new ErroConta("Senha atual incorreta");
  }
  if (nova.length < 4) throw new ErroConta("A nova senha precisa ter pelo menos 4 caracteres");
  const atualizada: LocalConta = {
    ...conta,
    senha_hash: await hashSenha(nova),
    atualizada_em: new Date().toISOString(),
  };
  await saveConta(atualizada);
  return atualizada;
}

/** Apaga a conta do aparelho (exige a senha). Os dados do app são mantidos. */
export async function apagarConta(senha: string): Promise<void> {
  const conta = await contaRegistrada();
  if (!conta) throw new ErroConta("Nenhuma conta neste aparelho");
  if (!(await conferirSenha(senha, conta.senha_hash))) {
    throw new ErroConta("Senha incorreta — a conta não foi apagada");
  }
  await deleteConta(conta.id);
  await setSetting(CHAVE_SESSAO, null);
}
