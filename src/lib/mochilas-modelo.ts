/**
 * Modelos pré-definidos de mochila de emergência.
 *
 * Cada modelo vem com itens, descrição de cada item, quantidade, peso estimado
 * e limite de peso — prontos para uso: o usuário marca o que já reuniu e edita
 * livremente (adicionar, remover, editar itens ou a própria mochila).
 *
 * A semeadura é idempotente: os ids são fixos, portanto recriar um modelo não
 * duplica itens existentes. Modelos apagados podem ser restaurados.
 */
import {
  getSetting,
  setSetting,
  listMochilas,
  saveMochila,
  listGear,
  saveGear,
  type LocalMochila,
  type LocalGearItem,
} from "@/lib/db";

export const CHAVE_SEMEADURA = "mochilas-modelos-v1";

export interface ItemModelo {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weight_g: number;
  notes: string;
}

export interface ModeloMochila {
  id: string;
  modelo: string;
  nome: string;
  descricao: string;
  limite_g: number;
  itens: ItemModelo[];
}

export const MODELOS: ModeloMochila[] = [
  {
    id: "modelo-8h",
    modelo: "8h",
    nome: "MOCHILA 8H",
    descricao:
      "Saída rápida de até 8 horas: trilha, pesca de dia ou deslocamento curto. Cabe o essencial para voltar seguro no mesmo dia — água, lanche, proteção do tempo e meios de pedir socorro.",
    limite_g: 4000,
    itens: [
      {
        id: "m8h-01",
        name: "Água (2 garrafas de 500 ml)",
        category: "hydration",
        quantity: 2,
        weight_g: 1000,
        notes: "Um litro cobre até 4 h de atividade moderada; reabasteça sempre que puder.",
      },
      {
        id: "m8h-02",
        name: "Barras de cereal / energéticos",
        category: "nutrition",
        quantity: 3,
        weight_g: 150,
        notes: "Energia de rápida reposição; uma barra a cada 2–3 h de esforço.",
      },
      {
        id: "m8h-03",
        name: "Sanduíche ou lanche compacto",
        category: "nutrition",
        quantity: 1,
        weight_g: 200,
        notes: "Refeição de verdade para o meio do dia; prefira algo que não estrague no calor.",
      },
      {
        id: "m8h-04",
        name: "Capa de chuva leve",
        category: "shelter",
        quantity: 1,
        weight_g: 250,
        notes: "Proteção imediata contra chuva e vento; também serve de isolante do chão.",
      },
      {
        id: "m8h-05",
        name: "Corta-vento ou fleece compacto",
        category: "warmth",
        quantity: 1,
        weight_g: 350,
        notes: "O corpo esfria rápido ao parar de caminhar; mantenha sempre acessível.",
      },
      {
        id: "m8h-06",
        name: "Lanterna frontal + pilhas reserva",
        category: "luz",
        quantity: 1,
        weight_g: 120,
        notes: "Deixa as mãos livres; se a saída se estender à noite, é indispensável.",
      },
      {
        id: "m8h-07",
        name: "Power bank 10.000 mAh + cabo",
        category: "luz",
        quantity: 1,
        weight_g: 220,
        notes: "Recarga do celular, que é seu GPS, lanterna e meio de comunicação.",
      },
      {
        id: "m8h-08",
        name: "Kit de primeiros socorros compacto",
        category: "medical",
        quantity: 1,
        weight_g: 300,
        notes:
          "Curativos, gaze, esparadrapo, antisséptico, analgésico e seus medicamentos pessoais.",
      },
      {
        id: "m8h-09",
        name: "Canivete multifuncional",
        category: "tools",
        quantity: 1,
        weight_g: 100,
        notes: "Corta corda, prepara comida e resolve pequenos reparos.",
      },
      {
        id: "m8h-10",
        name: "Mapa impresso da região + bússola",
        category: "navegacao",
        quantity: 1,
        weight_g: 80,
        notes: "Não depende de bateria nem de sinal; saiba usar antes de precisar.",
      },
      {
        id: "m8h-11",
        name: "Apito de emergência",
        category: "comunicacao",
        quantity: 1,
        weight_g: 20,
        notes: "Soa mais longe que a voz e gasta zero energia: 3 apitos = pedido de socorro.",
      },
      {
        id: "m8h-12",
        name: "Celular carregado + contatos de emergência",
        category: "comunicacao",
        quantity: 1,
        weight_g: 200,
        notes: "Avise alguém sobre rota e horário de retorno antes de sair.",
      },
      {
        id: "m8h-13",
        name: "Documentos e dinheiro em saco plástico",
        category: "navegacao",
        quantity: 1,
        weight_g: 50,
        notes: "Cópias de documentos, dinheiro trocado e cartão em embalagem à prova d'água.",
      },
      {
        id: "m8h-14",
        name: "Protetor solar e repelente (tamanho viagem)",
        category: "higiene",
        quantity: 1,
        weight_g: 120,
        notes: "Queimadura e picadas minam a resistência; reaplique ao longo do dia.",
      },
    ],
  },
  {
    id: "modelo-12h",
    modelo: "12h",
    nome: "MOCHILA 12H",
    descricao:
      "Dia inteiro fora de casa, do amanhecer ao anoitecer: tudo da mochila 8h mais comida extra, segunda camada de roupa, reserva de luz e itens para um imprevisto de algumas horas.",
    limite_g: 6000,
    itens: [
      {
        id: "m12h-01",
        name: "Água (1,5 a 2 L)",
        category: "hydration",
        quantity: 3,
        weight_g: 1600,
        notes: "Distribua em garrafas/cantil; beba em intervalos curtos antes da sede.",
      },
      {
        id: "m12h-02",
        name: "Barras e frutas secas",
        category: "nutrition",
        quantity: 4,
        weight_g: 250,
        notes: "Ração de marcha: energia constante sem pesar no estômago.",
      },
      {
        id: "m12h-03",
        name: "Lanche reforçado (sanduíche, latinha)",
        category: "nutrition",
        quantity: 1,
        weight_g: 350,
        notes: "Uma refeição completa no meio do dia mantém o raciocínio claro.",
      },
      {
        id: "m12h-04",
        name: "Capa de chuva com calça ou poncho",
        category: "shelter",
        quantity: 1,
        weight_g: 350,
        notes: "Chuva prolongada com roupa molhada é hipotermia garantida à noite.",
      },
      {
        id: "m12h-05",
        name: "Corta-vento ou fleece",
        category: "warmth",
        quantity: 1,
        weight_g: 350,
        notes: "Camada média para pausas e descidas.",
      },
      {
        id: "m12h-06",
        name: "Manta aluminizada (space blanket)",
        category: "shelter",
        quantity: 1,
        weight_g: 60,
        notes: "55 g que salvam vida: retém calor corporal em emergência.",
      },
      {
        id: "m12h-07",
        name: "Lanterna frontal + pilhas reserva",
        category: "luz",
        quantity: 1,
        weight_g: 120,
        notes: "Com 12 h fora, o retorno na escuridão é provável — saia preparado.",
      },
      {
        id: "m12h-08",
        name: "Power bank 20.000 mAh + cabo",
        category: "luz",
        quantity: 1,
        weight_g: 400,
        notes: "Bateria extra para celular e GPS em um dia longo.",
      },
      {
        id: "m12h-09",
        name: "Kit de primeiros socorros ampliado",
        category: "medical",
        quantity: 1,
        weight_g: 400,
        notes: "Inclui bandana triangular, pinça, tesoura e medicações pessoais para o dia.",
      },
      {
        id: "m12h-10",
        name: "Canivete multifuncional",
        category: "tools",
        quantity: 1,
        weight_g: 100,
        notes: "Corte, reparo e preparo de comida em um único item.",
      },
      {
        id: "m12h-11",
        name: "Paracord 10 m",
        category: "tools",
        quantity: 1,
        weight_g: 80,
        notes: "Amarra carga, monta abrigo improvisado, substitui cadarço ou corda de secar.",
      },
      {
        id: "m12h-12",
        name: "Mapa impresso + bússola",
        category: "navegacao",
        quantity: 1,
        weight_g: 80,
        notes: "Orientação sem depender de sinal ou bateria.",
      },
      {
        id: "m12h-13",
        name: "Apito + espelho de sinalização",
        category: "comunicacao",
        quantity: 1,
        weight_g: 40,
        notes: "Dupla clássica de resgate: som de longe e reflexo visível de avião.",
      },
      {
        id: "m12h-14",
        name: "Documentos, dinheiro e lanche reserva em saco estanque",
        category: "navegacao",
        quantity: 1,
        weight_g: 100,
        notes: "Se algo atrasar, você tem comida e recursos para atravessar o imprevisto.",
      },
      {
        id: "m12h-15",
        name: "Higiene rápida: papel higiênico, sachês e lixo",
        category: "higiene",
        quantity: 1,
        weight_g: 100,
        notes: "Papel, álcool gel e um saco para levar seu lixo de volta.",
      },
      {
        id: "m12h-16",
        name: "Protetor solar e repelente",
        category: "higiene",
        quantity: 1,
        weight_g: 120,
        notes: "Reaplique durante o dia; sol e insetos cansam mais que a trilha.",
      },
    ],
  },
  {
    id: "modelo-48h",
    modelo: "48h",
    nome: "MOCHILA 48H",
    descricao:
      "Dois dias autônomo: acampar é opcional, mas possível. Soma à mochila de 12h o sistema de dormir, cozinha portátil, comida de verdade e troca de roupa — o fim de semana completo fora.",
    limite_g: 12000,
    itens: [
      {
        id: "m48h-01",
        name: "Água (2 L) + filtro portátil",
        category: "hydration",
        quantity: 1,
        weight_g: 1200,
        notes: "O filtro transforma qualquer rio ou lagoa em reserva de água.",
      },
      {
        id: "m48h-02",
        name: "Comprimidos de purificação (reserva)",
        category: "hydration",
        quantity: 1,
        weight_g: 30,
        notes: "Plano B quando não há água corrente para o filtro.",
      },
      {
        id: "m48h-03",
        name: "Refeições liofilizadas / desidratadas",
        category: "nutrition",
        quantity: 6,
        weight_g: 1200,
        notes: "2 refeições quentes + 1 lanche por dia; só precisam de água quente.",
      },
      {
        id: "m48h-04",
        name: "Barras, café em sachê e sal",
        category: "nutrition",
        quantity: 1,
        weight_g: 300,
        notes: "Energia entre refeições e moral na xícara — sal repõ o suado.",
      },
      {
        id: "m48h-05",
        name: "Barraca leve 1–2 pessoas",
        category: "shelter",
        quantity: 1,
        weight_g: 1800,
        notes: "Proteção contra chuva, vento e insetos por duas noites.",
      },
      {
        id: "m48h-06",
        name: "Saco de dormir (confort +5 °C)",
        category: "warmth",
        quantity: 1,
        weight_g: 1200,
        notes: "Escolha pela temperatura de conforto, não pela de sobrevivência.",
      },
      {
        id: "m48h-07",
        name: "Isolante térmico de espuma",
        category: "warmth",
        quantity: 1,
        weight_g: 300,
        notes: "O chão rouba mais calor que o ar; o isolante resolve isso.",
      },
      {
        id: "m48h-08",
        name: "Fogareiro portátil + 1 cartucho de gás",
        category: "tools",
        quantity: 1,
        weight_g: 600,
        notes: "Água quente em minutos: refeição, café e desinfecção.",
      },
      {
        id: "m48h-09",
        name: "Panela leve + caneco + talher",
        category: "tools",
        quantity: 1,
        weight_g: 350,
        notes: "Um conjunto só: cozinhar, comer e beber.",
      },
      {
        id: "m48h-10",
        name: "Troca de roupa + meias extras (saco estanque)",
        category: "warmth",
        quantity: 1,
        weight_g: 800,
        notes: "Dormir seco evita resfriado; meia seca é ouro em trilha.",
      },
      {
        id: "m48h-11",
        name: "Lanterna frontal + reserva de pilhas",
        category: "luz",
        quantity: 1,
        weight_g: 150,
        notes: "Noites são longas; leve pilhas para as duas.",
      },
      {
        id: "m48h-12",
        name: "Power bank 20.000 mAh",
        category: "luz",
        quantity: 1,
        weight_g: 400,
        notes: "Duas recargas completas de celular sem tomada.",
      },
      {
        id: "m48h-13",
        name: "Kit de primeiros socorros completo",
        category: "medical",
        quantity: 1,
        weight_g: 450,
        notes: "Curativos maiores, bandana, medicações para 2 dias e receitas de uso contínuo.",
      },
      {
        id: "m48h-14",
        name: "Higiene: escova, pasta, sabão biodegradável, toalha",
        category: "higiene",
        quantity: 1,
        weight_g: 400,
        notes: "Sabão biodegradável e a 60 m dos rios: higiene sem agredir a fonte.",
      },
      {
        id: "m48h-15",
        name: "Papel higiênico + sacos de lixo",
        category: "higiene",
        quantity: 1,
        weight_g: 100,
        notes: "Tudo o que entra na trilha sai na trilha — leve seu lixo.",
      },
      {
        id: "m48h-16",
        name: "Navegação: bússola, mapa e celular com GPS",
        category: "navegacao",
        quantity: 1,
        weight_g: 250,
        notes: "Três fontes de orientação independentes; baixe mapas offline.",
      },
      {
        id: "m48h-17",
        name: "Ferramentas: canivete, paracord 15 m e fita adesiva",
        category: "tools",
        quantity: 1,
        weight_g: 250,
        notes: "A fita conserta mochila, barraca e botas; o paracord amarra o resto.",
      },
      {
        id: "m48h-18",
        name: "Documentos, dinheiro e cópias em saco estanque",
        category: "navegacao",
        quantity: 1,
        weight_g: 80,
        notes: "Identificação, contato de emergência e dinheiro trocado.",
      },
    ],
  },
  {
    id: "modelo-72h",
    modelo: "72h",
    nome: "MOCHILA 72H",
    descricao:
      "A clássica bug-out bag: 3 dias completos para situações de emergência real — enchente, tempestade, evacuação. Foco em água, comida que não estraga, abrigo rápido, informação e evacuação segura.",
    limite_g: 16000,
    itens: [
      {
        id: "m72h-01",
        name: "Água (3 L em garrafas resistentes)",
        category: "hydration",
        quantity: 3,
        weight_g: 3000,
        notes: "3 litros/dia é o mínimo para hidratação e higiene básica.",
      },
      {
        id: "m72h-02",
        name: "Filtro portátil + comprimidos de purificação",
        category: "hydration",
        quantity: 1,
        weight_g: 250,
        notes: "Dois métodos independentes: filtro mecânico e desinfecção química.",
      },
      {
        id: "m72h-03",
        name: "Alimentação 3 dias (não perecível)",
        category: "nutrition",
        quantity: 9,
        weight_g: 2000,
        notes:
          "Enlatados, liofilizados, pasta de amendoim, biscoitos — sem necessidade de geladeira.",
      },
      {
        id: "m72h-04",
        name: "Barras energéticas de reserva",
        category: "nutrition",
        quantity: 4,
        weight_g: 300,
        notes: "Ração de emergência para quando o plano principal falhar.",
      },
      {
        id: "m72h-05",
        name: "Barraca leve ou tarp com cordas",
        category: "shelter",
        quantity: 1,
        weight_g: 1600,
        notes: "Abrigo rápido; o tarp pesa menos e combina com qualquer situação.",
      },
      {
        id: "m72h-06",
        name: "Saco de dormir + isolante térmico",
        category: "warmth",
        quantity: 1,
        weight_g: 1500,
        notes: "Dormir aquecido mantém corpo e mente funcionando.",
      },
      {
        id: "m72h-07",
        name: "Manta aluminizada + capas de chuva",
        category: "shelter",
        quantity: 2,
        weight_g: 180,
        notes: "Uma para você, uma reserva — ou para outra pessoa.",
      },
      {
        id: "m72h-08",
        name: "Fogareiro + 2 cartuchos de gás",
        category: "tools",
        quantity: 1,
        weight_g: 900,
        notes: "Cozinhar e ferver água: segurança alimentar e sanitária.",
      },
      {
        id: "m72h-09",
        name: "Panela, caneco e talheres",
        category: "tools",
        quantity: 1,
        weight_g: 400,
        notes: "Conjunto mínimo para 3 dias de refeições quentes.",
      },
      {
        id: "m72h-10",
        name: "Kit de primeiros socorros completo + medicações",
        category: "medical",
        quantity: 1,
        weight_g: 600,
        notes: "3 dias de suas medicações, curativos, antisséptico, analgésicos e antidiarreico.",
      },
      {
        id: "m72h-11",
        name: "Higiene completa: pasta, sabão, papel, toalha",
        category: "higiene",
        quantity: 1,
        weight_g: 450,
        notes: "Sanidade previne doença — a maior ameaça em abrigos coletivos.",
      },
      {
        id: "m72h-12",
        name: "2 trocas de roupa + meias térmicas",
        category: "warmth",
        quantity: 2,
        weight_g: 1500,
        notes: "Camadas que podem ser ajustadas; meia seca evita fungos e feridas.",
      },
      {
        id: "m72h-13",
        name: "Jaqueta impermeável e gorro",
        category: "warmth",
        quantity: 1,
        weight_g: 450,
        notes: "Perder calor pela cabeça e ficar molhado derrubam qualquer pessoa.",
      },
      {
        id: "m72h-14",
        name: "Luz: frontal + lanterna backup + pilhas",
        category: "luz",
        quantity: 1,
        weight_g: 250,
        notes: "Duas fontes de luz independentes e pilhas sobrando.",
      },
      {
        id: "m72h-15",
        name: "Power bank 20.000 + painel solar dobrável",
        category: "luz",
        quantity: 1,
        weight_g: 1000,
        notes: "Energia autônoma: recarga pelo sol quando a rede cai.",
      },
      {
        id: "m72h-16",
        name: "Navegação: bússola, mapas, GPS e rotas de evacuação",
        category: "navegacao",
        quantity: 1,
        weight_g: 300,
        notes: "Saiba para onde ir SEM internet: marque rotas primária e alternativas.",
      },
      {
        id: "m72h-17",
        name: "Documentos em saco estanque + dinheiro vivo",
        category: "navegacao",
        quantity: 1,
        weight_g: 120,
        notes: "Cópias de RG, cadernetas, apólices e cartões + dinheiro trocado.",
      },
      {
        id: "m72h-18",
        name: "Ferramentas: canivete forte, paracord 15 m, fita, luvas",
        category: "tools",
        quantity: 1,
        weight_g: 700,
        notes: "Abertura de caminho, reparo e proteção das mãos em destroços.",
      },
      {
        id: "m72h-19",
        name: "Comunicação: apito, rádio AM/FM à pilha",
        category: "comunicacao",
        quantity: 1,
        weight_g: 350,
        notes: "O rádio informa rotas e resgates quando o celular não tem sinal.",
      },
      {
        id: "m72h-20",
        name: "Celular carregado + números de emergência anotados",
        category: "comunicacao",
        quantity: 1,
        weight_g: 200,
        notes: "Papel à prova d'água com contatos: o aparelho pode morrer, a lista não.",
      },
    ],
  },
  {
    id: "modelo-300h",
    modelo: "300h",
    nome: "MOCHILA 300H",
    descricao:
      "Operação prolongada — mais de 12 dias (300 horas) sem apoio externo. Expedição de longa duração ou sobrevivência estendida: comida de verdade, energia autônoma, ferramentas de campo e redundância em tudo.",
    limite_g: 26000,
    itens: [
      {
        id: "m300h-01",
        name: "Água (4 L) + filtro de gravidade",
        category: "hydration",
        quantity: 1,
        weight_g: 3600,
        notes:
          "O filtro de gravidade produz litros por hora sem esforço — essencial para 12+ dias.",
      },
      {
        id: "m300h-02",
        name: "Comprimidos de purificação (lote)",
        category: "hydration",
        quantity: 1,
        weight_g: 60,
        notes: "Redundância química para dias de água turva ou filtro danificado.",
      },
      {
        id: "m300h-03",
        name: "Alimentação de longo prazo (lio + arroz, aveia, enlatados)",
        category: "nutrition",
        quantity: 36,
        weight_g: 6500,
        notes:
          "~550 g/dia: liofilizados, arroz, aveia, enlatados, açúcar e sal calibrados por 12 dias.",
      },
      {
        id: "m300h-04",
        name: "Óleo, sal, açúcar e temperos (porções)",
        category: "nutrition",
        quantity: 1,
        weight_g: 400,
        notes: "Caloria densa e paladar: comida que você aceita comer por duas semanas.",
      },
      {
        id: "m300h-05",
        name: "Barras energéticas de emergência",
        category: "nutrition",
        quantity: 8,
        weight_g: 600,
        notes: "Reserva calórica para dias de alto esforço ou falha de planejamento.",
      },
      {
        id: "m300h-06",
        name: "Barraca de 4 estações ou tarp reforçado",
        category: "shelter",
        quantity: 1,
        weight_g: 2600,
        notes: "Abrigo para semanas: priorize costuras seladas e varas de qualidade.",
      },
      {
        id: "m300h-07",
        name: "Saco de dormir -10 °C + isolante + forro",
        category: "warmth",
        quantity: 1,
        weight_g: 2200,
        notes: "Sistema completo de dormir: a soma dos três vale mais que o saco sozinho.",
      },
      {
        id: "m300h-08",
        name: "Sistema de roupa em camadas + 3 meias",
        category: "warmth",
        quantity: 3,
        weight_g: 2600,
        notes: "Base térmica, média e externa impermeável; rotação de meias evita feridas.",
      },
      {
        id: "m300h-09",
        name: "Fogareiro multicombustível + combustível",
        category: "tools",
        quantity: 1,
        weight_g: 1400,
        notes:
          "Queima gasolina, querosene ou gás: combustível é fácil de reabastecer em qualquer lugar.",
      },
      {
        id: "m300h-10",
        name: "Conjunto de panelas + utensílios",
        category: "tools",
        quantity: 1,
        weight_g: 550,
        notes: "Panela grande + caneco + colher/faca: cozinha completa de campo.",
      },
      {
        id: "m300h-11",
        name: "Farmácia completa + medicações 15 dias",
        category: "medical",
        quantity: 1,
        weight_g: 800,
        notes:
          "Curativos avançados, antisséptico, analgésicos, antibiótico do kit, antialérgico e receitas.",
      },
      {
        id: "m300h-12",
        name: "Higiene de longa duração + toalha + sabão",
        category: "higiene",
        quantity: 1,
        weight_g: 650,
        notes: "Cortador de unhas, fio dental, sabão em barra: saúde da pele em semanas longas.",
      },
      {
        id: "m300h-13",
        name: "Luz: frontal + backup + pilhas sobressalentes",
        category: "luz",
        quantity: 1,
        weight_g: 350,
        notes: "Noites longas por muitas semanas: pilhas recarregáveis em rotação.",
      },
      {
        id: "m300h-14",
        name: "Energia: 2 power banks + painel solar 20 W",
        category: "luz",
        quantity: 1,
        weight_g: 1500,
        notes: "Autonomia elétrica real: painel 20 W recarrega bancos e pilhas em campo.",
      },
      {
        id: "m300h-15",
        name: "Navegação: bússola, GPS backup, cartas topográficas",
        category: "navegacao",
        quantity: 1,
        weight_g: 550,
        notes: "Cartas em papel da região + GPS reserva + caderno de anotações de rotas.",
      },
      {
        id: "m300h-16",
        name: "Ferramentas: machado, serra, canivete, paracord 30 m",
        category: "tools",
        quantity: 1,
        weight_g: 2000,
        notes:
          "Processar lenha, montar acampamento longo e reparar tudo — as ferramentas pesam, mas pagam.",
      },
      {
        id: "m300h-17",
        name: "Kit de reparo: fita, agulha, linha, fios, abraçadeiras",
        category: "tools",
        quantity: 1,
        weight_g: 300,
        notes: "Em semanas longas algo sempre quebra: mochila, bota, barraca ou mochilão.",
      },
      {
        id: "m300h-18",
        name: "Pesca e armadilhas simples (linha, anzóis, arame)",
        category: "tools",
        quantity: 1,
        weight_g: 300,
        notes: "Proteína suplementar com peso mínimo — é um seguro, não o plano principal.",
      },
      {
        id: "m300h-19",
        name: "Comunicação: rádio, apito, espelho de sinalização",
        category: "comunicacao",
        quantity: 1,
        weight_g: 700,
        notes: "Rádio VHF/AM-FM para informação; apito e espelho para resgate.",
      },
      {
        id: "m300h-20",
        name: "Documentos plastificados + dinheiro reserva",
        category: "navegacao",
        quantity: 1,
        weight_g: 150,
        notes: "Cópias plastificadas à prova de semanas de umidade + dinheiro de emergência.",
      },
      {
        id: "m300h-21",
        name: "Sacos estanques e organizadores",
        category: "tools",
        quantity: 4,
        weight_g: 400,
        notes: "Dormitório, comida, eletrônicos e roupa separados — mojado só o que puder ser.",
      },
    ],
  },
];

