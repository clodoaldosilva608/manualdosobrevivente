#!/usr/bin/env node
/**
 * Navegação de ruas (virada a virada) — injeta as traduções das chaves novas
 * nos 5 dicionários — idempotente.
 *
 * MÉTODO SEGURO: apenas INSERE as chaves ausentes antes do "}" final —
 * jamais reescreve o corpo do arquivo (chaves bare `Mapa: "Map"` coexistem
 * com chaves entre aspas; reescrever já quebrou o dicionário uma vez).
 */
import { readFileSync, writeFileSync } from "node:fs";

const NOVAS = {
  "na {rua}": {
    en: "on {rua}",
    es: "en {rua}",
    ru: "на {rua}",
    zh: "在{rua}",
    ja: "{rua}で",
  },
  "Siga pela {rua}": {
    en: "Follow {rua}",
    es: "Siga por {rua}",
    ru: "Следуйте по {rua}",
    zh: "沿{rua}行驶",
    ja: "{rua}を進んでください",
  },
  "Siga em frente": {
    en: "Go straight ahead",
    es: "Siga recto",
    ru: "Идите прямо",
    zh: "直行",
    ja: "まっすぐ進んでください",
  },
  "Chegou ao destino": {
    en: "You have arrived",
    es: "Ha llegado al destino",
    ru: "Вы прибыли в пункт назначения",
    zh: "已到达目的地",
    ja: "目的地に到着しました",
  },
  "Na rotatória, pegue a {n}ª saída": {
    en: "At the roundabout, take exit {n}",
    es: "En la rotonda, tome la {n}ª salida",
    ru: "На круговом перекрёстке выезд №{n}",
    zh: "环岛，从第 {n} 个出口驶出",
    ja: "ラウンドアバウトでは {n} 番目の出口を出てください",
  },
  "No fim da via, vire à direita": {
    en: "At the end of the road, turn right",
    es: "Al final de la vía, gire a la derecha",
    ru: "В конце дороги поверните направо",
    zh: "道路尽头右转",
    ja: "行き止まりを右折してください",
  },
  "Entre à direita": {
    en: "Merge right",
    es: "Incorpórese a la derecha",
    ru: "Перестройтесь вправо",
    zh: "向右并入",
    ja: "右に合流してください",
  },
  "Vire à direita": {
    en: "Turn right",
    es: "Gire a la derecha",
    ru: "Поверните направо",
    zh: "右转",
    ja: "右折してください",
  },
  "No fim da via, vire à esquerda": {
    en: "At the end of the road, turn left",
    es: "Al final de la vía, gire a la izquierda",
    ru: "В конце дороги поверните налево",
    zh: "道路尽头左转",
    ja: "行き止まりを左折してください",
  },
  "Entre à esquerda": {
    en: "Merge left",
    es: "Incorpórese a la izquierda",
    ru: "Перестройтесь влево",
    zh: "向左并入",
    ja: "左に合流してください",
  },
  "Vire à esquerda": {
    en: "Turn left",
    es: "Gire a la izquierda",
    ru: "Поверните налево",
    zh: "左转",
    ja: "左折してください",
  },
  "Mantenha-se à direita": {
    en: "Keep right",
    es: "Manténgase a la derecha",
    ru: "Держитесь правее",
    zh: "靠右行驶",
    ja: "右側をキープしてください",
  },
  "Mantenha-se à esquerda": {
    en: "Keep left",
    es: "Manténgase a la izquierda",
    ru: "Держитесь левее",
    zh: "靠左行驶",
    ja: "左側をキープしてください",
  },
  "Curva acentuada à direita": {
    en: "Sharp right turn",
    es: "Curva cerrada a la derecha",
    ru: "Резкий поворот направо",
    zh: "急右转",
    ja: "大きく右に曲がってください",
  },
  "Curva acentuada à esquerda": {
    en: "Sharp left turn",
    es: "Curva cerrada a la izquierda",
    ru: "Резкий поворот налево",
    zh: "急左转",
    ja: "大きく左に曲がってください",
  },
  "Faça o retorno": {
    en: "Make a U-turn",
    es: "Haga el retorno",
    ru: "Развернитесь",
    zh: "掉头",
    ja: "Uターンしてください",
  },
  "Pegue o acesso": {
    en: "Take the ramp",
    es: "Tome el acceso",
    ru: "Выезжайте на съезд",
    zh: "驶入匝道",
    ja: "ランプに入ってください",
  },
  "Pegue a saída": {
    en: "Take the exit",
    es: "Tome la salida",
    ru: "Съезжайте",
    zh: "驶出出口",
    ja: "出口に出てください",
  },
  "Continue pela {rua}": {
    en: "Continue on {rua}",
    es: "Continúe por {rua}",
    ru: "Продолжайте по {rua}",
    zh: "沿{rua}继续",
    ja: "{rua}を進み続けてください",
  },
  "Continue em frente": {
    en: "Continue straight",
    es: "Continúe recto",
    ru: "Продолжайте прямо",
    zh: "继续直行",
    ja: "そのまままっすぐ進んでください",
  },
  Continue: {
    en: "Continue",
    es: "Continúe",
    ru: "Продолжайте",
    zh: "继续",
    ja: "進んでください",
  },
  agora: {
    en: "now",
    es: "ahora",
    ru: "сейчас",
    zh: "现在",
    ja: "すぐです",
  },
  "Em {dist}": {
    en: "In {dist}",
    es: "A {dist}",
    ru: "Через {dist}",
    zh: "前方{dist}",
    ja: "あと{dist}で",
  },
  "Chegada! Rota de ruas concluída.": {
    en: "Arrived! Street route completed.",
    es: "¡Llegada! Ruta de calles completada.",
    ru: "Прибытие! Маршрут по улицам завершён.",
    zh: "到达！街道路线完成。",
    ja: "到着！街道ルート完了。",
  },
  "Você chegou ao destino": {
    en: "You have arrived at your destination",
    es: "Ha llegado a su destino",
    ru: "Вы прибыли в пункт назначения",
    zh: "您已到达目的地",
    ja: "目的地に到着しました",
  },
  "Você saiu da rota": {
    en: "You are off the route",
    es: "Ha salido de la ruta",
    ru: "Вы сошли с маршрута",
    zh: "您已偏离路线",
    ja: "ルートから外れています",
  },
  "Rota para {nome}: {resumo}": {
    en: "Route to {nome}: {resumo}",
    es: "Ruta a {nome}: {resumo}",
    ru: "Маршрут до {nome}: {resumo}",
    zh: "前往{nome}的路线：{resumo}",
    ja: "{nome}へのルート：{resumo}",
  },
  "Navegação de ruas iniciada": {
    en: "Street navigation started",
    es: "Navegación de calles iniciada",
    ru: "Навигация по улицам запущена",
    zh: "街道导航已开始",
    ja: "街道ナビを開始しました",
  },
  "Navegação de ruas encerrada": {
    en: "Street navigation ended",
    es: "Navegación de calles finalizada",
    ru: "Навигация по улицам завершена",
    zh: "街道导航已结束",
    ja: "街道ナビを終了しました",
  },
  "Voz da navegação ligada": {
    en: "Navigation voice on",
    es: "Voz de navegación activada",
    ru: "Голос навигации включён",
    zh: "导航语音已开启",
    ja: "ナビの音声をオンにしました",
  },
  "Rota recalculada": {
    en: "Route recalculated",
    es: "Ruta recalculada",
    ru: "Маршрут пересчитан",
    zh: "已重新规划路线",
    ja: "ルートを再計算しました",
  },
  "Digite o destino (endereço ou lugar)": {
    en: "Type the destination (address or place)",
    es: "Escriba el destino (dirección o lugar)",
    ru: "Введите пункт назначения (адрес или место)",
    zh: "输入目的地（地址或地点）",
    ja: "目的地を入力してください（住所または場所）",
  },
  "Lugar não reconhecido — tente outro endereço": {
    en: "Place not recognized — try another address",
    es: "Lugar no reconocido — pruebe otra dirección",
    ru: "Место не распознано — попробуйте другой адрес",
    zh: "未识别该地点——请尝试其他地址",
    ja: "場所を認識できません — 別の住所をお試しください",
  },
  "Sem internet: não deu para traçar a rota de ruas agora": {
    en: "No internet: could not draw the street route now",
    es: "Sin internet: no se pudo trazar la ruta de calles ahora",
    ru: "Нет интернета: сейчас не удалось построить маршрут по улицам",
    zh: "无网络：暂时无法规划街道路线",
    ja: "インターネットなし：今は街道ルートを作成できませんでした",
  },
  "Sem internet: rota por waypoints (linha reta) até {nome}": {
    en: "No internet: waypoint route (straight line) to {nome}",
    es: "Sin internet: ruta por waypoints (línea recta) hasta {nome}",
    ru: "Нет интернета: маршрут по точкам (прямая линия) до {nome}",
    zh: "无网络：使用航点路线（直线）前往{nome}",
    ja: "インターネットなし：{nome}までウェイポイント（直線）ルートに切り替えました",
  },
  "Navegação de ruas": {
    en: "Street navigation",
    es: "Navegación de calles",
    ru: "Навигация по улицам",
    zh: "街道导航",
    ja: "街道ナビ",
  },
  "para {nome}": {
    en: "to {nome}",
    es: "hacia {nome}",
    ru: "до {nome}",
    zh: "前往{nome}",
    ja: "{nome}へ",
  },
  "Voz da navegação": {
    en: "Navigation voice",
    es: "Voz de navegación",
    ru: "Голос навигации",
    zh: "导航语音",
    ja: "ナビの音声",
  },
  restam: {
    en: "remaining",
    es: "restan",
    ru: "осталось",
    zh: "剩余",
    ja: "残り",
  },
  "Fora da rota — recalculando o caminho": {
    en: "Off route — recalculating the way",
    es: "Fuera de la ruta — recalculando el camino",
    ru: "Вне маршрута — пересчитываем путь",
    zh: "偏离路线——正在重新规划",
    ja: "ルート外 — 経路を再計算しています",
  },
  "Aguardando o sinal de GPS…": {
    en: "Waiting for the GPS signal…",
    es: "Esperando la señal de GPS…",
    ru: "Ожидание сигнала GPS…",
    zh: "正在等待 GPS 信号…",
    ja: "GPS信号を待っています…",
  },
  "Rota de ruas": {
    en: "Street route",
    es: "Ruta de calles",
    ru: "Маршрут по улицам",
    zh: "街道路线",
    ja: "街道ルート",
  },
  "Do seu ponto atual até um endereço ou lugar: o traçado completo aparece no mapa, com setas de direção e a voz guiando cada manobra, como um GPS.": {
    en: "From your current point to an address or place: the full path appears on the map, with direction arrows and the voice guiding every maneuver, like a GPS.",
    es: "Desde su punto actual hasta una dirección o lugar: el trazado completo aparece en el mapa, con flechas de dirección y la voz guiando cada maniobra, como un GPS.",
    ru: "От вашей текущей точки до адреса или места: весь путь на карте, со стрелками направления и голосом, ведущим через каждый манёвр, как GPS.",
    zh: "从当前位置到地址或地点：完整路径显示在地图上，带方向箭头和语音引导每次转向，如同导航。",
    ja: "現在地から住所や場所まで：地図に完全な経路が表示され、方向矢印と音声がGPSのようにすべての転回を案内します。",
  },
  "Destino (endereço ou lugar)": {
    en: "Destination (address or place)",
    es: "Destino (dirección o lugar)",
    ru: "Пункт назначения (адрес или место)",
    zh: "目的地（地址或地点）",
    ja: "目的地（住所または場所）",
  },
  Perfil: {
    en: "Profile",
    es: "Perfil",
    ru: "Профиль",
    zh: "模式",
    ja: "プロファイル",
  },
  Carro: {
    en: "Car",
    es: "Auto",
    ru: "Автомобиль",
    zh: "汽车",
    ja: "車",
  },
  "A pé": {
    en: "On foot",
    es: "A pie",
    ru: "Пешком",
    zh: "步行",
    ja: "徒歩",
  },
  Bicicleta: {
    en: "Bicycle",
    es: "Bicicleta",
    ru: "Велосипед",
    zh: "自行车",
    ja: "自転車",
  },
  "Traçando…": {
    en: "Drawing…",
    es: "Trazando…",
    ru: "Построение…",
    zh: "规划中…",
    ja: "作成中…",
  },
  "Traçar rota": {
    en: "Draw route",
    es: "Trazar ruta",
    ru: "Построить маршрут",
    zh: "规划路线",
    ja: "ルートを作成",
  },
  "Ex: Praça dos Girassóis, Palmas": {
    en: "Ex: Praça dos Girassóis, Palmas",
    es: "Ej: Praça dos Girassóis, Palmas",
    ru: "Напр.: Praça dos Girassóis, Palmas",
    zh: "例：Praça dos Girassóis, Palmas",
    ja: "例：Praça dos Girassóis, Palmas",
  },
  manobras: {
    en: "maneuvers",
    es: "maniobras",
    ru: "манёвров",
    zh: "次转向",
    ja: "回の転回",
  },
  "Iniciar navegação": {
    en: "Start navigation",
    es: "Iniciar navegación",
    ru: "Начать навигацию",
    zh: "开始导航",
    ja: "ナビを開始",
  },
  Parar: {
    en: "Stop",
    es: "Detener",
    ru: "Остановить",
    zh: "停止",
    ja: "停止",
  },
  "Centralizar no mapa": {
    en: "Center on the map",
    es: "Centrar en el mapa",
    ru: "Центрировать на карте",
    zh: "在地图上居中",
    ja: "地図の中央に表示",
  },
  "Parar navegação": {
    en: "Stop navigation",
    es: "Detener navegación",
    ru: "Остановить навигацию",
    zh: "停止导航",
    ja: "ナビを停止",
  },
  "Rota do assistente": {
    en: "Assistant route",
    es: "Ruta del asistente",
    ru: "Маршрут ассистента",
    zh: "助手路线",
    ja: "アシスタントのルート",
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
