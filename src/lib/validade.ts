/**
 * Validade dos itens da mochila de emergência — lembretes de rotação.
 *
 * Parte pura (sem navegador) para poder testar com unidade: calcula o status
 * de cada item a partir de `expires_at` (data ISO "AAAA-MM-DD" vinda do
 * formulário) e resume os alertas de todas as mochilas.
 *
 * Limiares:
 *  - vencido  — data já passou;
 *  - crítico  — vence em até 7 dias;
 *  - atenção  — vence em até 30 dias;
 *  - próximo  — vence em até 90 dias;
 *  - ok       — mais de 90 dias.
 */

export type StatusValidade = "vencido" | "critico" | "atencao" | "proximo" | "ok";

export const DIA_MS = 86_400_000;

/**
 * Dias restantes até a validade (negativo = vencido).
 * Datas sem hora ("AAAA-MM-DD") são interpretadas como meio-dia local para
 * evitar deslocamento de fuso; datas completas usam o horário informado.
 */
export function diasRestantes(expiresAt: string, agora: number = Date.now()): number {
  if (!expiresAt) return NaN;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ? `${expiresAt}T12:00:00` : expiresAt;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return NaN;
  return Math.ceil((t - agora) / DIA_MS);
}

export function statusValidade(
  expiresAt: string | null | undefined,
  agora: number = Date.now(),
): StatusValidade | null {
  if (!expiresAt) return null;
  const dias = diasRestantes(expiresAt, agora);
  if (Number.isNaN(dias)) return null;
  if (dias < 0) return "vencido";
  if (dias <= 7) return "critico";
  if (dias <= 30) return "atencao";
  if (dias <= 90) return "proximo";
  return "ok";
}

/** Rótulo humano do status — chaves prontas para o t() do i18n. */
export function rotuloValidade(
  status: StatusValidade,
  dias: number,
): { chave: string; vars?: Record<string, number> } {
  const n = Math.abs(dias);
  switch (status) {
    case "vencido":
      return n <= 1
        ? { chave: "Vencido desde ontem" }
        : { chave: "Vencido há {n} dias", vars: { n } };
    case "critico":
      return n <= 0 ? { chave: "Vence hoje" } : { chave: "Vence em {n} dia", vars: { n } };
    case "atencao":
    case "proximo":
      return { chave: "Vence em {n} dias", vars: { n } };
    case "ok":
      return { chave: "Dentro da validade" };
  }
}

/** Classe de cor Tailwind do selo de cada status. */
export function corStatusValidade(status: StatusValidade): string {
  switch (status) {
    case "vencido":
      return "bg-destructive/15 text-destructive border-destructive/40";
    case "critico":
      return "bg-tactical-orange/15 text-tactical-orange border-tactical-orange/40";
    case "atencao":
      return "bg-tactical-amber/15 text-tactical-amber border-tactical-amber/40";
    case "proximo":
      return "bg-muted text-muted-foreground border-border";
    case "ok":
      return "bg-muted text-muted-foreground border-border";
  }
}

export interface AlertaValidade {
  item_id: string;
  nome: string;
  expires_at: string;
  mochila_id: string | null;
  mochila_nome: string | null;
  status: StatusValidade;
  dias: number;
}

export interface ResumoValidade {
  /** Vencidos e vencendo em até 30 dias — o que dispara lembrete. */
  alertas: AlertaValidade[];
  vencidos: AlertaValidade[];
  criticos: AlertaValidade[];
  atencao: AlertaValidade[];
  /** Itens com validade cadastrada que não exigem ação agora. */
  tranquilos: number;
  totalComValidade: number;
}

export function resumoValidade(
  itens: Array<{
    id: string;
    name: string;
    expires_at?: string | null;
    mochila_id?: string | null;
  }>,
  nomeMochila: (id: string | null) => string | null,
  agora: number = Date.now(),
): ResumoValidade {
  const alertas: AlertaValidade[] = [];
  const vencidos: AlertaValidade[] = [];
  const criticos: AlertaValidade[] = [];
  const atencao: AlertaValidade[] = [];
  let tranquilos = 0;
  let totalComValidade = 0;

  for (const item of itens) {
    const status = statusValidade(item.expires_at, agora);
    if (!item.expires_at || !status) continue;
    totalComValidade++;
    const dias = diasRestantes(item.expires_at, agora);
    const entrada: AlertaValidade = {
      item_id: item.id,
      nome: item.name,
      expires_at: item.expires_at,
      mochila_id: item.mochila_id ?? null,
      mochila_nome: nomeMochila(item.mochila_id ?? null),
      status,
      dias,
    };
    if (status === "ok") {
      tranquilos++;
      continue;
    }
    alertas.push(entrada);
    if (status === "vencido") vencidos.push(entrada);
    else if (status === "critico") criticos.push(entrada);
    else if (status === "atencao") atencao.push(entrada);
  }

  // Os mais urgentes primeiro: vencidos por mais tempo, depois os que vencem já.
  alertas.sort((a, b) => a.dias - b.dias);
  vencidos.sort((a, b) => a.dias - b.dias);
  criticos.sort((a, b) => a.dias - b.dias);
  atencao.sort((a, b) => a.dias - b.dias);

  return { alertas, vencidos, criticos, atencao, tranquilos, totalComValidade };
}