function itemParaGear(item: ItemModelo, mochilaId: string, agora: string): LocalGearItem {
  return {
    id: item.id,
    user_id: null,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    weight_g: item.weight_g,
    notes: item.notes,
    expires_at: null,
    packed: false,
    mochila_id: mochilaId,
    created_at: agora,
    updated_at: agora,
    dirty: true,
  };
}

function mochilaDoModelo(modelo: ModeloMochila, agora: string): LocalMochila {
  return {
    id: modelo.id,
    nome: modelo.nome,
    descricao: modelo.descricao,
    limite_g: modelo.limite_g,
    modelo: modelo.modelo,
    criada_em: agora,
    atualizada_em: agora,
  };
}

/**
 * Cria os 5 modelos na primeira visita (flag guardada nas configurações).
 * Não recria modelos que o usuário apagou — para isso existe restaurarModelos().
 */
export async function garantirModelosCriados(): Promise<void> {
  try {
    const ja = await getSetting<boolean>(CHAVE_SEMEADURA);
    if (ja) return;
    await criarTodosModelos();
    await setSetting(CHAVE_SEMEADURA, true);
  } catch {
    /* IndexedDB indisponível (SSR) — ignora */
  }
}

/** (Re)cria todos os modelos — usado pelo botão "Restaurar modelos". Idempotente. */
export async function criarTodosModelos(): Promise<number> {
  const agora = new Date().toISOString();
  const [existentes, itens] = await Promise.all([listMochilas(), listGear()]);
  const idsMochilas = new Set(existentes.map((m) => m.id));
  const idsItens = new Set(itens.map((i) => i.id));
  let criadas = 0;
  for (const modelo of MODELOS) {
    if (!idsMochilas.has(modelo.id)) {
      await saveMochila(mochilaDoModelo(modelo, agora));
      criadas++;
    }
    for (const item of modelo.itens) {
      if (!idsItens.has(item.id)) {
        await saveGear(itemParaGear(item, modelo.id, agora));
      }
    }
  }
  return criadas;
}

/** Recria apenas os modelos que não existem mais (apagados pelo usuário). */
export async function restaurarModelosApagados(): Promise<number> {
  try {
    await setSetting(CHAVE_SEMEADURA, true);
    return await criarTodosModelos();
  } catch {
    return 0;
  }
}
