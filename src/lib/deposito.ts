/**
 * Depósito de Suprimentos — catálogo curado por contexto (Fase 2 do Hub).
 *
 * RED LINE: o Manual NÃO vende nada. Cada item sugere um equipamento e
 * deep-linka a busca equivalente na loja do Centro (que concentra os
 * afiliados Amazon BR/Mercado Livre hoje e os kits próprios na Fase 4).
 *
 * O catálogo é intencionalmente pequeno e curado: qualidade > volume, no
 * espírito "as pessoas querem a ferramenta, não uma aula" (lição do Nomad).
 * `busca` é o termo comercial que o Centro usará na vitrine/afiliado.
 */

import { urlLoja } from "@/lib/hub-links";

export type ContextoDeposito =
  "agua" | "energia" | "primeiros-socorros" | "abrigos" | "comunicacao" | "ferramentas";

export interface ItemDeposito {
  id: string;
  nome: string;
  contexto: ContextoDeposito;
  /** Por que este item — linguagem direta, sem marketing vazio. */
  motivo: string;
  /** Faixa de preço observada no mercado BR (orientativa, R$). */
  faixa: string;
  /** Termo de busca comercial transmitido ao Centro via deep link. */
  busca: string;
  /** Perfis que mais se beneficiam do item (wizard de perfil usa). */
  perfis: Array<"urbano" | "trilha" | "litoral" | "rural">;
  /** true = sem isso o kit não funciona; false = melhoria desejável. */
  essencial: boolean;
}

export const CONTEXTOS: Array<{
  id: ContextoDeposito;
  nome: string;
  descricao: string;
}> = [
  {
    id: "agua",
    nome: "Água",
    descricao: "Tratar, carregar e encontrar água — a prioridade de qualquer kit.",
  },
  {
    id: "energia",
    nome: "Energia",
    descricao: "Luz e carregamento quando a rede cai — apagões e campo.",
  },
  {
    id: "primeiros-socorros",
    nome: "Primeiros socorros",
    descricao: "Estancar, imobilizar e estabilizar até o socorro chegar.",
  },
  {
    id: "abrigos",
    nome: "Abrigos e clima",
    descricao: "Proteção contra chuva, frio e calor extremo.",
  },
  {
    id: "comunicacao",
    nome: "Comunicação",
    descricao: "Saber o que acontece e pedir socorro sem sinal de operadora.",
  },
  {
    id: "ferramentas",
    nome: "Ferramentas",
    descricao: "Cortar, consertar, abrir e improvisar quando nada mais resolve.",
  },
];

