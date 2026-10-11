#!/usr/bin/env node
/**
 * Injeta as traduções das chaves novas (pendências: erros amigáveis de
 * autenticação, recuperação de senha e áreas offline no mapa) nos
 * 5 dicionários — idempotente.
 *
 * MÉTODO SEGURO: apenas INSERE as chaves ausentes antes do "}" final —
 * jamais reescreve o corpo do arquivo.
 */
import { readFileSync, writeFileSync } from "node:fs";

const NOVAS = {
  "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.": {
    en: "Too many attempts in a short time. Wait a few minutes and try again.",
    es: "Demasiados intentos en poco tiempo. Espere unos minutos e intente de nuevo.",
    ru: "Слишком много попыток за короткое время. Подождите несколько минут и попробуйте снова.",
    zh: "短时间内尝试次数过多。请等待几分钟后再试。",
    ja: "短時間に試行回数が多すぎます。数分待ってからもう一度お試しください。",
  },
  "E-mail ou senha incorretos.": {
    en: "Incorrect e-mail or password.",
    es: "Correo o contraseña incorrectos.",
    ru: "Неверная электронная почта или пароль.",
    zh: "邮箱或密码不正确。",
    ja: "メールアドレスまたはパスワードが違います。",
  },
  "Confirme seu e-mail pelo link que enviamos antes de entrar.": {
    en: "Confirm your e-mail via the link we sent before signing in.",
    es: "Confirme su correo con el enlace que enviamos antes de entrar.",
    ru: "Подтвердите свою почту по ссылке, которую мы отправили, прежде чем войти.",
    zh: "登录前请先通过我们发送的链接确认您的邮箱。",
    ja: "ログイン前に、送信したリンクでメールアドレスを確認してください。",
  },
  "Este e-mail já tem conta. Entre com a sua senha.": {
    en: "This e-mail already has an account. Sign in with your password.",
    es: "Este correo ya tiene cuenta. Entre con su contraseña.",
    ru: "На эту почту уже зарегистрирован аккаунт. Войдите с паролем.",
    zh: "该邮箱已有账户。请使用密码登录。",
    ja: "このメールアドレスには既にアカウントがあります。パスワードでログインしてください。",
  },
  "A senha precisa de pelo menos 6 caracteres.": {
    en: "The password needs at least 6 characters.",
    es: "La contraseña necesita al menos 6 caracteres.",
    ru: "Пароль должен содержать минимум 6 символов.",
    zh: "密码至少需要 6 个字符。",
    ja: "パスワードは 6 文字以上必要です。",
  },
  "E-mail inválido. Confira o endereço digitado.": {
    en: "Invalid e-mail. Check the address you typed.",
    es: "Correo inválido. Revise la dirección escrita.",
    ru: "Неверная электронная почта. Проверьте введённый адрес.",
    zh: "邮箱无效。请检查输入的地址。",
    ja: "メールアドレスが無効です。入力したアドレスを確認してください。",
  },
  "Sem conexão com o servidor. Verifique o sinal e tente de novo.": {
    en: "No connection to the server. Check your signal and try again.",
    es: "Sin conexión con el servidor. Verifique la señal e intente de nuevo.",
    ru: "Нет связи с сервером. Проверьте сигнал и попробуйте снова.",
    zh: "无法连接服务器。请检查信号后重试。",
    ja: "サーバーに接続できません。通信状況を確認して再試行してください。",
  },
  "Cadastro desativado no servidor — fale com a administração do projeto.": {
    en: "Sign-up disabled on the server — contact the project administration.",
    es: "Registro desactivado en el servidor — hable con la administración del proyecto.",
    ru: "Регистрация отключена на сервере — обратитесь к администрации проекта.",
    zh: "服务器已停用注册 — 请联系项目管理员。",
    ja: "サーバーで新規登録が無効です — プロジェクト管理者にご連絡ください。",
  },
  "Verificação de segurança pendente — tente de novo em instantes.": {
    en: "Security check pending — try again in a moment.",
    es: "Verificación de seguridad pendiente — intente de nuevo en un momento.",
    ru: "Проверка безопасности не завершена — попробуйте снова через минуту.",
    zh: "安全验证未完成 — 请稍后重试。",
    ja: "セキュリティ確認が未完了です — しばらくしてから再試行してください。",
  },
  "Digite seu e-mail para receber o link de recuperação": {
    en: "Type your e-mail to receive the recovery link",
    es: "Escriba su correo para recibir el enlace de recuperación",
    ru: "Введите свою почту, чтобы получить ссылку для восстановления",
    zh: "输入您的邮箱以接收恢复链接",
    ja: "復旧リンクを受け取るにはメールアドレスを入力してください",
  },
  "Link de recuperação enviado": {
    en: "Recovery link sent",
    es: "Enlace de recuperación enviado",
    ru: "Ссылка для восстановления отправлена",
    zh: "恢复链接已发送",
    ja: "復旧リンクを送信しました",
  },
  "Abra o link no e-mail para definir uma nova senha.": {
    en: "Open the link in the e-mail to set a new password.",
    es: "Abra el enlace en el correo para definir una nueva contraseña.",
    ru: "Откройте ссылку в письме, чтобы задать новый пароль.",
    zh: "打开邮件中的链接以设置新密码。",
    ja: "メール内のリンクを開いて新しいパスワードを設定してください。",
  },
  "Enviando link…": {
    en: "Sending link…",
    es: "Enviando enlace…",
    ru: "Отправляем ссылку…",
    zh: "正在发送链接…",
    ja: "リンクを送信中…",
  },
  "Esqueci minha senha": {
    en: "I forgot my password",
    es: "Olvidé mi contraseña",
    ru: "Я забыл пароль",
    zh: "我忘记了密码",
    ja: "パスワードをお忘れですか",
  },
  "Área offline salva no aparelho": {
    en: "Offline area saved on the device",
    es: "Área sin conexión guardada en el aparato",
    ru: "Автономная область сохранена на устройстве",
    zh: "离线区域已保存在设备上",
    ja: "オフライン領域を端末に保存しました",
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
    const bare = new RegExp(
      `^\\s{2}${JSON.stringify(pt)
        .slice(1, -1)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`,
      "m",
    );
    const escapada = pt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
