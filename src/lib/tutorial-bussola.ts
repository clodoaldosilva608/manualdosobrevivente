/**
 * Treinamento de campo — módulo BÚSSOLA.
 *
 * Curso passo a passo para aprender a usar a bússola corretamente, com
 * exercícios interativos (arrastar a luneta, girar o aparelho com o sensor
 * real) e quiz de verificação. Extensível: novos módulos entram como novas
 * listas de passos seguindo o mesmo formato.
 */

export type ModoExercicio = "explorar" | "marcacao" | "rumo" | null;

export interface PassoTutorial {
  id: string;
  titulo: string;
  resumo: string;
  /** Corpo da lição (Markdown). */
  corpo: string;
  /** Exercício interativo da lição, se houver. */
  exercicio?: {
    modo: Exclude<ModoExercicio, null>;
    instrução: string;
    /** Rumo-alvo do exercício (graus). */
    rumoAlvo?: number;
  } | null;
}

export const PASSOS_BUSSOLA: PassoTutorial[] = [
  {
    id: "porque",
    titulo: "Por que a bússola salva vidas",
    resumo: "O perigo real de andar em círculos e o valor de um rumo confiável.",
    corpo: `## O problema

Sem referência externa, o ser humano **anda em círculos**. Estudos de campo mostram que, em terreno fechado ou com visibilidade reduzida, pessoas caminhando "em linha reta" derivam para um lado e terminam a poucos metros de onde começaram. Fadiga, terreno inclinado e pernas de comprimento levemente diferente enganam o senso de direção.

## O que a bússola resolve

A bússola é a única referência de direção que **não depende de sinal, sol ou estrelas**. Com ela você consegue:

1. **Manter um rumo** — caminhar numa direção fixa por longas distâncias.
2. **Voltar pelo mesmo caminho** — o contra-rumo traz você de volta à base.
3. **Se situar no mapa** — cruzando marcações, você descobre onde está.

> **Regra do operador**: bússola + mapa valem mais do que GPS com bateria fraca. O GPS mostra onde você está; a bússola garante para onde você vai.`,
    exercicio: {
      modo: "explorar",
      instrução:
        "Arraste a rosa dos ventos e observe os pontos cardeais. Depois, toque em Continuar.",
    },
  },
  {
    id: "partes",
    titulo: "As partes da bússola",
    resumo: "Agulha, rosa, línea de fé e luneta — conheça o instrumento.",
    corpo: `## Anatomia essencial

- **Agulha magnética** — a ponta **vermelha** aponta sempre para o norte magnético. Nunca minta sobre isso; o resto do instrumento gira em torno dela.
- **Rosa dos ventos** — o mostrador de 0° a 360°. Graus são a linguagem da direção: 0°/360° norte, 90° leste, 180° sul, 270° oeste.
- **Luneta (bezel)** — o anel giratório que você ajusta para "guardar" um rumo.
- **Seta de orientação** — o "bunker" desenhado na luneta onde a agulha se encaixa.
- **Línea de fé / seta de direção** — a seta fixa da base que aponta para onde você quer ir.
- **Base transparente** — serve também de régua para trabalhar com o mapa.

> **Dica**: segure a bússola **nivelada** e **longe de metal** — celular no outro bolso, faca no peito e carro a 5 m desviam a agulha.`,
    exercicio: {
      modo: "explorar",
      instrução:
        "Arraste a rosa e repare na agulha vermelha: ela continua apontando o norte, não importa como você gire o mostrador.",
    },
  },
  {
    id: "nortes",
    titulo: "Norte verdadeiro × norte magnético",
    resumo: "Declinação magnética e como o app cuida disso para você.",
    corpo: `## Dois nortes diferentes

- **Norte verdadeiro** — a direção do Polo Norte geográfico, onde os meridianos convergem. É o norte dos mapas.
- **Norte magnético** — para onde a agulha aponta, movido pelo campo magnético da Terra. É o norte da bússola.

A diferença entre os dois chama-se **declinação magnética** e varia conforme onde você está no planeta — de 0° a dezenas de graus, e muda lentamente com os anos.

## Por que isso importa

Um erro de 10° parece pouco, mas em 1 km de caminhada coloca você **175 m** fora do destino. Em navegação séria, ajuste o rumo pela declinação local.

## No aplicativo

O Manual já compensa a declinação automaticamente para a sua região — em **Ajustes › Referência de norte** você escolhe trabalhar com norte **verdadeiro** (padrão, alinhado ao mapa) ou **magnético** (alinhado à agulha de uma bússola física).`,
    exercicio: null,
  },
  {
    id: "orientar-mapa",
    titulo: "Orientar o mapa",
    resumo: "Alinhar o mapa com o terreno para que ambos 'falem a mesma língua'.",
    corpo: `## O primeiro uso da bússola

Um mapa desorientado é um desenho; um mapa orientado é uma janela. Orientar o mapa significa girá-lo até que o norte do papel aponte para o norte real do terreno.

## Passo a passo

1. Coloque a bússola sobre o mapa, com a línea de fé alinhada ao meridiano (a linha vertical de norte) do mapa.
2. Gire **mapa e bússola juntos** até a agulha vermelha se encaixar na seta de orientação.
3. Pronto: o que está à sua esquerda no papel está à sua esquerda no terreno.

## Como usar isso

Com o mapa orientado, identifique no papel **duas ou três referências** que você também vê no campo (morro, curva do rio, torre). Essa correspondência é a base para se localizar e planejar o próximo trecho.`,
    exercicio: {
      modo: "marcacao",
      instrução:
        "Treino de leitura: gire a luneta até o índice marcar 0° — a posição de 'mapa orientado'. Encaixe o rumo 0° para continuar.",
      rumoAlvo: 0,
    },
  },
  {
    id: "marcacao",
    titulo: "Tomar uma marcação (rumo)",
    resumo: "Medir a direção de um ponto no terreno — a habilidade central.",
    corpo: `## O que é tomar uma marcação

Marcação (ou azimute) é o ângulo, em graus, entre o norte e a direção de um alvo. É o número que você "guarda" na luneta e segue.

## Passo a passo (bússola de base)

1. **Aponte** a línea de fé (a seta da base) para o alvo — um morro, uma árvore marcada, a saída da trilha.
2. **Gire a luneta** até a agulha vermelha ficar **encaixada** dentro da seta de orientação desenhada no fundo da cápsula ("encaixou a agulha").
3. **Leia** o grau no índice (a linha de referência da caja). Esse é o seu rumo.

## No exercício ao lado

A seta da base já está apontando para o marco. Falta girar a luneta até o rumo correto ficar no índice — a agulha vai "encaixar" sozinha quando você acertar.`,
    exercicio: {
      modo: "marcacao",
      instrução:
        "Gire a luneta até encaixar a agulha e ler o rumo do marco no índice. Tolerância de ±4°.",
      rumoAlvo: 60,
    },
  },
  {
    id: "seguir-rumo",
    titulo: "Seguir o rumo em campo",
    resumo: "Do número na luneta ao movimento no terreno — sem desviar.",
    corpo: `## A técnica do marco intermediário

Segurar um rumo "na cabeça" por horas é impossível. O método profissional é quebrar a rota em trechos curtos:

1. **Levante a vista** na direção do rumo e escolha um **marco visível** (árvore, rocha, poste) naquela linha.
2. **Caminhe até o marco** guardando a bússola — sem ficar olhando para o chão ou para o aparelho.
3. **Repita**: no marco, confirme o rumo e escolha o próximo.

Em neblina ou floresta densa sem marcos visíveis: um companheiro anda à frente recebendo rumos por gestos, ou você navega por "saltos" contando os passos.

## Prática agora

Se o seu aparelho tiver sensor de orientação, gire-se fisicamente até o rumo-alvo — o app confirma quando você estiver na linha. É o mesmo movimento que você fará no campo.`,
    exercicio: {
      modo: "rumo",
      instrução:
        "Gire o aparelho (ou arraste a rosa) até o rumo 90° (leste) e mantenha por um instante.",
      rumoAlvo: 90,
    },
  },
  {
    id: "contra-rumo",
    titulo: "O contra-rumo — voltar pelo mesmo caminho",
    resumo: "A técnica que traz você de volta à base em qualquer condição.",
    corpo: `## +180° de volta

O contra-rumo é a direção exatamente oposta à que você veio. A regra:

- Rumo **menor que 180°** → some **180**: rumo 70° → volta 250°.
- Rumo **maior que 180°** → subtraia **180**: rumo 210° → volta 30°.

## Quando usar

- Explorou uma área e precisa **voltar à trilha**.
- Neblina subiu, o terreno fechou — volte pelo caminho seguro.
- Sua rota de ida é a rota de volta planejada.

## No aplicativo

O Guia de Rota faz isso por você: com a **trilha gravada**, o botão "Voltar ao início" cria a navegação de retorno automaticamente — com distância, rumo e alerta de desvio. A bússola é o plano B quando a bateria acaba.`,
    exercicio: {
      modo: "marcacao",
      instrução:
        "Você chegou pelo rumo 210°. Configure a luneta no contra-rumo de volta. (210° − 180° = 30°.)",
      rumoAlvo: 30,
    },
  },
  {
    id: "dicas",
    titulo: "Dicas de operador",
    resumo: "Os detalhes que separam iniciantes de quem não se perde.",
    corpo: `## Higiene da bússola

- **Distância do metal**: 30 cm de celular, 1 m de faca/ferramentas, dezenas de metros de veículos e fios de energia.
- **Nivelada**: inclinar a bússola faz a agulha raspar e mentir. Olhe de cima, não de lado.
- **Frio**: bateria do GPS morre no frio; a agulha só fica preguiçosa — mas fica. Dê tempo para ela assentar.

## Rotina de navegação

1. **Antes de sair**: rumo anotado no papel + luneta configurada.
2. **A cada trecho**: confirme o rumo e o próximo marco.
3. **A cada parada**: confira a volta — "qual é o contra-rumo daqui?"

## Treine perto de casa

Navegação é músculo: faça um percurso curto com a bússola uma vez por mês. No dia em que ela for a única referência, seus dedos já vão saber o caminho.`,
    exercicio: null,
  },
];

