/**
 * Imagem de cada item da mochila.
 *
 * Todo item tem uma imagem referente ao que ele é:
 * - Itens dos modelos prontos: desenho técnico em SVG escolhido por
 *   palavras-chave do nome (e pela categoria como reserva) — não ocupa
 *   espaço no banco e funciona offline.
 * - Itens do usuário: foto própria (galeria ou câmera), comprimida para
 *   um data URL e guardada no banco local junto do item.
 */

/** Paleta tática (igual ao app): laranja, claro, azul, verde e âmbar. */
const L = "#FF6B35"; // laranja — traço principal
const C = "#e8e4dd"; // claro — traço secundário
const A = "#8ecae6"; // azul — água/eletrônico
const V = "#6BBF59"; // verde — vegetação/ok
const M = "#FFD166"; // âmbar — metal/luz

/** Envolve o desenho num SVG 64×64 e devolve um data URI. */
function svg(conteudo: string): string {
  const corpo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round">${conteudo}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(corpo)}`;
}

/* ------------------------------------------------------------------ */
/* Desenhos (64×64, traço 3px)                                         */
/* ------------------------------------------------------------------ */

const DESENHOS: Record<string, string> = {
  // Água: garrafa com nível
  agua: svg(
    `<rect x="24" y="16" width="16" height="38" rx="4" stroke="${A}" stroke-width="3"/><path d="M27 16v-6h10v6" stroke="${A}" stroke-width="3"/><path d="M26 36h12v14H26z" fill="${A}" opacity="0.35" stroke="none"/><path d="M26 36h12" stroke="${A}" stroke-width="2"/>`,
  ),
  // Filtro de água: funil + gota
  filtro: svg(
    `<path d="M18 16h28L36 30v14l-8 6V30z" stroke="${A}" stroke-width="3"/><path d="M44 42c0 3-2 5-4 5s-4-2-4-5 4-8 4-8 4 5 4 8z" fill="${A}" opacity="0.5" stroke="${A}" stroke-width="2"/>`,
  ),
  // Purificação: frasco de comprimidos + gota
  purificacao: svg(
    `<rect x="16" y="22" width="18" height="28" rx="3" stroke="${C}" stroke-width="3"/><path d="M20 22v-6h10v6M25 30v10M20 35h10" stroke="${C}" stroke-width="3"/><path d="M48 34c0 5-3 9-7 9s-7-4-7-9 7-14 7-14 7 9 7 14z" stroke="${A}" stroke-width="2.5" fill="${A}" opacity="0.4"/>`,
  ),
  // Barra de cereal: embalagem aberta com zigzag
  barra: svg(
    `<rect x="16" y="24" width="32" height="16" rx="3" stroke="${M}" stroke-width="3"/><path d="M16 30l6-4 6 4 6-4 6 4 6-4" stroke="${L}" stroke-width="2.5"/><path d="M22 24v-6h20v6" stroke="${M}" stroke-width="2.5"/><path d="M24 44v4M32 44v4M40 44v4" stroke="${C}" stroke-width="2"/>`,
  ),
  // Sanduíche/lanche
  lanche: svg(
    `<path d="M12 34L32 18l20 16z" stroke="${M}" stroke-width="3"/><path d="M14 40h36" stroke="${L}" stroke-width="3"/><path d="M16 46h32" stroke="${C}" stroke-width="3"/><path d="M28 26h8" stroke="${V}" stroke-width="2.5"/>`,
  ),
  // Refeição liofilizada/desidratada: sachê com vapor
  refeicao: svg(
    `<path d="M20 20h24l-3 30H23z" stroke="${M}" stroke-width="3"/><path d="M23 20l-3-6h24l-3 6" stroke="${M}" stroke-width="2.5"/><path d="M27 36c1-3-1-4 0-7M33 38c1-3-1-4 0-7" stroke="${C}" stroke-width="2"/>`,
  ),
  // Enlatados: lata
  lata: svg(
    `<ellipse cx="32" cy="18" rx="12" ry="5" stroke="${C}" stroke-width="3"/><path d="M20 18v26c0 3 5.4 6 12 6s12-3 12-6V18" stroke="${C}" stroke-width="3"/><path d="M20 30c4 2 20 2 24 0" stroke="${L}" stroke-width="2.5"/>`,
  ),
  // Temperos/óleo/sal: frasco dosador
  tempero: svg(
    `<rect x="24" y="22" width="16" height="28" rx="4" stroke="${C}" stroke-width="3"/><path d="M27 22v-7h10v7" stroke="${L}" stroke-width="3"/><circle cx="29" cy="15" r="1.4" fill="${C}" stroke="none"/><circle cx="33" cy="13" r="1.4" fill="${C}" stroke="none"/><circle cx="36" cy="16" r="1.4" fill="${C}" stroke="none"/>`,
  ),
  // Kit médico: maleta com cruz
  kit: svg(
    `<rect x="12" y="24" width="40" height="26" rx="4" stroke="${L}" stroke-width="3"/><path d="M26 24v-5a4 4 0 014-4h4a4 4 0 014 4v5" stroke="${L}" stroke-width="3"/><path d="M32 31v12M26 37h12" stroke="${V}" stroke-width="4"/>`,
  ),
  // Lanterna frontal: haste + led + feixe
  lanterna: svg(
    `<circle cx="32" cy="34" r="10" stroke="${L}" stroke-width="3"/><circle cx="32" cy="34" r="4" fill="${M}" stroke="none"/><path d="M14 34h8M42 34h8M16 22l6 5M48 22l-6 5M16 46l6-5M48 46l-6-5" stroke="${M}" stroke-width="2.5"/><path d="M24 12c4-3 12-3 16 0" stroke="${C}" stroke-width="2.5"/>`,
  ),
  // Power bank: bateria com raio
  powerbank: svg(
    `<rect x="20" y="14" width="24" height="38" rx="5" stroke="${A}" stroke-width="3"/><path d="M34 22l-7 12h6l-3 10 9-14h-6z" fill="${M}" stroke="none"/>`,
  ),
  // Painel solar
  painel: svg(
    `<path d="M14 40l8-18h28l-8 18z" stroke="${A}" stroke-width="3"/><path d="M22 40l8-18M30 40l8-18M18.5 31h27" stroke="${A}" stroke-width="2"/><path d="M24 46h18M28 46v6M38 46v6" stroke="${C}" stroke-width="2.5"/><circle cx="50" cy="14" r="4" stroke="${M}" stroke-width="2.5"/>`,
  ),
  // Canivete
  canivete: svg(
    `<rect x="12" y="34" width="26" height="10" rx="3" stroke="${L}" stroke-width="3"/><path d="M36 39l18-9-3 12-15 1z" stroke="${C}" stroke-width="3"/><circle cx="18" cy="39" r="1.6" fill="${L}" stroke="none"/><circle cx="24" cy="39" r="1.6" fill="${L}" stroke="none"/>`,
  ),
  // Machado
  machado: svg(
    `<path d="M22 52L40 14" stroke="${C}" stroke-width="3.5"/><path d="M36 16c8-4 16-2 20 4-8 2-12 8-13 14-5-4-8-11-7-18z" fill="${L}" opacity="0.25" stroke="${L}" stroke-width="3"/>`,
  ),
  // Serra
  serra: svg(
    `<path d="M12 40L44 20l6 10-32 20z" stroke="${C}" stroke-width="3"/><path d="M14 42l4 2 3-3 4 2 3-3 4 2 3-3 4 2 3-3" stroke="${L}" stroke-width="2.5"/>`,
  ),
  // Paracord: rolo de corda
  corda: svg(
    `<circle cx="32" cy="32" r="16" stroke="${V}" stroke-width="3"/><circle cx="32" cy="32" r="9" stroke="${V}" stroke-width="2.5"/><path d="M32 16v-6M38 47l6 6" stroke="${V}" stroke-width="3"/>`,
  ),
  // Fita/reparo: rolo de fita
  fita: svg(
    `<circle cx="28" cy="30" r="14" stroke="${M}" stroke-width="3"/><circle cx="28" cy="30" r="5" stroke="${C}" stroke-width="2.5"/><path d="M42 30v20h8v-6h-6" stroke="${M}" stroke-width="3"/>`,
  ),
  // Pesca: anzol + linha
  pesca: svg(
    `<path d="M32 10v22" stroke="${C}" stroke-width="2.5"/><path d="M32 32c0 8 6 12 12 8" stroke="${L}" stroke-width="3"/><path d="M44 40l4-6-8-2z" fill="${L}" stroke="none"/><circle cx="32" cy="12" r="3" stroke="${V}" stroke-width="2.5"/>`,
  ),
  // Barraca
  barraca: svg(
    `<path d="M10 48L32 18l22 30z" stroke="${V}" stroke-width="3"/><path d="M32 48V30l10 18" stroke="${V}" stroke-width="2.5"/><path d="M6 48h52" stroke="${C}" stroke-width="2.5"/>`,
  ),
  // Capa de chuva/poncho
  poncho: svg(
    `<path d="M32 14a4 4 0 110 8 4 4 0 010-8z" fill="${C}" stroke="none"/><path d="M32 22c-10 0-16 8-18 20h36c-2-12-8-20-18-20z" stroke="${M}" stroke-width="3"/><path d="M18 50l-4 6M32 50v8M46 50l4 6" stroke="${A}" stroke-width="2.5"/>`,
  ),
  // Jaqueta/corta-vento/fleece
  jaqueta: svg(
    `<path d="M24 14l8 4 8-4 10 8-6 8v20H20V30l-6-8z" stroke="${M}" stroke-width="3"/><path d="M32 18v32" stroke="${L}" stroke-width="2.5"/><path d="M24 14l-4-4M40 14l4-4" stroke="${C}" stroke-width="2.5"/>`,
  ),
  // Roupa/meias (camadas): pilha de roupas dobradas
  roupa: svg(
    `<rect x="16" y="18" width="32" height="9" rx="3" stroke="${C}" stroke-width="3"/><rect x="14" y="30" width="36" height="9" rx="3" stroke="${M}" stroke-width="3"/><rect x="18" y="42" width="28" height="9" rx="3" stroke="${L}" stroke-width="3"/>`,
  ),
  // Manta aluminizada
  manta: svg(
    `<rect x="16" y="16" width="32" height="32" rx="4" stroke="${C}" stroke-width="3"/><path d="M22 34l10-12M30 40l12-14" stroke="${A}" stroke-width="2.5"/><path d="M48 12l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="${M}" stroke="none"/>`,
  ),
  // Isolante térmico: colchonete enrolado
  isolante: svg(
    `<rect x="12" y="26" width="30" height="14" rx="7" stroke="${M}" stroke-width="3"/><circle cx="42" cy="33" r="7" stroke="${M}" stroke-width="3"/><circle cx="42" cy="33" r="3" stroke="${C}" stroke-width="2"/><path d="M12 26l-4-4M12 40l-4 4" stroke="${C}" stroke-width="2.5"/>`,
  ),
  // Saco de dormir
  sacodormir: svg(
    `<rect x="16" y="16" width="32" height="36" rx="12" stroke="${V}" stroke-width="3"/><path d="M16 28h32" stroke="${V}" stroke-width="2.5"/><rect x="26" y="19" width="12" height="7" rx="3" stroke="${C}" stroke-width="2.5"/>`,
  ),
  // Mapa + bússola
  mapa: svg(
    `<path d="M12 20l13-6 14 6 13-6v32l-13 6-14-6-13 6z" stroke="${C}" stroke-width="3"/><path d="M25 14v32M39 20v32" stroke="${C}" stroke-width="2"/><circle cx="32" cy="30" r="7" stroke="${L}" stroke-width="2.5"/><path d="M32 25l2.5 5-5 0z" fill="${L}" stroke="none"/>`,
  ),
  // GPS/satélite
  gps: svg(
    `<rect x="26" y="24" width="16" height="10" rx="2" stroke="${A}" stroke-width="3"/><path d="M34 24v-8M20 12l8 6M48 12l-8 6M34 40v8M28 54h12" stroke="${C}" stroke-width="2.5"/><circle cx="34" cy="29" r="2" fill="${L}" stroke="none"/>`,
  ),
  // Documentos + dinheiro
  documentos: svg(
    `<rect x="18" y="12" width="24" height="34" rx="3" stroke="${C}" stroke-width="3"/><path d="M24 20h12M24 26h12M24 32h8" stroke="${C}" stroke-width="2"/><circle cx="44" cy="44" r="10" stroke="${M}" stroke-width="3"/><path d="M44 38v12M40.5 41h5a2.5 2.5 0 010 5h-3a2.5 2.5 0 000 5h5" stroke="${M}" stroke-width="2"/>`,
  ),
  // Apito
  apito: svg(
    `<path d="M20 30h20a8 8 0 010 16H26l-6-4z" stroke="${M}" stroke-width="3"/><circle cx="26" cy="38" r="3" stroke="${L}" stroke-width="2.5"/><path d="M46 24c3 2 3 6 0 8M52 20c5 4 5 12 0 16" stroke="${C}" stroke-width="2.5"/>`,
  ),
  // Rádio
  radio: svg(
    `<rect x="10" y="26" width="40" height="24" rx="4" stroke="${L}" stroke-width="3"/><path d="M46 26L54 10" stroke="${L}" stroke-width="2.5"/><circle cx="20" cy="38" r="6" stroke="${C}" stroke-width="2.5"/><path d="M32 32h12M32 38h12M32 44h8" stroke="${V}" stroke-width="2"/>`,
  ),
  // Espelho de sinalização
  espelho: svg(
    `<circle cx="32" cy="28" r="12" stroke="${A}" stroke-width="3"/><path d="M24 24l6-2" stroke="#ffffff" stroke-width="2.5"/><path d="M32 44v8M26 52h12" stroke="${C}" stroke-width="3"/><path d="M50 14l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="${M}" stroke="none"/>`,
  ),
  // Celular
  celular: svg(
    `<rect x="22" y="12" width="20" height="38" rx="4" stroke="${A}" stroke-width="3"/><path d="M28 46h8" stroke="${A}" stroke-width="2.5"/><path d="M48 24c2 2 2 6 0 8M53 20c4 4 4 10 0 14" stroke="${V}" stroke-width="2.5"/>`,
  ),
  // Higiene: escova + pasta
  higiene: svg(
    `<path d="M16 48L38 26" stroke="${C}" stroke-width="3"/><path d="M36 20l8 8-6 6-8-8z" stroke="${L}" stroke-width="2.5"/><rect x="42" y="34" width="12" height="20" rx="3" stroke="${V}" stroke-width="3" transform="rotate(-8 48 44)"/>`,
  ),
  // Papel higiênico
  papel: svg(
    `<ellipse cx="26" cy="30" rx="12" ry="14" stroke="${C}" stroke-width="3"/><ellipse cx="26" cy="30" rx="4" ry="5" stroke="${C}" stroke-width="2.5"/><path d="M38 30v18c0 3 5 3 5 0" stroke="${C}" stroke-width="2.5"/><path d="M38 32c4 3 10 3 14 0" stroke="${M}" stroke-width="2" opacity="0.8"/>`,
  ),
  // Protetor solar/repelente: spray + sol
  protetor: svg(
    `<rect x="20" y="26" width="16" height="24" rx="4" stroke="${V}" stroke-width="3"/><path d="M24 26v-6h8v6M28 20v-4" stroke="${V}" stroke-width="2.5"/><circle cx="46" cy="22" r="6" stroke="${M}" stroke-width="2.5"/><path d="M46 10v4M46 30v4M34 22h4M54 22h4M38 14l3 3M54 30l-3-3M38 30l3-3M54 14l-3 3" stroke="${M}" stroke-width="2"/>`,
  ),
  // Lixo/sacos
  lixo: svg(
    `<path d="M20 26h24l-3 26H23z" stroke="${C}" stroke-width="3"/><path d="M26 26v-6h12v6M18 26h28" stroke="${L}" stroke-width="3"/><path d="M28 32v14M36 32v14" stroke="${C}" stroke-width="2"/>`,
  ),
  // Panela/cozinha
  panela: svg(
    `<path d="M14 28h36v10a12 12 0 01-12 12H26a12 12 0 01-12-12z" stroke="${M}" stroke-width="3"/><path d="M14 30l-6-4M50 30l6-4" stroke="${C}" stroke-width="2.5"/><path d="M26 20c0-3 3-3 3-6M36 20c0-3 3-3 3-6" stroke="${C}" stroke-width="2.5"/>`,
  ),
  // Fogareiro
  fogareiro: svg(
    `<path d="M18 40h28v8H18z" stroke="${C}" stroke-width="3"/><path d="M32 34c-4-3-2-7 0-10 2 3 4 7 0 10z" fill="${L}" stroke="${L}" stroke-width="2"/><path d="M32 20v6" stroke="${L}" stroke-width="2.5"/><circle cx="32" cy="16" r="3" stroke="${M}" stroke-width="2.5"/>`,
  ),
  // Cartucho de gás
  gas: svg(
    `<rect x="22" y="24" width="20" height="26" rx="5" stroke="${A}" stroke-width="3"/><path d="M28 24v-6h8v6M32 18v-6" stroke="${A}" stroke-width="2.5"/><path d="M27 34l4 6h-4l2 6" stroke="${L}" stroke-width="2.5"/>`,
  ),
  // Combustível: galão
  combustivel: svg(
    `<path d="M18 22h20l8 8v20H18z" stroke="${L}" stroke-width="3"/><path d="M38 22v8h8" stroke="${L}" stroke-width="2.5"/><path d="M24 16h10" stroke="${C}" stroke-width="3"/><path d="M26 34h10v10H26z" fill="${L}" opacity="0.3" stroke="none"/>`,
  ),
  // Saco estanque
  estanque: svg(
    `<path d="M20 22h24v30a4 4 0 01-4 4H24a4 4 0 01-4-4z" stroke="${A}" stroke-width="3"/><path d="M20 22l-4-6h32l-4 6" stroke="${A}" stroke-width="2.5"/><path d="M26 34h12M26 40h12" stroke="${C}" stroke-width="2"/>`,
  ),
  // Luvas
  luvas: svg(
    `<path d="M24 52V30c0-3 2-5 5-5s5 2 5 5v-8c0-3 2-5 5-5s5 2 5 5v8c0-2 2-4 4-4s4 2 4 5v20z" stroke="${C}" stroke-width="3"/><path d="M24 44h28" stroke="${L}" stroke-width="2.5"/>`,
  ),
  // Ferramenta (chave) — padrão de ferramentas
  ferramenta: svg(
    `<path d="M40 14a10 10 0 00-12 13L14 41l9 9 14-14a10 10 0 0013-12l-7 7-6-2-2-6z" stroke="${M}" stroke-width="3"/>`,
  ),
  // Talheres — padrão de alimentação
  talher: svg(
    `<path d="M22 12v40M17 12v10a5 5 0 0010 0V12" stroke="${C}" stroke-width="3"/><path d="M42 12c-4 0-6 6-6 12s2 8 6 8v20" stroke="${L}" stroke-width="3"/>`,
  ),
  // Gota — padrão de hidratação
  gota: svg(
    `<path d="M32 12c8 10 14 18 14 26a14 14 0 01-28 0c0-8 6-16 14-26z" stroke="${A}" stroke-width="3"/><path d="M24 38c0 5 3 8 8 8" stroke="${A}" stroke-width="2.5"/>`,
  ),
  // Chama — padrão de aquecimento
  chama: svg(
    `<path d="M32 10c6 8 14 14 14 26a14 14 0 01-28 0c0-8 4-12 8-18 2 4 4 6 6 6-1-5 0-10 0-14z" stroke="${L}" stroke-width="3"/><path d="M32 30c3 4 6 6 6 11a6 6 0 01-12 0c0-5 3-7 6-11z" fill="${M}" stroke="none"/>`,
  ),
  // Lâmpada — padrão de luz
  lampada: svg(
    `<circle cx="32" cy="26" r="12" stroke="${M}" stroke-width="3"/><path d="M26 38h12v6a6 6 0 01-12 0z" stroke="${M}" stroke-width="2.5"/><path d="M32 6v4M12 26h4M48 26h4M18 12l3 3M46 12l-3 3" stroke="${M}" stroke-width="2.5"/>`,
  ),
  // Antena — padrão de comunicação
  antena: svg(
    `<path d="M32 56V28" stroke="${C}" stroke-width="3"/><circle cx="32" cy="24" r="4" stroke="${L}" stroke-width="3"/><path d="M20 14c-4 5-4 15 0 20M44 14c4 5 4 15 0 20M12 6c-7 9-7 27 0 36M52 6c7 9 7 27 0 36" stroke="${A}" stroke-width="2.5"/><path d="M22 56h20" stroke="${C}" stroke-width="3"/>`,
  ),
  // Bússola — padrão de navegação
  bussola: svg(
    `<circle cx="32" cy="32" r="20" stroke="${L}" stroke-width="3"/><path d="M32 18l5 12-12 5z" fill="${L}" stroke="none"/><path d="M32 46l-5-12 12-5z" fill="${C}" stroke="none" opacity="0.6"/>`,
  ),
  // Sabonete — padrão de higiene
  sabonete: svg(
    `<rect x="14" y="26" width="36" height="18" rx="9" stroke="${V}" stroke-width="3"/><path d="M24 20c1-3-1-4 0-7M32 22c1-3-1-4 0-7M40 20c1-3-1-4 0-7" stroke="${A}" stroke-width="2.5"/>`,
  ),
  // Abrigo genérico
  abrigo: svg(
    `<path d="M12 34L32 16l20 18" stroke="${M}" stroke-width="3"/><path d="M18 32v20h28V32" stroke="${M}" stroke-width="3"/><path d="M28 52V40h8v12" stroke="${C}" stroke-width="2.5"/>`,
  ),
  // Cruz — padrão médico
  cruz: svg(
    `<circle cx="32" cy="32" r="20" stroke="${L}" stroke-width="3"/><path d="M32 22v20M22 32h20" stroke="${V}" stroke-width="5"/>`,
  ),
  // Peso/geral
  peso: svg(
    `<path d="M20 24h24l6 28H14z" stroke="${C}" stroke-width="3"/><path d="M26 24a6 6 0 1112 0" stroke="${C}" stroke-width="3"/><path d="M24 38h16" stroke="${L}" stroke-width="2.5"/>`,
  ),
};

