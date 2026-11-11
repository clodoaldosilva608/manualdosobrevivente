/**
 * Mensagens humanas para os erros comuns de autenticação — o Supabase
 * devolve textos cruas em inglês ("Invalid login credentials", "Rate limit
 * exceeded") que assustam o operador em campo. A função reconhece os padrões
 * conhecidos e devolve a chave pt-BR amigável (traduzível via t()); quando
 * não reconhece, devolve null — a mensagem original é mostrada.
 *
 * Falha de rede tem duas caras: aparelho sem internet (navigator.onLine
 * falso) ou servidor de contas inalcançável com o aparelho online (domínio
 * fora do ar/projeto pausado) — o operador precisa saber qual dos dois.
 *
 * Puro e injetável: testes de unidade cobrem cada padrão.
 */

export type ContextoAuth = { aparelhoOnline?: boolean };

/** Falha de rede em qualquer sabor que o fetch dos SDKs devolve. */
const REDE_FALHOU = /failed to fetch|networkerror|network error|fetch failed|load failed/i;

const PADROES: Array<[RegExp, string]> = [
  [
    /rate limit|too many requests|429/i,
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  ],
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail pelo link que enviamos antes de entrar."],
  [
    /already registered|already exists|user already/i,
    "Este e-mail já tem conta. Entre com a sua senha.",
  ],
  [
    /at least 6 characters|weak password|should be at least/i,
    "A senha precisa de pelo menos 6 caracteres.",
  ],
  [
    /unable to validate email|invalid email|invalid format/i,
    "E-mail inválido. Confira o endereço digitado.",
  ],
  [
    /signups not allowed|sign-up not allowed/i,
    "Cadastro desativado no servidor — fale com a administração do projeto.",
  ],
  [/captcha|verification/i, "Verificação de segurança pendente — tente de novo em instantes."],
];

/**
 * Devolve a mensagem amigável (chave pt-BR) para o erro, ou null quando
 * não reconhece o padrão — nesse caso a interface mostra a original.
 *
 * `contexto.aparelhoOnline` (padrão true) separa aparelho sem internet de
 * servidor inalcançável na falha de rede.
 */
export function mensagemAmigavelAuth(
  mensagem: string | undefined | null,
  contexto?: ContextoAuth,
): string | null {
  if (!mensagem) return null;
  if (REDE_FALHOU.test(mensagem)) {
    return contexto?.aparelhoOnline === false
      ? "Sem internet no aparelho. Verifique o Wi-Fi ou o sinal e tente de novo."
      : "Servidor de contas fora do ar. Tente de novo em alguns minutos — se persistir, procure a administração do projeto.";
  }
  for (const [padrao, chave] of PADROES) {
    if (padrao.test(mensagem)) return chave;
  }
  return null;
}
