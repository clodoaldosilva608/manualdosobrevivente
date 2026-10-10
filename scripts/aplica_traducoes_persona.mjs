#!/usr/bin/env node
/**
 * Task 28 — injeta as traduções das chaves novas (personagem/persona da IA)
 * nos 5 dicionários — idempotente.
 *
 * MÉTODO SEGURO: apenas INSERE as chaves ausentes antes do "}" final —
 * jamais reescreve o corpo do arquivo (chaves bare `Mapa: "Map"` coexistem
 * com chaves entre aspas; reescrever já quebrou o dicionário uma vez).
 */
import { readFileSync, writeFileSync } from "node:fs";

const NOVAS = {
  "Personagem da IA": {
    en: "AI character",
    es: "Personaje de la IA",
    ru: "Персонаж ИИ",
    zh: "AI 角色",
    ja: "AIキャラクター",
  },
  "Qual um dos personagens do Manual pode encarnar o assistente: o escolhido vira a miniatura flutuante (toque nela para abrir o chat) e dá o tom, a especialidade e a frase-símbolo das respostas.":
    {
      en: "Any of the Manual characters can become the assistant: the chosen one becomes the floating thumbnail (tap it to open the chat) and sets the tone, the specialty and the signature phrase of the answers.",
      es: "Cualquiera de los personajes del Manual puede encarnar al asistente: el elegido se convierte en la miniatura flotante (tóquela para abrir el chat) y da el tono, la especialidad y la frase-símbolo de las respuestas.",
      ru: "Любой персонаж Мануала может воплотить ассистента: выбранный становится плавающей миниатюрой (нажмите её, чтобы открыть чат) и задаёт тон, специализацию и фразу-символ ответов.",
      zh: "手册中的任意角色都可以成为助手：被选择的角色会变成悬浮缩略图（点击即可打开聊天），并决定回答的语气、专长和标志语。",
      ja: "マニュアルのどのキャラクターでもアシスタントになれます：選んだキャラクターがフローティングサムネイル（タップでチャットを開く）になり、回答の口調・得意分野・象徴フレーズを決めます。",
    },
  Padrão: { en: "Default", es: "Predeterminado", ru: "По умолчанию", zh: "默认", ja: "デフォルト" },
  "IA padrão do app": {
    en: "App default AI",
    es: "IA predeterminada del app",
    ru: "ИИ приложения по умолчанию",
    zh: "应用默认 AI",
    ja: "アプリのデフォルトAI",
  },
  Perfil: { en: "Profile", es: "Perfil", ru: "Профиль", zh: "简介", ja: "プロフィール" },
  "A IA assumiu a identidade de {nome} — o campo “Nome da sua IA” abaixo continua valendo se quiser chamá-la por outro apelido.":
    {
      en: "The AI has taken on the identity of {nome} — the “Name of your AI” field below still applies if you prefer another nickname.",
      es: "La IA asumió la identidad de {nome} — el campo “Nombre de su IA” abajo sigue valiendo si prefiere otro apodo.",
      ru: "ИИ принял личность «{nome}» — поле «Имя вашего ИИ» ниже по-прежнему действует, если хотите другое прозвище.",
      zh: "AI 已采用“{nome}”的身份 — 如果想要其他昵称，下方的“您的 AI 名称”仍然有效。",
      ja: "AIは「{nome}」の人格を引き受けました — 別のニックネームをご希望の場合は、下の「あなたのAIの名前」欄が引き続き有効です。",
    },
  "Sou {nome}, seu assistente no Manual do Sobrevivente.": {
    en: "I'm {nome}, your assistant in the Manual do Sobrevivente.",
    es: "Soy {nome}, su asistente en el Manual do Sobrevivente.",
    ru: "Я {nome}, ваш ассистент в Manual do Sobrevivente.",
    zh: "我是 {nome}，Manual do Sobrevivente 为您准备的助手。",
    ja: "私は {nome}、Manual do Sobrevivente のアシスタントです。",
  },
  "Personagens ativos aparecem na escolha de avatar ao criar conta, em Conta › Perfil na nuvem e na escolha da PERSONA do assistente IA (Ajustes › Assistente IA): o escolhido encarna a IA com nome, perfil e frase. Você pode enviar uma imagem ou colar uma URL.":
    {
      en: "Active characters appear in the avatar choice at sign-up, in Account › Cloud profile and in the AI assistant PERSONA choice (Settings › AI assistant): the chosen one embodies the AI with name, profile and phrase. You can upload an image or paste a URL.",
      es: "Los personajes activos aparecen en la elección de avatar al crear cuenta, en Cuenta › Perfil en la nube y en la elección de la PERSONA del asistente IA (Ajustes › Asistente IA): el elegido encarna a la IA con nombre, perfil y frase. Puede enviar una imagen o pegar una URL.",
      ru: "Активные персонажи появляются при выборе аватара при регистрации, в Аккаунт › Облачный профиль и при выборе ПЕРСОНЫ ИИ-ассистента (Настройки › ИИ-ассистент): выбранный воплощает ИИ с именем, профилем и фразой. Можно загрузить изображение или вставить URL.",
      zh: "启用中的角色会出现在注册时的头像选择、账户 › 云端个人资料以及 AI 助手人格选择（设置 › AI 助手）中：被选中的角色以名字、简介和标志语化身 AI。可上传图片或粘贴 URL。",
      ja: "有効なキャラクターは、登録時のアバター選択、アカウント › クラウドプロフィール、AIアシスタントのペルソナ選択（設定 › AIアシスタント）に表示されます：選ばれたキャラクターが名前・プロフィール・フレーズ付きでAIになります。画像をアップロードするかURLを貼り付けてください。",
    },
  "Identificador (slug)": {
    en: "Identifier (slug)",
    es: "Identificador (slug)",
    ru: "Идентификатор (slug)",
    zh: "标识符 (slug)",
    ja: "識別子（スラッグ）",
  },
  "Usado pela IA para lembrar a persona escolhida — minúsculas e hífens.": {
    en: "Used by the AI to remember the chosen persona — lowercase and hyphens.",
    es: "Usado por la IA para recordar la persona elegida — minúsculas y guiones.",
    ru: "Используется ИИ для запоминания выбранной персоны — строчные буквы и дефисы.",
    zh: "AI 用它记住所选人格 — 小写字母和连字符。",
    ja: "AIが選択されたペルソナを記憶するために使います — 小文字とハイフン。",
  },
  "Perfil (especialidades)": {
    en: "Profile (specialties)",
    es: "Perfil (especialidades)",
    ru: "Профиль (специализации)",
    zh: "简介（专长）",
    ja: "プロフィール（得意分野）",
  },
  "Frase-símbolo (lema)": {
    en: "Signature phrase (motto)",
    es: "Frase-símbolo (lema)",
    ru: "Фраза-символ (девиз)",
    zh: "标志语（格言）",
    ja: "象徴フレーズ（モットー）",
  },
  "Ex.: Rastreamento, observação, orientação e fauna": {
    en: "Ex.: Tracking, observation, orientation and wildlife",
    es: "Ej.: Rastreo, observación, orientación y fauna",
    ru: "Напр.: Слежение, наблюдение, ориентирование и фауна",
    zh: "例：追踪、观察、定向与野生动物",
    ja: "例：追跡、観察、方位、野生動物",
  },
  "Ex.: Preparação é transformar conhecimento em segurança.": {
    en: "Ex.: Preparation is turning knowledge into safety.",
    es: "Ej.: La preparación es convertir conocimiento en seguridad.",
    ru: "Напр.: Подготовка — это превращение знаний в безопасность.",
    zh: "例：准备就是把知识变成安全。",
    ja: "例：準備とは知識を安全に変えることです。",
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
