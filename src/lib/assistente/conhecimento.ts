/**
 * Conhecimento local do assistente — a "inteligência local" que responde
 * SEM chave e SEM internet: sobrevivência, uso do app, clima e navegação.
 *
 * Cada entrada tem palavras-chave e uma resposta prática. A busca pontua
 * pelo cruzamento de tokens da pergunta com as palavras-chave + título;
 * empatou, vence a entrada com mais cobertura. As entradas globais
 * (manual_ia_conhecimento, curadas pelo admin) entram na frente — ver
 * cerebro.ts —, este catálogo é o pré-entendimento de fábrica.
 */

export interface EntradaLocal {
  id: string;
  titulo: string;
  palavrasChave: string[];
  resposta: string;
}

export const BASE_LOCAL: EntradaLocal[] = [
  // ---- Sobrevivência: água ----
  {
    id: "agua-purificar",
    titulo: "Purificar água",
    palavrasChave: [
      "agua",
      "purificar",
      "potavel",
      "beber",
      "cloro",
      "fervura",
      "filtrar",
      "rio",
      "desidratacao",
    ],
    resposta:
      "Água segura em 3 passos: 1) Filtre o grosso com pano ou camiseta; 2) Ferva por 1 minuto (3 min acima de 2.000 m) OU use 2 gotas de hipoclorito 2,5% por litro esperando 30 min; 3) Guarde em recipiente limpo tampado. Chuva direta do céu é a fonte mais segura; nunca beba de poça estagnada sem tratamento. O app avisa estoque de água no Depósito.",
  },
  {
    id: "agua-encontrar",
    titulo: "Encontrar água na natureza",
    palavrasChave: [
      "encontrar",
      "achar",
      "fonte",
      "nascente",
      "orvalho",
      "cacto",
      "bananeira",
      "seco",
    ],
    resposta:
      "Sinais de água: verde denso de vegetação em linha (vale), voo de pássaros ao amanhecer/entardecer, insetos em enxame, pedra com musgo úmido. Colete orvalho com pano ao amanhecer, esprema em recipiente. Água de cipó/bananeira é potável direto; água de cacimba rasa sempre trate.",
  },
  // ---- Fogo ----
  {
    id: "fogo-acender",
    titulo: "Acender fogo",
    palavrasChave: [
      "fogo",
      "acender",
      "faisca",
      "silex",
      "ferrocerio",
      "friccao",
      "lente",
      "lupa",
      "fosforo",
    ],
    resposta:
      "Sem fósforo: 1) Ferrocerio/sílex com faca gera faísca quente — mirar no ninho de capim seco; 2) Lente ou óculos focalizando o sol em papel escuro; 3) Bateria + lã de aço (faísca por curto); 4) Arco e fricção (nogueira/seca, com fôlego para a brasa). Regra de ouro: triplique o material seco ANTES de tentar — fogo se constrói do pequeno para o grande.",
  },
  {
    id: "fogo-seguranca",
    titulo: "Segurança com fogo",
    palavrasChave: ["fogo", "seguranca", "apagar", "incendio", "vento", "abafar"],
    resposta:
      "Fogueira segura: limpe círculo de 1,5 m até a terra, cerque com pedras, vento a favor de saída de emergência, nunca sob galhada. Para apagar: água aos poucos mexendo as brasas, ou terra batida — teste com a mão a 10 cm antes de sair. Em emergência urbana, fogo é sinal e aquecimento; em mata, é risco de incêndio — avalie sempre.",
  },
  // ---- Abrigo ----
  {
    id: "abrigo-montar",
    titulo: "Montar abrigo",
    palavrasChave: ["abrigo", "montar", "toldo", "plastico", "galpao", "chuva", "frio", "dormir"],
    resposta:
      "Abrigo em A com toldo: corda esticada entre duas árvores a 1,2 m, lona/plástico sobreposto em telha, borda para baixo do vento; isole o chão com 20 cm de folhas secas (o solo rouba calor 5× mais rápido que o ar). Frio: abrigo pequeno e fechado; calor: sombra aberta com brisa. Nunca durma direto no chão molhado.",
  },
  {
    id: "abrigo-urbano",
    titulo: "Abrigo em cidade (desastre)",
    palavrasChave: ["abrigo", "cidade", "predio", "escola", "refugio", "enchente", "desabamento"],
    resposta:
      "Em enchente: NUNCA entre em porão/estacionamento; suba para andares altos sem teto de laje exposto. Terremoto: Agachar-Abrigar-Segurar sob mesa sólida; depois saia pela escada (nunca elevador). Estruturas seguras: escolas, ginásios, igrejas (construção reforçada). Marque no mapa tático os abrigos da sua região como waypoints.",
  },
  // ---- Primeiros socorros ----
  {
    id: "socorros-hemorragia",
    titulo: "Hemorragia",
    palavrasChave: [
      "sangramento",
      "hemorragia",
      "corte",
      "ferida",
      "pressao",
      "torniquete",
      "socorros",
    ],
    resposta:
      "Hemorragia: pressão firme com pano limpo por 10 minutos SEM levantar para olhar; se encharcar, coloque outro por cima. Sangramento arterial (jorro): torniquete 5 cm acima da ferida com pano + graveto de torção, anote a hora. Sempre chame ajuda (192 SAMU no Brasil). O app tem SOS com primeiros socorros completos no Menu.",
  },
  {
    id: "socorros-rcp",
    titulo: "RCP / parada cardíaca",
    palavrasChave: ["rcp", "massagem", "coracao", "parada", "desfibrilar", "respiracao", "engasgo"],
    resposta:
      "Pessoa sem resposta e sem respiração normal: deite no chão firme, entrelace as mãos no centro do peito, comprima 5–6 cm no ritmo de 'Stayin' Alive' (100–120/min), sem parar. Se houver DEA perto, alguém busca. Criança: 2 dedos ou uma mão, 4 cm. Faça o curso do Menu › Manual › Primeiros Socorros para prática guiada.",
  },
  {
    id: "socorros-queimadura",
    titulo: "Queimadura",
    palavrasChave: ["queimadura", "queimado", "agua fria", "bolha", "sol"],
    resposta:
      "Queimadura: água corrente em temperatura ambiente por 20 minutos (não gelo, não pasta de dente); cubra com pano limpo ou filme plástico; bolhas NÃO estouram. Queimadura de 3º grau (branca/carvão) ou maior que a mão = emergência 192. Sol: hidrate, sombra, compressa fria.",
  },
  {
    id: "hipotermia",
    titulo: "Hipotermia e calor extremo",
    palavrasChave: ["hipotermia", "frio", "calor", "insolacao", "desidratacao", "tremor"],
    resposta:
      "Hipotermia (tremor → sonolência): troque roupa molhada, aqueça o TRONCO primeiro (axilas, pescoço, virilha), bebida quente sem álcool, corpo a corpo em saco. Calor extremo (parar de suar, confusão): sombra, molhe a pele, ventile, bebida com sal/açúcar se consciente. Golpe de calor é emergência 192.",
  },
  // ---- Alimentação ----
  {
    id: "comida-plantas",
    titulo: "Plantas comestíveis e teste",
    palavrasChave: ["comida", "comer", "planta", "comestivel", "fruta", "caça", "pesca", "fome"],
    resposta:
      "Teste universal de comestibilidade (1 planta por vez): esfregue na pele → espere 8 h; toque no lábio → 8 h; mastigue e cuspa → 8 h; engula pequena porção → 8 h observando. Qualquer reação = descarta. Evite: seiva leitosa, cheiro de amêndoa, espinhos finos. Prefira frutas conhecidas; pesca/caps sem licença podem ser ilegais — priorize armadilhas conforme a lei local.",
  },
  {
    id: "comida-conservar",
    titulo: "Conservar alimento",
    palavrasChave: ["conservar", "salgar", "defumar", "charque", "estragar", "validade"],
    resposta:
      "Sem geladeira: salga (camada de sal grosso 24 h + secar à sombra), defumação (fumaça fria 6 h+) ou desidratação ao sol (tiras finas de carne/fruta cobertas com pano contra insetos). Regra: carne seca dura meses se ficar dura como couro e mantida seca. O Depósito do app vigia validades e avisa o que vence primeiro.",
  },
  // ---- Navegação ----
  {
    id: "nav-sol-sombras",
    titulo: "Orientar sem bússola",
    palavrasChave: [
      "norte",
      "orientar",
      "sol",
      "sombra",
      "estrelas",
      "cruzeiro",
      "bussola",
      "perdido",
    ],
    resposta:
      "Dia: sombra dupla — graveto vertical, marque a ponta, espere 15 min, marque de novo; a linha entre as marcas aponta LESTE (1ª) → OESTE (2ª); de pé com Leste à direita, você olha o NORTE. Noite: Cruzeiro do Sul — estenda o eixo maior 4,5× até o chão: é o SUL. O app tem bússola, sol/lua e declinação magnética para compensar.",
  },
  {
    id: "nav-mgrs",
    titulo: "Coordenadas MGRS/DD no app",
    palavrasChave: ["mgrs", "coordenada", "dd", "dms", "formato", "gopia", "gps"],
    resposta:
      "O painel do mapa mostra o centro em DD · DMS · MGRS com cópia a um toque; toque no mapa para ver as coordenadas de QUALQUER ponto (e o local do clique). Para navegar até uma coordenada: Ferramentas › Ir para (aceita DD, DMS e MGRS). Compartilhe sua posição pelo botão de compartilhar — o link abre direto no mapa.",
  },
  {
    id: "nav-rota",
    titulo: "Traçar e seguir rota",
    palavrasChave: ["rota", "tracar", "rota", "navegacao", "waypoint", "trilha", "guia"],
    resposta:
      "Ferramentas › Guia de Rota: adicione pontos (posição atual, waypoint salvo ou coordenada), dê um nome e inicie a navegação — o app mostra distância, rumo e correção ('esquerda/direita') até cada ponto, avisa quando sai da rota e se você anda em círculos. Peça ao assistente: 'trace uma rota até <lugar>'.",
  },
  // ---- Clima ----
  {
    id: "clima-prever",
    titulo: "Prever tempo sem internet",
    palavrasChave: [
      "tempo",
      "chuva",
      "prever",
      "nuvem",
      "vento",
      "tempestade",
      "clima",
      "barometro",
    ],
    resposta:
      "Sinais de tempo ruim: nuvens cumulonimbus (bigorna) crescendo à tarde, vento que vira e cresce, anel/duplo arco-íris, pressão caindo (o painel do mapa mostra pressão quando há GPS+rede), céu vermelho ao amanhecer, cheiro de terra molhada, fumaça descendo. Tempestade se afastando: fumaça subindo limpa e céu azul profundo ao entardecer.",
  },
  {
    id: "clima-raio",
    titulo: "Trovões e raios",
    palavrasChave: ["raio", "trovao", "relampago", "tempestade", "contador"],
    resposta:
      "Conte segundos entre o relâmpago e o trovão ÷ 3 = km de distância. Menos de 30 s = perigo imediato: saia de campo aberto e água, evite árvores isoladas, cercas e canos; em grupo, espalhem 15 m; agache em cócoras nos pés se for surpreendido. Carro fechado e prédio são seguros. O mapa tem radar de chuva e tempestades ao vivo (Camadas).",
  },
  // ---- App: uso ----
  {
    id: "app-mapa-camadas",
    titulo: "Camadas do mapa",
    palavrasChave: [
      "camada",
      "camadas",
      "mapa",
      "radar",
      "vento",
      "temperatura",
      "ciclone",
      "satelite",
      "layers",
    ],
    resposta:
      "Ferramentas › Camadas: bases (Topográfico colorido, Satélite, Ruas, Tático Escuro) e camadas de inteligência — radar de chuva animado, ciclones com rota e cone, nuvens ao vivo, vento em partículas, temperatura, voos, navios, terremotos, conflitos e mais. Cada camada tem dica de fonte. Dá para ligar/desligar tudo — e a opção 'tela limpa' deixa só o mapa.",
  },
  {
    id: "app-offline",
    titulo: "Uso offline do app",
    palavrasChave: ["offline", "sem internet", "baixar", "cache", "aviao", "internet"],
    resposta:
      "O Manual funciona SEM internet: mapas baixados em Áreas offline, manual completo em Download, mochila, checklists, notas e bússola 100% locais. Teste de prontidão no Menu › Offline mostra o que falta baixar. Backup em pasta do aparelho ou nuvem opcional (Ajustes › Backup).",
  },
  {
    id: "app-backup",
    titulo: "Backup dos dados",
    palavrasChave: ["backup", "salvar", "pasta", "perder", "trocar aparelho", "restaurar"],
    resposta:
      "Ajustes › Pasta de backup: escolha uma pasta no aparelho e o app grava backup automático a cada mudança (com rotação de versões). Para trocar de aparelho: restaure na pasta nova, ou entre com a mesma conta para sincronizar pela nuvem. Waypoints, mochila e checklists são sempre locais — nunca perca sem backup.",
  },
  {
    id: "app-assistente-ajuda",
    titulo: "O que o assistente faz",
    palavrasChave: ["ajuda", "assistente", "ia", "o que voce faz", "comandos", "funcoes"],
    resposta:
      "Eu executo o app por voz/texto: 'trace uma rota até o centro de Recife', 'ative o radar de chuva', 'quanto é a previsão de hoje?', 'quais as principais notícias?', 'mostre terremotos recentes', 'limpe a tela'. Também respondo sobrevivência (água, fogo, abrigo, socorros) e aprendo com você — quanto mais usa, melhor fico. Configure meu nome e comportamento em Ajustes › Assistente IA.",
  },
  {
    id: "app-mochila",
    titulo: "Mochila e Depósito",
    palavrasChave: ["mochila", "depósito", "inventario", "item", "estoque", "checklist"],
    resposta:
      "Menu › Mochila: cadastre itens com quantidade e validade — o app vigia e avisa o que está acabando ou vencendo (estoque inteligente por item). Menu › Depósito: pontos de suprimento (casa, sítio, veículo) com nota de local. Modelos prontos de mochila 72h e bug-out no botão Modelos.",
  },
  // ---- Emergências específicas ----
  {
    id: "emergencia-enchente",
    titulo: "Enchente",
    palavrasChave: ["enchente", "alagamento", "inundacao", "cheia", "agua alta"],
    resposta:
      "30 cm de água corrente derrubam um adulto; 60 cm levam um carro. Vá para o alto IMEDIATAMENTE (nunca porão), corte energia se puder com segurança, não atravesse água corrente a pé nem de carro, cuidado com fios. Sinal de resgate: pano colorido grande na janela. Rastreie o nível do rio pelo mapa (Camadas › Inteligência).",
  },
  {
    id: "emergencia-incendio",
    titulo: "Incêndio florestal / urbano",
    palavrasChave: ["incendio", "fogo florestal", "fumaca", "queimada", "evacuar"],
    resposta:
      "Fumaça densa: pano úmido no rosto, fique BAIXO (ar limpo embaixo), toque portas antes de abrir. Florestal: fuja PERPENDICULAR ao vento para baixo da encosta (fogo sobe ladeira rápido), procure área queimada/limpa. O mapa mostra focos de calor ao vivo (Camadas › Inteligência › Focos). Evacue quando a autoridade mandar — volte só com liberação.",
  },
  {
    id: "emergencia-gas",
    titulo: "Vazamento de gás",
    palavrasChave: ["gas", "vazamento", "cheiro", "botijao", "explosao"],
    resposta:
      "Cheiro de gás: NÃO acenda luz/fósforo/celular perto do local, abra janelas se for rápido, feche o registro, evacue e ligue 193 DE LONGE. Botijão: feche a válvula girando para a direita, nunca deite o botijão. Verifique com água + sabão (bolha = vazamento), nunca com fogo.",
  },
  {
    id: "emergencia-animal",
    titulo: "Mordida/ataque de animal",
    palavrasChave: [
      "mordida",
      "cobra",
      "cachorro",
      "escorpiao",
      "aranha",
      "picada",
      "veneno",
      "animal",
    ],
    resposta:
      "Cobra: lave, imobilize o membro ABAIXO do coração, leve ao hospital (soro é só no hospital) — NÃO corte, sugar nem torniquete; foto da cobra ajuda (sem arriscar). Escorpião/aranha: lave com água e sabão, compressa fria, 190/192 se criança/idoso. Cão: lave 15 min com água e sabão, procure posto (raiva). Não mate o animal: capturar vivo ajuda o diagnóstico.",
  },
  {
    id: "emergencia-bomba",
    titulo: "Explosão / tiroteio",
    palavrasChave: ["explosao", "bomba", "tiro", "tiroteio", "ataque", "run hide"],
    resposta:
      "Tiroteio: Corra-Esconda-Informe — saia da linha de tiro, trincheira de concreto, silêncio total, celular mudo, ligue 190 quando seguro. Explosão: afaste-se de vidraças, cubra a cabeça, segunde explosões são comuns, saia do prédio pela escada, não use elevador. Não poste sobre operações policiais em andamento.",
  },
  // ---- Comunicação ----
  {
    id: "comunicar-radio",
    titulo: "Comunicação em emergência",
    palavrasChave: ["radio", "comunicar", "comunicacao", "sinal", "sms", "mensagem", "telefonia"],
    resposta:
      "Rede cai, rádio fica: rádio AM/FM a pilha para ouvir oficiais; rádio amador/PMR para falar. SMS passa onde voz não passa; mensageiros com internet funcionam por Wi-Fi mesmo sem operadora. Marque ponto de encontro ANTES do desastre. O app tem Morse com lanterna/áudio (Ferramentas) e boletim de inteligência local.",
  },
  {
    id: "comunicar-sos",
    titulo: "Sinal SOS universal",
    palavrasChave: ["sos", "socorro", "sinal", "resgate", "apito", "lanterna", "3"],
    resposta:
      "SOS = 3 curto, 3 longo, 3 curto — em apito, lanterna, fumaça ou qualquer coisa (3 de tudo é sinal de emergência). Espelho de sinalização: reflexo do sol com os dedos em V apontando o alvo. Área grande: triângulo de pedras ou S.O.S. de material contrastante visível do ar. O app tem SOS com localização compartilhável e Morse.",
  },
  // ---- Preparação ----
  {
    id: "prep-72h",
    titulo: "Mochila 72 horas",
    palavrasChave: ["72", "mochila", "bag", "kit", "preparar", "bug out", "evacuacao"],
    resposta:
      "Mochila 72h: água (3 L/dia) + purificador, comida sem cozimento, primeiros socorros + remédios, abrigo (toldo + cobertor aluminizado), lanterna + pilhas, rádio, documentos + cópias, dinheiro trocado, multiuso, fogo à prova d'água, higiene, roupa, power bank, apito. Monte no Menu › Mochila — tem modelo pronto para editar.",
  },
  {
    id: "prep-plano",
    titulo: "Plano familiar de emergência",
    palavrasChave: ["plano", "familia", "encontro", "contato", "escola", "ponto"],
    resposta:
      "Plano mínimo: 2 pontos de encontro (perto de casa + fora do bairro), 1 contato fora da cidade como central (todo mundo liga para ele), rota de evacuação alternativa, papel do respectivo (quem busca na escola, quem pega documentos), revisão semestral das mochilas. Escreva e fotografe — na crise a memória falha. Marque os pontos como waypoints no mapa.",
  },
];

