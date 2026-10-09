/**
 * Gerador de "PIX Copia e Cola" (BR Code — EMV QRCPS-MPM) do Banco Central.
 *
 * Monta o payload completo a partir da chave PIX, do nome do recebedor e da
 * cidade, com CRC16-CCITT (0x1021, inicial 0xFFFF) — exatamente o formato que
 * os bancos brasileiros leem ao escanear o QR Code. Puro e determinístico,
 * sem dependências: testável e funciona offline.
 *
 * Referência: Manual de Pix do BCB (Anexo II — QRCPS-MPM, emissão estática).
 */

/** Chaves/tamanhos do padrão EMV do BR Code. */
const MAX_NOME = 25;
const MAX_CIDADE = 15;
const MAX_TXID = 25;

/** Remove acentos e caracteres fora do alfabeto permitido pelo BCB. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ,.-]/g, "")
    .trim();
}

/** Campo TLV: tag (2) + comprimento (2, zero-padded) + valor. */
function tlv(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

/**
 * CRC16-CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF, sem reflexão,
 * XOR-out 0x0000) — o algoritmo oficial do rodapé do BR Code.
 */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface DadosPix {
  /** Chave PIX (aleatória/EVP, e-mail, celular ou CNPJ). */
  chave: string;
  /** Nome do recebedor exibido no banco (máx. 25 caracteres). */
  nomeRecebedor: string;
  /** Cidade do recebedor (máx. 15 caracteres). */
  cidade: string;
  /** Valor da contribuição em reais. Omitido/zero = o pagador digita no app. */
  valor?: number;
  /** Identificador da transação (máx. 25 alfanuméricos). Padrão: "***". */
  txid?: string;
}

/**
 * Monta o payload "copia e cola" completo (com CRC) a partir dos dados.
 * Se a chave, o nome ou a cidade vierem vazios, devolve "" — a tela de apoio
 * trata isso como "PIX ainda não configurado".
 */
export function montarPixCopiaECola({
  chave,
  nomeRecebedor,
  cidade,
  valor,
  txid,
}: DadosPix): string {
  const chaveLimpa = chave.trim();
  const nome = normalizar(nomeRecebedor).slice(0, MAX_NOME);
  const cidadeLimpa = normalizar(cidade).slice(0, MAX_CIDADE);
  if (!chaveLimpa || !nome || !cidadeLimpa) return "";

  const gui = tlv("00", "br.gov.bcb.pix") + tlv("01", chaveLimpa);
  const conta = tlv("26", gui);

  const mcc = tlv("52", "0000");
  const moeda = tlv("53", "986");
  const montante = valor && valor > 0 ? tlv("54", valor.toFixed(2)) : "";
  const pais = tlv("58", "BR");
  const recebedor = tlv("59", nome);
  const municipio = tlv("60", cidadeLimpa);

  const txidLimpo =
    normalizar(txid ?? "***")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, MAX_TXID) || "***";
  const extras = tlv("62", tlv("05", txidLimpo));

  const semCrc =
    tlv("00", "01") + conta + mcc + moeda + montante + pais + recebedor + municipio + extras;
  const comRodapé = `${semCrc}6304`;
  return comRodapé + crc16(comRodapé);
}