/* ------------------------------------------------------------------ */
/* Regras por palavras-chave (ordem importa: o primeiro casar vence)   */
/* ------------------------------------------------------------------ */

const REGRAS: Array<[RegExp, string]> = [
  [/primeiros socorros|farmacia|medicac/, "kit"],
  [/isotermico|soro/, "kit"],
  [/purificac|comprimid/, "purificacao"],
  [/filtro/, "filtro"],
  [/\bagua\b|garraf|cantil|litro|hidrat/, "agua"],
  [/power ?bank|energia/, "powerbank"],
  [/protetor solar|repelente/, "protetor"],
  [/painel solar/, "painel"],
  [/lanterna|frontal|pilhas|backup e|luz/, "lanterna"],
  [/fogareiro/, "fogareiro"],
  [/cartucho de gas|gas/, "gas"],
  [/combustivel|multicombustivel/, "combustivel"],
  [/panela|caneco|talher|utensilio|cozinhar/, "panela"],
  [/pesca|anzol|armadilha/, "pesca"],
  [/machado/, "machado"],
  [/serra/, "serra"],
  [/canivete/, "canivete"],
  [/barraca|tarp/, "barraca"],
  [/paracord|corda/, "corda"],
  [/fita|reparo|agulha|abracadeira|linha/, "fita"],
  [/luvas/, "luvas"],
  [/roupa|meia|camada/, "roupa"],
  [/jaqueta|corta-vento|fleece|gorro/, "jaqueta"],
  [/capa de chuva|poncho|impermea/, "poncho"],
  [/manta/, "manta"],
  [/isolante/, "isolante"],
  [/saco de dormir|forro/, "sacodormir"],
  [/gps|rota|evacuac/, "gps"],
  [/mapa|bussola|navegac|carta|topograf/, "mapa"],
  [/documento|dinheiro|cartao|copia/, "documentos"],
  [/radio/, "radio"],
  [/apito|espelho de sinalizac/, "apito"],
  [/espelho/, "espelho"],
  [/celular/, "celular"],
  [/papel higienico|papel,/, "papel"],
  [/higiene|escova|pasta|sabao|sabo|toalha/, "higiene"],
  [/\boleo\b|\bsal\b|acucar|tempero/, "tempero"],
  [/enlatad|latinha/, "lata"],
  [/sanduiche|lanche/, "lanche"],
  [/barra|energetic/, "barra"],
  [/refeic|liofiliz|desidrat|alimentac|arroz|aveia|cafe/, "refeicao"],
  [/lixo|saco estanque|sacos|saco plasti|organizador|estanque/, "estanque"],
];