export interface QuestaoQuiz {
  pergunta: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
}

export const QUIZ_BUSSOLA: QuestaoQuiz[] = [
  {
    pergunta: "A ponta vermelha da agulha aponta sempre para…",
    alternativas: [
      "o norte verdadeiro do mapa",
      "o norte magnético",
      "o sul — a bússola é invertida no hemisfério sul",
      "a direção que você está andando",
    ],
    correta: 1,
    explicacao:
      "A agulha responde ao campo magnético da Terra: aponta o norte MAGNÉTICO. A diferença para o norte verdadeiro é a declinação, que o app compensa automaticamente.",
  },
  {
    pergunta: "Você caminhou pelo rumo 70° e quer voltar pelo mesmo caminho. Qual o contra-rumo?",
    alternativas: ["290°", "70° (basta seguir de volta)", "250°", "110°"],
    correta: 2,
    explicacao:
      "Rumo menor que 180°: some 180. 70° + 180° = 250°. É o mesmo cálculo que o botão 'Voltar ao início' do Guia de Rota automatiza.",
  },
  {
    pergunta: "Ao tomar uma marcação, o passo FINAL é…",
    alternativas: [
      "girar a luneta até encaixar a agulha na seta de orientação",
      "apontar a línea de fé para o alvo",
      "ler o grau no índice e guardá-lo",
      "segurar a bússola de lado para ver melhor",
    ],
    correta: 2,
    explicacao:
      "A sequência é: apontar a línea de fé ao alvo, encaixar a agulha girando a luneta e SÓ ENTAO ler o grau no índice. Ler antes de encaixar dá um rumo errado.",
  },
  {
    pergunta: "Antes de confiar numa leitura, o que verificar ao redor?",
    alternativas: [
      "objetos metálicos e eletrônicos que desviam a agulha",
      "se há sinais de celular para confirmar com o GPS",
      "a temperatura do ar",
      "nada — a agulha nunca mente",
    ],
    correta: 0,
    explicacao:
      "Metal e eletricidade desviam a agulha em dezenas de graus: celular, faca, mochila com armação, veículos e fios de alta tensão. Afaste-se e leia de novo.",
  },
];

/** Insígnia conquistada: todos os passos + quiz com ao menos 3/4 acertos. */
export const QUIZ_MINIMO = 3;

export interface ProgressoTutorial {
  passos: string[];
  quiz: { acertos: number; total: number } | null;
}

export const CHAVE_PROGRESSO = "tgis:tutorial-bussola";

export function carregarProgresso(): ProgressoTutorial {
  try {
    const raw = localStorage.getItem(CHAVE_PROGRESSO);
    if (!raw) return { passos: [], quiz: null };
    const v = JSON.parse(raw) as Partial<ProgressoTutorial>;
    return { passos: v.passos ?? [], quiz: v.quiz ?? null };
  } catch {
    return { passos: [], quiz: null };
  }
}

export function salvarProgresso(p: ProgressoTutorial): void {
  try {
    localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(p));
  } catch {
    /* armazenamento indisponível */
  }
}

export function treinadoCompleto(p: ProgressoTutorial): boolean {
  return p.passos.length >= PASSOS_BUSSOLA.length && (p.quiz?.acertos ?? 0) >= QUIZ_MINIMO;
}

/** Diferença angular mínima entre dois rumos (0–180). */
export function diferencaAngular(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}
