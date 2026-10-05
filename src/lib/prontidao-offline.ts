/**
 * Teste de prontidão offline — verifica o que está preparado no aparelho para
 * operar sem internet: Service Worker, cache do shell, página offline,
 * áreas de mapa, manual salvo, banco local e estado da rede.
 *
 * A parte pura (classificação do veredito) fica separada para testes de
 * unidade; as verificações de runtime usam APIs do navegador e rodam só no
 * cliente.
 */
import { listManualAssets, listMochilas, listGear } from "@/lib/db";
import { listAreas } from "@/lib/offline-tiles";
import { MANUAL } from "@/lib/manual-content";

export type EstadoVerificacao = "ok" | "aviso" | "falha";

export interface VerificacaoProntidao {
  id: string;
  /** Chave pt-BR do rótulo (traduzível via t()). */
  rotulo: string;
  estado: EstadoVerificacao;
  detalhe: string;
  /** Falha em verificação crítica derruba o veredito para NÃO PRONTO. */
  critica?: boolean;
}

export type VereditoProntidao = "pronto" | "parcial" | "nao-pronto";

/** Veredito a partir das verificações: crítico falha → NÃO PRONTO; qualquer falha/aviso → PARCIAL. */
export function classificarProntidao(verificacoes: VerificacaoProntidao[]): VereditoProntidao {
  if (verificacoes.some((v) => v.estado === "falha" && v.critica)) return "nao-pronto";
  if (verificacoes.some((v) => v.estado === "falha" || v.estado === "aviso")) return "parcial";
  return "pronto";
}

/** Rótulo do veredito — chave pt-BR para t(). */
export function rotuloVeredito(veredito: VereditoProntidao): string {
  switch (veredito) {
    case "pronto":
      return "PRONTO PARA OPERAR OFFLINE";
    case "parcial":
      return "PARCIALMENTE PRONTO";
    case "nao-pronto":
      return "NÃO PRONTO — resolva os itens em vermelho";
  }
}

/** Classe de cor do selo do veredito. */
export function corVeredito(veredito: VereditoProntidao): string {
  switch (veredito) {
    case "pronto":
      return "border-tactical-orange/60 bg-tactical-orange/10 text-tactical-orange";
    case "parcial":
      return "border-tactical-amber/60 bg-tactical-amber/10 text-tactical-amber";
    case "nao-pronto":
      return "border-destructive/60 bg-destructive/10 text-destructive";
  }
}

async function verificarServiceWorker(): Promise<VerificacaoProntidao> {
  const rotulo = "Service Worker";
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return { id: "sw", rotulo, estado: "falha", detalhe: "Navegador sem suporte", critica: true };
  }
  try {
    const controller = navigator.serviceWorker.controller;
    const registracoes = await navigator.serviceWorker.getRegistrations();
    if (controller) {
      return { id: "sw", rotulo, estado: "ok", detalhe: "Ativo e controlando a página" };
    }
    if (registracoes.length > 0) {
      return {
        id: "sw",
        rotulo,
        estado: "aviso",
        detalhe: "Registrado, mas ainda controla esta página — recarregue para ativar",
      };
    }
    return { id: "sw", rotulo, estado: "falha", detalhe: "Não registrado", critica: true };
  } catch {
    return { id: "sw", rotulo, estado: "falha", detalhe: "Falha ao consultar", critica: true };
  }
}

async function verificarCache(
  prefixo: string,
  url: string,
  critica: boolean,
): Promise<VerificacaoProntidao> {
  try {
    if (typeof caches === "undefined") {
      return {
        id: prefixo,
        rotulo: prefixo,
        estado: "aviso",
        detalhe: "Cache API indisponível",
        critica,
      };
    }
    const chaves = await caches.keys();
    const chave = chaves.find((k) => k.startsWith(prefixo));
    if (!chave) {
      return {
        id: prefixo,
        rotulo: prefixo,
        estado: critica ? "falha" : "aviso",
        detalhe: "Cache ainda não criado — navegue online uma vez",
        critica,
      };
    }
    const cache = await caches.open(chave);
    const presente = await cache.match(url);
    const total = (await cache.keys()).length;
    return {
      id: prefixo,
      rotulo: prefixo,
      estado: presente ? "ok" : critica ? "falha" : "aviso",
      detalhe: presente
        ? `${total} arquivo(s) em cache`
        : "Cache existe, mas sem o arquivo principal",
      critica,
    };
  } catch {
    return {
      id: prefixo,
      rotulo: prefixo,
      estado: "aviso",
      detalhe: "Não foi possível ler o cache",
      critica,
    };
  }
}