export const ITENS: ItemDeposito[] = [
  {
    id: "filtro-squeeze",
    nome: "Filtro de água tipo squeeze (0,1 µm)",
    contexto: "agua",
    motivo:
      "Transforma água de rio, chuva ou caixa d'água contaminada em água potável na hora, sem fogo nem pastilha.",
    faixa: "R$ 90–180",
    busca: "filtro de água sobrevivência squeeze",
    perfis: ["trilha", "rural", "urbano"],
    essencial: true,
  },
  {
    id: "pastilhas-cloramina",
    nome: "Pastilhas de cloramina (tratamento)",
    contexto: "agua",
    motivo:
      "Reserva de emergência para o filtro: leve, barata e com prazo longo — trata 20–50 litros por cartela.",
    faixa: "R$ 15–40",
    busca: "pastilha purificadora de agua cloramina",
    perfis: ["urbano", "trilha", "litoral", "rural"],
    essencial: true,
  },
  {
    id: "garrafa-rigida",
    nome: "Garrafa rígida de metal (1 L)",
    contexto: "agua",
    motivo:
      "Carrega água e permite ferver direto no fogo — função dupla que garrafa plástica não cumpre.",
    faixa: "R$ 60–150",
    busca: "garrafa de acampamento metal 1 litro",
    perfis: ["trilha", "rural"],
    essencial: true,
  },
  {
    id: "powerbank-20000",
    nome: "Power bank 20.000 mAh",
    contexto: "energia",
    motivo: "Mantém o celular (mapa tático, lanterna, SOS) vivo por 3–5 dias de apagão.",
    faixa: "R$ 80–200",
    busca: "power bank 20000 mAh",
    perfis: ["urbano", "trilha", "litoral", "rural"],
    essencial: true,
  },
  {
    id: "lanterna-headlamp",
    nome: "Lanterna de cabeça com pilha",
    contexto: "energia",
    motivo: "Deixa as mãos livres no escuro — mais útil que lanterna de mão em emergência.",
    faixa: "R$ 40–120",
    busca: "lanterna de cabeça pilha aa",
    perfis: ["urbano", "trilha", "rural"],
    essencial: true,
  },
  {
    id: "carregador-solar",
    nome: "Painel solar dobrável (10–20 W)",
    contexto: "energia",
    motivo: "Recarrega o power bank em apagões longos ou acampamentos de vários dias.",
    faixa: "R$ 120–300",
    busca: "painel solar dobrável portátil 20w",
    perfis: ["rural", "trilha", "litoral"],
    essencial: false,
  },
  {
    id: "kit-iais",
    nome: "Kit de primeiros socorros compacto",
    contexto: "primeiros-socorros",
    motivo:
      "Curativo, gazes, esparadrapo, antisséptico, analgésico e luvas — o mínimo para estancar e proteger.",
    faixa: "R$ 50–150",
    busca: "kit primeiros socorros compacto viagem",
    perfis: ["urbano", "trilha", "litoral", "rural"],
    essencial: true,
  },
  {
    id: "torniquete",
    nome: "Torniquete comercial",
    contexto: "primeiros-socorros",
    motivo: "Hemorragia grave de membro é a causa mais prevenível de morte — minuto decide.",
    faixa: "R$ 60–180",
    busca: "torniquete tático comercial",
    perfis: ["trilha", "rural", "urbano"],
    essencial: false,
  },
  {
    id: "capa-chuva",
    nome: "Capa de chuva reutilizável",
    contexto: "abrigos",
    motivo: "Hipotermia por chuva atinge até o litoral quente — molhado + vento mata em horas.",
    faixa: "R$ 30–90",
    busca: "capa de chuva tático reutilizável",
    perfis: ["urbano", "trilha", "litoral", "rural"],
    essencial: true,
  },
  {
    id: "lona-tarp",
    nome: "Lona/tarp impermeável (3×2 m)",
    contexto: "abrigos",
    motivo: "Abrige, cobre telhado quebrado, coleta água de chuva — o improviso mais versátil.",
    faixa: "R$ 40–120",
    busca: "lona tarp impermeável camping",
    perfis: ["rural", "trilha", "litoral"],
    essencial: false,
  },
  {
    id: "manta-aluminio",
    nome: "Manta de alumínio ( emergência )",
    contexto: "abrigos",
    motivo: "Guarda 90% do calor corporal; cabe no bolso e custa menos que um lanche.",
    faixa: "R$ 10–30",
    busca: "manta térmica aluminio emergência",
    perfis: ["urbano", "trilha", "litoral", "rural"],
    essencial: true,
  },
  {
    id: "radio-dinamo",
    nome: "Rádio AM/FM a dínamo/solar",
    contexto: "comunicacao",
    motivo:
      "Único canal de informação e alertas oficiais quando internet e operadoras caem (Defesa Civil usa rádio).",
    faixa: "R$ 60–160",
    busca: "rádio dínamo solar emergência",
    perfis: ["urbano", "litoral", "rural"],
    essencial: true,
  },
  {
    id: "apito-sirene",
    nome: "Apito de emergência (sem bola)",
    contexto: "comunicacao",
    motivo: "Som de apito atravessa 1 km de mata ou escombros; gritar cansa e rouba água.",
    faixa: "R$ 10–40",
    busca: "apito de emergência resgate",
    perfis: ["trilha", "litoral", "rural"],
    essencial: true,
  },
  {
    id: "powerbank-radio-bateria",
    nome: "Baterias alcalinas sobressalentes (AA/AAA)",
    contexto: "energia",
    motivo: "Rádios, lanternas e GPS comuns ainda usam pilha — estoque fechado não vaza.",
    faixa: "R$ 20–60",
    busca: "bateria alcalina aa kit",
    perfis: ["urbano", "litoral", "rural"],
    essencial: false,
  },
  {
    id: "faca-fixa",
    nome: "Faca de lâmina fixa (10–13 cm)",
    contexto: "ferramentas",
    motivo: "Ferramenta-mãe do campo: corta corda, prepara alimento, abre, entalha estacas.",
    faixa: "R$ 80–250",
    busca: "faca de lâmina fixa bushcraft",
    perfis: ["trilha", "rural"],
    essencial: true,
  },
  {
    id: "multiferramenta",
    nome: "Multiferramenta com alicate",
    contexto: "ferramentas",
    motivo: "Repara mochila, sapato, equipamento e lona sem precisar da caixa de ferramentas.",
    faixa: "R$ 70–200",
    busca: "multiferramenta alicate camping",
    perfis: ["trilha", "rural", "urbano"],
    essencial: true,
  },
  {
    id: "isqueiro-magnesio",
    nome: "Ferro de magnésio + isqueiro à prova d'água",
    contexto: "ferramentas",
    motivo: "Fogo em chuva forte, mochila molhada ou gás acabado — milhares de faíscas.",
    faixa: "R$ 25–80",
    busca: "ferro magnésio isqueiro fogo camping",
    perfis: ["trilha", "rural"],
    essencial: false,
  },
  {
    id: "corda-paracord",
    nome: "Paracord 550 (15–30 m)",
    contexto: "ferramentas",
    motivo: "Abrigo, maca improvisada, amarração de carga, rosário de emergência.",
    faixa: "R$ 25–80",
    busca: "paracord 550 7 fios",
    perfis: ["trilha", "rural", "litoral"],
    essencial: true,
  },
];

/** Itens filtrados por contexto do depósito (para a vitrina da tela). */
export function itensPorContexto(contexto: ContextoDeposito | "todos"): ItemDeposito[] {
  if (contexto === "todos") return ITENS;
  return ITENS.filter((i) => i.contexto === contexto);
}

/** Deep link do item para a loja do Centro (com UTM do depósito). */
export function urlItemNaLoja(item: ItemDeposito): string {
  return urlLoja(item.busca, `deposito:${item.id}`);
}

/** Deep link genérico do depósito para a loja. */
export function urlDepositoNaLoja(contexto?: ContextoDeposito): string {
  return urlLoja(contexto ? `kit ${contexto}` : "kit sobrevivência", "deposito:vitrine");
}
