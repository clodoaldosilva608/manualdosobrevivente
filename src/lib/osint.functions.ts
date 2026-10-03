/**
 * Server functions das ferramentas de investigação OSINT (Hub Osiris).
 *
 * Duas fontes públicas e keyless, sempre chamadas pelo servidor:
 *  - ipwho.is — geolocalização e operadora de um endereço IP;
 *  - rdap.org — registro público de domínios (RDAP, sucessor do WHOIS).
 * O cliente nunca acessa as fontes diretamente, evitando CORS e chaves
 * expostas. Consultas são pontuais, com cache curto para absorver toques
 * repetidos na interface.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

/** Busca JSON com tempo limite para não travar a resposta do servidor. */
async function buscarJson<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: {
        // Alguns provedores bloqueiam chamadas sem User-Agent de navegador.
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "application/rdap+json, application/json;q=0.9, */*;q=0.8",
      },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

// Cache genérico em memória por processo (chave → { dados, em }).
const G = globalThis as typeof globalThis & {
  __msOsintCache?: Map<string, { dados: unknown; em: number; erro?: string }>;
};
const cache: Map<string, { dados: unknown; em: number; erro?: string }> = (G.__msOsintCache ??=
  new Map());
const TTL_CONSULTA = 60_000;
const MAX_CACHE = 200;

async function comCache<T>(chave: string, produtor: () => Promise<T>): Promise<T> {
  const hit = cache.get(chave);
  if (hit && Date.now() - hit.em < TTL_CONSULTA) return hit.dados as T;
  if (cache.size > MAX_CACHE) cache.clear();
  const dados = await produtor();
  cache.set(chave, { dados, em: Date.now() });
  return dados;
}

// ---------------------------------------------------------------------------
// Investigação de IP (ipwho.is)
// ---------------------------------------------------------------------------

export interface IpInfo {
  ip: string;
  /** true quando a consulta usou o IP de origem da requisição. */
  origem: boolean;
  pais: string;
  paisCodigo: string;
  regiao: string;
  cidade: string;
  latitude: number | null;
  longitude: number | null;
  fuso: string;
  isp: string;
  org: string;
  asn: string;
  /** Domínio reverso da operadora, quando existe. */
  dominio: string;
}

interface RespostaIpwho {
  ip?: string;
  success?: boolean;
  message?: string;
  type?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  connection?: { asn?: number; org?: string; isp?: string; domain?: string };
  timezone?: { id?: string };
}

const EsquemaIp = z.object({ ip: z.string().trim().max(64).default("") });

export const investigarIp = createServerFn({ method: "GET" })
  .inputValidator(EsquemaIp.parse)
  .handler(async ({ data }): Promise<IpInfo> => {
    return comCache(`ip:${data.ip}`, async () => {
      let alvo = data.ip;
      let origem = false;
      if (!alvo) {
        // Sem IP informado: usa o endereço de origem da própria requisição.
        try {
          const req = getRequest();
          const xf = req.headers.get("x-forwarded-for") ?? "";
          alvo = xf.split(",")[0]?.trim() ?? "";
        } catch {
          alvo = "";
        }
        if (!alvo) throw new Error("Informe um endereço IP para investigar");
        origem = true;
      }
      const r = await buscarJson<RespostaIpwho>(`https://ipwho.is/${encodeURIComponent(alvo)}`);
      if (!r || r.success === false) {
        throw new Error(r?.message || "Endereço IP não encontrado");
      }
      return {
        ip: r.ip ?? alvo,
        origem,
        pais: r.country ?? "—",
        paisCodigo: r.country_code ?? "",
        regiao: r.region ?? "—",
        cidade: r.city ?? "—",
        latitude: typeof r.latitude === "number" ? r.latitude : null,
        longitude: typeof r.longitude === "number" ? r.longitude : null,
        fuso: r.timezone?.id ?? "—",
        isp: r.connection?.isp ?? "—",
        org: r.connection?.org ?? "—",
        asn: typeof r.connection?.asn === "number" ? `AS${r.connection.asn}` : "—",
        dominio: r.connection?.domain ?? "",
      } satisfies IpInfo;
    });
  });

// ---------------------------------------------------------------------------
// Investigação de domínio (RDAP via rdap.org)
// ---------------------------------------------------------------------------

export interface DominioInfo {
  dominio: string;
  /** Códigos de status EPP ("client hold", "redemption period"…). */
  status: string[];
  registrador: string;
  criadoEm: string;
  atualizadoEm: string;
  expiraEm: string;
  nameservers: string[];
}

interface RdapEvento {
  eventAction?: string;
  eventDate?: string;
}
interface RdapEntity {
  roles?: string[];
  vcardArray?: unknown;
}
interface RdapResposta {
  ldhName?: string;
  status?: string[];
  events?: RdapEvento[];
  entities?: RdapEntity[];
  nameservers?: Array<{ ldhName?: string }>;
}

/** Extrai o nome do registrador do vCard (array [ "vcard", [ [ "fn", {}, "text", Nome ] ] ]). */
function nomeDoVcard(entity: RdapEntity): string {
  try {
    const arr = entity.vcardArray as Array<unknown> | undefined;
    if (!Array.isArray(arr) || arr.length < 2) return "";
    const campos = arr[1] as Array<unknown>;
    for (const campo of campos) {
      if (Array.isArray(campo) && campo[0] === "fn" && typeof campo[3] === "string") {
        return campo[3];
      }
    }
  } catch {
    /* vcard malformado — ignora */
  }
  return "";
}

const EsquemaDominio = z.object({
  dominio: z
    .string()
    .trim()
    .min(4)
    .max(255)
    .transform((s) =>
      s
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        .split(":")[0]
        .toLowerCase(),
    )
    .refine((s) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(s), {
      message: "Domínio inválido",
    }),
});

export const investigarDominio = createServerFn({ method: "GET" })
  .inputValidator(EsquemaDominio.parse)
  .handler(async ({ data }): Promise<DominioInfo> => {
    return comCache(`rdap:${data.dominio}`, async () => {
      let r: RdapResposta;
      try {
        r = await buscarJson<RdapResposta>(
          `https://rdap.org/domain/${encodeURIComponent(data.dominio)}`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("404")) {
          throw new Error("Domínio sem registro público (não encontrado no RDAP)");
        }
        if (msg.includes("429")) {
          throw new Error("Limite de consultas do RDAP atingido — aguarde alguns minutos");
        }
        throw new Error("Falha na consulta ao registro do domínio");
      }
      const ev = (acao: string) =>
        r.events?.find((e) => e.eventAction?.toLowerCase() === acao)?.eventDate ?? "";
      const registrar = r.entities?.find((e) => e.roles?.includes("registrar"));
      return {
        dominio: r.ldhName ?? data.dominio,
        status: (r.status ?? []).slice(0, 8),
        registrador: registrar ? nomeDoVcard(registrar) || "—" : "—",
        criadoEm: ev("registration"),
        atualizadoEm: ev("last changed") || ev("last update of RDAP database"),
        expiraEm: ev("expiration"),
        nameservers: (r.nameservers ?? [])
          .map((n) => n.ldhName ?? "")
          .filter(Boolean)
          .slice(0, 6),
      } satisfies DominioInfo;
    });
  });
