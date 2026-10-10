#!/usr/bin/env node
/**
 * Lote IA + autenticação + tempestades — injeta as traduções das chaves novas
 * nos 5 dicionários — idempotente.
 *
 * MÉTODO SEGURO: apenas INSERE as chaves ausentes antes do "}" final —
 * jamais reescreve o corpo do arquivo (chaves bare coexistem com chaves
 * entre aspas; reescrever já quebrou o dicionário uma vez).
 */
import { readFileSync, writeFileSync } from "node:fs";

const NOVAS = {
  "Estilo de campo": {
    en: "Field style",
    es: "Estilo de campo",
    ru: "Полевой стиль",
    zh: "野外风格",
    ja: "フィールド流",
  },
  "Responda sempre como um instrutor de campo: passos numerados e curtos, linguagem simples, e termine cada resposta com uma dica de segurança prática.":
    {
      en: "Always answer like a field instructor: short numbered steps, plain language, and end every answer with a practical safety tip.",
      es: "Responda siempre como un instructor de campo: pasos numerados y cortos, lenguaje sencillo, y termine cada respuesta con una dica de seguridad práctica.",
      ru: "Отвечайте всегда как полевой инструктор: короткие нумерованные шаги, простой язык и в конце каждого ответа практический совет по безопасности.",
      zh: "始终像野外教官一样回答：简短的编号步骤、通俗易懂的语言，并在每次回答结尾附上一条实用安全提示。",
      ja: "いつも野外教官のように答えてください：短い番号付きの手順、平易な言葉、そして回答の最後に実用的な安全のヒントを添えて。",
    },
  "Kit 72 horas": {
    en: "72-hour kit",
    es: "Kit de 72 horas",
    ru: "Комплект на 72 часа",
    zh: "72小时应急包",
    ja: "72時間キット",
  },
  "Quando eu pedir ajuda com mochila ou kit de emergência, monte a lista de 72 horas: 3 litros de água por pessoa por dia, alimentos não perecíveis, documentos protegidos, rádio, lanterna, pilhas, primeiros socorros, ferramenta multiuso, agasalho e higiene — adaptada ao meu perfil.":
    {
      en: "When I ask for help with a backpack or emergency kit, build the 72-hour list: 3 liters of water per person per day, non-perishable food, protected documents, radio, flashlight, batteries, first aid, multi-tool, warm layer and hygiene — adapted to my profile.",
      es: "Cuando pida ayuda con mochila o kit de emergencia, arme la lista de 72 horas: 3 litros de agua por persona al día, alimentos no perecederos, documentos protegidos, radio, linterna, pilas, primeros auxilios, herramienta multiuso, abrigo e higiene — adaptada a mi perfil.",
      ru: "Когда я прошу помочь с рюкзаком или аварийным комплектом, составляйте список на 72 часа: 3 литра воды на человека в день, нескоропортящаяся еда, защищённые документы, рация, фонарь, батарейки, первая помощь, мультитул, тёплая одежда и гигиена — с учётом моего профиля.",
      zh: "当我请求背包或应急包帮助时，按 72 小时清单配置：每人每天 3 升水、不易腐食品、受保护证件、收音机、手电、电池、急救用品、多功能工具、保暖衣物和卫生用品 — 并按我的情况调整。",
      ja: "バックパックや非常キットの助けを求めたら、72時間リストを組み立ててください：1人1日3リットルの水、賞味期限の長い食料、保護した書類、ラジオ、懐中電灯、電池、救急用品、マルチツール、防寒着、衛生用品 — 私のプロフィールに合わせて調整。",
    },
  padrão: {
    en: "default",
    es: "predeterminado",
    ru: "по умолчанию",
    zh: "默认",
    ja: "デフォルト",
  },
  Editar: {
    en: "Edit",
    es: "Editar",
    ru: "Редактировать",
    zh: "编辑",
    ja: "編集",
  },
  Título: {
    en: "Title",
    es: "Título",
    ru: "Заголовок",
    zh: "标题",
    ja: "タイトル",
  },
  "Instrução que a IA vai seguir": {
    en: "Instruction the AI will follow",
    es: "Instrucción que la IA seguirá",
    ru: "Инструкция, которой ИИ будет следовать",
    zh: "AI 将遵循的指令",
    ja: "AI が従う指示",
  },
  Cancelar: {
    en: "Cancel",
    es: "Cancelar",
    ru: "Отмена",
    zh: "取消",
    ja: "キャンセル",
  },
  Salvar: {
    en: "Save",
    es: "Guardar",
    ru: "Сохранить",
    zh: "保存",
    ja: "保存",
  },
  "Prompt atualizado": {
    en: "Prompt updated",
    es: "Prompt actualizado",
    ru: "Промпт обновлён",
    zh: "提示词已更新",
    ja: "プロンプトを更新しました",
  },
  "Skill atualizada": {
    en: "Skill updated",
    es: "Habilidad actualizada",
    ru: "Навык обновлён",
    zh: "技能已更新",
    ja: "スキルを更新しました",
  },
  "Autenticação (Google e e-mail)": {
    en: "Authentication (Google and e-mail)",
    es: "Autenticación (Google y correo)",
    ru: "Аутентификация (Google и эл. почта)",
    zh: "身份验证（Google 和电子邮件）",
    ja: "認証（Google とメール）",
  },
  "Reconsultar estado": {
    en: "Recheck status",
    es: "Volver a consultar el estado",
    ru: "Проверить состояние снова",
    zh: "重新检查状态",
    ja: "状態を再確認",
  },
  "Consultando o painel…": {
    en: "Checking the dashboard…",
    es: "Consultando el panel…",
    ru: "Проверяем панель…",
    zh: "正在查询控制台…",
    ja: "ダッシュボードを確認中…",
  },
  "Não consegui consultar o estado da autenticação agora — tente novamente.": {
    en: "Couldn't check the authentication status right now — try again.",
    es: "No pude consultar el estado de autenticación ahora — inténtelo de nuevo.",
    ru: "Не удалось проверить состояние аутентификации — попробуйте снова.",
    zh: "暂时无法查询身份验证状态 — 请重试。",
    ja: "認証の状態を確認できませんでした — もう一度お試しください。",
  },
  "E-mail e senha: ativo — o cadastro autentica na hora (a conta nasce confirmada pelo servidor, sem depender de e-mail).":
    {
      en: "E-mail and password: active — signup authenticates instantly (the account is born confirmed by the server, no e-mail needed).",
      es: "Correo y contraseña: activo — el registro autentica al instante (la cuenta nace confirmada por el servidor, sin depender de correo).",
      ru: "Эл. почта и пароль: активно — регистрация аутентифицируется сразу (аккаунт подтверждается сервером, без письма).",
      zh: "邮箱和密码：已启用 — 注册即刻登录（账号由服务器直接确认，无需邮件）。",
      ja: "メールとパスワード：有効 — 登録すると即座にログインできます（サーバーが確認済みで作成、メール不要）。",
    },
  "Confirmação de e-mail: desligada no painel — cadastro autentica na hora.": {
    en: "E-mail confirmation: off in the dashboard — signup authenticates instantly.",
    es: "Confirmación de correo: desactivada en el panel — el registro autentica al instante.",
    ru: "Подтверждение почты: выключено в панели — регистрация аутентифицируется сразу.",
    zh: "邮箱确认：控制台中已关闭 — 注册即刻登录。",
    ja: "メール確認：パネルでオフ — 登録すると即ログインできます。",
  },
  "Confirmação de e-mail: ligada no painel — o app contorna criando a conta já confirmada; ninguém fica preso em “confira seu e-mail”.":
    {
      en: "E-mail confirmation: on in the dashboard — the app works around it by creating the account already confirmed; nobody gets stuck on “check your e-mail”.",
      es: "Confirmación de correo: activada en el panel — la app lo evita creando la cuenta ya confirmada; nadie queda atrapado en «revisa tu correo».",
      ru: "Подтверждение почты: включено в панели — приложение обходит это, создавая уже подтверждённый аккаунт; никто не застревает на «проверьте почту».",
      zh: "邮箱确认：控制台中已开启 — 应用通过直接创建已确认账号绕过它，没人会卡在“请查收邮件”。",
      ja: "メール確認：パネルでオン — アプリは確認済みアカウントを作成して回避します。「メールを確認」で止まりません。",
    },
  "Login com Google: ATIVO — o botão “Continuar com Google” aparece no login sozinho.": {
    en: "Google sign-in: ACTIVE — the “Continue with Google” button appears on the login by itself.",
    es: "Acceso con Google: ACTIVO — el botón «Continuar con Google» aparece solo en el login.",
    ru: "Вход через Google: АКТИВЕН — кнопка «Продолжить с Google» появляется на входе сама.",
    zh: "Google 登录：已启用 — “使用 Google 继续”按钮会自动出现在登录页。",
    ja: "Google ログイン：有効 — 「Google で続行」ボタンがログインに自動で表示されます。",
  },
  "Login com Google: ainda não ativado no painel — siga o passo a passo abaixo.": {
    en: "Google sign-in: not enabled in the dashboard yet — follow the steps below.",
    es: "Acceso con Google: aún no activado en el panel — siga los pasos de abajo.",
    ru: "Вход через Google: ещё не включён в панели — следуйте шагам ниже.",
    zh: "Google 登录：控制台中尚未启用 — 请按以下步骤操作。",
    ja: "Google ログイン：パネルでまだ有効になっていません — 以下の手順に従ってください。",
  },
  "Para ativar o Google (5 minutos):": {
    en: "To enable Google (5 minutes):",
    es: "Para activar Google (5 minutos):",
    ru: "Чтобы включить Google (5 минут):",
    zh: "启用 Google（5 分钟）：",
    ja: "Google を有効にする（5分）：",
  },
  "Em console.cloud.google.com → APIs e serviços → Credenciais → Criar credencial → ID do cliente OAuth → Aplicativo da Web.":
    {
      en: "In console.cloud.google.com → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.",
      es: "En console.cloud.google.com → APIs y servicios → Credenciales → Crear credencial → ID de cliente OAuth → Aplicación web.",
      ru: "В console.cloud.google.com → API и сервисы → Учётные данные → Создать учётные данные → ID клиента OAuth → Веб-приложение.",
      zh: "在 console.cloud.google.com → API 和服务 → 凭据 → 创建凭据 → OAuth 客户端 ID → Web 应用。",
      ja: "console.cloud.google.com → API とサービス → 認証情報 → 認証情報を作成 → OAuth クライアント ID → ウェブ アプリケーション。",
    },
  "Em “URI de redirecionamento autorizado”, cole exatamente:": {
    en: "In “Authorized redirect URI”, paste exactly:",
    es: "En «URI de redirección autorizada», pegue exactamente:",
    ru: "В «Разрешённый URI перенаправления» вставьте точно:",
    zh: "在“已获授权的重定向 URI”中精确粘贴：",
    ja: "「承認済みのリダイレクト URI」に次を正確に貼り付け：",
  },
  "Copie o ID do cliente e o client secret gerados.": {
    en: "Copy the generated client ID and client secret.",
    es: "Copie el ID de cliente y el client secret generados.",
    ru: "Скопируйте созданные ID клиента и client secret.",
    zh: "复制生成的客户端 ID 和客户端密钥。",
    ja: "生成されたクライアント ID とクライアント シークレットをコピーします。",
  },
  "No painel do Supabase → Authentication → Sign In / Providers → Google: cole as duas credenciais e salve.":
    {
      en: "In the Supabase dashboard → Authentication → Sign In / Providers → Google: paste both credentials and save.",
      es: "En el panel de Supabase → Authentication → Sign In / Providers → Google: pegue las dos credenciales y guarde.",
      ru: "В панели Supabase → Authentication → Sign In / Providers → Google: вставьте оба значения и сохраните.",
      zh: "在 Supabase 控制台 → Authentication → Sign In / Providers → Google：粘贴两项凭据并保存。",
      ja: "Supabase ダッシュボード → Authentication → Sign In / Providers → Google：2つの認証情報を貼り付けて保存。",
    },
  "Ainda no painel → Authentication → URL Configuration: Site URL https://manualdosobrevivente.vercel.app e Redirect URLs incluindo este endereço.":
    {
      en: "Still in the dashboard → Authentication → URL Configuration: Site URL https://manualdosobrevivente.vercel.app and Redirect URLs including this address.",
      es: "Aún en el panel → Authentication → URL Configuration: Site URL https://manualdosobrevivente.vercel.app y Redirect URLs incluyendo esta dirección.",
      ru: "Там же в панели → Authentication → URL Configuration: Site URL https://manualdosobrevivente.vercel.app и Redirect URLs с этим адресом.",
      zh: "仍在控制台 → Authentication → URL Configuration：Site URL 填 https://manualdosobrevivente.vercel.app，Redirect URLs 包含此地址。",
      ja: "同じパネルの Authentication → URL Configuration：Site URL は https://manualdosobrevivente.vercel.app、Redirect URLs にこのアドレスを含めます。",
    },
  "Volte aqui e toque em reconsultar — o botão do Google aparece no login sozinho.": {
    en: "Come back here and tap recheck — the Google button appears on the login by itself.",
    es: "Vuelva aquí y toque volver a consultar — el botón de Google aparece solo en el login.",
    ru: "Вернитесь сюда и нажмите «Проверить снова» — кнопка Google появится на входе сама.",
    zh: "回到这里点击重新检查 — Google 按钮会自动出现在登录页。",
    ja: "ここに戻って再確認をタップ — Google ボタンがログインに自動で表示されます。",
  },
  "Abrir provedores no painel do Supabase": {
    en: "Open providers in the Supabase dashboard",
    es: "Abrir proveedores en el panel de Supabase",
    ru: "Открыть провайдеров в панели Supabase",
    zh: "在 Supabase 控制台打开登录方式",
    ja: "Supabase ダッシュボードでプロバイダを開く",
  },
  "Sobre o SMTP:": {
    en: "About SMTP:",
    es: "Sobre el SMTP:",
    ru: "О SMTP:",
    zh: "关于 SMTP：",
    ja: "SMTP について：",
  },
  "O app funciona sem SMTP (o cadastro não depende de e-mail). Se quiser enviar e-mails próprios no futuro — recuperação de senha, avisos — configure Project Settings → Authentication → SMTP com um provedor gratuito (Resend, Brevo, SES).":
    {
      en: "The app works without SMTP (signup doesn't depend on e-mail). If you want to send your own e-mails later — password recovery, alerts — configure Project Settings → Authentication → SMTP with a free provider (Resend, Brevo, SES).",
      es: "La app funciona sin SMTP (el registro no depende de correo). Si quiere enviar correos propios en el futuro — recuperación de contraseña, avisos — configure Project Settings → Authentication → SMTP con un proveedor gratuito (Resend, Brevo, SES).",
      ru: "Приложение работает без SMTP (регистрация не зависит от почты). Если позже захотите отправлять свои письма — восстановление пароля, уведомления — настройте Project Settings → Authentication → SMTP с бесплатным провайдером (Resend, Brevo, SES).",
      zh: "应用无需 SMTP 即可运行（注册不依赖邮件）。将来若想发送自己的邮件（找回密码、通知），请在 Project Settings → Authentication → SMTP 配置免费服务商（Resend、Brevo、SES）。",
      ja: "アプリは SMTP なしで動作します（登録にメールは不要）。将来、独自のメール（パスワード復旧や通知）を送りたい場合は、Project Settings → Authentication → SMTP で無料プロバイダ（Resend、Brevo、SES）を設定してください。",
    },
  "Este e-mail já tem conta — entre com a sua senha.": {
    en: "This e-mail already has an account — sign in with your password.",
    es: "Este correo ya tiene cuenta — entre con su contraseña.",
    ru: "На эту почту уже есть аккаунт — войдите с паролем.",
    zh: "此邮箱已有账号 — 请使用密码登录。",
    ja: "このメールはすでに登録済みです — パスワードでログインしてください。",
  },
  "umidade {v}%": {
    en: "humidity {v}%",
    es: "humedad {v}%",
    ru: "влажность {v}%",
    zh: "湿度 {v}%",
    ja: "湿度 {v}%",
  },
};