/* ------------------------------------------------------------------ */
/* Busca                                                              */
/* ------------------------------------------------------------------ */

/** Normaliza: minúsculas, sem acento. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface AcheLocal {
  entrada: EntradaLocal;
  score: number;
}

/** Limiar mínimo para aceitar um achado da base local. */
export const LIMIAR_LOCAL = 0.25;

/**
 * Busca na base local: pontua palavras-chave (peso 1) e título (peso 2)
 * contra os tokens da pergunta; devolve o melhor achado acima do limiar.
 */
export function buscarBaseLocal(pergunta: string): AcheLocal | null {
  const ts = normalizar(pergunta)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2);
  if (ts.length === 0) return null;

  let melhor: AcheLocal | null = null;
  for (const entrada of BASE_LOCAL) {
    const alvoChaves = new Set(entrada.palavrasChave.map(normalizar));
    const alvoTitulo = new Set(normalizar(entrada.titulo).split(/[^a-z0-9]+/));
    let hits = 0;
    const cobertos = new Set<string>();
    for (const t of ts) {
      if (alvoChaves.has(t)) {
        hits += 1;
        cobertos.add(t);
      } else if (alvoTitulo.has(t)) {
        hits += 2;
        cobertos.add(t);
      }
    }
    // Cobertura importa: 1 acerto numa pergunta longa vale pouco.
    const score = hits / ts.length;
    if (score >= LIMIAR_LOCAL && (!melhor || score > melhor.score)) {
      melhor = { entrada, score };
    }
  }
  return melhor;
}