/** Reserva pela categoria, quando o nome não casa com nenhuma regra. */
const POR_CATEGORIA: Record<string, string> = {
  tools: "ferramenta",
  nutrition: "talher",
  hydration: "gota",
  medical: "cruz",
  warmth: "chama",
  shelter: "abrigo",
  luz: "lampada",
  comunicacao: "antena",
  navegacao: "bussola",
  higiene: "sabonete",
};

/** Normaliza para casar palavras-chave: sem acento, minúsculas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Imagem padrão do item: desenho SVG referente ao nome (ou à categoria).
 * Sempre devolve um data URI — nenhum item fica sem imagem.
 */
export function imagemPadraoDoItem(nome: string, categoria: string): string {
  const n = normalizar(`${nome} ${categoria}`);
  for (const [re, chave] of REGRAS) {
    if (re.test(n)) return DESENHOS[chave] ?? DESENHOS.peso!;
  }
  return DESENHOS[POR_CATEGORIA[categoria] ?? "peso"] ?? DESENHOS.peso!;
}

/**
 * Foto do usuário (galeria ou câmera) virando data URL JPEG comprimido
 * (maior lado 360 px, qualidade 0,82) para caber no banco local.
 */
export async function arquivoParaFoto(
  file: File,
  maiorLado = 360,
  qualidade = 0.82,
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const imagem = await carregarImagem(url);
    const escala = Math.min(1, maiorLado / Math.max(imagem.width, imagem.height));
    const w = Math.max(1, Math.round(imagem.width * escala));
    const h = Math.max(1, Math.round(imagem.height * escala));
    const tela = document.createElement("canvas");
    tela.width = w;
    tela.height = h;
    const ctx = tela.getContext("2d");
    if (!ctx) throw new Error("canvas indisponível");
    ctx.drawImage(imagem, 0, 0, w, h);
    return tela.toDataURL("image/jpeg", qualidade);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rejeitar(new Error("arquivo de imagem inválido"));
    img.src = url;
  });
}

/* Usado apenas pelos testes (chaves existentes). */
export const CHAVES_DESENHOS = Object.keys(DESENHOS);