const ARQUIVOS = {
  en: "src/lib/i18n/dic-en.ts",
  es: "src/lib/i18n/dic-es.ts",
  ru: "src/lib/i18n/dic-ru.ts",
  zh: "src/lib/i18n/dic-zh.ts",
  ja: "src/lib/i18n/dic-ja.ts",
};

for (const [idioma, caminho] of Object.entries(ARQUIVOS)) {
  const fonte = readFileSync(caminho, "utf8");
  const insercoes = [];
  for (const [pt, trs] of Object.entries(NOVAS)) {
    // A chave existe? Formato bare (Mapa:) ou entre aspas ("Mapa":).
    const escapada = pt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bare = new RegExp(`^\\s{2}${escapada}:`, "m");
    const entreAspas = new RegExp(`^\\s{2}"${escapada}":`, "m");
    if (bare.test(fonte) || entreAspas.test(fonte)) continue;
    insercoes.push(`  ${JSON.stringify(pt)}: ${JSON.stringify(trs[idioma])},`);
  }
  if (insercoes.length === 0) {
    console.log(`${idioma}: nada a inserir`);
    continue;
  }
  const fim = fonte.lastIndexOf("}");
  const novo = fonte.slice(0, fim) + insercoes.join("\n") + "\n" + fonte.slice(fim);
  writeFileSync(caminho, novo);
  console.log(`${idioma}: +${insercoes.length} chaves`);
}
console.log("DICIONÁRIOS ATUALIZADOS (inserção segura)");