async function verificarAreas(): Promise<VerificacaoProntidao> {
  const rotulo = "Áreas de mapa salvas";
  try {
    const areas = await listAreas();
    const tiles = areas.reduce((s, a) => s + a.tile_count, 0);
    if (areas.length === 0) {
      return {
        id: "mapas",
        rotulo,
        estado: "aviso",
        detalhe: "Nenhuma área baixada — o mapa fica sem fundo sem sinal",
      };
    }
    return {
      id: "mapas",
      rotulo,
      estado: "ok",
      detalhe: `${areas.length} área(s) · ${tiles} blocos`,
    };
  } catch {
    return { id: "mapas", rotulo, estado: "aviso", detalhe: "Não foi possível consultar" };
  }
}

async function verificarManual(): Promise<VerificacaoProntidao> {
  const rotulo = "Manual salvo no aparelho";
  try {
    const salvos = await listManualAssets();
    if (salvos.length >= MANUAL.length) {
      return {
        id: "manual",
        rotulo,
        estado: "ok",
        detalhe: `${salvos.length} de ${MANUAL.length} tópicos com texto e imagem`,
      };
    }
    if (salvos.length > 0) {
      return {
        id: "manual",
        rotulo,
        estado: "aviso",
        detalhe: `${salvos.length} de ${MANUAL.length} tópicos — baixe o restante`,
      };
    }
    return {
      id: "manual",
      rotulo,
      estado: "aviso",
      detalhe: "Nenhum tópico salvo — baixe para ler sem sinal",
    };
  } catch {
    return { id: "manual", rotulo, estado: "aviso", detalhe: "Não foi possível consultar" };
  }
}

async function verificarDados(): Promise<VerificacaoProntidao> {
  const rotulo = "Banco local (mochilas e ajustes)";
  try {
    const [mochilas, itens] = await Promise.all([listMochilas(), listGear()]);
    if (mochilas.length === 0 && itens.length === 0) {
      return {
        id: "dados",
        rotulo,
        estado: "aviso",
        detalhe: "Banco funciona, mas ainda sem mochilas criadas",
      };
    }
    return {
      id: "dados",
      rotulo,
      estado: "ok",
      detalhe: `${mochilas.length} mochila(s) · ${itens.length} item(ns)`,
    };
  } catch {
    return {
      id: "dados",
      rotulo,
      estado: "falha",
      detalhe: "IndexedDB inacessível",
      critica: true,
    };
  }
}

function verificarRede(): VerificacaoProntidao {
  const rotulo = "Rede agora";
  const onLine = typeof navigator !== "undefined" ? navigator.onLine : true;
  return onLine
    ? { id: "rede", rotulo, estado: "ok", detalhe: "Conectado — bom momento para baixar mapas" }
    : {
        id: "rede",
        rotulo,
        estado: "ok",
        detalhe: "Sem rede — este é o teste de verdade",
      };
}

/** Roda todas as verificações no navegador e devolve a lista pronta para a tela. */
export async function executarProntidao(): Promise<VerificacaoProntidao[]> {
  const [sw, shell, offlineHtml, mapas, manual, dados] = await Promise.all([
    verificarServiceWorker(),
    verificarCache("shell-", "/", true),
    verificarCache("shell-", "/offline.html", false),
    verificarAreas(),
    verificarManual(),
    verificarDados(),
  ]);
  // IDs distintos para as duas verificações do cache do shell.
  shell.id = "shell";
  shell.rotulo = "Cache do aplicativo (shell)";
  offlineHtml.id = "offline-html";
  offlineHtml.rotulo = "Página offline de emergência";
  return [sw, shell, offlineHtml, mapas, manual, dados, verificarRede()];
}
