#!/usr/bin/env node
/**
 * Injeta as traduções das chaves novas (portão de autenticação, tela limpa,
 * painéis dobráveis, personagens) nos 5 dicionários — idempotente.
 *
 * MÉTODO SEGURO: apenas INSERE as chaves ausentes antes do "}" final —
 * jamais reescreve o corpo do arquivo (as chaves existentes usam tanto
 * identificadores sem aspas — `Mapa: "Map"` — quanto chaves entre aspas,
 * e reordenar/reformatar já quebrou o dicionário uma vez).
 */
import { readFileSync, writeFileSync } from "node:fs";

const NOVAS = {
  "Acesso do operador — identifique-se para entrar no mapa": {
    en: "Operator access — sign in to enter the map",
    es: "Acceso del operador — identifíquese para entrar en el mapa",
    ru: "Доступ оператора — войдите, чтобы открыть карту",
    zh: "操作员访问 — 请登录以进入地图",
    ja: "オペレーターアクセス — マップに入るにはログインしてください",
  },
  "Sua conta sincroniza mochila, notas e rotas entre aparelhos.": {
    en: "Your account syncs backpack, notes and routes across devices.",
    es: "Su cuenta sincroniza mochila, notas y rutas entre aparatos.",
    ru: "Ваш аккаунт синхронизирует рюкзак, заметки и маршруты между устройствами.",
    zh: "您的账户可在多台设备间同步背包、笔记和路线。",
    ja: "アカウントでバックパック、ノート、ルートを端末間で同期します。",
  },
  "Confira seu e-mail": {
    en: "Check your e-mail",
    es: "Revise su correo electrónico",
    ru: "Проверьте свою электронную почту",
    zh: "请查收您的电子邮件",
    ja: "メールを確認してください",
  },
  "Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar a conta e voltar ao aplicativo.":
    {
      en: "We sent a confirmation link to your e-mail. Open it to activate your account and return to the app.",
      es: "Enviamos un enlace de confirmación a su correo. Ábralo para activar la cuenta y volver a la aplicación.",
      ru: "Мы отправили ссылку для подтверждения на вашу почту. Откройте её, чтобы активировать аккаунт и вернуться в приложение.",
      zh: "我们已向您的邮箱发送确认链接。请打开该链接以激活账户并返回应用。",
      ja: "確認リンクをメールに送信しました。開いてアカウントを有効化し、アプリに戻ってください。",
    },
  "Reenviar e-mail": {
    en: "Resend e-mail",
    es: "Reenviar correo",
    ru: "Отправить письмо снова",
    zh: "重新发送邮件",
    ja: "メールを再送信",
  },
  "Reenviando…": { en: "Resending…", es: "Reenviando…", ru: "Отправка…", zh: "正在重新发送…", ja: "再送信中…" },
  "Já confirmei": { en: "I've confirmed", es: "Ya confirmé", ru: "Я подтвердил", zh: "我已确认", ja: "確認しました" },
  "Ainda não confirmado": {
    en: "Not confirmed yet",
    es: "Aún no confirmado",
    ru: "Ещё не подтверждено",
    zh: "尚未确认",
    ja: "まだ確認されていません",
  },
  "Abra o link que enviamos ao seu e-mail e tente novamente.": {
    en: "Open the link we sent to your e-mail and try again.",
    es: "Abra el enlace que enviamos a su correo e inténtelo de nuevo.",
    ru: "Откройте ссылку, которую мы отправили на вашу почту, и попробуйте снова.",
    zh: "请打开我们发送到您邮箱的链接，然后重试。",
    ja: "送信したリンクをメールで開き、もう一度お試しください。",
  },
  "Verificando sessão…": {
    en: "Checking session…",
    es: "Verificando sesión…",
    ru: "Проверка сессии…",
    zh: "正在检查会话…",
    ja: "セッションを確認中…",
  },
  "Entre na sua conta para escolher um personagem e personalizar o perfil.": {
    en: "Sign in to your account to choose a character and personalize your profile.",
    es: "Entre en su cuenta para elegir un personaje y personalizar el perfil.",
    ru: "Войдите в свой аккаунт, чтобы выбрать персонажа и настроить профиль.",
    zh: "登录您的账户以选择角色并自定义个人资料。",
    ja: "アカウントにログインしてキャラクターを選び、プロフィールをカスタマイズしましょう。",
  },
  "Escolha seu personagem": {
    en: "Choose your character",
    es: "Elija su personaje",
    ru: "Выберите своего персонажа",
    zh: "选择您的角色",
    ja: "キャラクターを選択",
  },
  "Esse avatar representa você no Manual. Escolha um personagem do elenco ou use a sua própria foto.":
    {
      en: "This avatar represents you in the Manual. Pick a character from the cast or use your own photo.",
      es: "Este avatar lo representa en el Manual. Elija un personaje del elenco o use su propia foto.",
      ru: "Этот аватар представляет вас в Мануале. Выберите персонажа из состава или используйте своё фото.",
      zh: "此头像代表您在本手册中的形象。请从角色库中选择一个角色，或使用您自己的照片。",
      ja: "このアバターがマニュアルでのあなたを表します。キャストから選ぶか、自分の写真を使ってください。",
    },
  "Avatar atual": { en: "Current avatar", es: "Avatar actual", ru: "Текущий аватар", zh: "当前头像", ja: "現在のアバター" },
  "Usar minha foto": { en: "Use my photo", es: "Usar mi foto", ru: "Использовать своё фото", zh: "使用我的照片", ja: "自分の写真を使う" },
  "Personagens disponíveis": {
    en: "Available characters",
    es: "Personajes disponibles",
    ru: "Доступные персонажи",
    zh: "可用角色",
    ja: "利用可能なキャラクター",
  },
  "Avatar atualizado": {
    en: "Avatar updated",
    es: "Avatar actualizado",
    ru: "Аватар обновлён",
    zh: "头像已更新",
    ja: "アバターを更新しました",
  },
  "Falha ao salvar o avatar": {
    en: "Failed to save avatar",
    es: "Fallo al guardar el avatar",
    ru: "Не удалось сохранить аватар",
    zh: "保存头像失败",
    ja: "アバターの保存に失敗しました",
  },
  "Falha ao enviar a foto": {
    en: "Failed to upload photo",
    es: "Fallo al enviar la foto",
    ru: "Не удалось загрузить фото",
    zh: "上传照片失败",
    ja: "写真のアップロードに失敗しました",
  },
  "O elenco de personagens está sendo montado — por enquanto, use a sua própria foto.": {
    en: "The cast of characters is being assembled — for now, use your own photo.",
    es: "El elenco de personajes se está montando — por ahora, use su propia foto.",
    ru: "Состав персонажей формируется — пока используйте своё фото.",
    zh: "角色库正在建设中——目前请使用您自己的照片。",
    ja: "キャラクターのラインナップは準備中です。当面はご自身の写真をご利用ください。",
  },
  "Agora não": { en: "Not now", es: "Ahora no", ru: "Не сейчас", zh: "暂不", ja: "今はしない" },
  "Modo mapa limpo": {
    en: "Clean map mode",
    es: "Modo mapa limpio",
    ru: "Режим чистой карты",
    zh: "纯净地图模式",
    ja: "クリーンマップモード",
  },
  "Elementos da tela restaurados": {
    en: "Screen elements restored",
    es: "Elementos de pantalla restaurados",
    ru: "Элементы экрана восстановлены",
    zh: "屏幕元素已恢复",
    ja: "画面要素を復元しました",
  },
  "Só o mapa à vista — toque no botão de olho para trazer tudo de volta.": {
    en: "Only the map in view — tap the eye button to bring everything back.",
    es: "Solo el mapa a la vista — toque el botón del ojo para traer todo de vuelta.",
    ru: "На экране только карта — нажмите кнопку с глазом, чтобы вернуть всё обратно.",
    zh: "仅显示地图——点击眼睛按钮即可恢复全部内容。",
    ja: "マップだけが表示されています。目のボタンをタップするとすべて戻ります。",
  },
  "Todos os elementos voltaram ao mapa.": {
    en: "All elements are back on the map.",
    es: "Todos los elementos volvieron al mapa.",
    ru: "Все элементы вернулись на карту.",
    zh: "所有元素已返回地图。",
    ja: "すべての要素がマップに戻りました。",
  },
  "Toque nos pontos do mapa para ver as informações": {
    en: "Tap the map points to see the information",
    es: "Toque los puntos del mapa para ver la información",
    ru: "Коснитесь точек на карте, чтобы увидеть информацию",
    zh: "点击地图上的点以查看信息",
    ja: "マップの地点をタップして情報を表示",
  },
  "Terremotos, alertas, focos de calor, ciclones, voos e mais — escolha camadas em Camadas.": {
    en: "Earthquakes, alerts, heat spots, cyclones, flights and more — pick layers in Layers.",
    es: "Terremotos, alertas, focos de calor, ciclones, vuelos y más — elija capas en Capas.",
    ru: "Землетрясения, оповещения, очаги тепла, циклоны, рейсы и другое — выбирайте слои в «Слои».",
    zh: "地震、警报、热点、气旋、航班等——请在“图层”中选择图层。",
    ja: "地震、警報、熱源、サイクロン、飛行機など — 「レイヤー」で選択できます。",
  },
  "Restaurar elementos da tela": {
    en: "Restore screen elements",
    es: "Restaurar elementos de la pantalla",
    ru: "Восстановить элементы экрана",
    zh: "恢复屏幕元素",
    ja: "画面要素を復元",
  },
  "Limpar a tela (só o mapa)": {
    en: "Clear the screen (map only)",
    es: "Limpiar la pantalla (solo el mapa)",
    ru: "Очистить экран (только карта)",
    zh: "清空屏幕（仅地图）",
    ja: "画面をクリア（マップのみ）",
  },
  "Recolher painel": { en: "Collapse panel", es: "Contraer panel", ru: "Свернуть панель", zh: "收起面板", ja: "パネルを折りたたむ" },
  COORDENADA: { en: "COORDINATE", es: "COORDENADA", ru: "КООРДИНАТА", zh: "坐标", ja: "座標" },
  Personagens: { en: "Characters", es: "Personajes", ru: "Персонажи", zh: "角色", ja: "キャラクター" },
  "Contas bloqueadas": {
    en: "Blocked accounts",
    es: "Cuentas bloqueadas",
    ru: "Заблокированные аккаунты",
    zh: "已封禁账户",
    ja: "ブロックされたアカウント",
  },
  Bloqueado: { en: "Blocked", es: "Bloqueado", ru: "Заблокирован", zh: "已封禁", ja: "ブロック済み" },
  "Bloquear conta no painel": {
    en: "Block account in the panel",
    es: "Bloquear cuenta en el panel",
    ru: "Заблокировать аккаунт в панели",
    zh: "在面板中封禁账户",
    ja: "パネルでアカウントをブロック",
  },
  "Perfil bloqueado": {
    en: "Profile blocked",
    es: "Perfil bloqueado",
    ru: "Профиль заблокирован",
    zh: "已封禁资料",
    ja: "プロフィールをブロックしました",
  },
  "Perfil desbloqueado": {
    en: "Profile unblocked",
    es: "Perfil desbloqueado",
    ru: "Профиль разблокирован",
    zh: "已解除封禁",
    ja: "プロフィールのブロックを解除しました",
  },
  "Personagens ativos aparecem na escolha de avatar ao criar conta e em Conta › Perfil na nuvem. Você pode enviar uma imagem ou colar uma URL.":
    {
      en: "Active characters appear in the avatar picker at sign-up and in Account › Cloud profile. You can upload an image or paste a URL.",
      es: "Los personajes activos aparecen en la elección de avatar al crear cuenta y en Cuenta › Perfil en la nube. Puede enviar una imagen o pegar una URL.",
      ru: "Активные персонажи появляются при выборе аватара при регистрации и в «Аккаунт › Облачный профиль». Можно загрузить изображение или вставить URL.",
      zh: "启用的角色会出现在注册时的头像选择中和“账户 › 云端资料”里。您可以上传图片或粘贴 URL。",
      ja: "有効なキャラクターは、アカウント作成時のアバター選択と「アカウント › クラウドプロフィール」に表示されます。画像をアップロードするかURLを貼り付けてください。",
    },
  "Novo personagem": {
    en: "New character",
    es: "Nuevo personaje",
    ru: "Новый персонаж",
    zh: "新角色",
    ja: "新しいキャラクター",
  },
  "Carregando personagens…": {
    en: "Loading characters…",
    es: "Cargando personajes…",
    ru: "Загрузка персонажей…",
    zh: "正在加载角色…",
    ja: "キャラクターを読み込み中…",
  },
  "Nenhum personagem cadastrado ainda — o elenco começa aqui.": {
    en: "No characters registered yet — the cast starts here.",
    es: "Ningún personaje registrado aún — el elenco empieza aquí.",
    ru: "Персонажей пока нет — состав начинается здесь.",
    zh: "尚未登记任何角色——角色库从这里开始。",
    ja: "キャラクターはまだ登録されていません。ここから始めましょう。",
  },
  "sem descrição": { en: "no description", es: "sin descripción", ru: "без описания", zh: "无描述", ja: "説明なし" },
  "Excluir o personagem {nome}?": {
    en: "Delete the character {nome}?",
    es: "¿Eliminar el personaje {nome}?",
    ru: "Удалить персонажа {nome}?",
    zh: "删除角色 {nome}？",
    ja: "キャラクター {nome} を削除しますか？",
  },
  "Personagem excluído": {
    en: "Character deleted",
    es: "Personaje eliminado",
    ru: "Персонаж удалён",
    zh: "角色已删除",
    ja: "キャラクターを削除しました",
  },
  "Editar personagem": {
    en: "Edit character",
    es: "Editar personaje",
    ru: "Редактировать персонажа",
    zh: "编辑角色",
    ja: "キャラクターを編集",
  },
  Nome: { en: "Name", es: "Nombre", ru: "Имя", zh: "名称", ja: "名前" },
  "Descrição (opcional)": {
    en: "Description (optional)",
    es: "Descripción (opcional)",
    ru: "Описание (необязательно)",
    zh: "描述（可选）",
    ja: "説明（任意）",
  },
  "Ex.: Guia da floresta": {
    en: "E.g.: Forest guide",
    es: "Ej.: Guía del bosque",
    ru: "Напр.: Лесной проводник",
    zh: "例：森林向导",
    ja: "例：森のガイド",
  },
  "Imagem (URL ou upload)": {
    en: "Image (URL or upload)",
    es: "Imagen (URL o envío)",
    ru: "Изображение (URL или загрузка)",
    zh: "图片（URL 或上传）",
    ja: "画像（URLまたはアップロード）",
  },
  Enviar: { en: "Upload", es: "Enviar", ru: "Загрузить", zh: "上传", ja: "アップロード" },
  "Imagem enviada": {
    en: "Image uploaded",
    es: "Imagen enviada",
    ru: "Изображение загружено",
    zh: "图片已上传",
    ja: "画像をアップロードしました",
  },
  "Falha ao enviar a imagem": {
    en: "Failed to upload image",
    es: "Fallo al enviar la imagen",
    ru: "Не удалось загрузить изображение",
    zh: "上传图片失败",
    ja: "画像のアップロードに失敗しました",
  },
  "Ativo (aparece no cadastro)": {
    en: "Active (shown at sign-up)",
    es: "Activo (aparece en el registro)",
    ru: "Активен (виден при регистрации)",
    zh: "启用（注册时显示）",
    ja: "有効（登録時に表示）",
  },
  "Prévia do personagem": {
    en: "Character preview",
    es: "Vista previa del personaje",
    ru: "Предпросмотр персонажа",
    zh: "角色预览",
    ja: "キャラクターのプレビュー",
  },
  "sem imagem": { en: "no image", es: "sin imagen", ru: "без изображения", zh: "无图片", ja: "画像なし" },
  "Prévia do avatar": {
    en: "Avatar preview",
    es: "Vista previa del avatar",
    ru: "Предпросмотр аватара",
    zh: "头像预览",
    ja: "アバターのプレビュー",
  },
  "Salvar personagem": {
    en: "Save character",
    es: "Guardar personaje",
    ru: "Сохранить персонажа",
    zh: "保存角色",
    ja: "キャラクターを保存",
  },
  "Informe o nome do personagem": {
    en: "Enter the character's name",
    es: "Informe el nombre del personaje",
    ru: "Укажите имя персонажа",
    zh: "请输入角色名称",
    ja: "キャラクター名を入力してください",
  },
  "Perfil na nuvem": {
    en: "Cloud profile",
    es: "Perfil en la nube",
    ru: "Облачный профиль",
    zh: "云端资料",
    ja: "クラウドプロフィール",
  },
  "Personagem e foto que representam você entre os aparelhos.": {
    en: "Character and photo that represent you across devices.",
    es: "Personaje y foto que lo representan entre los aparatos.",
    ru: "Персонаж и фото, представляющие вас на всех устройствах.",
    zh: "代表您在多台设备间形象的角色和照片。",
    ja: "端末間であなたを表すキャラクターと写真です。",
  },
  Personalizar: { en: "Personalize", es: "Personalizar", ru: "Настроить", zh: "自定义", ja: "カスタマイズ" },
  Fechar: { en: "Close", es: "Cerrar", ru: "Закрыть", zh: "关闭", ja: "閉じる" },
  Ativo: { en: "Active", es: "Activo", ru: "Активен", zh: "启用", ja: "有効" },
  Inativo: { en: "Inactive", es: "Inactivo", ru: "Неактивен", zh: "停用", ja: "無効" },
  "Conta criada": {
    en: "Account created",
    es: "Cuenta creada",
    ru: "Аккаунт создан",
    zh: "账户已创建",
    ja: "アカウントを作成しました",
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
    const bare = new RegExp(`^\\s{2}${JSON.stringify(pt).slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`, "m");
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
