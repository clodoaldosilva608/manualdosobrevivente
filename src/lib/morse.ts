/**
 * Código Morse — conversão de texto para Morse e para o padrão de pulsos do
 * estrobo (tocha e tela) da página SOS.
 *
 * Convenções internacionais (unidade = duração do ponto):
 * - ponto: 1 unidade aceso
 * - traço: 3 unidades acesas
 * - pausa entre símbolos da mesma letra: 1 unidade apagada
 * - pausa entre letras: 3 unidades apagadas
 * - pausa entre palavras: 7 unidades apagadas
 */

/** Tabela internacional: letras, dígitos e pontuação de campo. */
export const CODIGO_MORSE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "!": "-.-.--",
  "/": "-..-.",
  "-": "-....-",
  "(": "-.--.",
  ")": "-.--.-",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "@": ".--.-.",
  "'": ".----.",
  '"': ".-..-.",
};

/** Tabela inversa, para exibir o texto decodificado de um Morse digitado. */
export const MORSE_CODIGO: Record<string, string> = Object.fromEntries(
  Object.entries(CODIGO_MORSE).map(([letra, codigo]) => [codigo, letra]),
);

/** Mensagens prontas oferecidas na página SOS (curtas, de campo). */
export const MENSAGENS_PRE_DEFINIDAS: Array<{ texto: string; descricao: string }> = [
  { texto: "SOS", descricao: "chamado de socorro padrão" },
  { texto: "SOCORRO", descricao: "pedido de auxílio" },
  { texto: "AJUDA", descricao: "preciso de ajuda" },
  { texto: "PERDIDO", descricao: "deslocado da rota" },
  { texto: "FERIDO", descricao: "há um ferido no grupo" },
  { texto: "AQUI", descricao: "marcar a própria posição" },
  { texto: "AGUA", descricao: "preciso de água" },
  { texto: "FOGO", descricao: "preciso de fogo / incêndio" },
];

/** Remove acentos e diacríticos (A→Á igual, Ç→C) e devolve maiúsculas. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°ª]/g, "O")
    .toUpperCase();
}

/**
 * Converte texto livre em Morse: letras separadas por espaço e palavras por
 * " / ". Caracteres sem código Morse viram espaço.
 */
export function textoParaMorse(texto: string): string {
  const limpo = normalizarTexto(texto);
  return limpo
    .split(/\s+/)
    .filter((palavra) => palavra.length > 0)
    .map((palavra) =>
      palavra
        .split("")
        .map((c) => CODIGO_MORSE[c] ?? "")
        .filter((c) => c !== "")
        .join(" "),
    )
    .filter((palavra) => palavra !== "")
    .join(" / ");
}

/** Decodifica Morse ("... --- ..." → "SOS") para conferência em campo. */
export function morseParaTexto(morse: string): string {
  return morse
    .trim()
    .split(/\s*\/\s*|\s{3,}/)
    .map((palavra) =>
      palavra
        .trim()
        .split(/\s+/)
        .filter((c) => c !== "")
        .map((c) => MORSE_CODIGO[c] ?? "?")
        .join(""),
    )
    .filter((p) => p !== "")
    .join(" ");
}

/** Um pulso (ou pausa) do estrobe, com a letra em transmissão no momento. */
export interface PassoMorse {
  /** true = luz acesa; false = pausa. */
  aceso: boolean;
  /** Duração em milissegundos. */
  ms: number;
  /** Índice do caractere da mensagem em transmissão (para destacar na tela). */
  letra: number;
}

/**
 * Constrói a sequência completa de pulsos para transmitir o texto no estrobo.
 * A sequência termina com uma pausa de 7 unidades para a repetição respirar.
 */
export function padraoMorse(texto: string, unidadeMs = 200): PassoMorse[] {
  const limpo = normalizarTexto(texto);
  const passos: PassoMorse[] = [];
  const palavras = limpo.split(/\s+/).filter((p) => p.length > 0);
  palavras.forEach((palavra, ip) => {
    // Percorre a palavra mantendo a posição real no texto original para o
    // destaque da letra em transmissão na tela.
    let cursor = 0;
    const letrasComIndice: Array<{ codigo: string; indice: number }> = [];
    for (const c of palavra) {
      const indice = limpo.indexOf(c, cursor);
      if (CODIGO_MORSE[c] != null && indice >= 0) {
        letrasComIndice.push({ codigo: CODIGO_MORSE[c], indice });
      }
      cursor = (indice >= 0 ? indice : cursor) + 1;
    }
    letrasComIndice.forEach((entrada, il) => {
      const simbolos = entrada.codigo.split("");
      simbolos.forEach((s, is) => {
        passos.push({
          aceso: true,
          ms: s === "-" ? unidadeMs * 3 : unidadeMs,
          letra: entrada.indice,
        });
        const ultimaSimbolo = is === simbolos.length - 1;
        const ultimaLetra = il === letrasComIndice.length - 1;
        const ultimaPalavra = ip === palavras.length - 1;
        if (ultimaSimbolo && ultimaLetra) {
          if (!ultimaPalavra)
            passos.push({ aceso: false, ms: unidadeMs * 7, letra: entrada.indice });
        } else if (ultimaSimbolo) {
          passos.push({ aceso: false, ms: unidadeMs * 3, letra: entrada.indice });
        } else {
          passos.push({ aceso: false, ms: unidadeMs, letra: entrada.indice });
        }
      });
    });
  });
  passos.push({ aceso: false, ms: unidadeMs * 7, letra: -1 });
  return passos;
}
