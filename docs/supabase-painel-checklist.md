# Painel Supabase — checklist de pendências (Google login, URLs e e-mail)

> Última atualização: 2026-10-12. Estado: cadastro por e-mail **já funciona sem
> este checklist** (a conta nasce confirmada via servidor — sem depender de
> SMTP). O checklist destrava o **login com Google** e endurece os e-mails.

O que ainda exige o painel (só o dono da conta resolve — a Management API
rejeita chaves de projeto por design):

---

## 1. Login com Google (Authentication → Providers → Google)

1. Acesse o Google Cloud Console: <https://console.cloud.google.com/apis/credentials>
2. **Criar credenciais → ID do cliente OAuth → Aplicativo da Web**
3. Em **URIs de redirecionamento autorizados**, cole exatamente:
   ```
   https://mbterwktxczsyevcudoz.supabase.co/auth/v1/callback
   ```
4. Copie o **Client ID** e o **Client secret**.
5. No painel do Supabase (<https://supabase.com/dashboard/project/mbterwktxczsyevcudoz/auth/providers>)
   → **Google** → ative → cole os dois valores → **Save**.

Pronto: o botão **“Continuar com Google”** aparece sozinho no portão e no
/login — o app já consulta o estado do provedor (`/auth/v1/settings`) e só
exibe o botão quando o provedor está ativo. Nenhum deploy é necessário.

## 2. URLs de redirecionamento (Authentication → URL Configuration)

Em <https://supabase.com/dashboard/project/mbterwktxczsyevcudoz/auth/url-configuration>:

- **Site URL**: `https://manualdosobrevivente.vercel.app`
- **Redirect URLs** (adicione todas):
  ```
  https://manualdosobrevivente.vercel.app/**
  https://manual-do-sobrevivente.vercel.app/**
  http://localhost:8080/**
  http://localhost:5173/**
  ```

Sem isso o Google login volta a `redirect_not_allowed` e a recuperação de
senha não abre o link.

## 3. E-mail (SMTP próprio — opcional, recomendado)

O app **não depende** de e-mail para cadastro. O SMTP só entra em cena para
**recuperação de senha** (fluxo “Esqueci minha senha”) e para o reenvio de
confirmação de contas antigas. O SMTP embutido do Supabase tem limite rígido
(poucas mensagens por hora) — para uso real, configure um próprio:

1. Crie uma conta em um serviço de e-mail transacional (Resend, Brevo,
   Mailgun — todos com plano gratuito) OU use Gmail com senha de app.
2. Em <https://supabase.com/dashboard/project/mbterwktxczsyevcudoz/settings/auth>
   → **SMTP Settings** → ative e preencha Host/Porta/Usuário/Senha/Remetente.
3. Teste com o fluxo “Esqueci minha senha” no app.

## 4. (Opcional) Token da Management API para automação

Se quiser que as próximas configurações de painel sejam feitas por aqui sem
passo a passo manual: <https://supabase.com/dashboard/account/tokens> →
**Generate token** (começa com `sbp_`). Com esse token é possível ajustar
providers, URLs e SMTP por API. O token nunca vai para o repositório — cole
no chat quando for usar.

---

## O que JÁ está resolvido no app (sem tocar no painel)

- ✅ Cadastro autentica na hora (conta confirmada via servidor — sem SMTP);
- ✅ Erros de autenticação com mensagem humana (rate limit, senha errada,
  e-mail não confirmado, já registrado, sem conexão);
- ✅ Fluxo “Esqueci minha senha” com link por e-mail;
- ✅ Botão Google aparece sozinho quando o provedor é ativado no painel;
- ✅ Áreas de mapa baixadas em /offline agora ALIMENTAM o mapa (protocolo
  `tg-offline` no MapLibre) — o item “Áreas de mapa salvas” do Teste de
  Prontidão Offline fica verde depois do download e o mapa funciona sem sinal.
